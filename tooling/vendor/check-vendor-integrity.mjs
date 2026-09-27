/**
 * Verifies the vendored marketplace SDK is byte-identical to what was recorded.
 *
 * Run as a check in CI and before every commit that touches `vendor/`. A failure means generated
 * code was edited in place, which docs/adr/0007 forbids: re-vendor from upstream instead.
 *
 * Usage:
 *   node tooling/vendor/check-vendor-integrity.mjs <vendor-dir>
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const vendorDir = process.argv[2];
if (vendorDir === undefined) {
  console.error("usage: node tooling/vendor/check-vendor-integrity.mjs <vendor-dir>");
  process.exit(2);
}

const checksumFile = path.join(vendorDir, "CHECKSUMS.sha256");
if (!fs.existsSync(checksumFile)) {
  console.error(`missing ${checksumFile}`);
  process.exit(2);
}

function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(abs));
    else if (entry.isFile()) found.push(abs);
  }
  return found;
}

const recorded = new Map();
for (const line of fs.readFileSync(checksumFile, "utf8").split("\n")) {
  if (line.trim() === "") continue;
  const [hash, relative] = line.split(/\s+/, 2);
  recorded.set(relative, hash);
}

const distDir = path.join(vendorDir, "dist");
if (!fs.existsSync(distDir)) {
  console.error(`missing ${distDir}`);
  process.exit(2);
}

const problems = [];
const seen = new Set();
for (const abs of walk(distDir)) {
  const relative = path.relative(vendorDir, abs).split(path.sep).join("/");
  seen.add(relative);
  const expected = recorded.get(relative);
  if (expected === undefined) {
    problems.push(`not recorded in CHECKSUMS.sha256: ${relative}`);
    continue;
  }
  const actual = createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
  if (actual !== expected) problems.push(`modified: ${relative}`);
}

for (const relative of recorded.keys()) {
  if (!seen.has(relative)) problems.push(`missing file: ${relative}`);
}

if (problems.length > 0) {
  console.error(`Vendored SDK integrity check failed for ${vendorDir}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("\nVendored code must stay byte-identical to upstream. See docs/adr/0007.");
  process.exit(1);
}

console.log(`Vendored SDK intact: ${vendorDir} (${recorded.size} files)`);
