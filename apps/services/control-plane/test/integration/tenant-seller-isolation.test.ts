/**
 * Seller isolation across two real tenants (docs/PLAN.md M5 exit criterion 3).
 *
 * The existing tests prove the *shape* of isolation: the seller routes take their tenant from the
 * session, and `authorize` refuses a session that names another tenant. What none of them prove is
 * that two tenants, each with its own engine and its own credential, actually come back with their
 * own data — the claim M5 states as "tenant A cannot see tenant B orders through any UI endpoint".
 *
 * A stubbed transport cannot answer that, because the interesting failure is precisely the one a
 * stub erases: if the control plane resolved the *wrong* tenant's base URL or credential, a stub
 * would still return whatever the test told it to. So this test gives each tenant a genuinely
 * separate Medusa instance — its own schema, its own secret key, its own port — seeds a
 * distinguishable order into each, and drives the real seller HTTP surface with each seller's own
 * session.
 *
 * What it asserts:
 *
 *   1. A's session lists A's order and not B's; B's session lists B's order and not A's.
 *   2. A's session cannot read B's order by id, even with the real id in hand — a cross-tenant URL
 *      is not expressible, and a guessed id is still refused.
 *   3. A's sync-health read does not include a problem recorded against B.
 *   4. A's warehouse, bins, bin contents and ledger are A's own — B's bin id is not found against
 *      A's instance — so the WMS read is scoped by the session's tenant and not by the URL (M6).
 *
 * Skipped when `TEST_DATABASE_URL` is absent, like the other real-Medusa tests, so `pnpm test` runs
 * without a database; run with `pnpm test:integration`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { Pool } from "pg";
import {
  InMemoryAccountStore,
  InMemoryRouteRegistrar,
  InMemorySeeder,
  InMemoryTenantSchemaAdmin,
  InMemoryTenantStore,
  MedusaCliMigrationRunner,
  PostgresTenantSchemaAdmin,
  ProvisioningOrchestrator,
  RecordingMigrationRunner,
  SellerOrderReader,
  SessionManager,
  HttpChannelConnectionClient,
  HttpWmsClient,
  InMemoryAuditLog,
  TenantRegistry,
  TenantTerminationService,
  createControlPlaneServer,
  createLogger,
  createProvisioningHandlers
} from "@platform/control-plane";
import { InMemoryMedusaTargetStore } from "../../src/medusa-target.ts";
import { InMemoryRateShoppingRulesStore } from "../../src/rate-shopping-rules-store.ts";
import { InMemoryMedusaAdminKeyStore, InMemorySecretStore } from "@platform/secrets";
import { InMemorySyncStateStore } from "@platform/sync-state";
import type { ChannelCode, TenantId } from "@platform/contracts";
import {
  DATABASE_URL,
  MEDUSA_CWD,
  SEED_SCRIPT,
  databaseUrlFor,
  runMedusa,
  startServer,
  silentLogger
} from "./medusa-harness.ts";

const GOOD_PASSWORD = "correct horse battery";

const ALPHA: TenantId = "tnt-itest-isolation-alpha";
const BETA: TenantId = "tnt-itest-isolation-beta";

interface SeedResult {
  readonly orderId: string;
  readonly displayId: number;
  readonly secretKey: string;
}

/** Everything one booted tenant contributes to the assertions. */
interface TenantFixture {
  readonly tenantId: TenantId;
  readonly baseUrl: string;
  readonly secretKey: string;
  readonly orderId: string;
  readonly email: string;
  readonly sku: string;
  readonly channel: ChannelCode;
  readonly externalOrderId: string;
  /** A problem recorded against this tenant only, so sync health can be checked for bleed. */
  readonly failedExternalOrderId: string;
  /** A warehouse and bin this tenant owns, with a code no other tenant uses. */
  readonly warehouseId: string;
  readonly binId: string;
  readonly binCode: string;
  readonly server: { stop: () => void };
}

