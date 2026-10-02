/**
 * Integration plane courier surface tests (docs/adr/0020).
 *
 * These start the real server and make real HTTP requests, because the parts that matter only exist
 * when wired: service-token auth, the platform key being resolved per courier and never looked up by
 * the provider, the fan-out tolerating one courier failing, and — the point of M7's audit criterion —
 * that the quote `selectCourier` chose is the exact service `createShipment` books.
 *
 * The providers are small in-test implementations of `CourierProvider`, not mocks of our logic: they
 * record what they were given and return real normalised types, so the route's behaviour is the
 * thing under test (AGENTS.md §7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type {
  CourierCapabilities,
  CourierCredential,
  CourierProvider
} from "@platform/courier-sdk";
import type {
  ChannelConnector,
  ChannelCapabilities
} from "@platform/channel-sdk";
import type {
  CourierCode,
  RateShoppingRules,
  Shipment,
  ShipmentQuote,
  ShipmentRequest,
  TrackingEvent
} from "@platform/contracts";
import { selectCourier } from "@platform/contracts";
import { RateLimitGovernor } from "@platform/rate-governor";
import { createLogger } from "@platform/observability";
import { CredentialStore, InMemorySecretStore } from "@platform/secrets";
import { InMemoryOAuthStateStore } from "../src/oauth-state.ts";
import { createIntegrationPlaneServer } from "../src/http.ts";
import type { CourierKeyResolver, RegisteredChannel, RegisteredCourier } from "../src/types.ts";

const SERVICE_TOKEN = "svc-token-1";
const PUBLIC_BASE_URL = "https://integration.example.test";

/** A provider that records its inputs and returns whatever the test configured. */
class RecordingProvider implements CourierProvider {
  readonly courier: CourierCode;
  quotes: readonly ShipmentQuote[];
  quoteError: Error | null = null;
  quoteCalls = 0;
  lastQuoteCredential: CourierCredential | null = null;
  lastQuoteRequest: ShipmentRequest | null = null;
  lastCreateQuote: ShipmentQuote | null = null;
  lastCreateCredential: CourierCredential | null = null;
  lastTrackedNumber: string | null = null;
  lastTrackCredential: CourierCredential | null = null;
  lastCancelledNumber: string | null = null;
  lastCancelCredential: CourierCredential | null = null;
  capabilities_: CourierCapabilities;

  constructor(courier: CourierCode, quotes: readonly ShipmentQuote[], capabilities?: Partial<CourierCapabilities>) {
    this.courier = courier;
    this.quotes = quotes;
    this.capabilities_ = {
      supportsQuoting: true,
      supportsTracking: true,
      supportsCancellation: true,
      supportsInsurance: true,
      supportsCod: true,
      serviceLevels: ["regular"],
      ...capabilities
    };
  }

  async quote(request: ShipmentRequest, credential: CourierCredential): Promise<readonly ShipmentQuote[]> {
    this.quoteCalls += 1;
    this.lastQuoteRequest = request;
    this.lastQuoteCredential = credential;
    if (this.quoteError !== null) throw this.quoteError;
    return this.quotes;
  }

  async createShipment(
    quote: ShipmentQuote,
    _request: ShipmentRequest,
    credential: CourierCredential
  ): Promise<Shipment> {
    this.lastCreateQuote = quote;
    this.lastCreateCredential = credential;
    return {
      courier: quote.courier,
      serviceLevel: quote.serviceLevel,
      trackingNumber: `${quote.courier}-WAYBILL-1`,
      status: "created",
      createdAt: "2026-09-26T12:00:00.000Z"
    };
  }

  async track(trackingNumber: string, credential: CourierCredential): Promise<readonly TrackingEvent[]> {
    this.lastTrackedNumber = trackingNumber;
    this.lastTrackCredential = credential;
    return [
      { status: "created", occurredAt: "2026-09-26T12:00:00.000Z", description: "Shipment created" },
      { status: "in_transit", occurredAt: "2026-09-26T18:00:00.000Z", description: "Departed hub" }
    ];
  }

