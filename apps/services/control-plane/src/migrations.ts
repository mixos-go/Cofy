/**
 * Running Medusa migrations against a tenant schema.
 *
 * Medusa is never forked (AGENTS.md §2.1), so migrations are invoked through its own CLI rather
 * than by replaying SQL we copied out of it. We only decide **which database** the command runs
 * against, by pinning the schema on the connection.
 *
 * The command itself is injected rather than imported, so the argument and environment
 * construction — the part that is easy to get subtly wrong — is testable without spawning a
 * process or having a Medusa install. The real runner is a thin adapter over `node:child_process`.
 */

import { spawn } from "node:child_process";
import { PlatformError } from "@platform/contracts";
import { assertSafeSchemaName } from "@platform/tenant-client";

export interface MigrationRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

/**
 * Executes a command. Injected so tests can observe exactly what would have been run.
 */
export type CommandRunner = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly env: Readonly<Record<string, string>>;
    readonly timeoutMs: number;
  }
) => Promise<MigrationRunResult>;

export interface TenantMigrationRunner {
  /** Applies all pending migrations to one tenant's schema. Must be safe to re-run. */
  run(schemaName: string): Promise<void>;
}

/**
 * Pins a Postgres schema on a connection string via the `options` parameter, which is how the
 * server receives `-c search_path=...`. This is the same mechanism `tenant-client` uses for
 * runtime queries, kept in one place so the two cannot diverge.
 */
export function connectionStringForSchema(connectionString: string, schemaName: string): string {
  assertSafeSchemaName(schemaName);
  const url = new URL(connectionString);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  return url.toString();
}

export interface MedusaCliMigrationRunnerOptions {
  readonly connectionString: string;
  /** Working directory of the tenant's Medusa install. */
  readonly cwd: string;
  readonly runCommand?: CommandRunner;
  /** Defaults to the official CLI entry point. Overridable for a pinned version. */
  readonly medusaCommand?: string;
  readonly timeoutMs?: number;
}

export class MedusaCliMigrationRunner implements TenantMigrationRunner {
  readonly #connectionString: string;
  readonly #cwd: string;
  readonly #runCommand: CommandRunner;
  readonly #medusaCommand: string;
  readonly #timeoutMs: number;

  constructor(options: MedusaCliMigrationRunnerOptions) {
    this.#connectionString = options.connectionString;
    this.#cwd = options.cwd;
    this.#runCommand = options.runCommand ?? spawnCommandRunner;
    this.#medusaCommand = options.medusaCommand ?? "npx medusa";
    this.#timeoutMs = options.timeoutMs ?? 300_000;
  }

  async run(schemaName: string): Promise<void> {
    const databaseUrl = connectionStringForSchema(this.#connectionString, schemaName);
    const [command, ...prefixArgs] = this.#medusaCommand.split(" ");
    if (command === undefined) {
      throw new PlatformError("PROVISIONING_FAILED", "Migration command is empty.", {
        details: { schemaName }
      });
    }

    const result = await this.#runCommand(command, [...prefixArgs, "db:migrate"], {
      cwd: this.#cwd,
      env: {
        // The schema is conveyed two ways. `options=-c search_path=...` in the URL is the plain
        // driver path, but it is overridden: knex emits `set search_path to "<schema>"` after
        // connecting, from `databaseDriverOptions.searchPath` in `medusa-config`, which is itself
        // built from `DATABASE_SCHEMA`. Both are passed so the URL and the config agree; see
        // ADR 0011 for why `DATABASE_SCHEMA` alone is not sufficient.
        DATABASE_URL: databaseUrl,
        DATABASE_SCHEMA: schemaName,
        // Migrations must never prompt: a hanging process looks identical to a slow one.
        MEDUSA_DISABLE_TELEMETRY: "1",
        CI: "true"
      },
      timeoutMs: this.#timeoutMs
    });

    if (result.exitCode !== 0) {
      throw new PlatformError(
        "PROVISIONING_FAILED",
        `Medusa migration failed for schema '${schemaName}' (exit ${result.exitCode}).`,
        {
          details: {
            schemaName,
            // Tail only: a full dump can contain connection strings.
            stderr: result.stderr.slice(-2000)
          }
        }
      );
    }
  }
}

/** Real runner. Kept last so the part CI cannot exercise is small and obvious. */
export const spawnCommandRunner: CommandRunner = (command, args, options) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(
          new PlatformError("PROVISIONING_FAILED", "Migration command exceeded its time limit.", {
            details: { timeoutMs: options.timeoutMs }
          })
        );
        return;
      }
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });

/** Test double: applies migrations immediately and records which schemas were touched. */
export class RecordingMigrationRunner implements TenantMigrationRunner {
  readonly applied: string[] = [];
  #shouldFail: (schemaName: string) => boolean = () => false;

  failWhen(predicate: (schemaName: string) => boolean): void {
    this.#shouldFail = predicate;
  }

  async run(schemaName: string): Promise<void> {
    if (this.#shouldFail(schemaName)) {
      throw new PlatformError("PROVISIONING_FAILED", `Migration failed for '${schemaName}'.`);
    }
    this.applied.push(schemaName);
  }
}
