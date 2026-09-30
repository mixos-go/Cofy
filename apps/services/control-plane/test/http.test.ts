/**
 * HTTP API tests.
 *
 * These start the real server on an ephemeral port and make real HTTP requests, because the
 * authorization path (token -> session -> capability -> tenant scope -> handler) only exists when
 * it is actually wired up. Asserting it through a direct function call would miss exactly the
 * mistakes this layer is prone to: a route that forgets its scope check, or a status that does not
 * match the error code.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { InMemorySecretStore } from "@platform/secrets";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { InMemoryTenantStore } from "../src/tenant-store.ts";
import { InMemoryTenantSchemaAdmin } from "../src/tenant-schema.ts";
import { RecordingMigrationRunner } from "../src/migrations.ts";
import { ProvisioningOrchestrator } from "../src/provisioning.ts";
import { InMemoryRouteRegistrar, InMemorySeeder, createProvisioningHandlers } from "../src/steps.ts";
import { InMemoryAccountStore, SessionManager } from "../src/identity.ts";
import { TenantTerminationService } from "../src/termination.ts";
import { TenantRegistry } from "../src/tenants.ts";
import { createControlPlaneServer } from "../src/http.ts";
import { InMemoryMedusaTargetStore } from "../src/medusa-target.ts";
import { createLogger } from "../src/logging.ts";

const GOOD_PASSWORD = "correct horse battery";
const NOW = "2026-09-27T00:00:00.000Z";

interface Harness {
  server: Server;
  baseUrl: string;
  store: InMemoryTenantStore;
  accounts: InMemoryAccountStore;
  schemaAdmin: InMemoryTenantSchemaAdmin;
  syncState: InMemorySyncStateStore;
  medusaTargets: InMemoryMedusaTargetStore;
  close: () => Promise<void>;
}

const SERVICE_TOKEN = "service-token-value-for-tests";

async function startHarness(): Promise<Harness> {
  const logger = createLogger("error", {}, () => {});
  const store = new InMemoryTenantStore();
  const schemaAdmin = new InMemoryTenantSchemaAdmin();
  const migrations = new RecordingMigrationRunner();
  const seeder = new InMemorySeeder();
  const routes = new InMemoryRouteRegistrar();

  const registry = new TenantRegistry({
    store,
    logger,
    now: () => NOW,
    generateId: (() => {
      let n = 0;
      return () => `tnt-${String((n += 1)).padStart(4, "0")}`;
    })()
  });

  const provisioning = new ProvisioningOrchestrator({
    store,
    logger,
    now: () => NOW,
    handlers: createProvisioningHandlers({ schemaAdmin, migrationRunner: migrations, seeder, routes })
  });

  const termination = new TenantTerminationService({
    store,
    secrets: new InMemorySecretStore(),
    schemaAdmin,
    logger,
    now: () => NOW
  });

  const accounts = new InMemoryAccountStore();
  const sessions = new SessionManager({ accounts, now: () => NOW });
  const syncState = new InMemorySyncStateStore();
  const medusaTargets = new InMemoryMedusaTargetStore();

  const server = createControlPlaneServer({
    registry,
    provisioning,
    termination,
    sessions,
    syncState,
    medusaTargets,
    serviceTokens: [SERVICE_TOKEN],
    logger
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    store,
    accounts,
    schemaAdmin,
    syncState,
    medusaTargets,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  };
}

async function login(baseUrl: string, email: string, password: string): Promise<string> {
  const response = await fetch(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const body = (await response.json()) as { token: string };
  return body.token;
}

test("the API", async (t) => {
  const harness = await startHarness();
  t.after(async () => {
    await harness.close();
  });

  await harness.accounts.create({
    email: "ops@example.com",
    displayName: "Ops",
    password: GOOD_PASSWORD,
    role: "operator",
    tenantId: null,
    now: NOW
  });

  const operatorToken = await login(harness.baseUrl, "ops@example.com", GOOD_PASSWORD);

  await t.test("login issues a token and a wrong password gets 401", async () => {
    const bad = await fetch(`${harness.baseUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "ops@example.com", password: "wrong password here" })
    });
    assert.equal(bad.status, 401);
  });

  await t.test("a request without a token is 401", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants`);
    assert.equal(response.status, 401);
  });

  await t.test("a garbage token is 401", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants`, {
      headers: { authorization: "Bearer not-a-real-token" }
    });
    assert.equal(response.status, 401);
  });

  let tenantId = "";

  await t.test("an operator can create a tenant and provisioning completes synchronously enough", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        slug: "acme",
        displayName: "Acme",
        plan: "growth",
        region: "id-jkt"
      })
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { tenant: { id: string; state: string } };
    tenantId = body.tenant.id;
    assert.equal(body.tenant.state, "provisioning");
  });

  await t.test("provisioning can be re-run and the tenant becomes active", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/provision`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}` }
    });

    assert.equal(response.status, 200);
    const health = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/health`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    const body = (await health.json()) as { servable: boolean; provisioningComplete: boolean };
    assert.equal(body.servable, true);
    assert.equal(body.provisioningComplete, true);
  });

  await t.test("a malformed body is 422, not 500", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ slug: "A", displayName: "", plan: "nope", region: "mars" })
    });

    assert.equal(response.status, 422);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_FAILED");
  });

  await t.test("an unknown route is 404", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/nope`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(response.status, 404);
  });

  let sellerToken = "";

  await t.test("a seller account is created and can log in", async () => {
    const account = await harness.accounts.create({
      email: "seller@example.com",
      displayName: "Seller",
      password: GOOD_PASSWORD,
      role: "seller_owner",
      tenantId: tenantId as never,
      now: NOW
    });
    assert.equal(account.tenantId, tenantId);
    sellerToken = await login(harness.baseUrl, "seller@example.com", GOOD_PASSWORD);
  });

  await t.test("a seller cannot terminate a tenant", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 403);
  });

  await t.test("a seller sees only their own tenant", async () => {
    // Create a second tenant so there is something to hide.
    await fetch(`${harness.baseUrl}/v1/tenants`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ slug: "other", displayName: "Other", plan: "starter", region: "sg-sin" })
    });

    const sellerList = await fetch(`${harness.baseUrl}/v1/tenants`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    const sellerBody = (await sellerList.json()) as { tenants: { id: string }[] };
    assert.deepEqual(
      sellerBody.tenants.map((entry) => entry.id),
      [tenantId]
    );

    const operatorList = await fetch(`${harness.baseUrl}/v1/tenants`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    const operatorBody = (await operatorList.json()) as { tenants: { id: string }[] };
    assert.equal(operatorBody.tenants.length, 2);
  });

  await t.test("a seller may not read another tenant by guessing its id", async () => {
    const all = await harness.store.listTenants();
    const other = all.find((entry) => entry.id !== tenantId);
    assert.ok(other, "expected a second tenant");

    const response = await fetch(`${harness.baseUrl}/v1/tenants/${other.id}`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 403);
  });

  await t.test("provisioning is an operator action, not a seller one", async () => {
    // `tenant:create` is operator-only. A seller owning the tenant still may not trigger
    // provisioning: that is platform work, and letting a seller do it would let them interfere
    // with a run an operator is diagnosing.
    const asSeller = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/provision`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(asSeller.status, 403);

    const asOperator = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/provision`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(asOperator.status, 200);
  });

  await t.test("a viewer cannot provision a tenant it can read", async () => {
    await harness.accounts.create({
      email: "viewer@example.com",
      displayName: "Viewer",
      password: GOOD_PASSWORD,
      role: "seller_viewer",
      tenantId: tenantId as never,
      now: NOW
    });
    const viewerToken = await login(harness.baseUrl, "viewer@example.com", GOOD_PASSWORD);

    const read = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}`, {
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(read.status, 200, "a viewer may read");

    const write = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/provision`, {
      method: "POST",
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(write.status, 403, "a viewer may not write");
  });

  await t.test("terminating a tenant marks it terminated and it stops being servable", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${operatorToken}` }
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { tenant: { state: string }; revokedChannels: string[] };
    assert.equal(body.tenant.state, "terminated");

    const health = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/health`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    const healthBody = (await health.json()) as { servable: boolean };
    assert.equal(healthBody.servable, false);
  });

  await t.test("the sync-state surface requires a service token", async () => {
    const withoutToken = await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId, channel: "shopee", externalOrderId: "ext-1" })
    });
    assert.equal(withoutToken.status, 401);

    const withSessionToken = await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${operatorToken}` },
      body: JSON.stringify({ tenantId, channel: "shopee", externalOrderId: "ext-1" })
    });
    // An operator session must not stand in for the worker's service token: different trust.
    assert.equal(withSessionToken.status, 401);
  });

  await t.test("reserving an order ref twice returns the existing ref", async () => {
    const call = async (): Promise<{ kind: string }> => {
      const response = await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ tenantId, channel: "shopee", externalOrderId: "ext-route-1" })
      });
      assert.equal(response.status, 200);
      return (await response.json()) as { kind: string };
    };

    assert.equal((await call()).kind, "reserved");
    assert.equal((await call()).kind, "exists");
  });

  await t.test("the medusa target surface is service-only and never returns a credential", async () => {
    await harness.medusaTargets.set({ tenantId, baseUrl: "https://tenant-a.medusa.example" });

    const withoutToken = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/medusa-target`);
    assert.equal(withoutToken.status, 401);

    const withSession = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/medusa-target`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    // An operator session is not the worker's credential: different trust, so it must not resolve.
    assert.equal(withSession.status, 401);

    const response = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/medusa-target`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { target: Record<string, unknown> };
    assert.equal(body.target.baseUrl, "https://tenant-a.medusa.example");
    // The key is not part of this response at all; assert on the shape, not just absence of a name.
    assert.deepEqual(Object.keys(body.target).sort(), ["baseUrl", "tenantId"]);
  });

  await t.test("a tenant with no target is a hard 404, not an empty target", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/tenants/tnt-missing/medusa-target`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(response.status, 404);
  });

  await t.test("an unknown channel on the sync surface is a validation failure", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId, channel: "not-a-channel", externalOrderId: "ext-1" })
    });
    assert.equal(response.status, 422);
  });

  await t.test("the sync surface commits an order ref and returns it", async () => {
    await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId, channel: "shopee", externalOrderId: "ext-commit" })
    });
    const response = await fetch(`${harness.baseUrl}/v1/sync/order-refs/commit`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId, channel: "shopee", externalOrderId: "ext-commit", orderId: "order-1" })
    });

    assert.equal(response.status, 200);
    const ref = (await response.json()) as { status: string; orderId: string };
    assert.equal(ref.status, "committed");
    assert.equal(ref.orderId, "order-1");
  });

  await t.test("an idempotency key replays only with the same fingerprint", async () => {
    const claim = async (fingerprint: string): Promise<{ status: number; body: { kind?: string; error?: { code: string } } }> => {
      const response = await fetch(`${harness.baseUrl}/v1/sync/idempotency/claim`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ tenantId, key: "k1", operation: "order.create", fingerprint })
      });
      return { status: response.status, body: (await response.json()) as { kind?: string; error?: { code: string } } };
    };

    assert.equal((await claim("fp-a")).body.kind, "claimed");
    assert.equal((await claim("fp-a")).body.kind, "in_flight");
    // Re-using a key for different input is a bug, not a retry.
    const conflict = await claim("fp-b");
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error?.code, "IDEMPOTENCY_CONFLICT");
  });

  await t.test("a SKU map can be stored and read back for the worker's stock push", async () => {
    const write = await fetch(`${harness.baseUrl}/v1/sync/sku-maps/upsert`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({
        tenantId,
        channel: "shopee",
        sku: "SKU-1",
        externalProductId: "1001",
        externalSkuId: "model-11",
        externalInventoryId: null
      })
    });
    assert.equal(write.status, 200);

    const read = await fetch(`${harness.baseUrl}/v1/sync/sku-maps/${tenantId}/shopee/SKU-1`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    const body = (await read.json()) as { map: { externalSkuId: string } | null };
    assert.equal(body.map?.externalSkuId, "model-11");
  });

  await t.test("a cursor round-trips and an unknown entity is a validation failure", async () => {
    const set = await fetch(`${harness.baseUrl}/v1/sync/cursors/set`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId, channel: "shopee", entity: "orders", cursor: "tok-9" })
    });
    assert.equal(set.status, 200);

    const get = await fetch(`${harness.baseUrl}/v1/sync/cursors/${tenantId}/shopee/orders`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    const body = (await get.json()) as { cursor: { cursor: string | null } | null };
    assert.equal(body.cursor?.cursor, "tok-9");

    const bad = await fetch(`${harness.baseUrl}/v1/sync/cursors/${tenantId}/shopee/nonsense`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(bad.status, 422);
  });

  await t.test("the drift dashboard counts a failed ref and returns to zero after a repair", async () => {
    const driftTenant = "tnt-drift";
    const failedRef = async (): Promise<{ total: number; failedImport: number }> => {
      const response = await fetch(`${harness.baseUrl}/v1/sync/drift/${driftTenant}/shopee`, {
        headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
      });
      assert.equal(response.status, 200);
      return ((await response.json()) as { drift: { total: number; failedImport: number } }).drift;
    };

    await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId: driftTenant, channel: "shopee", externalOrderId: "ext-drift" })
    });
    await fetch(`${harness.baseUrl}/v1/sync/order-refs/fail`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId: driftTenant, channel: "shopee", externalOrderId: "ext-drift" })
    });
    assert.equal((await failedRef()).total, 1);
    assert.equal((await failedRef()).failedImport, 1);

    // The worker's repair path reopens the ref, then re-imports it; the dashboard reads zero after.
    const reopen = await fetch(`${harness.baseUrl}/v1/sync/order-refs/reopen`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId: driftTenant, channel: "shopee", externalOrderId: "ext-drift" })
    });
    assert.equal(reopen.status, 200);
    await fetch(`${harness.baseUrl}/v1/sync/order-refs/commit`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({
        tenantId: driftTenant,
        channel: "shopee",
        externalOrderId: "ext-drift",
        orderId: "order-1"
      })
    });
    assert.equal((await failedRef()).total, 0);
    assert.equal((await failedRef()).failedImport, 0);
  });

  await t.test("the drift dashboard is scoped per tenant, so one tenant cannot read another's", async () => {
    await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId: "tnt-a-drift", channel: "shopee", externalOrderId: "ext-a" })
    });
    await fetch(`${harness.baseUrl}/v1/sync/order-refs/fail`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({ tenantId: "tnt-a-drift", channel: "shopee", externalOrderId: "ext-a" })
    });

    const other = await fetch(`${harness.baseUrl}/v1/sync/drift/tnt-b-drift/shopee`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    const body = (await other.json()) as { drift: { total: number } };
    assert.equal(body.drift.total, 0);
  });

  await t.test("a drift read without a service token is refused", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/sync/drift/${tenantId}/shopee`);
    assert.equal(response.status, 401);
  });

  await t.test("an unknown status filter on the ref list is a validation failure", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/sync/order-refs/${tenantId}/shopee?status=bogus`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(response.status, 422);
  });
});
