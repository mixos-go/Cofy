/**
 * Integration plane HTTP tests.
 *
 * These start the real server and make real HTTP requests, because the parts that matter only
 * exist when wired: service-token auth, single-use OAuth state, and "the credential we stored is
 * the credential the connector is handed". Asserting those through a direct call would miss the
 * mistakes this layer is prone to.
 *
 * The connector is a small in-test implementation of `ChannelConnector`, not a mock of our logic:
 * it records what it was given and returns real normalised types, so the route's behaviour is the
 * thing under test.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { ChannelCapabilities, ChannelConnector, Credential } from "@platform/channel-sdk";
import type { ChannelListing, ChannelOrder, ChannelStockLevel, Cursor, Page, TrackingWriteBack } from "@platform/contracts";
import { RateLimitedError } from "@platform/contracts";
import { RateLimitGovernor } from "@platform/rate-governor";
import { createLogger } from "@platform/observability";
import { CredentialStore, InMemorySecretStore } from "@platform/secrets";
import { InMemoryOAuthStateStore } from "../src/oauth-state.ts";
import { createIntegrationPlaneServer } from "../src/http.ts";
import type { RegisteredChannel } from "../src/types.ts";

const SERVICE_TOKEN = "svc-token-1";
const PUBLIC_BASE_URL = "https://integration.example.test";

/** A connector that records its inputs and returns a page whose size the test controls. */
class RecordingConnector implements ChannelConnector {
  readonly channel = "tiktok_tokopedia" as const;

  lastBeginContext: { tenantId: string; redirectUri: string; state: string } | null = null;
  lastCompleteParams: { code: string; state: string } | null = null;
  lastFetchCredential: Credential | null = null;
  ordersInPage = 0;
  caughtUp = true;
  fetchOrdersError: Error | null = null;
  /** How many times the real connector method was reached, to prove a denied call was not sent. */
  orderFetches = 0;

  /** The credential `completeAuthorization` will hand back. */
  credential: Credential = {
    channel: "tiktok_tokopedia",
    accessToken: "act.issued",
    refreshToken: "rft.issued",
    expiresAt: "2026-09-30T00:00:00.000Z",
    context: { shopCipher: "cipher-issued" }
  };

  async beginAuthorization(ctx: {
    tenantId: string;
    redirectUri: string;
    state: string;
  }): Promise<{ url: string }> {
    this.lastBeginContext = ctx;
    return { url: `https://auth.example.test/authorize?state=${ctx.state}` };
  }

  async completeAuthorization(
    _ctx: { tenantId: string; redirectUri: string; state: string },
    params: { code: string; state: string }
  ): Promise<Credential> {
    this.lastCompleteParams = params;
    return this.credential;
  }

  async refreshCredential(credential: Credential): Promise<Credential> {
    return credential;
  }

  async fetchOrders(_cursor: Cursor, credential: Credential): Promise<Page<ChannelOrder>> {
    this.orderFetches += 1;
    this.lastFetchCredential = credential;
    if (this.fetchOrdersError !== null) throw this.fetchOrdersError;
    return {
      items: Array.from({ length: this.ordersInPage }, (_, i) => ({
        channel: "tiktok_tokopedia" as const,
        externalOrderId: `ext-${i}`,
        placedAt: "2026-09-26T00:00:00.000Z",
        buyerEmail: null,
        currency: "IDR" as const,
        lines: [],
        totals: {
          subtotal: { amount: 0, currency: "IDR" as const },
          shipping: { amount: 0, currency: "IDR" as const },
          discount: { amount: 0, currency: "IDR" as const },
          grandTotal: { amount: 0, currency: "IDR" as const }
        }
      })),
      next: { value: this.caughtUp ? null : "more" }
    };
  }

  async acknowledgeOrder(): Promise<void> {}
  lastStockItems: readonly unknown[] | null = null;
  stockCapable = false;
  listingsInPage = 0;

  async pushStock(items: readonly unknown[]): Promise<readonly never[]> {
    this.lastStockItems = items;
    return [];
  }
  async fetchListings(): Promise<Page<ChannelListing>> {
    return {
      items: Array.from({ length: this.listingsInPage }, (_, i) => ({
        channel: "tiktok_tokopedia" as const,
        externalProductId: `prod-${i}`,
        title: "Item",
        status: "active" as const,
        variants: [{ externalSkuId: `sku-${i}`, sku: `SKU-${i}`, externalInventoryId: null }],
        updatedAt: null
      })),
      next: { value: null }
    };
  }
  stockLevelsInPage = 0;
  snapshotCapable = false;
  async fetchStockSnapshot(): Promise<Page<ChannelStockLevel>> {
    return {
      items: Array.from({ length: this.stockLevelsInPage }, (_, i) => ({
        channel: "tiktok_tokopedia" as const,
        externalSkuId: `sku-${i}`,
        sku: `SKU-${i}`,
        available: i
      })),
      next: { value: null }
    };
  }
  webhookHandlers(): Readonly<Record<string, never>> {
    return {};
  }
  trackingCapable = false;
  /** What `attachTrackingNumber` was given, so a test can prove the route passed the write through. */
  lastTrackingWrite: { externalOrderId: string; tracking: TrackingWriteBack } | null = null;
  trackingWrites = 0;

