/**
 * Postgres rate-shopping rules store integration test.
 *
 * The in-memory and Postgres stores are two implementations of one interface, and the rule is that
 * they must not drift in behaviour. The assertions here are the ones the in-memory path is also
 * expected to satisfy — a saved document round-trips, a tenant that never saved gets the default,
 * and a delete leaves nothing — run against the database the platform actually uses.
 *
 * Skipped when `TEST_DATABASE_URL` is absent, so `pnpm test` still works without a database while
 * `pnpm test:integration` runs it for real. It uses its own schema and drops it afterwards, so it is
 * safe against a shared development database.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresRateShoppingRulesStore } from "@platform/control-plane";
import type { RateShoppingRules } from "@platform/contracts";

const DATABASE_URL = process.env.TEST_DATABASE_URL;
const SCHEMA = "platform_ops_rules_itest";

if (DATABASE_URL === undefined) {
  test("postgres rate-shopping rules store", { skip: "TEST_DATABASE_URL not set" }, () => {});
} else {
  const connectionString = DATABASE_URL;
  const store = new PostgresRateShoppingRulesStore(connectionString, { schema: SCHEMA });
  const internal = new Pool({ connectionString, max: 1 });

  const rules: RateShoppingRules = {
    allowedCouriers: ["jne", "sicepat"],
    allowedServiceLevels: ["regular"],
    maxPrice: { amount: 25_000, currency: "IDR" },
    maxEstimatedDays: 4,
    requiresInsurance: false,
    requiresCod: true,
    strategy: "preferred",
    preferredCouriers: ["sicepat", "jne"]
  };

  test("postgres: rules round-trip, default when unset, and delete clears", async (t) => {
    await internal.query(`drop schema if exists ${SCHEMA} cascade`);
    t.after(async () => {
      await store.close();
      await internal.end();
    });

    // A tenant that never saved rules gets the default, with the epoch `updatedAt` that marks
    // "never written" without a separate nullable column.
    const unset = await store.get("tnt-rules");
    assert.equal(unset.rules.strategy, "cheapest");
    assert.deepEqual(unset.rules.allowedCouriers, []);
    assert.equal(unset.updatedAt, new Date(0).toISOString());

    const saved = await store.set({ tenantId: "tnt-rules", rules, now: "2026-09-26T10:00:00.000Z" });
    assert.equal(saved.updatedAt, "2026-09-26T10:00:00.000Z");

    const read = await store.get("tnt-rules");
    assert.deepEqual(read.rules, rules);
    assert.equal(read.updatedAt, "2026-09-26T10:00:00.000Z");

    // One set of rules per tenant: a second write replaces rather than appending.
    await store.set({
      tenantId: "tnt-rules",
      rules: { ...rules, strategy: "fastest" },
      now: "2026-09-26T11:00:00.000Z"
    });
    const replaced = await store.get("tnt-rules");
    assert.equal(replaced.rules.strategy, "fastest");

    const rows = await internal.query<{ n: number }>(
      `select count(*)::int as n from ${SCHEMA}.tenant_rate_shopping_rules where tenant_id = $1`,
      ["tnt-rules"]
    );
    assert.equal(rows.rows[0]?.n, 1);

    await store.delete("tnt-rules");
    const cleared = await store.get("tnt-rules");
    assert.equal(cleared.updatedAt, new Date(0).toISOString());
  });
}
