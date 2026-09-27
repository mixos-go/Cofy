import path from "node:path";

import { NO_SIBLING_IMPORTS } from "./config.js";

/**
 * Map a repository-relative file path to its zone.
 *
 * The zone is derived purely from the directory layout so it stays correct even for files that
 * are not yet part of a declared workspace (e.g. a stray file in data-plane/).
 */
export function zoneForPath(relPath) {
  const parts = relPath.split("/").filter(Boolean);
  const [top, second] = parts;

  if (top === "packages") return second ? `package:${second}` : "package:";
  if (top === "connectors") return second ? `connector:${second}` : "connector:";

  if (top === "apps") {
    const group = parts[1];
    const name = parts[2];
    if (group === "services") return name ? `service:${name}` : "service:";
    if (group === "web") return name ? `web:${name}` : "web:";
    return name ? `service:${name}` : "service:";
  }

  if (top === "data-plane") return "data-plane";
  if (top === "tooling") return second ? `tooling:${second}` : "tooling:";

  return "other";
}

/** Zone kind without the instance name, e.g. "service" for "service:worker". */
export function zoneKind(zone) {
  const idx = zone.indexOf(":");
  return idx === -1 ? zone : zone.slice(0, idx);
}

/** Zone instance name, e.g. "worker" for "service:worker". Null when the zone has no instance. */
export function zoneName(zone) {
  const idx = zone.indexOf(":");
  return idx === -1 ? null : zone.slice(idx + 1);
}

function patternMatches(pattern, zone) {
  if (pattern.endsWith("*")) return zone.startsWith(pattern.slice(0, -1));
  return pattern === zone;
}

/** Does a zone pattern list permit an import into `targetZone`? */
export function targetAllowed(allowed, targetZone) {
  if (allowed === null || allowed === undefined) return false;
  return allowed.some((pattern) => patternMatches(pattern, targetZone));
}

/** Is `targetZone` a sibling of `sourceZone` that must not be reached by import? */
export function isForbiddenSibling(sourceZone, targetZone) {
  if (sourceZone === targetZone) return false;
  const sourceIsSiblingScoped = NO_SIBLING_IMPORTS.some((pattern) =>
    patternMatches(pattern, sourceZone)
  );
  return sourceIsSiblingScoped && zoneKind(sourceZone) === zoneKind(targetZone);
}

/** Resolve a relative import specifier against the importing file's repository-relative path. */
export function resolveRelative(fromRelPath, specifier) {
  const dir = path.posix.dirname(fromRelPath);
  return path.posix.normalize(path.posix.join(dir, specifier));
}