  async attachTrackingNumber(
    externalOrderId: string,
    tracking: TrackingWriteBack
  ): Promise<void> {
    this.trackingWrites += 1;
    this.lastTrackingWrite = { externalOrderId, tracking };
  }
  capabilities(): ChannelCapabilities {
    return {
      supportsOrderPull: true,
      supportsStockPush: this.stockCapable,
      supportsWebhooks: false,
      supportsOrderAcknowledgement: false,
      splitsOrderHistory: true,
      supportsListingRead: true,
      supportsStockSnapshotRead: this.snapshotCapable,
      supportsTrackingWriteBack: this.trackingCapable
    };
  }
}

interface Harness {
  server: Server;
  baseUrl: string;
  connector: RecordingConnector;
  credentials: CredentialStore;
  states: InMemoryOAuthStateStore;
  governor: RateLimitGovernor;
  close: () => Promise<void>;
}

async function startHarness(
  options: { readonly appCapacity?: number } = {}
): Promise<Harness> {
  const logger = createLogger("error", {}, () => {});
  const connector = new RecordingConnector();
  const secrets = new InMemorySecretStore();
  const credentials = new CredentialStore(secrets);
  const states = new InMemoryOAuthStateStore();
  // A large-but-finite budget by default so tests that are not about rate limiting never trip it;
  // the rate-limit tests pass a small capacity to reach the limit deliberately.
  const governor = new RateLimitGovernor({
    appBudgets: {
      tiktok_tokopedia: { capacity: options.appCapacity ?? 1000, refillPerSecond: 1 }
    }
  });

  const channels: RegisteredChannel[] = [{ channel: "tiktok_tokopedia", connector }];

  const server = createIntegrationPlaneServer({
    credentials,
    channels,
    couriers: [],
    courierKeys: { get: () => null },
    publicBaseUrl: PUBLIC_BASE_URL,
    oauthStates: states,
    serviceTokens: [SERVICE_TOKEN],
    governor,
    logger
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    connector,
    credentials,
    states,
    governor,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  };
}

function serviceHeaders(): Record<string, string> {
  return { authorization: `Bearer ${SERVICE_TOKEN}`, "content-type": "application/json" };
}

test("health is public and reports the registered channels", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { status: string; channels: string[] };
    assert.equal(body.status, "ok");
    assert.deepEqual(body.channels, ["tiktok_tokopedia"]);
  } finally {
    await h.close();
  }
});

test("authorize requires a service token", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/authorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 401);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "UNAUTHENTICATED");
  } finally {
    await h.close();
  }
});

