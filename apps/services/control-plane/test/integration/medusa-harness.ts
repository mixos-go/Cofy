/**
 * Shared harness for integration tests that boot a real Medusa instance (ADR 0016, AGENTS.md §6).
 *
 * Two tests now need the same three things: a database URL for one tenant, a Medusa CLI invocation
 * that runs to completion, and a `medusa start` that is only "ready" once `/health` answers. Keeping
 * them here rather than copying them means a fix to the boot sequence — a timeout, an environment
 * variable the CLI turns out to need — lands once, and a new real-Medusa test starts from something
 * already known to work.
 *
 * Not a `.test.ts` file, so `node --test test/integration/*.test.ts` does not execute it.
 */

import { spawn } from "node:child_process";
import type { Logger } from "@platform/control-plane";

/** Absent means every real-Medusa test skips, so `pnpm test` still needs no database. */
export const DATABASE_URL = process.env.TEST_DATABASE_URL;

export const MEDUSA_CWD = new URL("../../../../../data-plane/medusa-config", import.meta.url).pathname;
export const MEDUSA_COMMAND = `${MEDUSA_CWD}/node_modules/.bin/medusa`;
export const SEED_SCRIPT = "src/scripts/seed-tenant-order.ts";

export function databaseUrlFor(base: string, databaseName: string): string {
  const url = new URL(base);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Runs a Medusa CLI subcommand to completion, returning its exit code and output. */
export function runMedusa(
  args: readonly string[],
  env: Record<string, string>,
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(MEDUSA_COMMAND, [...args], {
      cwd: MEDUSA_CWD,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

/** Boots `medusa start` and waits for `/health`, so a reader has something real to call. */
export async function startServer(
  env: Record<string, string>,
  port: number,
  timeoutMs: number
): Promise<{ stop: () => void }> {
  const child = spawn(MEDUSA_COMMAND, ["start", "--port", String(port)], {
    cwd: MEDUSA_CWD,
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  // Drained, never buffered: a verbose boot must not fill a pipe and stall the process.
  child.stdout.resume();
  child.stderr.resume();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (child.exitCode !== null) {
      throw new Error(`Medusa exited during boot with code ${child.exitCode}.`);
    }
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) {
        return { stop: () => child.kill("SIGKILL") };
      }
    } catch {
      // Not listening yet.
    }
  }
  child.kill("SIGKILL");
  throw new Error(`Medusa did not become healthy within ${timeoutMs}ms.`);
}

export const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
  child() {
    return silentLogger;
  }
};