  async cancelShipment(trackingNumber: string, credential: CourierCredential): Promise<void> {
    this.lastCancelledNumber = trackingNumber;
    this.lastCancelCredential = credential;
  }

  capabilities(): CourierCapabilities {
    return this.capabilities_;
  }
}

/** A connector that does nothing; the channel surface is exercised in `http.test.ts`. */
class StubConnector implements ChannelConnector {
  readonly channel = "tiktok_tokopedia" as const;
  async beginAuthorization(): Promise<{ url: string }> {
    return { url: "https://auth.example.test" };
  }
  async completeAuthorization(): Promise<never> {
    throw new Error("not used");
  }
  async refreshCredential(credential: never): Promise<never> {
    return credential;
  }
  async fetchOrders(): Promise<never> {
    throw new Error("not used");
  }
  async acknowledgeOrder(): Promise<void> {}
  async pushStock(): Promise<readonly never[]> {
    return [];
  }
  async fetchListings(): Promise<never> {
    throw new Error("not used");
  }
  async fetchStockSnapshot(): Promise<never> {
    throw new Error("not used");
  }
  async attachTrackingNumber(): Promise<never> {
    throw new Error("not used");
  }
  webhookHandlers(): Readonly<Record<string, never>> {
    return {};
  }
  capabilities(): ChannelCapabilities {
    return {
      supportsOrderPull: true,
      supportsStockPush: false,
      supportsWebhooks: false,
      supportsOrderAcknowledgement: false,
      splitsOrderHistory: true,
      supportsListingRead: true,
      supportsStockSnapshotRead: false,
      supportsTrackingWriteBack: false
    };
  }
}

interface Harness {
  baseUrl: string;
  providers: Map<CourierCode, RecordingProvider>;
  close: () => Promise<void>;
}

async function startHarness(
  providers: readonly RecordingProvider[],
  keys: Readonly<Partial<Record<CourierCode, string>>>,
  appCapacity = 1000
): Promise<Harness> {
  const logger = createLogger("error", {}, () => {});
  const credentials = new CredentialStore(new InMemorySecretStore());
  const governor = new RateLimitGovernor({
    appBudgets: Object.fromEntries(
      providers.map((p) => [p.courier, { capacity: appCapacity, refillPerSecond: 1 }])
    ),
    sellerBudget: { capacity: 1000, refillPerSecond: 1 }
  });

  const registered: RegisteredCourier[] = providers.map((provider) => ({
    courier: provider.courier,
    provider
  }));
  const channels: RegisteredChannel[] = [{ channel: "tiktok_tokopedia", connector: new StubConnector() }];

  const courierKeys: CourierKeyResolver = {
    get: (courier) => {
      const apiKey = keys[courier];
      return apiKey === undefined ? null : { courier, apiKey, context: {} };
    }
  };

  const server: Server = createIntegrationPlaneServer({
    credentials,
    channels,
    couriers: registered,
    courierKeys,
    publicBaseUrl: PUBLIC_BASE_URL,
    oauthStates: new InMemoryOAuthStateStore(),
    serviceTokens: [SERVICE_TOKEN],
    governor,
    logger
  });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    providers: new Map(providers.map((p) => [p.courier, p])),
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      })
  };
}

function serviceHeaders(): Record<string, string> {
  return { authorization: `Bearer ${SERVICE_TOKEN}`, "content-type": "application/json" };
}

function quote(overrides: Partial<ShipmentQuote> & { courier: CourierCode }): ShipmentQuote {
  return {
    serviceLevel: "regular",
    price: { amount: 20_000, currency: "IDR" },
    estimatedDays: { min: 2, max: 3 },
    supportsInsurance: true,
    supportsCod: true,
    providerQuoteId: `${overrides.courier}-reg`,
    ...overrides
  };
}

const SHIPMENT = {
  orderId: "ord_1",
  destination: { city: "Jakarta", postalCode: "10110", address: "Jl. Merdeka 1" },
  weightGrams: 1200,
  declaredValue: { amount: 150_000, currency: "IDR" },
  requiresInsurance: false,
  requiresCod: false
} as const;