test("a wrong, malformed, or non-bearer token is refused", async () => {
  const h = await startHarness();
  try {
    const attempt = async (authorization: string): Promise<number> => {
      const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/authorize`, {
        method: "POST",
        headers: { authorization, "content-type": "application/json" },
        body: JSON.stringify({ tenantId: "tnt-a" })
      });
      return response.status;
    };

    assert.equal(await attempt("Bearer wrong-token"), 401);
    assert.equal(await attempt("Bearer "), 401);
    assert.equal(await attempt("Basic svc-token-1"), 401);
    // A prefix of the real token must not pass: length is part of the comparison.
    assert.equal(await attempt("Bearer svc-token"), 401);
  } finally {
    await h.close();
  }
});

test("authorize returns a URL and a state, and gives the connector the derived redirect URI", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/authorize`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { authorizeUrl: string; state: string };

    assert.ok(body.authorizeUrl.includes(body.state), "the URL must carry the state it was issued for");

    // The redirect URI is built from the configured public origin, not from a request header.
    assert.equal(h.connector.lastBeginContext?.tenantId, "tnt-a");
    assert.equal(
      h.connector.lastBeginContext?.redirectUri,
      `${PUBLIC_BASE_URL}/v1/channels/tiktok_tokopedia/callback`
    );
  } finally {
    await h.close();
  }
});

test("callback consumes the state, exchanges the code, and stores the credential", async () => {
  const h = await startHarness();
  try {
    const state = await h.states.create({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      redirectUri: `${PUBLIC_BASE_URL}/v1/channels/tiktok_tokopedia/callback`,
      now: new Date()
    });

    const response = await fetch(
      `${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=the-code&state=${state.state}`
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as { connected: boolean };
    assert.equal(body.connected, true);

    assert.deepEqual(h.connector.lastCompleteParams, { code: "the-code", state: state.state });

    // The credential the connector returned is what lands in the store, keyed by the tenant.
    const stored = await h.credentials.get({ tenantId: "tnt-a", channel: "tiktok_tokopedia" });
    assert.ok(stored);
    assert.equal(stored.accessToken, "act.issued");
    assert.deepEqual(stored.context, { shopCipher: "cipher-issued" });
  } finally {
    await h.close();
  }
});

test("a replayed callback is refused and the code is never exchanged twice", async () => {
  const h = await startHarness();
  try {
    const state = await h.states.create({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      redirectUri: `${PUBLIC_BASE_URL}/v1/channels/tiktok_tokopedia/callback`,
      now: new Date()
    });

    const first = await fetch(
      `${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=c1&state=${state.state}`
    );
    assert.equal(first.status, 200);

    const replay = await fetch(
      `${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=c2&state=${state.state}`
    );
    assert.equal(replay.status, 403);
    const body = (await replay.json()) as { error: { code: string } };
    assert.equal(body.error.code, "FORBIDDEN");

    // The replay never reached the connector: the recorded code is still the first one.
    assert.equal(h.connector.lastCompleteParams?.code, "c1");
  } finally {
    await h.close();
  }
});

test("an unknown state is refused", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=c&state=nope`);
    assert.equal(response.status, 403);
  } finally {
    await h.close();
  }
});

test("a state issued for one channel cannot complete another channel's callback", async () => {
  const h = await startHarness();
  try {
    const state = await h.states.create({
      tenantId: "tnt-a",
      channel: "shopee",
      redirectUri: `${PUBLIC_BASE_URL}/v1/channels/shopee/callback`,
      now: new Date()
    });

    const response = await fetch(
      `${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=c&state=${state.state}`
    );
    assert.equal(response.status, 403);
  } finally {
    await h.close();
  }
});

test("an expired state is refused", async () => {
  const h = await startHarness();
  try {
    const states = new InMemoryOAuthStateStore({ ttlSeconds: 1 });
    const state = await states.create({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      redirectUri: `${PUBLIC_BASE_URL}/v1/channels/tiktok_tokopedia/callback`,
      now: new Date("2026-09-26T00:00:00.000Z")
    });

    const consumed = await states.consume(state.state, new Date("2026-09-26T00:00:05.000Z"));
    assert.equal(consumed, null);
  } finally {
    await h.close();
  }
});

test("a callback with no code or state is a validation failure", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/callback?code=` );
    assert.equal(response.status, 422);
  } finally {
    await h.close();
  }
});

test("probe loads the stored credential and hands exactly that to the connector", async () => {
  const h = await startHarness();
  try {
    await h.credentials.put({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      accessToken: "act.stored",
      refreshToken: "rft.stored",
      expiresAt: null,
      context: { shopCipher: "cipher-stored" }
    });

    h.connector.ordersInPage = 3;
    h.connector.caughtUp = false;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/probe`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      reachable: boolean;
      ordersInFirstPage: number;
      caughtUp: boolean;
    };
    assert.equal(body.reachable, true);
    assert.equal(body.ordersInFirstPage, 3);
    assert.equal(body.caughtUp, false);

    // The proof: the connector saw the stored token, not a caller-supplied one.
    assert.equal(h.connector.lastFetchCredential?.accessToken, "act.stored");
    assert.deepEqual(h.connector.lastFetchCredential?.context, { shopCipher: "cipher-stored" });
  } finally {
    await h.close();
  }
});

test("probe reports a disconnected channel rather than throwing an upstream error", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/probe`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-none" })
    });
    assert.equal(response.status, 502);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "CHANNEL_DISCONNECTED");
  } finally {
    await h.close();
  }
});

