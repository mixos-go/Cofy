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
import type { ChannelConnector, Credential } from "@platform/channel-sdk";
import type { ChannelOrder, Cursor, Page } from "@platform/contracts";
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
  async pushStock(): Promise<readonly never[]> {
    return [];
  }
  webhookHandlers(): Readonly<Record<string, never>> {
    return {};
  }
  capabilities() {
    return {
      supportsOrderPull: true,
      supportsStockPush: false,
      supportsWebhooks: false,
      supportsOrderAcknowledgement: false,
      splitsOrderHistory: true
    };
  }
}

interface Harness {
  server: Server;
  baseUrl: string;
  connector: RecordingConnector;
  credentials: CredentialStore;
  states: InMemoryOAuthStateStore;
  close: () => Promise<void>;
}

async function startHarness(): Promise<Harness> {
  const logger = createLogger("error", {}, () => {});
  const connector = new RecordingConnector();
  const secrets = new InMemorySecretStore();
  const credentials = new CredentialStore(secrets);
  const states = new InMemoryOAuthStateStore();

  const channels: RegisteredChannel[] = [{ channel: "tiktok_tokopedia", connector }];

  const server = createIntegrationPlaneServer({
    credentials,
    channels,
    publicBaseUrl: PUBLIC_BASE_URL,
    oauthStates: states,
    serviceTokens: [SERVICE_TOKEN],
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