test("health lists the couriers this plane serves", async () => {
  const h = await startHarness([new RecordingProvider("jne", [])], {});
  try {
    const response = await fetch(`${h.baseUrl}/health`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as { couriers: string[] };
    assert.deepEqual(body.couriers, ["jne"]);
  } finally {
    await h.close();
  }
});

test("the courier surface requires a service token", async () => {
  const h = await startHarness([new RecordingProvider("jne", [])], { jne: "key" });
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/quotes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT })
    });
    assert.equal(response.status, 401);
  } finally {
    await h.close();
  }
});

test("capabilities are credential-free and report what each courier supports", async () => {
  const h = await startHarness(
    [new RecordingProvider("jne", [], { supportsCod: false, serviceLevels: ["regular", "express"] })],
    // No key configured: capabilities must still answer, because they are a property of the app
    // registration, not of a seller's connection (docs/adr/0003).
    {}
  );
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/capabilities`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({})
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      couriers: { courier: string; capabilities: CourierCapabilities }[];
    };
    assert.equal(body.couriers.length, 1);
    assert.equal(body.couriers[0]?.courier, "jne");
    assert.equal(body.couriers[0]?.capabilities.supportsCod, false);
    assert.deepEqual(body.couriers[0]?.capabilities.serviceLevels, ["regular", "express"]);
  } finally {
    await h.close();
  }
});

test("quotes fan out across the requested couriers and the provider gets the platform key", async () => {
  const jne = new RecordingProvider("jne", [quote({ courier: "jne" })]);
  const jnt = new RecordingProvider("jnt", [quote({ courier: "jnt" })]);
  const h = await startHarness([jne, jnt], { jne: "jne-key", jnt: "jnt-key" });
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/quotes`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { quotes: ShipmentQuote[]; failures: unknown[] };
    assert.equal(body.quotes.length, 2);
    assert.deepEqual(body.quotes.map((q) => q.courier).sort(), ["jne", "jnt"]);
    assert.deepEqual(body.failures, []);

    // The provider was handed the platform key for its own courier, and the neutral request.
    assert.equal(jne.lastQuoteCredential?.apiKey, "jne-key");
    assert.equal(jnt.lastQuoteCredential?.apiKey, "jnt-key");
    assert.equal(jne.lastQuoteRequest?.weightGrams, 1200);
  } finally {
    await h.close();
  }
});

test("a courier that fails to quote is reported, not fatal, so the others still answer", async () => {
  const jne = new RecordingProvider("jne", [quote({ courier: "jne" })]);
  const jnt = new RecordingProvider("jnt", []);
  jnt.quoteError = new Error("courier is down");
  const h = await startHarness([jne, jnt], { jne: "k", jnt: "k" });
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/quotes`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      quotes: ShipmentQuote[];
      failures: { courier: string; reason: string }[];
    };
    assert.equal(body.quotes.length, 1);
    assert.equal(body.quotes[0]?.courier, "jne");
    assert.deepEqual(body.failures, [{ courier: "jnt", reason: "courier_error" }]);
  } finally {
    await h.close();
  }
});

test("a registered courier with no configured key is an actionable failure, not an empty quote list", async () => {
  const jne = new RecordingProvider("jne", [quote({ courier: "jne" })]);
  const h = await startHarness([jne], {});
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/quotes`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT })
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { quotes: unknown[]; failures: { reason: string }[] };
    assert.equal(body.quotes.length, 0);
    assert.equal(body.failures[0]?.reason, "VALIDATION_FAILED");
    // And the provider was never called with a missing key.
    assert.equal(jne.quoteCalls, 0);
  } finally {
    await h.close();
  }
});