test("an unknown channel is a 404, not a crash", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/lazada/probe`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 404);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "NOT_FOUND");
  } finally {
    await h.close();
  }
});

/** Connects tnt-a with a stored credential, the precondition for the worker routes. */
async function connect(h: Harness): Promise<void> {
  await h.credentials.put({
    tenantId: "tnt-a",
    channel: "tiktok_tokopedia",
    accessToken: "act.stored",
    refreshToken: "rft.stored",
    expiresAt: null,
    context: { shopCipher: "cipher-stored" }
  });
}

test("the order page route requires a service token", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });
    assert.equal(response.status, 401);
  } finally {
    await h.close();
  }
});

test("the order page route returns one page and an opaque next cursor", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.ordersInPage = 2;
    h.connector.caughtUp = false;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { items: unknown[]; nextCursor: string | null };
    assert.equal(body.items.length, 2);
    // The workflow owns pagination; this plane returns the token, it does not walk the cursor.
    assert.equal(body.nextCursor, "more");
  } finally {
    await h.close();
  }
});

test("the listings page route returns the normalised variants the mapping needs", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.listingsInPage = 1;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/listings/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { items: { variants: { sku: string | null }[] }[] };
    assert.equal(body.items[0]?.variants[0]?.sku, "SKU-0");
  } finally {
    await h.close();
  }
});

test("the stock snapshot route returns the levels the comparison needs", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.snapshotCapable = true;
    h.connector.stockLevelsInPage = 2;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/stock-snapshot/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { items: { sku: string | null }[]; nextCursor: string | null };
    assert.equal(body.items.length, 2);
    assert.equal(body.items[0]?.sku, "SKU-0");
  } finally {
    await h.close();
  }
});

test("the stock snapshot route refuses a channel that cannot report stock", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.snapshotCapable = false;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/stock-snapshot/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });

    assert.equal(response.status, 422);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_FAILED");
  } finally {
    await h.close();
  }
});

test("the capabilities route reports what a connector can do without a stored credential", async () => {
  const h = await startHarness();
  try {
    // Deliberately not connected: the worker asks before a seller has connected, so the answer must
    // not depend on a credential (docs/adr/0015).
    h.connector.snapshotCapable = true;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/capabilities`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({})
    });

    assert.equal(response.status, 200);
    const body = (await response.json()) as { capabilities: { supportsStockSnapshotRead: boolean } };
    assert.equal(body.capabilities.supportsStockSnapshotRead, true);
  } finally {
    await h.close();
  }
});

test("the stock route refuses a channel that declares it cannot push stock", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    // The connector says so itself; the plane must not call it and hope.
    h.connector.stockCapable = false;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/stock`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", items: [{ sku: "SKU-1", available: 5 }] })
    });

    assert.equal(response.status, 422);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_FAILED");
    assert.equal(h.connector.lastStockItems, null, "the connector was never called");
  } finally {
    await h.close();
  }
});

test("the stock route hands the connector the payload with its marketplace addresses", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.stockCapable = true;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/stock`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        tenantId: "tnt-a",
        items: [{ sku: "SKU-1", available: 5, externalProductId: "prod-1", externalSkuId: "sku-1" }]
      })
    });

    assert.equal(response.status, 200);
    assert.deepEqual(h.connector.lastStockItems, [
      { sku: "SKU-1", available: 5, externalProductId: "prod-1", externalSkuId: "sku-1" }
    ]);
  } finally {
    await h.close();
  }
});

test("a call over the app budget is refused with a 429 and a Retry-After, and never reaches the connector", async () => {
  // One token, positive refill. The first call spends it; the second must be refused rather than
  // sent, because the governor exists precisely to keep the marketplace from seeing the overflow.
  const h = await startHarness({ appCapacity: 1 });
  try {
    await connect(h);

    const first = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });
    assert.equal(first.status, 200);
    const fetchesAfterFirst = h.connector.orderFetches;

    const second = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });
    assert.equal(second.status, 429);
    assert.ok(second.headers.get("retry-after") !== null, "a 429 must tell the caller when to retry");

    const body = (await second.json()) as { error: { code: string } };
    assert.equal(body.error.code, "CHANNEL_RATE_LIMITED");

    // The point of the refusal: the marketplace was not called a second time.
    assert.equal(h.connector.orderFetches, fetchesAfterFirst);
  } finally {
    await h.close();
  }
});

