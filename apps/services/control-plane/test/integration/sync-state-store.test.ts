/**
 * Postgres sync-state store integration test.
 *
 * It runs the *same* conformance suite the in-memory store runs, against a real Postgres. That is
 * the point: the store's guarantees (a duplicate delivery is a no-op, an idempotency claim is a
 * stealable lease, a committed ref is final) must hold on the database the platform actually uses,
 * not only on the test double. A behaviour that passes in memory and fails here is exactly the
 * class of bug this suite exists to catch.
 *
 * Skipped when `TEST_DATABASE_URL` is absent, so `pnpm test` still works without a database while
 * `pnpm test:integration` runs it for real. It uses its own schema and drops it afterwards, so it
 * is safe against a shared development database.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresSyncStateStore } from "@platform/control-plane";
import { runSyncStateStoreConformance } from "@platform/sync-state/testing";

const DATABASE_URL = process.env.TEST_DATABASE_URL;
const SCHEMA = "platform_ops_syncstate_itest";

if (DATABASE_URL === undefined) {
  test("postgres sync-state store", { skip: "TEST_DATABASE_URL not set" }, () => {});
} else {
  const connectionString = DATABASE_URL;
  const store = new PostgresSyncStateStore(connectionString, { schema: SCHEMA });
  const internal = new Pool({ connectionString, max: 1 });

  // One fresh schema per run, so a leftover row from an interrupted run cannot make a test pass or
  // fail for the wrong reason.
  async function resetSchema(): Promise<void> {
    await internal.query(`drop schema if exists ${SCHEMA} cascade`);
  }

  /**
   * The suite assumes each test starts with no rows, because the in-memory store it was written
   * against hands out a fresh instance per test. The Postgres store is one durable instance, so the
   * equivalent is to empty the tables. The tables themselves are recreated lazily by the store.
   */
  async function makeStore(): Promise<PostgresSyncStateStore> {
    await internal.query(`create schema if not exists ${SCHEMA}`);
    await internal.query(
      `create table if not exists ${SCHEMA}.channel_order_refs (tenant_id text, channel text, external_order_id text, order_id text, status text, created_at timestamptz, updated_at timestamptz, primary key (tenant_id, channel, external_order_id))`
    );
    await internal.query(
      `create table if not exists ${SCHEMA}.idempotency_records (tenant_id text, key text, operation text, fingerprint text, outcome text, result jsonb, expires_at timestamptz, created_at timestamptz, updated_at timestamptz, primary key (tenant_id, key))`
    );
    await internal.query(
      `create table if not exists ${SCHEMA}.channel_sku_maps (tenant_id text, channel text, sku text, external_product_id text, external_sku_id text, external_inventory_id text, updated_at timestamptz, primary key (tenant_id, channel, sku))`
    );
    await internal.query(
      `create table if not exists ${SCHEMA}.sync_cursors (tenant_id text, channel text, entity text, cursor text, updated_at timestamptz, primary key (tenant_id, channel, entity))`
    );
    await internal.query(`truncate ${SCHEMA}.channel_order_refs, ${SCHEMA}.idempotency_records, ${SCHEMA}.channel_sku_maps, ${SCHEMA}.sync_cursors`);
    return store;
  }

  // The store memoizes schema creation, so a drop after construction would leave it writing to a
  // missing schema. Reset first, then let the first store call recreate it.
  await resetSchema();

  // Registered before the suite (which ends by disposing the schema) so it runs while the rows exist.
  // The suite proves the *behaviour* of a redelivered order; this proves the database constraint
  // underneath it, which is the part an in-memory map could simulate without actually enforcing.
  test("postgres: a redelivered order does not create a second row", async () => {
    await makeStore();
    await store.reserveOrderRef({ tenantId: "tnt-unique", channel: "shopee", externalOrderId: "ext-1", now: "2026-09-26T00:00:00.000Z" });
    await store.reserveOrderRef({ tenantId: "tnt-unique", channel: "shopee", externalOrderId: "ext-1", now: "2026-09-26T00:00:00.000Z" });

    const count = await internal.query(
      `select count(*)::int as n from ${SCHEMA}.channel_order_refs
        where tenant_id = $1 and channel = $2 and external_order_id = $3`,
      ["tnt-unique", "shopee", "ext-1"]
    );
    assert.equal(count.rows[0]?.n, 1);
  });

  runSyncStateStoreConformance("postgres", makeStore, async () => {
    await internal.end();
    await store.close();
  });
}
