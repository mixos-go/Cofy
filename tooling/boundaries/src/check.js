import fs from "node:fs";
import path from "node:path";

import ts from "typescript";

import {
  ALLOWED_TARGETS,
  DB_DRIVER_ALLOWED_ZONES,
  DB_DRIVER_PACKAGES,
  MEDUSA_IMPORT_ALLOWED_ZONES,
  MEDUSA_PACKAGE_PREFIXES
} from "./config.js";
import { isForbiddenSibling, resolveRelative, targetAllowed, zoneForPath, zoneKind } from "./zone.js";

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".medusa",
  ".next",
  ".turbo",
  ".agent_tmp"
]);

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];

/** Look up the allowed import targets for a zone, falling back to the kind wildcard. */
export function allowedTargetsFor(zone) {
  if (Object.hasOwn(ALLOWED_TARGETS, zone)) return ALLOWED_TARGETS[zone];
  const wildcard = `${zoneKind(zone)}:*`;
  if (Object.hasOwn(ALLOWED_TARGETS, wildcard)) return ALLOWED_TARGETS[wildcard];
  return null;
}

function walk(dir, repoRoot, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs, repoRoot, out);
    } else if (entry.isFile()) {
      // package.json is scanned for banned dependencies; source files are scanned for imports.
      if (entry.name === "package.json" || SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        out.push(path.relative(repoRoot, abs).split(path.sep).join("/"));
      }
    }
  }
  return out;
}

/**
 * Build a map of workspace package name -> zone, so imports written with a package specifier
 * (`@platform/contracts`) are checked the same way as relative imports.
 */
export function buildWorkspaceNames(repoRoot) {
  const map = new Map();
  const roots = ["apps/services", "apps/web", "packages", "connectors", "data-plane/modules", "tooling"];

  for (const root of roots) {
    const absRoot = path.join(repoRoot, root);
    if (!fs.existsSync(absRoot)) continue;
    for (const name of fs.readdirSync(absRoot)) {
      const manifest = path.join(absRoot, name, "package.json");
      if (!fs.existsSync(manifest)) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, "utf8"));
        const rel = path.relative(repoRoot, path.join(absRoot, name)).split(path.sep).join("/");
        if (parsed.name) map.set(parsed.name, zoneForPath(rel));
      } catch {
        // A malformed manifest is reported by the dependency scan, not here.
      }
    }
  }
  return map;
}

