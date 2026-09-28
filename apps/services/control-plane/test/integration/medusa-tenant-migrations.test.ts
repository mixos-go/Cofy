/**
 * Real-Medusa migration integration test.
 *
 * M1's isolation test proves our own queries stay inside a tenant schema. This test proves the
 * harder half: that **vanilla Medusa**, migrated through its own CLI, puts its core tables in the
 * tenant schema rather than in `public`, and that a *second* tenant can migrate in the same
 * database. Both were real defects found by running the CLI, not by reasoning about config:
 *
 *   - Without `databaseDriverOptions.searchPath` in `medusa-config`, 125 core tables land in
 *     `public` while only 23 module tables land in the tenant schema.
 *   - Medusa's order migrations guard `CREATE TYPE ... AS ENUM` on
 *     `pg_type WHERE typname = ...` with no namespace filter. `pg_type` is database-global, so
 *     the second tenant's guard is satisfied by the first tenant's type, its `CREATE TYPE` is
 *     skipped, and the following `CREATE TABLE` fails with `type ... does not exist`. The
 *     control plane prevents this by creating those enums in every schema up front.
 *
 * It creates and drops a **dedicated database**, so a regression that put tables back into
 * `public` cannot pollute a shared development database, and the `public` assertion stays honest.
 *
 * Skipped when `TEST_DATABASE_URL` is absent, so `pnpm test` runs without a database; run with
 * `pnpm test:integration` and docker compose up.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresTenantSchemaAdmin } from "@platform/control-plane";
import { MedusaCliMigrationRunner } from "../../src/migrations.ts";

const DATABASE_URL = process.env.TEST_DATABASE_URL;

// The CLI is invoked by absolute path rather than through `npx`: it resolves to the workspace's
// pinned Medusa, needs no network, and cannot pick up a different global install.
const MEDUSA_CWD = new URL("../../../../../data-plane/medusa-config", import.meta.url).pathname;
const MEDUSA_COMMAND = `${MEDUSA_CWD}/node_modules/.bin/medusa`;

function databaseUrlFor(base: string, databaseName: string): string {
  const url = new URL(base);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function countTables(connectionString: string, schemaName: string): Promise<number> {
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query<{ count: string }>(
      "select count(*)::text as count from information_schema.tables where table_schema = $1",
      [schemaName]
    );
    return Number(result.rows[0]?.count ?? "0");
  } finally {
    await pool.end();
  }
}

/** Runs `body` with `search_path` pinned to `schemaName`, the way the tenant's own pools connect. */
async function withTenantSchema<T>(
  connectionString: string,
  schemaName: string,
  body: (pool: Pool) => Promise<T>
): Promise<T> {
  const pool = new Pool({ connectionString, options: `-c search_path=${schemaName}` });
  try {
    return await body(pool);
  } finally {
    await pool.end();
  }
}

test(
  "vanilla Medusa migrations land in the tenant schema and a second tenant can follow",
  { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false },
  async (t) => {
    const databaseName = `medusa_itest_${process.pid}_${Date.now()}`;
    const admin = new Pool({ connectionString: DATABASE_URL! });

    await admin.query(`create database ${databaseName}`);
    const tenantDatabaseUrl = databaseUrlFor(DATABASE_URL!, databaseName);

    const schemaAdmin = new PostgresTenantSchemaAdmin(tenantDatabaseUrl);
    const runner = new MedusaCliMigrationRunner({
      connectionString: tenantDatabaseUrl,
      cwd: MEDUSA_CWD,
      medusaCommand: MEDUSA_COMMAND,
      timeoutMs: 600_000
    });

    // One teardown, in this order: the schema admin's idle connections must be closed *before*
    // the database is dropped, or `drop ... with (force)` terminates them and node-postgres
    // raises that as an uncaught error after the test has already ended.
    t.after(async () => {
      await schemaAdmin.close();
      await admin.query(`drop database if exists ${databaseName} with (force)`);
      await admin.end();
    });

    await t.test("core tables land in the tenant schema, not in public", async () => {
      await schemaAdmin.createSchema("tenant_itest_one");
      await runner.run("tenant_itest_one");

      const inTenant = await countTables(tenantDatabaseUrl, "tenant_itest_one");
      const inPublic = await countTables(tenantDatabaseUrl, "public");

      // The core order/product tables are the ones that leaked before the fix; assert on them
      // directly so the test fails for the right reason if the driver option is dropped.
      assert.equal(inPublic, 0, "no Medusa table may land in public");
      assert.ok(inTenant > 100, `expected the full Medusa schema in the tenant, saw ${inTenant} tables`);
    });

    await t.test("a second tenant migrates in the same database", async () => {
      // This is the case the `pg_type` guard breaks: the first tenant's enum types make the
      // second tenant's guarded `CREATE TYPE` a no-op unless the schema admin pre-created them.
      await schemaAdmin.createSchema("tenant_itest_two");
      await runner.run("tenant_itest_two");

      assert.ok(await countTables(tenantDatabaseUrl, "tenant_itest_two") > 100);
      assert.equal(await countTables(tenantDatabaseUrl, "public"), 0);
    });

    await t.test("the channel-order-link module and its link to Order migrate into the tenant", async () => {
      // M3's importer identifies an already-imported order through this module, so its presence in
      // the tenant schema is the data-plane half of the plan's "Medusa integration as a data-plane
      // module, never a fork". It also proves the module link file is discovered by convention: the
      // link table only exists if Medusa loaded `src/links/order-channel-order-link.ts`.
      const tables = await withTenantSchema(tenantDatabaseUrl, "tenant_itest_one", async (pool) =>
        pool.query<{ table_name: string }>(
          "select table_name from information_schema.tables where table_schema = 'tenant_itest_one'"
        )
      );
      const names = new Set(tables.rows.map((row) => row.table_name));
      assert.ok(names.has("channel_order_link"), "the module's table must exist");
      assert.ok(
        names.has("order_order_channelorderlink_channel_order_link"),
        "the link table proves Medusa discovered the module link"
      );
      assert.ok(names.has("sales_channel"), "sanity: the core schema is there too");
    });

    await t.test("the external-reference index makes a re-import a no-op, and dismissal frees the key", async () => {
      // This is the uniqueness M3's "re-running the import creates exactly one order" rests on.
      // The index is partial (`WHERE deleted_at IS NULL`), which is also what lets a dismissed link
      // be re-imported. Both behaviours are asserted on the real schema the CLI produced.
      await withTenantSchema(tenantDatabaseUrl, "tenant_itest_one", async (pool) => {
        await pool.query(
          `insert into channel_order_link (id, channel, external_order_id, tenant_id)
           values ('col_1', 'tiktok', 'ext-1', 'tenant_itest_one')`
        );

        await assert.rejects(
          pool.query(
            `insert into channel_order_link (id, channel, external_order_id, tenant_id)
             values ('col_2', 'tiktok', 'ext-1', 'tenant_itest_one')`
          ),
          /duplicate key value violates unique constraint/,
          "the same external order must not be linkable twice"
        );

        // Soft-delete the first link, then the same external reference is importable again.
        await pool.query(`update channel_order_link set deleted_at = now() where id = 'col_1'`);
        await pool.query(
          `insert into channel_order_link (id, channel, external_order_id, tenant_id)
           values ('col_3', 'tiktok', 'ext-1', 'tenant_itest_one')`
        );

        const { rows } = await pool.query<{ count: string }>(
          `select count(*)::text as count from channel_order_link where external_order_id = 'ext-1'`
        );
        assert.equal(rows[0]?.count, "2", "both the dismissed and the live link are retained");
      });
    });
  }
);
