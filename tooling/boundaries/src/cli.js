import { fileURLToPath } from "node:url";
import path from "node:path";

import { checkBoundaries } from "./check.js";

function parseArgs(argv) {
  const args = { root: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--root") args.root = argv[++i];
    else if (arg === "--json") args.json = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = args.root ? path.resolve(args.root) : path.resolve(here, "../../..");

  const findings = checkBoundaries(repoRoot);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ repoRoot, findings }, null, 2)}\n`);
  } else if (findings.length === 0) {
    process.stdout.write("boundaries: OK — no violations\n");
  } else {
    const byRule = new Map();
    for (const finding of findings) {
      if (!byRule.has(finding.rule)) byRule.set(finding.rule, []);
      byRule.get(finding.rule).push(finding);
    }

    process.stderr.write(`boundaries: ${findings.length} violation(s) found\n\n`);
    for (const [rule, group] of byRule) {
      process.stderr.write(`  [${rule}] (${group.length})\n`);
      for (const finding of group) {
        const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
        process.stderr.write(`    ${location}\n      ${finding.message}\n`);
      }
    }
    process.stderr.write(
      "\nFix the code. Do not disable this check — see AGENTS.md §3 and §7.\n"
    );
  }

  process.exitCode = findings.length === 0 ? 0 : 1;
}

main();