// Response shapes, named rather than `any`: the assertions below are the contract, so a shape
// change should be a compile error here rather than a silent `undefined` at runtime.
interface OrderSummaryBody {
  readonly orderId: string;
  readonly email: string | null;
  readonly channel: ChannelCode | null;
}
interface OrderListBody {
  readonly orders: readonly OrderSummaryBody[];
  readonly total: number;
}
interface OrderDetailBody extends OrderSummaryBody {
  readonly lines: readonly { readonly sku: string | null }[];
}
interface HealthProblemBody {
  readonly externalOrderId: string;
  readonly explanation: string;
}
interface HealthChannelBody {
  readonly channel: ChannelCode;
  readonly unresolved: number;
  readonly problems: readonly HealthProblemBody[];
}
interface HealthBody {
  readonly channels: readonly HealthChannelBody[];
}
interface ErrorBody {
  readonly error: { readonly code: string; readonly message: string };
}
interface WarehouseBody {
  readonly id: string;
  readonly name: string;
}
interface WarehouseListBody {
  readonly warehouses: readonly WarehouseBody[];
}
interface BinBody {
  readonly id: string;
  readonly warehouseId: string;
  readonly code: string;
  readonly kind: string;
}
interface BinListBody {
  readonly bins: readonly BinBody[];
}
interface BinContentsBody {
  readonly binId: string;
  readonly code: string;
  readonly contents: readonly { readonly sku: string; readonly quantity: number }[];
}
interface MovementListBody {
  readonly movements: readonly { readonly id: string; readonly binId: string; readonly kind: string }[];
}

/**
 * Seeds one warehouse with a single storage bin through the tenant's own Admin API, using that
 * tenant's secret key directly.
 *
 * The control plane is deliberately not involved: this is the data the *engine* holds, so a
 * cross-tenant read failure can only be the control plane picking the wrong instance, not the
 * fixture having put the wrong thing there. Each tenant gets a distinct bin code, which is what
 * makes "whose bin came back" answerable from the response alone.
 */
async function seedWarehouse(input: {
  readonly baseUrl: string;
  readonly secretKey: string;
  readonly code: string;
}): Promise<{ readonly warehouseId: string; readonly binId: string }> {
  const auth = `Basic ${Buffer.from(`${input.secretKey}:`).toString("base64")}`;
  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(`${input.baseUrl}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    assert.ok(response.ok, `seeding ${path} failed (${response.status}): ${text.slice(0, 500)}`);
    return JSON.parse(text) as T;
  };

  const warehouse = (
    await post<{ warehouse: { id: string } }>("/admin/wms/warehouses", { name: `Gudang ${input.code}` })
  ).warehouse;
  const bin = (
    await post<{ bin: { id: string } }>("/admin/wms/bins", {
      warehouseId: warehouse.id,
      code: input.code,
      kind: "storage"
    })
  ).bin;
  return { warehouseId: warehouse.id, binId: bin.id };
}

/**
 * Migrates vanilla Medusa into a fresh tenant schema through the runner provisioning uses, seeds one
 * order through the fixture, and boots the instance.
 *
 * The runner is the production `MedusaCliMigrationRunner`, not a hand-rolled spawn: pinning the
 * schema is exactly the part that has broken before (ADR 0011), so a test that bypassed it would
 * not cover the failure it exists for.
 */
async function prepareTenant(input: {
  readonly tenantDatabaseUrl: string;
  readonly schemaName: string;
  readonly tenantId: TenantId;
  readonly port: number;
  readonly email: string;
  readonly channel: ChannelCode;
  readonly externalOrderId: string;
  readonly failedExternalOrderId: string;
  readonly binCode: string;
  readonly schemaAdmin: PostgresTenantSchemaAdmin;
}): Promise<TenantFixture> {
  await input.schemaAdmin.createSchema(input.schemaName);

  await new MedusaCliMigrationRunner({
    connectionString: input.tenantDatabaseUrl,
    cwd: MEDUSA_CWD,
    medusaCommand: `${MEDUSA_CWD}/node_modules/.bin/medusa`,
    timeoutMs: 600_000
  }).run(input.schemaName);

  // A distinct buyer email and SKU per tenant. If the control plane answered a read from the wrong
  // instance, these are the values that would come back instead of the caller's own.
  const sku = `SKU-${input.tenantId}`;
  const env = {
    DATABASE_URL: input.tenantDatabaseUrl,
    DATABASE_SCHEMA: input.schemaName,
    JWT_SECRET: `isolation-itest-${input.tenantId}`,
    COOKIE_SECRET: `isolation-itest-${input.tenantId}`,
    TENANT_ID: input.tenantId,
    SEED_ORDER_EMAIL: input.email,
    SEED_VARIANT_SKU: sku,
    MEDUSA_DISABLE_TELEMETRY: "1",
    CI: "true"
  };

  const seed = await runMedusa(["exec", `./${SEED_SCRIPT}`], env, 300_000);
  const match = /SEED=(\{.*\})/.exec(seed.stdout);
  assert.ok(
    match !== null,
    `the fixture did not print a SEED line for ${input.tenantId}:\n${seed.stdout.slice(-2000)}\n${seed.stderr.slice(-2000)}`
  );
  const seeded = JSON.parse(match[1]!) as SeedResult;

  const server = await startServer(env, input.port, 180_000);

  // The warehouse is seeded through the tenant's own Admin API once the instance is up, so the
  // control-plane read that follows has a real, tenant-owned bin to find or fail to find.
  const warehouse = await seedWarehouse({
    baseUrl: `http://127.0.0.1:${input.port}`,
    secretKey: seeded.secretKey,
    code: input.binCode
  });

  return {
    tenantId: input.tenantId,
    baseUrl: `http://127.0.0.1:${input.port}`,
    secretKey: seeded.secretKey,
    orderId: seeded.orderId,
    email: input.email,
    sku,
    channel: input.channel,
    externalOrderId: input.externalOrderId,
    failedExternalOrderId: input.failedExternalOrderId,
    warehouseId: warehouse.warehouseId,
    binId: warehouse.binId,
    binCode: input.binCode,
    server
  };
}

