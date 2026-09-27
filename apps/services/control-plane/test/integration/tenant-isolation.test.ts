/**
 * Tenant isolation integration test.
 *
 * This is the test that actually proves M1's central claim: that one tenant cannot read another
 * tenant's rows. The unit tests assert on configuration; only a real Postgres can confirm that
 * pinning `search_path` at connection level does what we think it does.
 *
 * It is skipped when `TEST_DATABASE_URL` is absent rather than failing, so `pnpm test` still works
 * on a laptop with no database while CI and `pnpm test:integration` run it for real.
 *
 * The test creates and drops its own schemas. It never touches `public`, so it is safe against a
 * shared development database.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { TenantClient } from "@platform/tenant-client";
import type { TenantRoute } from "@platform/tenant-client";
import { PostgresTenantSchemaAdmin } from "@platform/control-plane";
import type { TenantId } from "@platform/contracts";

const DATABASE_URL = process.env.TEST_DATABASE_URL;

const ALPHA: TenantId = "tnt-itest-alpha";
const BETA: TenantId = "tnt-itest-beta";
const ALPHA_SCHEMA = "tenant_itest_alpha";
const BETA_SCHEMA = "tenant_itest_beta";

function directoryFor(routes: readonly TenantRoute[]) {
  return {
    async resolve(tenantId: TenantId) {
      return routes.find((route) => route.tenantId === tenantId) ?? null;
    }
  };
}

test("tenant isolation", { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false }, async (t) => {
  const admin = new PostgresTenantSchemaAdmin(DATABASE_URL!);
  const client = new TenantClient({
    connectionString: DATABASE_URL!,
    directory: directoryFor([
      { tenantId: ALPHA, schemaName: ALPHA_SCHEMA, state: "active" },
      { tenantId: BETA, schemaName: BETA_SCHEMA, state: "active" }
    ]),
    maxConnectionsPerTenant: 2
  });

  // Fresh schemas for every run, so a previous failure cannot make this pass.
  await admin.dropSchema(ALPHA_SCHEMA);
  await admin.dropSchema(BETA_SCHEMA);
  await admin.createSchema(ALPHA_SCHEMA);
  await admin.createSchema(BETA_SCHEMA);

  t.after(async () => {
    await client.closeAll();
    await admin.dropSchema(ALPHA_SCHEMA);
    await admin.dropSchema(BETA_SCHEMA);
    await admin.close();
  });

  await t.test("the same unqualified table name resolves per tenant", async () => {
    const alpha = await client.connect(ALPHA);
    const beta = await client.connect(BETA);

    await alpha.query("create table orders (id text primary key, total integer not null)");
    await beta.query("create table orders (id text primary key, total integer not null)");

    await alpha.query("insert into orders (id, total) values ($1, $2)", ["a-1", 100]);
    await beta.query("insert into orders (id, total) values ($1, $2)", ["b-1", 200]);

    const alphaRows = await alpha.query<{ id: string; total: number }>("select id, total from orders");
    const betaRows = await beta.query<{ id: string; total: number }>("select id, total from orders");

    assert.deepEqual(alphaRows, [{ id: "a-1", total: 100 }]);
    assert.deepEqual(betaRows, [{ id: "b-1", total: 200 }]);
  });

  await t.test("a tenant cannot see the rows of another tenant through an unqualified query", async () => {
    const alpha = await client.connect(ALPHA);
    const rows = await alpha.query<{ count: string }>("select count(*)::text as count from orders");
    assert.equal(rows[0]?.count, "1", "alpha must see only its own row");
  });

  await t.test("search_path is pinned at the connection, not only for the first query", async () => {
    const alpha = await client.connect(ALPHA);
    // A pool reuses connections. If search_path were set per query or not at all, a later query
    // could land in the wrong schema; here the same handle must stay pinned.
    const first = await alpha.query<{ current: string }>("select current_schema() as current");
    const second = await alpha.query<{ current: string }>("select current_schema() as current");
    assert.equal(first[0]?.current, ALPHA_SCHEMA);
    assert.equal(second[0]?.current, ALPHA_SCHEMA);
  });

  await t.test("two concurrent tenants do not leak into each other's pool", async () => {
    const [alpha, beta] = await Promise.all([client.connect(ALPHA), client.connect(BETA)]);
    const [alphaRows, betaRows] = await Promise.all([
      alpha.query<{ id: string }>("select id from orders"),
      beta.query<{ id: string }>("select id from orders")
    ]);
    assert.deepEqual(alphaRows.map((r) => r.id), ["a-1"]);
    assert.deepEqual(betaRows.map((r) => r.id), ["b-1"]);
    assert.equal(client.poolCount, 2);
  });

  await t.test("creating a schema twice is a no-op, which is what resume relies on", async () => {
    await admin.createSchema(ALPHA_SCHEMA);
    assert.equal(await admin.schemaExists(ALPHA_SCHEMA), true);
    const alpha = await client.connect(ALPHA);
    const rows = await alpha.query<{ count: string }>(
      "select count(*)::text as count from information_schema.tables where table_schema = current_schema()"
    );
    assert.equal(rows[0]?.count, "1", "the second create must not have wiped the table");
  });

  await t.test("deletion is scheduled without dropping the tenant's data", async () => {
    await admin.scheduleDeletion(ALPHA, ALPHA_SCHEMA, new Date().toISOString());

    const scheduled = await admin.listScheduledDeletions();
    assert.equal(scheduled.some((entry) => entry.tenantId === ALPHA), true);
    assert.equal(await admin.schemaExists(ALPHA_SCHEMA), true, "data must survive until the purge runs");

    // Idempotent: terminating twice must not schedule two purges.
    await admin.scheduleDeletion(ALPHA, ALPHA_SCHEMA, new Date().toISOString());
    const again = await admin.listScheduledDeletions();
    assert.equal(again.filter((entry) => entry.tenantId === ALPHA).length, 1);
  });

  await t.test("the platform_ops schema is separate from tenant schemas", async () => {
    const pool = new Pool({ connectionString: DATABASE_URL });
    const rows = await pool.query<{ table_schema: string }>(
      "select table_schema from information_schema.tables where table_name = 'tenant_deletions'"
    );
    await pool.end();
    assert.deepEqual(rows.rows.map((r) => r.table_schema), ["platform_ops"]);
  });
});