/** Collect import specifiers with their source locations from a parsed file. */
export function collectSpecifiers(sourceFile) {
  const found = [];

  const record = (node) => {
    const specifier = node.moduleSpecifier;
    if (specifier && ts.isStringLiteralLike(specifier)) {
      found.push({
        value: specifier.text,
        line: sourceFile.getLineAndCharacterOfPosition(specifier.getStart()).line + 1
      });
    }
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      record(node);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      if (ts.isStringLiteralLike(expression)) {
        found.push({
          value: expression.text,
          line: sourceFile.getLineAndCharacterOfPosition(expression.getStart()).line + 1
        });
      }
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const first = node.arguments[0];
      if ((isRequire || isDynamicImport) && ts.isStringLiteralLike(first)) {
        found.push({
          value: first.text,
          line: sourceFile.getLineAndCharacterOfPosition(first.getStart()).line + 1
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function barePackageName(specifier) {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("node:")) {
    return null;
  }
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function isMedusaPackage(name) {
  return MEDUSA_PACKAGE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Evaluate a single import specifier against every rule.
 * Returns an array of findings (a specifier can violate more than one rule).
 */
export function evaluateSpecifier({ sourceZone, relPath, specifier, line, workspaceNames }) {
  const findings = [];
  const add = (rule, message) => findings.push({ rule, file: relPath, line, specifier, message });

  const name = barePackageName(specifier);

  if (name !== null) {
    if (isMedusaPackage(name) && !MEDUSA_IMPORT_ALLOWED_ZONES.has(sourceZone)) {
      add(
        "medusa-core-import",
        `Zone '${sourceZone}' must not import the commerce engine ('${name}'). ` +
          `AGENTS.md §2.1 — only ${[...MEDUSA_IMPORT_ALLOWED_ZONES].join(", ")} may.`
      );
    }

    if (DB_DRIVER_PACKAGES.has(name) && !DB_DRIVER_ALLOWED_ZONES.has(sourceZone)) {
      add(
        "direct-db-access",
        `Zone '${sourceZone}' must not import database driver '${name}' directly. ` +
          `AGENTS.md §2.3 — use packages/tenant-client.`
      );
    }

    const targetZone = workspaceNames.get(name);
    if (targetZone !== undefined) {
      findings.push(...evaluateInternal(sourceZone, targetZone, relPath, specifier, line));
    }
    return findings;
  }

  // Relative import: resolve it to a repository path and derive the target zone.
  const resolved = resolveRelative(relPath, specifier);
  const targetZone = zoneForPath(resolved);
  findings.push(...evaluateInternal(sourceZone, targetZone, relPath, specifier, line));
  return findings;
}

function evaluateInternal(sourceZone, targetZone, relPath, specifier, line) {
  const findings = [];
  const push = (rule, message) => findings.push({ rule, file: relPath, line, specifier, message });
  const targetKind = zoneKind(targetZone);

  // A workspace importing its own files is not a boundary crossing. Deep imports into another
  // workspace's internals are a different matter, and are covered by the package `exports` map.
  if (sourceZone === targetZone) return findings;

  // data-plane runs under Medusa inside the tenant instance; it may not reach outward.
  if (sourceZone === "data-plane" && ["package", "connector", "service", "web"].includes(targetKind)) {
    push(
      "data-plane-outward-import",
      `data-plane/ must not import from '${targetZone}'. It runs inside the tenant's Medusa ` +
        `instance under a different runtime. AGENTS.md §3.`
    );
    return findings;
  }

  if (targetZone === "data-plane" && sourceZone !== "data-plane") {
    push(
      "data-plane-inward-import",
      `Zone '${sourceZone}' must not import data-plane/ code. It is compiled into the tenant's ` +
        `Medusa instance. AGENTS.md §3.`
    );
    return findings;
  }

  if (isForbiddenSibling(sourceZone, targetZone)) {
    push(
      "sibling-app-import",
      `Zone '${sourceZone}' must not import sibling '${targetZone}'. Apps communicate over ` +
        `HTTP/queue. AGENTS.md §3.`
    );
    return findings;
  }

  // Validate every internal target, not just package/connector ones: a connector reaching into a
  // service, or a service reaching into a web app, is as much a boundary violation as the reverse.
  if (targetZone !== "other") {
    const allowed = allowedTargetsFor(sourceZone);
    if (!targetAllowed(allowed, targetZone)) {
      push(
        "cross-layer-import",
        `Zone '${sourceZone}' must not import '${targetZone}'. ` +
          `Allowed targets: ${allowed === null ? "none" : allowed.join(", ")}. AGENTS.md §3.`
      );
    }
  }

  return findings;
}

/** Scan package.json manifests for banned dependencies. Catches intent before code exists. */
export function evaluateManifest({ relPath, zone, manifest }) {
  const findings = [];
  const fields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

  for (const field of fields) {
    const deps = manifest[field];
    if (!deps || typeof deps !== "object") continue;

    for (const name of Object.keys(deps)) {
      if (isMedusaPackage(name) && !MEDUSA_IMPORT_ALLOWED_ZONES.has(zone)) {
        findings.push({
          rule: "medusa-core-import",
          file: relPath,
          line: 0,
          specifier: name,
          message:
            `Zone '${zone}' declares '${name}' as a dependency. AGENTS.md §2.1 — only ` +
            `${[...MEDUSA_IMPORT_ALLOWED_ZONES].join(", ")} may embed the commerce engine.`
        });
      }
      if (DB_DRIVER_PACKAGES.has(name) && !DB_DRIVER_ALLOWED_ZONES.has(zone)) {
        findings.push({
          rule: "direct-db-access",
          file: relPath,
          line: 0,
          specifier: name,
          message: `Zone '${zone}' declares database driver '${name}'. AGENTS.md §2.3.`
        });
      }
      if (zone === "data-plane" && (name.startsWith("@platform/") || name.startsWith("@repo/"))) {
        findings.push({
          rule: "data-plane-outward-import",
          file: relPath,
          line: 0,
          specifier: name,
          message:
            `data-plane/ must not depend on internal package '${name}'. It runs inside the ` +
            `tenant's Medusa instance. AGENTS.md §3.`
        });
      }
    }
  }

  return findings;
}

/** Run every check against a repository root. Returns all findings, sorted by file then line. */
export function checkBoundaries(repoRoot) {
  const workspaceNames = buildWorkspaceNames(repoRoot);
  const findings = [];

  const files = walk(repoRoot, repoRoot, []);
  for (const relPath of files) {
    const abs = path.join(repoRoot, relPath);
    const sourceZone = zoneForPath(relPath);
    const content = fs.readFileSync(abs, "utf8");

    if (path.basename(relPath) === "package.json") {
      let manifest;
      try {
        manifest = JSON.parse(content);
      } catch {
        findings.push({
          rule: "invalid-manifest",
          file: relPath,
          line: 0,
          specifier: "",
          message: "package.json is not valid JSON."
        });
        continue;
      }
      findings.push(...evaluateManifest({ relPath, zone: sourceZone, manifest }));
      continue;
    }

    const sourceFile = ts.createSourceFile(
      relPath,
      content,
      ts.ScriptTarget.Latest,
      true,
      relPath.endsWith(".tsx") || relPath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    for (const { value, line } of collectSpecifiers(sourceFile)) {
      findings.push(
        ...evaluateSpecifier({ sourceZone, relPath, specifier: value, line, workspaceNames })
      );
    }
  }

  return findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)));
}
