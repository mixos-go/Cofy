/**
 * Tenant registry, state machine, and termination tests.
 *
 * Termination is the most safety-critical operation here, so the tests are about *order* and about
 * what is left behind when part of it fails — not just about the happy path.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySecretStore } from "@platform/secrets";
import { InMemoryTenantStore, deriveSchemaName } from "../src/tenant-store.ts";
import { InMemoryTenantSchemaAdmin } from "../src/tenant-schema.ts";
import { TenantRegistry, createTenantDirectory } from "../src/tenants.ts";
import { TenantTerminationService } from "../src/termination.ts";
import { assertTenantTransition, canTransitionTenant, isServableState } from "../src/state.ts";
import { InMemoryAccountStore } from "../src/identity.ts";
import { createLogger } from "../src/logging.ts";

const silentLogger = createLogger("error", {}, () => {});
const NOW = "2026-09-27T00:00:00.000Z";

function makeRegistry(generateId = () => "tnt-0001") {
  const store = new InMemoryTenantStore();
  const registry = new TenantRegistry({ store, logger: silentLogger, now: () => NOW, generateId });
  return { store, registry };
}

test("creating a tenant begins in provisioning with every step pending", async () => {
  const { store, registry } = makeRegistry();

  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "growth",
    region: "id-jkt"
  });

  assert.equal(tenant.state, "provisioning");
  assert.equal(tenant.schemaName, deriveSchemaName(tenant.id));

  const run = await store.getProvisioningRun(tenant.id);
  assert.equal(run.complete, false);
  assert.equal(run.steps.every((s) => s.status === "pending"), true);
});

test("the schema name comes from the id, not the slug", async () => {
  const { registry } = makeRegistry(() => "tnt-0001");
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });

  assert.equal(tenant.schemaName, "tenant_tnt-0001".replace("-", "_"));
  assert.notEqual(tenant.schemaName, "acme");
});

test("duplicate slugs are rejected", async () => {
  let counter = 0;
  const { registry } = makeRegistry(() => `tnt-000${(counter += 1)}`);

  await registry.create({ slug: "acme", displayName: "Acme", plan: "starter", region: "id-jkt" });

  await assert.rejects(
    () => registry.create({ slug: "acme", displayName: "Other", plan: "starter", region: "id-jkt" }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "CONFLICT");
      return true;
    }
  );
});

test("invalid plan and region are rejected before anything is stored", async () => {
  const { store, registry } = makeRegistry();

  await assert.rejects(
    () =>
      registry.create({
        slug: "acme",
        displayName: "Acme",
        plan: "enterprise" as never,
        region: "id-jkt"
      })
  );
  await assert.rejects(
    () =>
      registry.create({
        slug: "acme",
        displayName: "Acme",
        plan: "starter",
        region: "eu-west" as never
      })
  );

  assert.deepEqual(await store.listTenants(), []);
});

test("the state machine allows the documented transitions and nothing else", () => {
  assert.equal(canTransitionTenant("provisioning", "active"), true);
  assert.equal(canTransitionTenant("active", "suspended"), true);
  assert.equal(canTransitionTenant("suspended", "active"), true);
  assert.equal(canTransitionTenant("active", "terminated"), true);
  assert.equal(canTransitionTenant("active", "provisioning"), false, "no un-provisioning");
  assert.equal(canTransitionTenant("terminated", "active"), false, "termination is terminal");
  assert.equal(canTransitionTenant("provisioning", "suspended"), false);

  assert.equal(isServableState("active"), true);
  assert.equal(isServableState("suspended"), false);

  assert.throws(() => assertTenantTransition("terminated", "active"), /Cannot move a tenant/);
});

test("the registry refuses an invalid state change", async () => {
  const { registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });

  await assert.rejects(
    () => registry.setState(tenant.id, "suspended"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_STATE_INVALID");
      return true;
    }
  );
});

test("the directory resolves a tenant with its schema and state", async () => {
  const { store, registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });

  const directory = createTenantDirectory(store);
  const route = await directory.resolve(tenant.id);

  assert.equal(route?.schemaName, tenant.schemaName);
  assert.equal(route?.state, "provisioning");
  assert.equal(await directory.resolve("tnt-nope"), null);
});

test("termination revokes credentials, schedules deletion, and marks the tenant terminated", async () => {
  const { store, registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });
  await store.setTenantState(tenant.id, "active", NOW);

  const secrets = new InMemorySecretStore();
  await secrets.put({ tenantId: tenant.id, channel: "shopee" }, "shp-secret");
  await secrets.put({ tenantId: tenant.id, channel: "tiktok_tokopedia" }, "tt-secret");

  const schemaAdmin = new InMemoryTenantSchemaAdmin();
  await schemaAdmin.createSchema(tenant.schemaName);

  const service = new TenantTerminationService({
    store,
    secrets,
    schemaAdmin,
    logger: silentLogger,
    now: () => NOW
  });

  const result = await service.terminate(tenant.id);

  assert.equal(result.tenant.state, "terminated");
  assert.deepEqual([...result.revokedChannels].sort(), ["shopee", "tiktok_tokopedia"]);
  assert.equal(await secrets.get({ tenantId: tenant.id, channel: "shopee" }), null);
  assert.equal((await secrets.listForTenant(tenant.id)).length, 0);

  const deletions = await schemaAdmin.listScheduledDeletions();
  assert.equal(deletions.length, 1);
  assert.equal(deletions[0]?.schemaName, tenant.schemaName);

  // The data is scheduled, not dropped: a mistaken termination must be observable and reversible
  // before the purge runs.
  assert.equal(schemaAdmin.schemas.has(tenant.schemaName), true);
});

test("credentials are revoked before the tenant is marked terminated", async () => {
  const { store, registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });
  await store.setTenantState(tenant.id, "active", NOW);

  const secrets = new InMemorySecretStore();
  await secrets.put({ tenantId: tenant.id, channel: "shopee" }, "shp-secret");

  // Fail at the scheduling step, which runs after revocation and before the state change.
  const schemaAdmin = new InMemoryTenantSchemaAdmin();
  schemaAdmin.scheduleDeletion = async () => {
    throw new Error("platform_ops unavailable");
  };

  const service = new TenantTerminationService({
    store,
    secrets,
    schemaAdmin,
    logger: silentLogger,
    now: () => NOW
  });

  await assert.rejects(() => service.terminate(tenant.id), /platform_ops unavailable/);

  // This is the point of the ordering: the crash left no live credentials behind, and the tenant
  // is still nominally active, so an operator sees it and can retry.
  assert.equal(await secrets.get({ tenantId: tenant.id, channel: "shopee" }), null);
  assert.equal((await store.getTenant(tenant.id))?.state, "active");
});

test("terminating an already terminated tenant is refused", async () => {
  const { store, registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });
  await store.setTenantState(tenant.id, "terminated", NOW);

  const service = new TenantTerminationService({
    store,
    secrets: new InMemorySecretStore(),
    schemaAdmin: new InMemoryTenantSchemaAdmin(),
    logger: silentLogger,
    now: () => NOW
  });

  await assert.rejects(
    () => service.terminate(tenant.id),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_STATE_INVALID");
      return true;
    }
  );
});

test("termination reports the number of revoked credentials without leaking their values", async () => {
  const { store, registry } = makeRegistry();
  const tenant = await registry.create({
    slug: "acme",
    displayName: "Acme",
    plan: "starter",
    region: "id-jkt"
  });
  await store.setTenantState(tenant.id, "active", NOW);

  const secrets = new InMemorySecretStore();
  await secrets.put({ tenantId: tenant.id, channel: "shopee" }, "super-secret-value");

  const lines: string[] = [];
  const logger = createLogger("debug", {}, (line) => lines.push(line));

  const service = new TenantTerminationService({
    store,
    secrets,
    schemaAdmin: new InMemoryTenantSchemaAdmin(),
    logger,
    now: () => NOW
  });
  await service.terminate(tenant.id);

  const output = lines.join("\n");
  assert.equal(output.includes("super-secret-value"), false, "a secret reached a log line");
});

test("disabling a missing account raises NOT_FOUND", async () => {
  const store = new InMemoryAccountStore();
  await assert.rejects(
    () => store.disable("acc-missing", NOW),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "NOT_FOUND");
      return true;
    }
  );
});
