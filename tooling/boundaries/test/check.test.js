import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkBoundaries } from "../src/check.js";

/**
 * Each test builds a real fixture repository on disk and runs the real checker against it.
 * No mocks: the point of this suite is to prove the checker detects violations in files,
 * which is exactly what CI relies on.
 */
function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "boundaries-"));
  for (const [relPath, content] of Object.entries(files)) {
    const abs = path.join(root, relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
  return root;
}

function rulesOf(findings) {
  return findings.map((f) => f.rule).sort();
}

test("a clean tree produces no findings", () => {
  const root = makeRepo({
    "packages/contracts/package.json": { name: "@platform/contracts", version: "0.0.0" },
    "packages/contracts/src/index.ts": "export type OrderId = string;\n",
    "packages/channel-sdk/package.json": {
      name: "@platform/channel-sdk",
      version: "0.0.0",
      dependencies: { "@platform/contracts": "workspace:*" }
    },
    "packages/channel-sdk/src/index.ts": 'import type { OrderId } from "@platform/contracts";\nexport type X = OrderId;\n',
    "connectors/shopee/package.json": {
      name: "@platform/connector-shopee",
      version: "0.0.0",
      dependencies: { "@platform/channel-sdk": "workspace:*" }
    },
    "connectors/shopee/src/index.ts": 'import type { X } from "@platform/channel-sdk";\nexport type Y = X;\n',
    "apps/services/worker/src/index.ts": 'import type { Y } from "@platform/connector-shopee";\nexport type Z = Y;\n',
    "data-plane/modules/wms/package.json": {
      name: "@platform/medusa-wms",
      version: "0.0.0",
      dependencies: { "@medusajs/framework": "^2.0.0" }
    },
    "data-plane/modules/wms/src/index.ts": 'import { model } from "@medusajs/framework/utils";\nexport default model;\n'
  });

  assert.deepEqual(checkBoundaries(root), []);
});

test("contracts importing anything internal is rejected", () => {
  const root = makeRepo({
    "packages/contracts/package.json": { name: "@platform/contracts", version: "0.0.0" },
    "packages/contracts/src/index.ts": 'import type { X } from "@platform/channel-sdk";\nexport type Y = X;\n',
    "packages/channel-sdk/package.json": { name: "@platform/channel-sdk", version: "0.0.0" }
  });

  const findings = checkBoundaries(root);
  assert.deepEqual(rulesOf(findings), ["cross-layer-import"]);
  assert.match(findings[0].message, /contracts/);
});

test("a connector may not import another connector", () => {
  const root = makeRepo({
    // Two levels up: src -> shopee -> connectors.
    "connectors/shopee/src/index.ts": 'import type { X } from "../../lazada/src/index";\nexport type Y = X;\n',
    "connectors/lazada/src/index.ts": "export type X = 1;\n"
  });

  assert.deepEqual(rulesOf(checkBoundaries(root)), ["cross-layer-import"]);
});

test("a workspace may import its own files without tripping the checker", () => {
  const root = makeRepo({
    "packages/contracts/src/index.ts": 'export * from "./ids";\nexport * from "./orders";\n',
    "packages/contracts/src/ids.ts": "export type OrderId = string;\n",
    "packages/contracts/src/orders.ts": 'import type { OrderId } from "./ids";\nexport type O = OrderId;\n'
  });

  assert.deepEqual(checkBoundaries(root), []);
});

test("a connector may not import a service or a web app", () => {
  const root = makeRepo({
    "connectors/shopee/src/index.ts":
      'import { a } from "../../../apps/services/worker/src/index";\nimport { b } from "../../../apps/web/oms-web/src/index";\nexport const c = [a, b];\n',
    "apps/services/worker/src/index.ts": "export const a = 1;\n",
    "apps/web/oms-web/src/index.ts": "export const b = 2;\n"
  });

  const findings = checkBoundaries(root);
  assert.ok(findings.every((f) => f.rule === "cross-layer-import"));
  assert.equal(findings.length, 2);
});

test("services may not import sibling services", () => {
  const root = makeRepo({
    "apps/services/worker/src/index.ts":
      'import { a } from "../../integration-plane/src/index";\nexport const c = a;\n',
    "apps/services/integration-plane/src/index.ts": "export const a = 1;\n"
  });

  const findings = checkBoundaries(root);
  assert.deepEqual(rulesOf(findings), ["sibling-app-import"]);
});

test("web apps may not import sibling web apps", () => {
  const root = makeRepo({
    "apps/web/oms-web/src/index.ts": 'import { a } from "../../ops-console/src/index";\nexport const c = a;\n',
    "apps/web/ops-console/src/index.ts": "export const a = 1;\n"
  });

  assert.deepEqual(rulesOf(checkBoundaries(root)), ["sibling-app-import"]);
});

test("importing the commerce engine outside the data plane is rejected, in code and in manifest", () => {
  const root = makeRepo({
    "apps/services/worker/package.json": {
      name: "@platform/worker",
      version: "0.0.0",
      dependencies: { "@medusajs/framework": "^2.0.0" }
    },
    "apps/services/worker/src/index.ts": 'import { Container } from "@medusajs/framework";\nexport const c = Container;\n'
  });

  const findings = checkBoundaries(root);
  assert.equal(findings.length, 2, "expected one finding for the manifest and one for the import");
  assert.ok(findings.every((f) => f.rule === "medusa-core-import"));
});

test("a database driver import is rejected outside the allowed zones", () => {
  const root = makeRepo({
    "apps/services/worker/src/index.ts": 'import pg from "pg";\nexport const c = pg;\n'
  });

  const findings = checkBoundaries(root);
  assert.deepEqual(rulesOf(findings), ["direct-db-access"]);
});

test("tenant-client may use a database driver; a connector may not", () => {
  const root = makeRepo({
    "packages/tenant-client/src/index.ts": 'import pg from "pg";\nexport const c = pg;\n',
    "connectors/shopee/src/index.ts": 'import pg from "pg";\nexport const c = pg;\n'
  });

  const findings = checkBoundaries(root);
  assert.deepEqual(rulesOf(findings), ["direct-db-access"]);
  assert.match(findings[0].file, /connectors\/shopee/);
});

test("data-plane may not import internal packages, by code or by manifest", () => {
  const root = makeRepo({
    // The import target must exist as a workspace for the checker to resolve it by name.
    "packages/contracts/package.json": { name: "@platform/contracts", version: "0.0.0" },
    "packages/contracts/src/index.ts": "export type X = string;\n",
    "data-plane/modules/wms/package.json": {
      name: "@platform/medusa-wms",
      version: "0.0.0",
      dependencies: { "@platform/contracts": "workspace:*" }
    },
    "data-plane/modules/wms/src/index.ts":
      'import type { X } from "@platform/contracts";\nexport type Y = X;\n'
  });

  const findings = checkBoundaries(root);
  assert.equal(findings.length, 2, "expected one finding for the manifest and one for the import");
  assert.ok(findings.every((f) => f.rule === "data-plane-outward-import"));
});

test("nothing outside data-plane may import data-plane code", () => {
  const root = makeRepo({
    // Four levels up: src -> worker -> services -> apps -> repository root.
    "apps/services/worker/src/index.ts":
      'import { m } from "../../../../data-plane/modules/wms/src/index";\nexport const c = m;\n',
    "data-plane/modules/wms/src/index.ts": "export const m = 1;\n"
  });

  assert.deepEqual(rulesOf(checkBoundaries(root)), ["data-plane-inward-import"]);
});

test("require() and dynamic import() are detected, not only static imports", () => {
  const root = makeRepo({
    "apps/services/worker/src/index.ts":
      'const a = require("pg");\nconst b = await import("@medusajs/framework");\nexport const c = [a, b];\n'
  });

  assert.deepEqual(rulesOf(checkBoundaries(root)), ["direct-db-access", "medusa-core-import"]);
});

test("findings carry the file and line so CI output is actionable", () => {
  const root = makeRepo({
    "connectors/shopee/src/index.ts": "// header\nexport const a = 1;\nimport pg from \"pg\";\n"
  });

  const findings = checkBoundaries(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
  assert.equal(findings[0].file, "connectors/shopee/src/index.ts");
});

test("malformed package.json is reported instead of crashing the checker", () => {
  // A stub manifest is needed so the checker's workspace-name map is built normally.
  const root = makeRepo({
    "packages/contracts/package.json": { name: "@platform/contracts", version: "0.0.0" },
    "packages/contracts/src/index.ts": "export type OrderId = string;\n",
    "apps/services/worker/package.json": "{ not json"
  });

  assert.deepEqual(rulesOf(checkBoundaries(root)), ["invalid-manifest"]);
});
