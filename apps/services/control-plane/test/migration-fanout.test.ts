/**
 * Migration fan-out tests.
 *
 * The behaviour worth testing is failure containment: one tenant's migration failing must not stop
 * the others, and the failures must come back as a retryable list.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTenantStore } from "../src/tenant-store.ts";
import { RecordingMigrationRunner } from "../src/migrations.ts";
import { MigrationFanOut } from "../src/migration-fanout.ts";
import { createLogger } from "../src/logging.ts";
import type { TenantLifecycleState, TenantPlan } from "@platform/contracts";

const silentLogger = createLogger("error", {}, () => {});
const NOW = "2026-09-27T00:00:00.000Z";

async function tenant(
  store: InMemoryTenantStore,
  id: string,
  state: TenantLifecycleState,
  plan: TenantPlan = "starter"
) {
  const record = await store.createTenant({
    id,
    slug: id,
    displayName: id,
    plan,
    region: "id-jkt",
    now: NOW
  });
  if (state !== "provisioning") {
    await store.setTenantState(record.id, state, NOW);
  }
  return record;
}

test("every active tenant is migrated", async () => {
  const store = new InMemoryTenantStore();
  const a = await tenant(store, "tnt-a", "active");
  const b = await tenant(store, "tnt-b", "active");

  const runner = new RecordingMigrationRunner();
  const report = await new MigrationFanOut({ store, runner, logger: silentLogger }).runAll();

  assert.equal(report.succeeded.length, 2);
  assert.equal(report.failed.length, 0);
  assert.deepEqual(runner.applied, [a.schemaName, b.schemaName]);
});

test("suspended tenants are migrated: they still own data", async () => {
  const store = new InMemoryTenantStore();
  await tenant(store, "tnt-a", "suspended");

  const runner = new RecordingMigrationRunner();
  const report = await new MigrationFanOut({ store, runner, logger: silentLogger }).runAll();

  assert.equal(report.succeeded.length, 1);
});

test("provisioning and terminated tenants are skipped with a reason", async () => {
  const store = new InMemoryTenantStore();
  await tenant(store, "tnt-prov", "provisioning");
  await tenant(store, "tnt-term", "terminated");

  const runner = new RecordingMigrationRunner();
  const report = await new MigrationFanOut({ store, runner, logger: silentLogger }).runAll();

  assert.equal(report.succeeded.length, 0);
  assert.equal(report.skipped.length, 2);
  assert.equal(report.skipped.every((entry) => entry.status === "skipped"), true);
  assert.equal(runner.applied.length, 0, "a skipped tenant must not be touched");
});

test("one failing tenant does not stop the others", async () => {
  const store = new InMemoryTenantStore();
  await tenant(store, "tnt-a", "active");
  await tenant(store, "tnt-b", "active");
  await tenant(store, "tnt-c", "active");

  const runner = new RecordingMigrationRunner();
  runner.failWhen((schemaName) => schemaName.includes("tnt_b"));

  const report = await new MigrationFanOut({ store, runner, logger: silentLogger }).runAll();

  assert.equal(report.succeeded.length, 2);
  assert.equal(report.failed.length, 1);
  assert.equal(report.failed[0]?.tenantId, "tnt-b");
  assert.match(report.failed[0]?.errorMessage ?? "", /Migration failed/);
  // tnt-c ran even though tnt-b failed, which is the whole point of the fan-out.
  assert.equal(runner.applied.some((schema) => schema.includes("tnt_a")), true);
  assert.equal(runner.applied.some((schema) => schema.includes("tnt_c")), true);
});

test("retry re-runs only the tenants named", async () => {
  const store = new InMemoryTenantStore();
  await tenant(store, "tnt-a", "active");
  await tenant(store, "tnt-b", "active");

  const runner = new RecordingMigrationRunner();
  const fanOut = new MigrationFanOut({ store, runner, logger: silentLogger });

  await fanOut.runAll();
  assert.equal(runner.applied.length, 2);

  runner.failWhen(() => false);
  const retried = await fanOut.retry(["tnt-b"]);

  assert.equal(retried.succeeded.length, 1);
  assert.equal(runner.applied.length, 3, "only tnt-b ran again");
});

test("the report counts agree with the lists", async () => {
  const store = new InMemoryTenantStore();
  await tenant(store, "tnt-a", "active");
  await tenant(store, "tnt-b", "provisioning");
  await tenant(store, "tnt-c", "active");

  const runner = new RecordingMigrationRunner();
  runner.failWhen((schemaName) => schemaName.includes("tnt_c"));

  const report = await new MigrationFanOut({ store, runner, logger: silentLogger }).runAll();

  assert.equal(report.succeeded.length, 1);
  assert.equal(report.skipped.length, 1);
  assert.equal(report.failed.length, 1);
});
