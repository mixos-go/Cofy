/**
 * Regenerates `vendor/<name>/CHECKSUMS.sha256` from the current `dist`.
 *
 * Only run this after re-vendoring from upstream at a pinned commit, never to silence a failing
 * integrity check on edited generated code (docs/adr/0007).
 *
 * Usage:
 *   node tooling/vendor/generate-vendor-checksums.mjs <vendor-dir> [<vendor-dir> ...]
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error("usage: node tooling/vendor/generate-vendor-checksums.mjs <vendor-dir> [...]");
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

for (const vendorDir of targets) {
  const distDir = path.join(vendorDir, "dist");
  if (!fs.existsSync(distDir)) {
    console.error(`missing ${distDir}`);
    process.exit(2);
  }
  const relatives = walk(distDir)
    .map((abs) => path.relative(vendorDir, abs).split(path.sep).join("/"))
    .sort();
  const lines = relatives.map((relative) => {
    const hash = createHash("sha256").update(fs.readFileSync(path.join(vendorDir, relative))).digest("hex");
    return `${hash}  ${relative}`;
  });
  fs.writeFileSync(path.join(vendorDir, "CHECKSUMS.sha256"), `${lines.join("\n")}\n`);
  console.log(`wrote ${path.join(vendorDir, "CHECKSUMS.sha256")} (${lines.length} files)`);
}
