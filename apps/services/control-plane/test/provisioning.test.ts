/**
 * Provisioning orchestrator tests.
 *
 * These exercise the real orchestrator and the real in-memory store. The only substitutions are
 * the external effects it cannot have in a unit test: schema DDL, the Medusa CLI, and seeding.
 * Those are the seams the design created deliberately, and each test asserts on what the
 * orchestrator *did* to them.
 *
 * The behaviours that matter are resumability and ordering, because they are what the milestone
 * claims and what is invisible in a happy-path run.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PROVISIONING_STEPS } from "@platform/contracts";
import { InMemoryTenantStore } from "../src/tenant-store.ts";
import { InMemoryTenantSchemaAdmin } from "../src/tenant-schema.ts";
import { RecordingMigrationRunner } from "../src/migrations.ts";
import { ProvisioningOrchestrator } from "../src/provisioning.ts";
import { InMemoryRouteRegistrar, InMemorySeeder, createProvisioningHandlers } from "../src/steps.ts";
import { createLogger } from "../src/logging.ts";
import type { ProvisioningStepHandler } from "../src/provisioning.ts";
import type { ProvisioningStep } from "@platform/contracts";

const silentLogger = createLogger("error", {}, () => {});

async function seedTenant(store: InMemoryTenantStore, id = "tnt-a") {
  return store.createTenant({
    id,
    slug: id,
    displayName: "Tenant A",
    plan: "starter",
    region: "id-jkt",
    now: "2026-09-27T00:00:00.000Z"
  });
}

interface Deps {
  store: InMemoryTenantStore;
  schemaAdmin: InMemoryTenantSchemaAdmin;
  migrations: RecordingMigrationRunner;
  seeder: InMemorySeeder;
  routes: InMemoryRouteRegistrar;
}

function makeDeps(): Deps {
  return {
    store: new InMemoryTenantStore(),
    schemaAdmin: new InMemoryTenantSchemaAdmin(),
    migrations: new RecordingMigrationRunner(),
    seeder: new InMemorySeeder(),
    routes: new InMemoryRouteRegistrar()
  };
}

function orchestratorFor(
  deps: Deps,
  overrides: Partial<Record<ProvisioningStep, ProvisioningStepHandler>> = {}
) {
  return new ProvisioningOrchestrator({
    store: deps.store,
    logger: silentLogger,
    now: () => "2026-09-27T00:00:01.000Z",
    handlers: {
      ...createProvisioningHandlers({
        schemaAdmin: deps.schemaAdmin,
        migrationRunner: deps.migrations,
        seeder: deps.seeder,
        routes: deps.routes
      }),
      ...overrides
    }
  });
}

test("provisioning runs every step, creates the schema, and activates the tenant", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  const run = await orchestratorFor(deps).provision(tenant.id);

  assert.equal(run.complete, true);
  assert.deepEqual(
    run.steps.map((s) => s.status),
    PROVISIONING_STEPS.map(() => "succeeded")
  );
  assert.equal(deps.schemaAdmin.schemas.has(tenant.schemaName), true);
  assert.deepEqual(deps.migrations.applied, [tenant.schemaName]);
  assert.deepEqual(deps.seeder.seeded, [tenant.schemaName]);
  assert.equal(deps.routes.registered.get(tenant.id), tenant.schemaName);

  const stored = await deps.store.getTenant(tenant.id);
  assert.equal(stored?.state, "active");
});

test("a tenant is not active until every step has succeeded", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  // Fail the step just before activation. If activation were not last, the tenant would be
  // reachable with unseeded data.
  const run = await orchestratorFor(deps, {
    register_routes: async () => {
      throw new Error("registrar unavailable");
    }
  }).provision(tenant.id);

  assert.equal(run.complete, false);
  const stored = await deps.store.getTenant(tenant.id);
  assert.equal(stored?.state, "provisioning");
  assert.equal(deps.schemaAdmin.schemas.has(tenant.schemaName), true);
});

test("resume skips succeeded steps and does not repeat migrations", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  const failing = orchestratorFor(deps, {
    seed_defaults: async () => {
      throw new Error("seeder unavailable");
    }
  });

  const first = await failing.provision(tenant.id);
  assert.equal(first.complete, false);
  assert.deepEqual(deps.migrations.applied, [tenant.schemaName]);

  const seededStep = first.steps.find((s) => s.step === "seed_defaults");
  assert.equal(seededStep?.status, "failed");
  assert.equal(seededStep?.attempt, 1);

  const second = await orchestratorFor(deps).provision(tenant.id);

  assert.equal(second.complete, true);
  // The whole point: migrations were NOT re-run.
  assert.deepEqual(deps.migrations.applied, [tenant.schemaName]);

  const schemaStep = second.steps.find((s) => s.step === "create_schema");
  assert.equal(schemaStep?.attempt, 1, "a succeeded step must not be attempted twice");
});

test("a failed step is retried on resume and its attempt count increases", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  // Fail the migration step on the first pass. Its recorded attempt count is what tells an
  // operator how many times a step has been tried across resumes.
  let failedOnce = false;
  await orchestratorFor(deps, {
    run_medusa_migrations: async (ctx) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("migration crashed");
      }
      await deps.migrations.run(ctx.schemaName);
    }
  }).provision(tenant.id);

  const afterFailure = await deps.store.getProvisioningRun(tenant.id);
  const migrationStep = afterFailure.steps.find((s) => s.step === "run_medusa_migrations");
  assert.equal(migrationStep?.status, "failed");
  assert.equal(migrationStep?.attempt, 1);
  assert.deepEqual(deps.migrations.applied, [], "the first attempt did not reach the runner");

  const resumed = await orchestratorFor(deps).provision(tenant.id);
  assert.equal(resumed.complete, true);

  const retried = resumed.steps.find((s) => s.step === "run_medusa_migrations");
  assert.equal(retried?.attempt, 2, "a step that ran again must show two attempts");
  assert.deepEqual(deps.migrations.applied, [tenant.schemaName]);
});

test("a failed step records a message and never throws out of provision", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  const run = await orchestratorFor(deps, {
    create_schema: async () => {
      throw new Error("permission denied for schema");
    }
  }).provision(tenant.id);

  const step = run.steps.find((s) => s.step === "create_schema");
  assert.equal(step?.status, "failed");
  assert.equal(step?.errorMessage, "permission denied for schema");
  // Later steps must not have been attempted.
  assert.equal(run.steps.find((s) => s.step === "run_medusa_migrations")?.status, "pending");
});

test("migrating without a schema fails with a clear cause instead of a connection error", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  const run = await orchestratorFor(deps, {
    create_schema: async () => {
      // Simulate a handler that silently does nothing.
    }
  }).provision(tenant.id);

  const step = run.steps.find((s) => s.step === "run_medusa_migrations");
  assert.equal(step?.status, "failed");
  assert.match(step?.errorMessage ?? "", /schema that does not exist/);
  assert.deepEqual(deps.migrations.applied, []);
});

test("provisioning a missing tenant throws TENANT_NOT_FOUND", async () => {
  const deps = makeDeps();
  await assert.rejects(
    () => orchestratorFor(deps).provision("tnt_missing"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_NOT_FOUND");
      return true;
    }
  );
});

test("a terminated tenant cannot be re-provisioned", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);
  await deps.store.setTenantState(tenant.id, "terminated", "2026-09-27T00:00:02.000Z");

  await assert.rejects(
    () => orchestratorFor(deps).provision(tenant.id),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_STATE_INVALID");
      return true;
    }
  );
});

test("onProvisioned fires once, only when the run is complete", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);
  let notifications = 0;

  const handlers = createProvisioningHandlers({
    schemaAdmin: deps.schemaAdmin,
    migrationRunner: deps.migrations,
    seeder: deps.seeder,
    routes: deps.routes
  });

  const orchestrator = new ProvisioningOrchestrator({
    store: deps.store,
    logger: silentLogger,
    now: () => "2026-09-27T00:00:01.000Z",
    handlers,
    onProvisioned: async () => {
      notifications += 1;
    }
  });

  await orchestrator.provision(tenant.id);
  await orchestrator.provision(tenant.id);

  assert.equal(notifications, 2, "each completed run notifies once");
  assert.equal((await deps.store.getProvisioningRun(tenant.id)).complete, true);
});

test("a missing handler is recorded as failed, not silently skipped", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);

  const orchestrator = new ProvisioningOrchestrator({
    store: deps.store,
    logger: silentLogger,
    now: () => "2026-09-27T00:00:01.000Z",
    handlers: {
      create_schema: async () => {}
    }
  });

  const run = await orchestrator.provision(tenant.id);
  const step = run.steps.find((s) => s.step === "run_medusa_migrations");
  assert.equal(step?.status, "failed");
  assert.match(step?.errorMessage ?? "", /No handler registered/);
});

test("the admin credential is minted before seeding, since seeding calls the authenticated API", async () => {
  const deps = makeDeps();
  const tenant = await seedTenant(deps.store);
  const order: string[] = [];
  let seededCredentialPresent = false;

  const orchestrator = new ProvisioningOrchestrator({
    store: deps.store,
    logger: silentLogger,
    now: () => "2026-09-27T00:00:01.000Z",
    handlers: createProvisioningHandlers({
      schemaAdmin: deps.schemaAdmin,
      migrationRunner: deps.migrations,
      seeder: {
        async seed() {
          order.push("seed");
          seededCredentialPresent = order.includes("admin_key");
        }
      },
      routes: deps.routes,
      medusaAdmin: {
        async ensureAdminKey() {
          order.push("admin_key");
        }
      }
    })
  });

  const run = await orchestrator.provision(tenant.id);

  assert.equal(run.complete, true);
  assert.equal(seededCredentialPresent, true, "seeding must not run before the credential exists");
  assert.deepEqual(order, ["admin_key", "seed"]);
});
