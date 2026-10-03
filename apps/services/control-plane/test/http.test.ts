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
import { InMemoryRateShoppingRulesStore } from "../src/rate-shopping-rules-store.ts";
import { SellerOrderReader } from "../src/seller-orders.ts";
import type { SellerReadTransport } from "../src/seller-orders.ts";
import { HttpChannelConnectionClient } from "../src/channels.ts";
import type { ChannelConnectionTransport } from "../src/channels.ts";
import { InMemoryAuditLog } from "../src/audit.ts";
import { HttpWmsClient } from "../src/wms.ts";
import type { WmsTransport } from "../src/wms.ts";
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
  /** The platform-owned shipping policy, so a test can prove termination clears it. */
  rateShoppingRules: InMemoryRateShoppingRulesStore;
  /** Replace the tenant-engine transport so a seller read is exercised without a live instance. */
  setSellerTransport: (transport: SellerReadTransport) => void;
  /** Replace the channel-service transport so a connection is exercised without the integration plane. */
  setChannelTransport: (transport: ChannelConnectionTransport) => void;
  /** Replace the tenant-engine transport so the warehouse surface is exercised without a live instance. */
  setWmsTransport: (transport: WmsTransport) => void;
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

  const rateShoppingRules = new InMemoryRateShoppingRulesStore();
  const termination = new TenantTerminationService({
    store,
    secrets: new InMemorySecretStore(),
    schemaAdmin,
    logger,
    rateShoppingRules,
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

  // Same seam for the channel service. The client is built once, as production builds it, and only
  // its transport is swapped, so the request shape (path, bearer header, body) is what the test
  // exercises.
  let channelTransport: ChannelConnectionTransport = () => {
    throw new Error("channel transport not installed by the test");
  };
  const channelConnections = new HttpChannelConnectionClient({
    baseUrl: "https://integration.example.test",
    serviceToken: SERVICE_TOKEN,
    transport: (url, init) => channelTransport(url, init),
    logger
  });

  // The warehouse surface's seam. Built once, as production builds it, so the request shape (path,
  // Basic credential, body) is what the test exercises rather than a stub of our own code.
  let wmsTransport: WmsTransport = () => {
    throw new Error("wms transport not installed by the test");
  };
  const wms = new HttpWmsClient({
    targets: medusaTargets,
    keys: medusaKeys,
    transport: (url, init) => wmsTransport(url, init),
    logger
  });

  const server = createControlPlaneServer({
    registry,
    provisioning,
    termination,
    sessions,
    syncState,
    medusaTargets,
    rateShoppingRules,
    serviceTokens: [SERVICE_TOKEN],
    sellerOrders,
    channelConnections,
    auditLog: new InMemoryAuditLog(),
    wms,
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
    rateShoppingRules,
    medusaKeys,
    setSellerTransport: (transport) => {
      sellerTransport = transport;
    },
    setChannelTransport: (transport) => {
      channelTransport = transport;
    },
    setWmsTransport: (transport) => {
      wmsTransport = transport;
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
  let sellerAccountId = "";

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
    sellerAccountId = account.id;
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

  await t.test("the order detail carries its shipments, projected from the engine's fulfillments", async () => {
    const seen: { url: string }[] = [];
    harness.setSellerTransport(async (url) => {
      seen.push({ url });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            order: {
              id: "order_9",
              display_id: 12,
              status: "pending",
              fulfillment_status: "shipped",
              total: 48_000,
              subtotal: 40_000,
              shipping_total: 5_000,
              discount_total: 0,
              created_at: NOW,
              updated_at: NOW,
              items: [{ title: "Kaos", variant_sku: "SKU-1", quantity: 2, unit_price: 20_000, subtotal: 40_000 }],
              fulfillments: [
                {
                  id: "ful_1",
                  shipped_at: NOW,
                  delivered_at: null,
                  metadata: {
                    courier: "jne",
                    service_level: "regular",
                    arrangement: "channel",
                    channel: "shopee",
                    external_order_id: "ext-9",
                    shipment_status: "in_transit",
                    shipment_events: [
                      { status: "in_transit", occurredAt: NOW, description: "Departed" }
                    ]
                  },
                  labels: [
                    { tracking_number: "JNE-1", tracking_url: "https://track.example.test/JNE-1", label_url: "" }
                  ]
                }
              ]
            }
          })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders/order_9`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      fulfillmentStatus: string | null;
      shipments: {
        fulfillmentId: string;
        trackingNumber: string | null;
        trackingUrl: string | null;
        labelUrl: string | null;
        courier: string | null;
        serviceLevel: string | null;
        arrangement: string | null;
        status: string;
        events: { status: string; occurredAt: string; description: string }[];
        shippedAt: string | null;
        deliveredAt: string | null;
      }[];
    };

    assert.equal(body.fulfillmentStatus, "shipped");
    assert.equal(body.shipments.length, 1);
    const shipment = body.shipments[0]!;
    assert.equal(shipment.fulfillmentId, "ful_1");
    assert.equal(shipment.trackingNumber, "JNE-1");
    assert.equal(shipment.trackingUrl, "https://track.example.test/JNE-1");
    // An empty label URL reads as absent, not as an empty string a link would render as broken.
    assert.equal(shipment.labelUrl, null);
    assert.equal(shipment.courier, "jne");
    assert.equal(shipment.serviceLevel, "regular");
    assert.equal(shipment.arrangement, "channel");
    assert.equal(shipment.status, "in_transit");
    assert.equal(shipment.events.length, 1);
    assert.equal(shipment.events[0]?.description, "Departed");
    assert.equal(shipment.shippedAt, NOW);
    assert.equal(shipment.deliveredAt, null);
    // The shipment rides on the order read: the proxy asks for the fulfillments it needs, rather
    // than issuing a second request (docs/adr/0016).
    assert.ok(
      seen[0]?.url.includes("*fulfillments"),
      "the order detail must ask Medusa for the fulfillments"
    );
  });

  await t.test("a shipment with no metadata or label still projects, and malformed events are dropped", async () => {
    harness.setSellerTransport(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          order: {
            id: "order_9",
            status: "pending",
            created_at: NOW,
            updated_at: NOW,
            items: [],
            fulfillments: [
              // A fulfillment the engine created by some other path: no metadata, no label. It must
              // still appear so the seller sees the order shipped, with an honest `created` status.
              { id: "ful_bare", shipped_at: NOW, metadata: null, labels: [] },
              // Malformed metadata: an arrangement we never write and events missing a status.
              {
                id: "ful_bad",
                metadata: { arrangement: "telepathy", shipment_events: [{ occurredAt: NOW }, "nonsense"] },
                labels: []
              },
              // No id: unaddressable, so it must be dropped rather than projected.
              { metadata: {} }
            ]
          }
        })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/seller/orders/order_9`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      shipments: { fulfillmentId: string; status: string; arrangement: string | null; events: unknown[]; trackingNumber: string | null }[];
    };

    assert.equal(body.shipments.length, 2);
    const bare = body.shipments.find((s) => s.fulfillmentId === "ful_bare")!;
    assert.equal(bare.status, "created");
    assert.equal(bare.arrangement, null);
    assert.equal(bare.trackingNumber, null);
    assert.deepEqual(bare.events, []);

    const bad = body.shipments.find((s) => s.fulfillmentId === "ful_bad")!;
    // An arrangement we do not recognise is reported as absent, not echoed back as a value the UI
    // would have to interpret.
    assert.equal(bad.arrangement, null);
    assert.deepEqual(bad.events, []);
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

  await t.test("a seller connects a channel and the control plane asks the channel service with its tenant", async () => {
    const seen: { url: string; auth: string | undefined; body: unknown }[] = [];
    harness.setChannelTransport(async (url, init) => {
      seen.push({
        url,
        auth: (init.headers as Record<string, string>)?.authorization,
        body: JSON.parse(String(init.body))
      });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ authorizeUrl: "https://auth.example.test/authorize?state=s1", state: "s1", expiresAt: NOW })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/channels/shopee/connect`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { authorizeUrl: string };
    assert.ok(body.authorizeUrl.startsWith("https://auth.example.test/"));

    // The tenant is the session's, not anything the caller sent, and the hop is authenticated with
    // the service token (ADR 0008) rather than a seller session.
    assert.equal(seen.length, 1);
    assert.deepEqual(seen[0]?.body, { tenantId });
    assert.equal(seen[0]?.auth, `Bearer ${SERVICE_TOKEN}`);
    assert.ok(seen[0]?.url.endsWith("/v1/channels/shopee/authorize"));
  });

  await t.test("the channel list is scoped to the session's tenant and names every channel we serve", async () => {
    let askedTenant: unknown = null;
    harness.setChannelTransport(async (_url, init) => {
      askedTenant = (JSON.parse(String(init.body)) as { tenantId: unknown }).tenantId;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            connections: [
              { tenantId, channel: "shopee", expiresAt: null, context: { shopId: "123" } }
            ]
          })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/channels`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      tenantId: string;
      connections: { channel: string }[];
      availableChannels: string[];
    };

    assert.equal(body.tenantId, tenantId);
    // The tenant asked of the channel service is the session's; there is no id in the request to
    // tamper with.
    assert.equal(askedTenant, tenantId);
    assert.deepEqual(body.connections.map((entry) => entry.channel), ["shopee"]);
    // Every channel we serve is named, so the screen renders "hubungkan" without inferring absence.
    assert.deepEqual(body.availableChannels, ["tiktok_tokopedia", "shopee", "lazada"]);
  });

  await t.test("a seller_viewer may see channels but may not connect or disconnect one", async () => {
    const viewerToken = await login(harness.baseUrl, "viewer@example.com", GOOD_PASSWORD);
    harness.setChannelTransport(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ connections: [] })
    }));

    // `channel:read` is not a write, so a read-only seat keeps it.
    const read = await fetch(`${harness.baseUrl}/v1/seller/channels`, {
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(read.status, 200);

    // Connecting and disconnecting are writes to a credential, and a viewer does not hold them.
    const connect = await fetch(`${harness.baseUrl}/v1/seller/channels/shopee/connect`, {
      method: "POST",
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(connect.status, 403);

    const disconnect = await fetch(`${harness.baseUrl}/v1/seller/channels/shopee/disconnect`, {
      method: "POST",
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(disconnect.status, 403);
  });

  await t.test("an operator impersonates a tenant and the session is read-only and recorded", async () => {
    // The impersonated session must be able to read the tenant's orders.
    harness.setSellerTransport(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ orders: [], count: 0 })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/ops/impersonate`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ tenantId })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      token: string;
      role: string;
      tenantId: string;
      expiresAt: string;
      actor: { email: string };
    };

    assert.equal(body.role, "seller_viewer");
    assert.equal(body.tenantId, tenantId);
    assert.equal(body.actor.email, "ops@example.com");

    // Read-only: the impersonated session can read orders...
    const read = await fetch(`${harness.baseUrl}/v1/seller/orders`, {
      headers: { authorization: `Bearer ${body.token}` }
    });
    assert.equal(read.status, 200);

    // ...but it is a viewer, so it cannot connect a channel (a credential write).
    const write = await fetch(`${harness.baseUrl}/v1/seller/channels/shopee/connect`, {
      method: "POST",
      headers: { authorization: `Bearer ${body.token}` }
    });
    assert.equal(write.status, 403);

    // The audit trail names the actor and the tenant, with the expiry the session actually got.
    const audit = await fetch(`${harness.baseUrl}/v1/ops/impersonations?tenantId=${tenantId}`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(audit.status, 200);
    const auditBody = (await audit.json()) as {
      impersonations: { actorEmail: string; tenantId: string; expiresAt: string }[];
    };
    assert.equal(auditBody.impersonations.length, 1);
    assert.equal(auditBody.impersonations[0]?.actorEmail, "ops@example.com");
    assert.equal(auditBody.impersonations[0]?.tenantId, tenantId);
    assert.equal(auditBody.impersonations[0]?.expiresAt, body.expiresAt);
  });

  await t.test("a seller cannot reach the ops surface, and an operator cannot impersonate an unknown tenant", async () => {
    // A seller credential must not reach either ops route.
    const sellerImpersonate = await fetch(`${harness.baseUrl}/v1/ops/impersonate`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ tenantId })
    });
    assert.equal(sellerImpersonate.status, 403);

    const sellerAudit = await fetch(`${harness.baseUrl}/v1/ops/impersonations`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(sellerAudit.status, 403);

    // Impersonating a tenant that does not exist fails before a session is minted.
    const unknown = await fetch(`${harness.baseUrl}/v1/ops/impersonate`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tnt-does-not-exist" })
    });
    assert.equal(unknown.status, 404);

    // And nothing was recorded for the failed attempt.
    const audit = await fetch(`${harness.baseUrl}/v1/ops/impersonations?tenantId=tnt-does-not-exist`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    const auditBody = (await audit.json()) as { impersonations: unknown[] };
    assert.equal(auditBody.impersonations.length, 0);
  });

  await t.test("the seller channel surface refuses an operator and a service token", async () => {
    const operator = await fetch(`${harness.baseUrl}/v1/seller/channels`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(operator.status, 403);

    const service = await fetch(`${harness.baseUrl}/v1/seller/channels`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(service.status, 401);
  });

  await t.test("an unknown channel is a 404 before any request reaches the channel service", async () => {
    let called = false;
    harness.setChannelTransport(async () => {
      called = true;
      return { ok: true, status: 200, text: async () => "{}" };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/channels/not-a-channel/connect`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 404);
    assert.equal(called, false, "an unknown channel must not be forwarded");
  });

  await t.test("a channel service that cannot be reached is an error, not an empty channel list", async () => {
    harness.setChannelTransport(async () => {
      throw new Error("connection refused");
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/channels`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    // "no channels connected" and "we could not ask" must not look the same.
    assert.equal(response.status, 502);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "UPSTREAM_ERROR");
  });

  await t.test("the warehouse read is the session's tenant, over a Basic credential, and is projected", async () => {
    const seen: { url: string; auth: string | undefined }[] = [];
    harness.setWmsTransport(async (url, init) => {
      seen.push({ url, auth: (init.headers as Record<string, string>)?.authorization });
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            warehouses: [
              { id: "wh_1", name: "Gudang Utama", stockLocationId: "loc_1", tenant_id: "leaked", secret: "nope" }
            ]
          })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { warehouses: Record<string, unknown>[] };

    // The credential is the tenant's Medusa key over HTTP Basic, not a bearer and not the seller's
    // token (ADR 0012), and the path is the tenant instance's own Admin route.
    assert.equal(seen.length, 1);
    assert.ok(seen[0]?.auth?.startsWith("Basic "), "the tenant's admin key must be sent over Basic");
    assert.ok(seen[0]?.url.includes("/admin/wms/warehouses"));

    // The projection strips what the seller may not see: a field the data plane adds (or leaks) does
    // not reach the seller by default (ADR 0016).
    assert.deepEqual(body.warehouses, [{ id: "wh_1", name: "Gudang Utama", stockLocationId: "loc_1" }]);
  });

  await t.test("a seller creates a warehouse and a bin, and the tenant is never in the request", async () => {
    const posts: { url: string; body: unknown }[] = [];
    harness.setWmsTransport(async (url, init) => {
      const body = init.body === undefined ? null : JSON.parse(String(init.body));
      posts.push({ url, body });
      if (url.includes("/warehouses")) {
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ warehouse: { id: "wh_2", name: "Gudang 2", stockLocationId: null } })
        };
      }
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ bin: { id: "bin_2", warehouseId: "wh_2", code: "A-01", kind: "storage" } })
      };
    });

    const warehouse = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "Gudang 2" })
    });
    assert.equal(warehouse.status, 200);
    assert.deepEqual(posts[0]?.body, { name: "Gudang 2", stockLocationId: null });

    const bin = await fetch(`${harness.baseUrl}/v1/seller/wms/bins`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ warehouseId: "wh_2", code: "A-01", kind: "storage" })
    });
    assert.equal(bin.status, 200);
    // The tenant is the session's and is not forwarded in the body: the instance already is that
    // tenant, so there is no tenant field a caller could tamper with.
    assert.deepEqual(posts[1]?.body, { warehouseId: "wh_2", code: "A-01", kind: "storage" });
  });

  await t.test("receiving a purchase order forwards the lines and attributes the act to the seller", async () => {
    let forwarded: Record<string, unknown> | null = null;
    harness.setWmsTransport(async (url, init) => {
      assert.ok(url.includes("/admin/wms/purchase-orders/po_1/receive"));
      forwarded = JSON.parse(String(init.body)) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ receipt: { purchaseOrderId: "po_1", stagingBinId: "bin_stg", status: "received" } })
      };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/wms/purchase-orders/po_1/receive`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ lines: [{ sku: "SKU-1", quantity: 10 }] })
    });
    assert.equal(response.status, 200);
    assert.deepEqual(forwarded, { lines: [{ sku: "SKU-1", quantity: 10 }], actor: sellerAccountId });

    const body = (await response.json()) as { receipt: { status: string; stagingBinId: string } };
    assert.equal(body.receipt.status, "received");
    assert.equal(body.receipt.stagingBinId, "bin_stg");
  });

  await t.test("a wrong-barcode scan is a 422 carrying the engine's message, not a generic failure", async () => {
    harness.setWmsTransport(async () => ({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ message: "Barcode 999 does not match the expected barcode for SKU-1." })
    }));

    const response = await fetch(`${harness.baseUrl}/v1/seller/wms/pick-tasks/task_1/scans`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ sku: "SKU-1", barcode: "999", quantity: 1 })
    });
    // The picker has to know what was expected, so the engine's own message is surfaced rather than
    // replaced by "the request failed".
    assert.equal(response.status, 422);
    const body = (await response.json()) as { error: { code: string; message: string } };
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.match(body.error.message, /does not match the expected barcode/);
  });

  await t.test("a seller_viewer may see the warehouse but may not move stock in it", async () => {
    const viewerToken = await login(harness.baseUrl, "viewer@example.com", GOOD_PASSWORD);
    harness.setWmsTransport(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ warehouses: [] })
    }));

    const read = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(read.status, 200);

    // A receipt, a put-away, a pick and a stocktake are all `wms:write`; a viewer holds only read.
    for (const [path, payload] of [
      ["/v1/seller/wms/put-away", { warehouseId: "w", fromBinId: "a", toBinId: "b", sku: "S", quantity: 1 }],
      ["/v1/seller/wms/purchase-orders", { warehouseId: "w", lines: [{ sku: "S", title: "T", orderedQuantity: 1 }] }],
      ["/v1/seller/wms/pick-tasks", { warehouseId: "w", orderId: "o", packingBinId: "p", lines: [{ sku: "S", quantity: 1 }] }],
      ["/v1/seller/wms/stocktakes", { warehouseId: "w", binId: "b", sku: "S" }]
    ] as const) {
      const response = await fetch(`${harness.baseUrl}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${viewerToken}`, "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      assert.equal(response.status, 403, `${path} must be refused for a viewer`);
    }
  });

  await t.test("an impersonated session may read the warehouse and may not move stock in it", async () => {
    // This is the ADR 0019 read-only floor reaching the warehouse: support sees what the seller
    // sees, and cannot act inside the tenant.
    const impersonated = await fetch(`${harness.baseUrl}/v1/ops/impersonate`, {
      method: "POST",
      headers: { authorization: `Bearer ${operatorToken}`, "content-type": "application/json" },
      body: JSON.stringify({ tenantId })
    });
    assert.equal(impersonated.status, 200);
    const { token } = (await impersonated.json()) as { token: string };

    harness.setWmsTransport(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ bins: [] })
    }));

    const read = await fetch(`${harness.baseUrl}/v1/seller/wms/bins`, {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(read.status, 200);

    const write = await fetch(`${harness.baseUrl}/v1/seller/wms/stocktakes`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ warehouseId: "w", binId: "b", sku: "S" })
    });
    assert.equal(write.status, 403);
  });

  await t.test("the warehouse surface refuses an operator and a service token, and needs a bin for the ledger", async () => {
    const operator = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${operatorToken}` }
    });
    assert.equal(operator.status, 403);

    const service = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(service.status, 401);

    // The ledger is read per bin; an absent `binId` is a bad request, not a whole-ledger dump.
    const noBin = await fetch(`${harness.baseUrl}/v1/seller/wms/stock-movements`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(noBin.status, 422);
  });

  await t.test("an unreachable engine is not an empty warehouse, and a tenant with no key is a hard 404", async () => {
    harness.setWmsTransport(async () => {
      throw new Error("connection refused");
    });
    const down = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(down.status, 502);
    const body = (await down.json()) as { error: { code: string } };
    assert.equal(body.error.code, "UPSTREAM_ERROR");

    await harness.medusaKeys.delete(tenantId);
    harness.setWmsTransport(async () => ({ ok: true, status: 200, text: async () => "{}" }));
    const noKey = await fetch(`${harness.baseUrl}/v1/seller/wms/warehouses`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(noKey.status, 404);
    await harness.medusaKeys.put(tenantId, "sk_test_secret_value");
  });

  await t.test("a malformed warehouse body is 422 before anything crosses to the tenant", async () => {
    let called = false;
    harness.setWmsTransport(async () => {
      called = true;
      return { ok: true, status: 201, text: async () => JSON.stringify({ warehouse: {} }) };
    });

    const response = await fetch(`${harness.baseUrl}/v1/seller/wms/bins`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ warehouseId: "w", code: "", kind: "somewhere" })
    });
    assert.equal(response.status, 422);
    assert.equal(called, false, "a malformed body must not reach the tenant");
  });

  await t.test("a seller can save and read back its rate-shopping rules", async () => {
    // Before anything is saved the tenant gets the default: no constraints, cheapest first. That is
    // what `selectCourier` will be handed, so "unset" and "no rules" must be the same answer.
    const initial = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    assert.equal(initial.status, 200);
    const initialBody = (await initial.json()) as { rules: { strategy: string; allowedCouriers: string[] } };
    assert.equal(initialBody.rules.strategy, "cheapest");
    assert.deepEqual(initialBody.rules.allowedCouriers, []);

    const saved = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        allowedCouriers: ["jne", "sicepat"],
        allowedServiceLevels: ["regular"],
        maxPrice: { amount: 25_000, currency: "IDR" },
        maxEstimatedDays: 4,
        requiresInsurance: false,
        requiresCod: true,
        strategy: "preferred",
        preferredCouriers: ["sicepat", "jne"]
      })
    });
    assert.equal(saved.status, 200);
    const savedBody = (await saved.json()) as { rules: { strategy: string; preferredCouriers: string[] } };
    assert.equal(savedBody.rules.strategy, "preferred");
    assert.deepEqual(savedBody.rules.preferredCouriers, ["sicepat", "jne"]);

    const reread = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      headers: { authorization: `Bearer ${sellerToken}` }
    });
    const rereadBody = (await reread.json()) as { rules: { allowedCouriers: string[]; requiresCod: boolean } };
    assert.deepEqual(rereadBody.rules.allowedCouriers, ["jne", "sicepat"]);
    assert.equal(rereadBody.rules.requiresCod, true);
  });

  await t.test("a rate-shopping rule naming an unknown courier is 422", async () => {
    // The rule reaches `selectCourier`, which would otherwise reject every quote for a courier the
    // seller never wrote. Validating at the boundary keeps that a request error, not a shipping
    // failure discovered later.
    const response = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ strategy: "cheapest", allowedCouriers: ["not-a-courier"] })
    });
    assert.equal(response.status, 422);
  });

  await t.test("a viewer may read rate-shopping rules but not change them", async () => {
    const viewerToken = await login(harness.baseUrl, "viewer@example.com", GOOD_PASSWORD);

    const read = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      headers: { authorization: `Bearer ${viewerToken}` }
    });
    assert.equal(read.status, 200, "a viewer may read the shipping policy");

    const write = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      method: "POST",
      headers: { authorization: `Bearer ${viewerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ strategy: "fastest" })
    });
    assert.equal(write.status, 403, "a viewer may not change the shipping policy");
  });

  await t.test("the worker reads a tenant's rate-shopping rules with a service token", async () => {
    // The shipment-create workflow needs the rules before it can call `selectCourier`, and the worker
    // has no seller session. So the same record the seller writes is readable over the service-token
    // surface; a seller session must not reach it, and an unauthenticated call must not either.
    const saved = await fetch(`${harness.baseUrl}/v1/seller/rate-shopping-rules`, {
      method: "POST",
      headers: { authorization: `Bearer ${sellerToken}`, "content-type": "application/json" },
      body: JSON.stringify({ strategy: "fastest", allowedCouriers: ["jnt"] })
    });
    assert.equal(saved.status, 200);

    const read = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/rate-shopping-rules`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(read.status, 200);
    const body = (await read.json()) as { rules: { strategy: string; allowedCouriers: string[] } };
    assert.equal(body.rules.strategy, "fastest");
    assert.deepEqual(body.rules.allowedCouriers, ["jnt"]);

    // A fresh tenant gets the default rather than a 404: absence and "no rules" are the same answer.
    const fresh = await fetch(`${harness.baseUrl}/v1/tenants/tenant-fresh/rate-shopping-rules`, {
      headers: { authorization: `Bearer ${SERVICE_TOKEN}` }
    });
    assert.equal(fresh.status, 200);
    const freshBody = (await fresh.json()) as { rules: { strategy: string } };
    assert.equal(freshBody.rules.strategy, "cheapest");

    const withoutToken = await fetch(`${harness.baseUrl}/v1/tenants/${tenantId}/rate-shopping-rules`);
    assert.equal(withoutToken.status, 401);
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

    // Termination clears the platform-owned shipping policy too. It is not in the tenant schema the
    // purge drops, so without this the rules would outlive the tenant.
    const cleared = await harness.rateShoppingRules.get(tenantId as never);
    assert.equal(cleared.updatedAt, new Date(0).toISOString());
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