test(
  "a seller session reads its own tenant's orders and never another tenant's",
  { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false },
  async (t) => {
    const databaseName = `isolation_itest_${process.pid}_${Date.now()}`;
    const admin = new Pool({ connectionString: DATABASE_URL! });
    await admin.query(`create database ${databaseName}`);
    const tenantDatabaseUrl = databaseUrlFor(DATABASE_URL!, databaseName);

    const schemaAdmin = new PostgresTenantSchemaAdmin(tenantDatabaseUrl);
    const alphaSchema = `tenant_isolation_alpha_${process.pid}`;
    const betaSchema = `tenant_isolation_beta_${process.pid}`;
    // A private port range so a parallel run does not collide with a real service.
    const alphaPort = 47_000 + (process.pid % 500);
    const betaPort = alphaPort + 1;

    // Registered before anything can fail, so a half-booted run still tears down.
    const instances: TenantFixture[] = [];
    const controlPlane: { server: Server | null } = { server: null };
    t.after(async () => {
      for (const instance of instances) instance.server.stop();
      controlPlane.server?.close();
      // The schema admin's idle connections must close before the database drops, or
      // `drop ... with (force)` terminates them and node-postgres raises after the test ended.
      await schemaAdmin.close();
      await admin.query(`drop database if exists ${databaseName} with (force)`);
      await admin.end();
    });

    const alpha = await prepareTenant({
      tenantDatabaseUrl,
      schemaName: alphaSchema,
      tenantId: ALPHA,
      port: alphaPort,
      email: "alpha-buyer@example.com",
      channel: "shopee",
      externalOrderId: "alpha-ext-1",
      failedExternalOrderId: "alpha-ext-failed",
      binCode: "ALPHA-A-01",
      schemaAdmin
    });
    instances.push(alpha);

    const beta = await prepareTenant({
      tenantDatabaseUrl,
      schemaName: betaSchema,
      tenantId: BETA,
      port: betaPort,
      email: "beta-buyer@example.com",
      channel: "tiktok_tokopedia",
      externalOrderId: "beta-ext-1",
      failedExternalOrderId: "beta-ext-failed",
      binCode: "BETA-B-02",
      schemaAdmin
    });
    instances.push(beta);

    // Each tenant's own key and target. The control plane must pick the one matching the session;
    // pointing a read at the other base URL or key is the failure this test exists to catch.
    const targets = new InMemoryMedusaTargetStore();
    await targets.set({ tenantId: ALPHA, baseUrl: alpha.baseUrl });
    await targets.set({ tenantId: BETA, baseUrl: beta.baseUrl });
    const keys = new InMemoryMedusaAdminKeyStore();
    await keys.put(ALPHA, alpha.secretKey);
    await keys.put(BETA, beta.secretKey);

    const syncState = new InMemorySyncStateStore();
    const now = new Date().toISOString();
    // Committed refs are what attribute an order to a channel (ADR 0016 point 4).
    await syncState.reserveOrderRef({ tenantId: ALPHA, channel: alpha.channel, externalOrderId: alpha.externalOrderId, now });
    await syncState.commitOrderRef(ALPHA, alpha.channel, alpha.externalOrderId, alpha.orderId, now);
    await syncState.reserveOrderRef({ tenantId: BETA, channel: beta.channel, externalOrderId: beta.externalOrderId, now });
    await syncState.commitOrderRef(BETA, beta.channel, beta.externalOrderId, beta.orderId, now);
    // A failed import for B only, so A's sync health can be checked for bleed.
    await syncState.reserveOrderRef({ tenantId: BETA, channel: beta.channel, externalOrderId: beta.failedExternalOrderId, now });
    await syncState.failOrderRef(BETA, beta.channel, beta.failedExternalOrderId, now);

    const accounts = new InMemoryAccountStore();
    const sessions = new SessionManager({ accounts });
    for (const [tenantId, email] of [
      [ALPHA, "alpha@example.com"],
      [BETA, "beta@example.com"]
    ] as const) {
      await accounts.create({
        email,
        displayName: email,
        password: GOOD_PASSWORD,
        role: "seller_viewer",
        tenantId,
        now
      });
    }

    const logger = createLogger("error", {}, () => {});
    const store = new InMemoryTenantStore();
    const registry = new TenantRegistry({ store, logger });
    const provisioning = new ProvisioningOrchestrator({
      store,
      logger,
      handlers: createProvisioningHandlers({
        schemaAdmin: new InMemoryTenantSchemaAdmin(),
        migrationRunner: new RecordingMigrationRunner(),
        seeder: new InMemorySeeder(),
        routes: new InMemoryRouteRegistrar()
      })
    });
    const termination = new TenantTerminationService({
      store,
      secrets: new InMemorySecretStore(),
      schemaAdmin: new InMemoryTenantSchemaAdmin(),
      logger,
      medusaAdminKeys: keys,
      medusaTargets: targets
    });
    const sellerOrders = new SellerOrderReader({
      targets,
      keys,
      syncState,
      // The real HTTP transport against two real instances: the isolation claim is about which
      // instance answers, so it cannot be asserted through a stub.
      transport: fetch,
      logger: silentLogger
    });

    // A channel client that is never reached in this test: the isolation claim is about the seller
    // *order* read, and a channel route that never runs is the honest way to keep it out of the way.
    const channelConnections = new HttpChannelConnectionClient({
      baseUrl: "https://integration.example.test",
      serviceToken: "unused",
      transport: () => {
        throw new Error("the channel service is not exercised by the isolation test");
      },
      logger: silentLogger
    });

    // The warehouse surface, built the way production builds it and against the same real
    // transports. A tenant's WMS tables live in its own schema, so the isolation claim is about
    // which instance answers and can only be proven against two real instances.
    const wms = new HttpWmsClient({
      targets,
      keys,
      transport: fetch,
      logger: silentLogger
    });

    controlPlane.server = createControlPlaneServer({
      registry,
      provisioning,
      termination,
      sessions,
      syncState,
      medusaTargets: targets,
      rateShoppingRules: new InMemoryRateShoppingRulesStore(),
      serviceTokens: [],
      sellerOrders,
      channelConnections,
      auditLog: new InMemoryAuditLog(),
      wms,
      logger
    });
    await new Promise<void>((resolve) => controlPlane.server!.listen(0, resolve));
    const { port } = controlPlane.server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    const login = async (email: string): Promise<string> => {
      const response = await fetch(`${baseUrl}/v1/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: GOOD_PASSWORD })
      });
      assert.equal(response.status, 200, `login for ${email} failed`);
      return ((await response.json()) as { token: string }).token;
    };
    const get = async <T>(token: string, path: string): Promise<{ status: number; body: T }> => {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { authorization: `Bearer ${token}` }
      });
      return { status: response.status, body: (await response.json()) as T };
    };

    const alphaToken = await login("alpha@example.com");
    const betaToken = await login("beta@example.com");

    await t.test("each seller lists its own order and only its own", async () => {
      const alphaList = await get<OrderListBody>(alphaToken, "/v1/seller/orders");
      assert.equal(alphaList.status, 200);
      assert.equal(alphaList.body.total, 1);
      assert.equal(alphaList.body.orders.length, 1);
      const alphaOrder = alphaList.body.orders[0];
      assert.ok(alphaOrder, "tenant A must see its own order");
      assert.equal(alphaOrder.orderId, alpha.orderId);
      assert.equal(alphaOrder.email, alpha.email);
      assert.equal(alphaOrder.channel, alpha.channel);
      // The other tenant's order must not appear at all, not merely be miscounted.
      assert.ok(
        !JSON.stringify(alphaList.body).includes(beta.orderId),
        "tenant A's list must not contain tenant B's order id"
      );

      const betaList = await get<OrderListBody>(betaToken, "/v1/seller/orders");
      assert.equal(betaList.status, 200);
      assert.equal(betaList.body.total, 1);
      const betaOrder = betaList.body.orders[0];
      assert.ok(betaOrder, "tenant B must see its own order");
      assert.equal(betaOrder.orderId, beta.orderId);
      assert.equal(betaOrder.email, beta.email);
      assert.equal(betaOrder.channel, beta.channel);
      assert.ok(
        !JSON.stringify(betaList.body).includes(alpha.orderId),
        "tenant B's list must not contain tenant A's order id"
      );
    });

    await t.test("a seller reading another tenant's order id is refused, not served", async () => {
      // The real id of the other tenant's order, which a seller must never be able to use.
      const crossRead = await get<ErrorBody>(alphaToken, `/v1/seller/orders/${beta.orderId}`);
      assert.equal(crossRead.status, 404);
      assert.equal(crossRead.body.error.code, "NOT_FOUND");

      // And its own id still works, so the refusal is about the tenant, not a broken route.
      const ownRead = await get<OrderDetailBody>(alphaToken, `/v1/seller/orders/${alpha.orderId}`);
      assert.equal(ownRead.status, 200);
      assert.equal(ownRead.body.orderId, alpha.orderId);
      assert.equal(ownRead.body.lines[0]?.sku, alpha.sku);

      // The same from the other side, so a bug that pinned every read to one tenant cannot pass by
      // leaving one direction correct.
      const betaCrossRead = await get<ErrorBody>(betaToken, `/v1/seller/orders/${alpha.orderId}`);
      assert.equal(betaCrossRead.status, 404);
      const betaOwnRead = await get<OrderDetailBody>(betaToken, `/v1/seller/orders/${beta.orderId}`);
      assert.equal(betaOwnRead.status, 200);
      assert.equal(betaOwnRead.body.lines[0]?.sku, beta.sku);
    });

    await t.test("sync health is scoped to the session's tenant", async () => {
      // B has one failed import; A has none. A's read must not surface B's problem.
      const alphaHealth = await get<HealthBody>(alphaToken, "/v1/sync/health");
      assert.equal(alphaHealth.status, 200);
      const alphaView = alphaHealth.body.channels.find((channel) => channel.channel === beta.channel);
      assert.ok(alphaView, "every known channel is reported, including healthy ones");
      assert.equal(alphaView.unresolved, 0, "tenant A must not see tenant B's failed import");

      const betaHealth = await get<HealthBody>(betaToken, "/v1/sync/health");
      const betaView = betaHealth.body.channels.find((channel) => channel.channel === beta.channel);
      assert.ok(betaView);
      assert.equal(betaView.unresolved, 1);
      assert.equal(betaView.problems[0]?.externalOrderId, beta.failedExternalOrderId);
      // The explanation is prose, not the internal kind: the seller gets an action, not a code.
      assert.match(betaView.problems[0]?.explanation ?? "", /could not be imported/);
    });

    await t.test("each seller reads its own warehouse and never another tenant's", async () => {
      // A's warehouses and bins are A's own, and carry A's codes only.
      const alphaWarehouses = await get<WarehouseListBody>(alphaToken, "/v1/seller/wms/warehouses");
      assert.equal(alphaWarehouses.status, 200);
      assert.ok(
        alphaWarehouses.body.warehouses.some((warehouse) => warehouse.id === alpha.warehouseId),
        "tenant A must see its own warehouse"
      );
      assert.ok(
        !JSON.stringify(alphaWarehouses.body).includes(beta.warehouseId),
        "tenant A's warehouse list must not contain tenant B's warehouse"
      );

      const alphaBins = await get<BinListBody>(alphaToken, "/v1/seller/wms/bins");
      assert.equal(alphaBins.status, 200);
      const alphaBin = alphaBins.body.bins.find((bin) => bin.id === alpha.binId);
      assert.ok(alphaBin, "tenant A must see its own bin");
      assert.equal(alphaBin.code, alpha.binCode);
      assert.ok(
        !JSON.stringify(alphaBins.body).includes(beta.binCode),
        "tenant A's bin list must not contain tenant B's bin code"
      );

      // The same from the other side, so a bug that pinned every read to one instance cannot pass
      // by leaving one direction correct.
      const betaWarehouses = await get<WarehouseListBody>(betaToken, "/v1/seller/wms/warehouses");
      assert.ok(betaWarehouses.body.warehouses.some((warehouse) => warehouse.id === beta.warehouseId));
      assert.ok(!JSON.stringify(betaWarehouses.body).includes(alpha.warehouseId));
      const betaBins = await get<BinListBody>(betaToken, "/v1/seller/wms/bins");
      const betaBin = betaBins.body.bins.find((bin) => bin.id === beta.binId);
      assert.ok(betaBin, "tenant B must see its own bin");
      assert.equal(betaBin.code, beta.binCode);
      assert.ok(!JSON.stringify(betaBins.body).includes(alpha.binCode));
    });

    await t.test("a seller reading another tenant's bin or ledger is refused, not served", async () => {
      // A's own bin resolves and reports A's own code.
      const ownContents = await get<BinContentsBody>(alphaToken, `/v1/seller/wms/bins/${alpha.binId}/contents`);
      assert.equal(ownContents.status, 200);
      assert.equal(ownContents.body.code, alpha.binCode);

      // B's real bin id, held by A's session, is not found against A's instance. The id is not
      // addressable across tenants even when the caller knows it.
      const crossContents = await get<ErrorBody>(alphaToken, `/v1/seller/wms/bins/${beta.binId}/contents`);
      assert.equal(crossContents.status, 404);
      assert.equal(crossContents.body.error.code, "NOT_FOUND");

      // And the ledger read, which takes a bin id from the query, is answered from A's own instance:
      // B's bin does not exist there, so its ledger is empty rather than B's. The route deliberately
      // does not 404 an unknown bin (an empty ledger is a legitimate answer), so the isolation claim
      // is the absence of B's movements, not a status.
      const crossLedger = await get<MovementListBody>(
        alphaToken,
        `/v1/seller/wms/stock-movements?binId=${beta.binId}`
      );
      assert.equal(crossLedger.status, 200);
      assert.equal(
        crossLedger.body.movements.length,
        0,
        "tenant A must not see any of tenant B's movements for B's bin"
      );

      // B's own ledger still reads, so the refusal is about the tenant and not a broken route.
      const betaLedger = await get<MovementListBody>(
        betaToken,
        `/v1/seller/wms/stock-movements?binId=${beta.binId}`
      );
      assert.equal(betaLedger.status, 200);
    });
  }
);
