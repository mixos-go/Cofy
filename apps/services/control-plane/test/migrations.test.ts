/**
 * Migration runner tests.
 *
 * The control plane tells Medusa *which schema* to migrate by configuring the child process. The
 * easy-to-get-wrong part is how that schema is conveyed, so it is asserted here rather than
 * discovered by diffing a database after a real migration.
 *
 * Background: pinning the schema only as `options=-c search_path=...` inside `DATABASE_URL` is not
 * enough. Knex emits `set search_path to "<schema>"` *after* connecting, from the driver-level
 * `searchPath` that `medusa-config` builds from `DATABASE_SCHEMA`, and that overrides the
 * connection-level `options`. `DATABASE_SCHEMA` is therefore passed as well, and both must agree;
 * see ADR 0011.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { MedusaCliMigrationRunner, connectionStringForSchema } from "../src/migrations.ts";
import type { MigrationRunResult } from "../src/migrations.ts";

function capturingRunner() {
  const calls: Array<{ command: string; args: readonly string[]; env: Readonly<Record<string, string>> }> = [];
  const runCommand = async (
    command: string,
    args: readonly string[],
    options: { readonly env: Readonly<Record<string, string>> }
  ): Promise<MigrationRunResult> => {
    calls.push({ command, args, env: options.env });
    return { exitCode: 0, stdout: "", stderr: "" };
  };
  return { calls, runCommand };
}

test("the migration process is told the tenant schema the way Medusa reads it", async () => {
  const { calls, runCommand } = capturingRunner();
  const runner = new MedusaCliMigrationRunner({
    connectionString: "postgres://platform:secret@db.internal:5432/medusa",
    cwd: "/srv/medusa",
    runCommand
  });

  await runner.run("tenant_alpha");

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.env.DATABASE_SCHEMA, "tenant_alpha");
});

test("the schema is also pinned inside DATABASE_URL for the plain driver path", async () => {
  const url = connectionStringForSchema("postgres://platform:secret@db.internal:5432/medusa", "tenant_alpha");
  assert.equal(new URL(url).searchParams.get("options"), "-c search_path=tenant_alpha");
});

test("an unsafe schema name is refused before any process is spawned", async () => {
  const { calls, runCommand } = capturingRunner();
  const runner = new MedusaCliMigrationRunner({
    connectionString: "postgres://platform:secret@db.internal:5432/medusa",
    cwd: "/srv/medusa",
    runCommand
  });

  await assert.rejects(() => runner.run("tenant_alpha; drop schema public cascade"), /unsafe schema name/i);
  assert.equal(calls.length, 0, "an unsafe name must not reach the database");
});
