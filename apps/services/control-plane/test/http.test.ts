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
import { InMemorySecretStore, InMemoryMedusaAdminKeyStore } from "@platform/secrets";
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
import { SellerOrderReader } from "../src/seller-orders.ts";
import type { SellerReadTransport } from "../src/seller-orders.ts";
import { createLogger } from "../src/logging.ts";
import { SYNC_ENTITIES } from "@platform/contracts";

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
  medusaKeys: InMemoryMedusaAdminKeyStore;
  /** Replace the tenant-engine transport so a seller read is exercised without a live instance. */
  setSellerTransport: (transport: SellerReadTransport) => void;
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
  const medusaKeys = new InMemoryMedusaAdminKeyStore();

  // A mutable holder so a test can install its own transport after the server is listening. The
  // reader is built once, as production builds it, and only the transport seam is swapped.
  let sellerTransport: SellerReadTransport = () => {
    throw new Error("seller transport not installed by the test");
  };
  const sellerOrders = new SellerOrderReader({
    targets: medusaTargets,
    keys: medusaKeys,
    syncState,
    transport: (url, init) => sellerTransport(url, init),
    logger
  });

  const server = createControlPlaneServer({
    registry,
    provisioning,
    termination,
    sessions,
    syncState,
    medusaTargets,
    serviceTokens: [SERVICE_TOKEN],
    sellerOrders,
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
    medusaKeys,
    setSellerTransport: (transport) => {
      sellerTransport = transport;
    },
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

  await t.test("sync health is scoped to the caller's tenant and explains a failure without a raw error", async () => {
    // Seed a failed ref for the seller's own tenant and one for a different tenant. The seller must
    // see only its own, which is the isolation the M5 criterion asks for on a *new* route — the
    // tenant comes from the session, so there is no id to tamper with.
    const otherTenant = (await harness.store.listTenants()).find((entry) => entry.id !== tenantId);
    assert.ok(otherTenant, "expected a second tenant");

    const seed = async (target: string, externalOrderId: string): Promise<void> => {
      await fetch(`${harness.baseUrl}/v1/sync/order-refs/reserve`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ tenantId: target, channel: "shopee", externalOrderId })
      });
      await fetch(`${harness.baseUrl}/v1/sync/order-refs/fail`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ tenantId: target, channel: "shopee", externalOrderId })
      });
    };
    await seed(tenantId, "ext-mine");
    await seed(otherTenant.id, "ext-theirs");

    const response = await fetch(`${harness.baseUrl}/v1/sync/health`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      tenantId: string;
      channels: {
        channel: string;
        unresolved: number;
        problems: { externalOrderId: string; kind: string; explanation: string }[];
      }[];
    };

    assert.equal(body.tenantId, tenantId);
    // Every known channel is present, healthy ones included, so the UI never infers absence.
    assert.deepEqual(
      body.channels.map((entry) => entry.channel).sort(),
      ["lazada", "shopee", "tiktok_tokopedia"]
    );

    const shopee = body.channels.find((entry) => entry.channel === "shopee");
    assert.equal(shopee?.unresolved, 1, "only the seller's own drift is counted");
    assert.deepEqual(shopee?.problems.map((problem) => problem.externalOrderId), ["ext-mine"]);
    assert.equal(shopee?.problems[0]?.kind, "failed_import");
    // An actionable sentence, not a code. The exact wording may change; that it is prose and names
    // the class of failure is the property under test.
    const explanation = shopee?.problems[0]?.explanation ?? "";
    assert.ok(explanation.length > 40, "the explanation is a sentence, not an error code");
    assert.ok(!explanation.includes("failed_import"), "the explanation does not leak the internal kind");

    const clear = body.channels.find((entry) => entry.channel === "lazada");
    assert.equal(clear?.unresolved, 0);
    assert.deepEqual(clear?.problems, []);
  });

  await t.test("sync health refuses an operator, which has no tenant of its own", async () => {
    // The seller route is tenant-scoped by construction. An operator reading a named tenant is the
    // ops console's job, and that surface must be audited separately (M5) rather than reusing this.
    const response = await fetch(`${harness.baseUrl}/v1/sync/health`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(response.status, 403);
  });

  await t.test("sync health requires a session, so a service token does not open it", async () => {
    const response = await fetch(`${harness.baseUrl}/v1/sync/health`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(response.status, 401);
  });

  await t.test("seller orders are read from the tenant's engine and joined to a channel", async () => {
    await harness.medusaTargets.set({ tenantId, baseUrl: "https://tenant-a.medusa.example" });
    await harness.medusaKeys.put(tenantId, "sk_test_secret_value");

    // The channel comes from platform-owned sync state (ADR 0016), not from Medusa. Committing a
    // ref is what makes this order attributable to Shopee.
    await harness.syncState.reserveOrderRef({
      tenantId,
      channel: "shopee",
      externalOrderId: "ext-9",
      now: NOW
    });
    await harness.syncState.commitOrderRef(tenantId, "shopee", "ext-9", "order_9", NOW);

    const seen: { url: string; auth: string | undefined }[] = [];
    harness.setSellerTransport(async (url, init) => {
      seen.push({ url, auth: (init.headers as Record<string, string>)?.authorization });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            orders: [
              {
                id: "order_9",
                display_id: 12,
                status: "pending",
                email: "buyer@example.com",
                // Medusa stores IDR in whole rupiah.
                total: 48_000,
                created_at: NOW,
                updated_at: NOW,
                items: [{ quantity: 2 }, { quantity: 1 }]
              }
            ],
            count: 1
          })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      total: number;
      orders: { orderId: string; channel: string | null; externalOrderId: string | null; itemCount: number; total: { amount: number; currency: string } }[];
    };

    assert.equal(body.total, 1);
    assert.equal(body.orders[0]?.channel, "shopee");
    assert.equal(body.orders[0]?.externalOrderId, "ext-9");
    assert.equal(body.orders[0]?.itemCount, 3);
    // Medusa whole rupiah -> platform sen. A missed 100x is an order priced 100x wrong, with no
    // error anywhere, so the conversion is asserted rather than assumed.
    assert.deepEqual(body.orders[0]?.total, { amount: 4_800_000, currency: "IDR" });
    // The credential is presented as HTTP Basic (ADR 0012) and never appears in the response.
    assert.ok(seen[0]?.auth?.startsWith("Basic "));
    assert.ok(seen[0]?.url.includes("/admin/orders"), "the read proxies Medusa's own admin route");
    assert.ok(!JSON.stringify(body).includes("sk_test_secret_value"));
  });

  await t.test("an order with no committed ref reports a null channel rather than a guess", async () => {
    harness.setSellerTransport(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ orders: [{ id: "order_unattributed", status: "pending", total: 1000, items: [] }], count: 1 })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { orders: { channel: string | null; externalOrderId: string | null }[] };
    // The order exists in Medusa but the platform has no marketplace reference for it. Saying so is
    // honest; inventing a channel would disagree with reconciliation.
    assert.equal(body.orders[0]?.channel, null);
    assert.equal(body.orders[0]?.externalOrderId, null);
  });

  await t.test("one seller order returns its lines, with money in sen", async () => {
    harness.setSellerTransport(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          order: {
            id: "order_9",
            display_id: 12,
            status: "pending",
            total: 48_000,
            subtotal: 40_000,
            shipping_total: 5_000,
            discount_total: 2_000,
            created_at: NOW,
            updated_at: NOW,
            items: [{ title: "Kaos", variant_sku: "SKU-1", quantity: 2, unit_price: 20_000, subtotal: 40_000 }]
          }
        })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders/order_9`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      orderId: string;
      channel: string | null;
      subtotal: { amount: number };
      shipping: { amount: number };
      discount: { amount: number };
      lines: { title: string; sku: string | null; quantity: number; unitPrice: { amount: number } }[];
    };

    assert.equal(body.orderId, "order_9");
    assert.equal(body.channel, "shopee");
    assert.deepEqual(body.subtotal, { amount: 4_000_000, currency: "IDR" });
    assert.deepEqual(body.shipping, { amount: 500_000, currency: "IDR" });
    assert.deepEqual(body.discount, { amount: 200_000, currency: "IDR" });
    assert.equal(body.lines[0]?.sku, "SKU-1");
    assert.deepEqual(body.lines[0]?.unitPrice, { amount: 2_000_000, currency: "IDR" });
  });

  await t.test("an order Medusa does not have is 404, and a broken engine is not an empty list", async () => {
    harness.setSellerTransport(async () => ({ ok: false, status: 404, text: async () => "" }));
    const missing = await fetch(`${harness.baseUrl}/v1/seller/orders/order_nope`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(missing.status, 404);

    harness.setSellerTransport(async () => {
      throw new Error("connection refused");
    });
    const down = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    // An unreachable engine must not read as "no orders": a seller has to tell the two apart.
    assert.equal(down.status, 502);
    const body = (await down.json()) as { error: { code: string } };
    assert.equal(body.error.code, "UPSTREAM_ERROR");
  });

  await t.test("a tenant with no engine or no key is a hard 404, never a fallback target", async () => {
    // Removing the key while leaving the target is the case that would otherwise send an empty
    // credential to a real instance.
    await harness.medusaKeys.delete(tenantId);
    const response = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 404);
    await harness.medusaKeys.put(tenantId, "sk_test_secret_value");
  });

  await t.test("the seller order surface requires order:read and a session, not a service token", async () => {
    harness.setSellerTransport(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ orders: [], count: 0 }) }));

    const noToken = await fetch(`${harness.baseUrl}/v1/seller/orders`);
    assert.equal(noToken.status, 401);

    // The worker's service token is a different trust than a seller session (ADR 0012).
    const service = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(service.status, 401);

    // An operator is cross-tenant by construction and has no tenant of its own, so the seller
    // surface cannot serve it. Its own read names the tenant explicitly.
    const operator = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(operator.status, 403);
  });

  await t.test("a seller_viewer can read orders, because order:read is not a write", async () => {
    // Reuses the viewer account created earlier in this harness: same role, same tenant.
    const viewerToken = await login(harness.baseUrl, "viewer@example.com", GOOD_PASSWORD);

    harness.setSellerTransport(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ orders: [{ id: "order_9", status: "pending", total: 1000, items: [] }], count: 1 })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(response.status, 200);
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

  await t.test("every declared sync entity is accepted, so a new one cannot be rejected by a stale copy", async () => {
    // The stock reconciliation reads its cursor and then advances it. When this surface validated
    // `entity` against a hand-written list of two, the read worked and the advance was a 422, so the
    // pass failed on page one and — because a unit re-arms only when it completes — never ran again.
    // Iterating the contract's own list is what keeps this from recurring: a member added to
    // SYNC_ENTITIES is exercised here automatically.
    for (const entity of SYNC_ENTITIES) {
      const set = await fetch(`${harness.baseUrl}/v1/sync/cursors/set`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE_TOKEN}` },
        body: JSON.stringify({ tenantId, channel: "shopee", entity, cursor: `tok-${entity}` })
      });
      assert.equal(set.status, 200, `setting the ${entity} cursor must be accepted`);

      const get = await fetch(`${harness.baseUrl}/v1/sync/cursors/${tenantId}/shopee/${entity}`, {
        headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
      });
      const body = (await get.json()) as { cursor: { cursor: string | null } | null };
      assert.equal(body.cursor?.cursor, `tok-${entity}`, `the ${entity} cursor must round-trip`);
    }
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