test("a rate-limit response from the channel pauses every tenant on that channel", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    await h.credentials.put({
      tenantId: "tnt-b",
      channel: "tiktok_tokopedia",
      accessToken: "act.stored-b",
      refreshToken: "rft.stored-b",
      expiresAt: null,
      context: { shopCipher: "cipher-stored-b" }
    });
    h.connector.fetchOrdersError = new RateLimitedError("TikTok says slow down.", 30);

    const first = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", cursor: null })
    });
    assert.equal(first.status, 429);
    assert.equal(first.headers.get("retry-after"), "30");

    h.connector.fetchOrdersError = null;
    h.connector.orderFetches = 0;

    // A different tenant on the same channel inherits the cooldown: the app key is shared, so one
    // tenant's rate limit is everyone's, and the second call must not go out.
    const second = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/orders/page`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-b", cursor: null })
    });
    assert.equal(second.status, 429);
    assert.equal(h.connector.orderFetches, 0, "the channel was not called during the cooldown");
  } finally {
    await h.close();
  }
});

test("connections lists a tenant's channels as summaries and never a token", async () => {
  const h = await startHarness();
  try {
    await h.credentials.put({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      accessToken: "act.secret-value",
      refreshToken: "rft.secret-value",
      expiresAt: "2026-10-01T00:00:00.000Z",
      context: { shopCipher: "cipher-a" }
    });
    // A second tenant's credential must not appear in this tenant's list.
    await h.credentials.put({
      tenantId: "tnt-b",
      channel: "tiktok_tokopedia",
      accessToken: "act.other",
      refreshToken: null,
      expiresAt: null,
      context: {}
    });

    const response = await fetch(`${h.baseUrl}/v1/channels/connections`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      connections: { tenantId: string; channel: string; expiresAt: string | null; context: Record<string, string> }[];
    };

    assert.equal(body.connections.length, 1);
    assert.equal(body.connections[0]?.tenantId, "tnt-a");
    assert.equal(body.connections[0]?.channel, "tiktok_tokopedia");
    assert.equal(body.connections[0]?.expiresAt, "2026-10-01T00:00:00.000Z");
    assert.deepEqual(body.connections[0]?.context, { shopCipher: "cipher-a" });
    // The whole point of the summary: a token must not be reachable through it.
    assert.ok(!JSON.stringify(body).includes("act.secret-value"));
    assert.ok(!JSON.stringify(body).includes("rft.secret-value"));
  } finally {
    await h.close();
  }
});

test("connections requires a service token", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/connections`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 401);
  } finally {
    await h.close();
  }
});

test("disconnect revokes a channel's credential", async () => {
  const h = await startHarness();
  try {
    await connect(h);

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/disconnect`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { disconnected: boolean; channel: string };
    assert.equal(body.disconnected, true);
    assert.equal(body.channel, "tiktok_tokopedia");

    // The credential is gone, so it cannot be handed to a connector any more.
    const stored = await h.credentials.get({ tenantId: "tnt-a", channel: "tiktok_tokopedia" });
    assert.equal(stored, null);
  } finally {
    await h.close();
  }
});

test("disconnecting an already-disconnected channel is a no-op, not an error", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/disconnect`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-none" })
    });
    // Idempotent: the seller's intent is already satisfied. A 404 would only teach them to retry.
    assert.equal(response.status, 200);
  } finally {
    await h.close();
  }
});

test("disconnect refuses an unknown channel rather than clearing an arbitrary key", async () => {
  const h = await startHarness();
  try {
    const response = await fetch(`${h.baseUrl}/v1/channels/not-a-channel/disconnect`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a" })
    });
    assert.equal(response.status, 404);
  } finally {
    await h.close();
  }
});

test("the tracking route writes the waybill through the connector with the stored credential", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.trackingCapable = true;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/tracking`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        tenantId: "tnt-a",
        externalOrderId: "ext-1",
        trackingNumber: "JX1234567890",
        trackingUrl: "https://track.example.test/JX1234567890"
      })
    });

    assert.equal(response.status, 200);
    assert.deepEqual(h.connector.lastTrackingWrite, {
      externalOrderId: "ext-1",
      tracking: { trackingNumber: "JX1234567890", trackingUrl: "https://track.example.test/JX1234567890" }
    });
  } finally {
    await h.close();
  }
});

test("the tracking route refuses a channel that cannot write tracking back", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.trackingCapable = false;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/tracking`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", externalOrderId: "ext-1", trackingNumber: "JX1" })
    });

    assert.equal(response.status, 422);
    const body = (await response.json()) as { error: { code: string } };
    assert.equal(body.error.code, "VALIDATION_FAILED");
    // The connector must not have been reached: a capability gate that still calls is not a gate.
    assert.equal(h.connector.trackingWrites, 0);
  } finally {
    await h.close();
  }
});

test("the tracking route defaults a missing trackingUrl to null", async () => {
  const h = await startHarness();
  try {
    await connect(h);
    h.connector.trackingCapable = true;

    const response = await fetch(`${h.baseUrl}/v1/channels/tiktok_tokopedia/tracking`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", externalOrderId: "ext-1", trackingNumber: "JX1" })
    });

    assert.equal(response.status, 200);
    assert.deepEqual(h.connector.lastTrackingWrite?.tracking, { trackingNumber: "JX1", trackingUrl: null });
  } finally {
    await h.close();
  }
});