test("the chosen quote is the exact service createShipment books", async () => {
  const jne = new RecordingProvider("jne", [
    quote({ courier: "jne", price: { amount: 30_000, currency: "IDR" }, providerQuoteId: "jne-reg" })
  ]);
  const jnt = new RecordingProvider("jnt", [
    quote({ courier: "jnt", price: { amount: 18_000, currency: "IDR" }, providerQuoteId: "jnt-reg" })
  ]);
  const h = await startHarness([jne, jnt], { jne: "k", jnt: "k" });
  try {
    const quoteResponse = await fetch(`${h.baseUrl}/v1/couriers/quotes`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT })
    });
    const { quotes } = (await quoteResponse.json()) as { quotes: ShipmentQuote[] };

    const rules: RateShoppingRules = {
      allowedCouriers: [],
      allowedServiceLevels: [],
      maxPrice: null,
      maxEstimatedDays: null,
      requiresInsurance: false,
      requiresCod: false,
      strategy: "cheapest",
      preferredCouriers: []
    };
    const selection = selectCourier(quotes, rules, "2026-09-26T12:00:00.000Z");
    assert.equal(selection.chosen?.courier, "jnt");
    assert.equal(selection.chosen?.providerQuoteId, "jnt-reg");

    const createResponse = await fetch(`${h.baseUrl}/v1/couriers/jnt/shipments`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", quote: selection.chosen, shipment: SHIPMENT })
    });
    assert.equal(createResponse.status, 200);
    const { shipment } = (await createResponse.json()) as { shipment: Shipment };
    assert.equal(shipment.trackingNumber, "jnt-WAYBILL-1");
    // The provider booked exactly the quote the audit chose.
    assert.equal(jnt.lastCreateQuote?.providerQuoteId, "jnt-reg");
  } finally {
    await h.close();
  }
});

test("booking a quote under a different courier is refused rather than billed", async () => {
  const jne = new RecordingProvider("jne", [quote({ courier: "jne" })]);
  const h = await startHarness([jne], { jne: "k" });
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/jne/shipments`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({
        tenantId: "tnt-a",
        quote: quote({ courier: "jnt" }),
        shipment: SHIPMENT
      })
    });
    assert.equal(response.status, 422);
    assert.equal(jne.lastCreateQuote, null);
  } finally {
    await h.close();
  }
});

test("tracking returns the courier's events oldest first, and cancel reaches the provider", async () => {
  const jne = new RecordingProvider("jne", []);
  const h = await startHarness([jne], { jne: "k" });
  try {
    const trackResponse = await fetch(`${h.baseUrl}/v1/couriers/jne/tracking`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", trackingNumber: "jne-WAYBILL-1" })
    });
    assert.equal(trackResponse.status, 200);
    const { events } = (await trackResponse.json()) as { events: TrackingEvent[] };
    assert.deepEqual(events.map((e) => e.status), ["created", "in_transit"]);
    assert.equal(jne.lastTrackedNumber, "jne-WAYBILL-1");
    assert.equal(jne.lastTrackCredential?.apiKey, "k");

    const cancelResponse = await fetch(`${h.baseUrl}/v1/couriers/jne/shipments/cancel`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", trackingNumber: "jne-WAYBILL-1" })
    });
    assert.equal(cancelResponse.status, 200);
    assert.equal(jne.lastCancelledNumber, "jne-WAYBILL-1");
  } finally {
    await h.close();
  }
});

test("an unknown courier is a 404, not a crash", async () => {
  const h = await startHarness([new RecordingProvider("jne", [])], { jne: "k" });
  try {
    const response = await fetch(`${h.baseUrl}/v1/couriers/anteraja/tracking`, {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ tenantId: "tnt-a", trackingNumber: "x" })
    });
    assert.equal(response.status, 404);
  } finally {
    await h.close();
  }
});

test("a call over the courier budget is refused with a 429 and never reaches the provider", async () => {
  const jne = new RecordingProvider("jne", [quote({ courier: "jne" })]);
  const h = await startHarness([jne], { jne: "k" }, 1);
  try {
    const call = (): Promise<Response> =>
      fetch(`${h.baseUrl}/v1/couriers/quotes`, {
        method: "POST",
        headers: serviceHeaders(),
        body: JSON.stringify({ tenantId: "tnt-a", shipment: SHIPMENT, couriers: ["jne"] })
      });

    assert.equal((await call()).status, 200);
    const refused = await call();
    assert.equal(refused.status, 429);
    assert.equal(refused.headers.get("retry-after"), "1");
    // The provider saw exactly one call; the denied one never left the plane.
    assert.equal(jne.quoteCalls, 1);
  } finally {
    await h.close();
  }
});
