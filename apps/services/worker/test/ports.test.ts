/**
 * Outbound-port tests.
 *
 * The integration plane answers a throttled call with `429` and `CHANNEL_RATE_LIMITED`. The worker
 * rebuilds that error from the HTTP response, and if it derived retryability from the status alone
 * it would mark the call terminal — so this is the seam where the governor's decision can be lost.
 * These tests pin the mapping.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import { HttpChannelGateway, HttpCommerceClient, HttpSyncStateClient } from "../src/ports.ts";
import type { Transport } from "@platform/http-transport";

/** A fetch that returns one canned error response, so the mapping is the only thing under test. */
function errorTransport(status: number, code: string): typeof fetch {
  return (async () =>
    ({
      ok: false,
      status,
      text: async () => JSON.stringify({ error: { code, message: "denied", details: {} } })
    }) as Response) as unknown as typeof fetch;
}

const gateway = (transport: typeof fetch): HttpChannelGateway =>
  new HttpChannelGateway({ baseUrl: "https://planes.example.test", serviceToken: "svc", transport });

test("a 429 CHANNEL_RATE_LIMITED is retryable, even though 429 is not a 5xx", async () => {
  const error = await gateway(errorTransport(429, "CHANNEL_RATE_LIMITED"))
    .fetchOrders({ tenantId: "tnt-a", channel: "shopee", cursor: null })
    .then(
      () => null,
      (caught: unknown) => caught
    );

  assert.ok(error instanceof PlatformError);
  assert.equal(error.code, "CHANNEL_RATE_LIMITED");
  assert.equal(error.retryable, true);
});

test("a 404 is terminal, so a missing route is not retried forever", async () => {
  const error = await gateway(errorTransport(404, "NOT_FOUND"))
    .fetchOrders({ tenantId: "tnt-a", channel: "shopee", cursor: null })
    .then(
      () => null,
      (caught: unknown) => caught
    );

  assert.ok(error instanceof PlatformError);
  assert.equal(error.retryable, false);
});

/** A fetch that records the URL and returns one canned JSON body. */
function jsonTransport(body: unknown, seen: string[]): typeof fetch {
  return (async (url: string) =>
    ({
      ok: true,
      status: 200,
      text: async () => {
        seen.push(String(url));
        return JSON.stringify(body);
      }
    }) as unknown as Response) as unknown as typeof fetch;
}

test("listOrderRefs addresses the target in the path, matching the control-plane route", async () => {
  const seen: string[] = [];
  const client = new HttpSyncStateClient({
    baseUrl: "https://planes.example.test",
    serviceToken: "svc",
    transport: jsonTransport({ refs: [] }, seen)
  });

  await client.listOrderRefs({ tenantId: "tnt-a", channel: "shopee", status: "failed", limit: 5 });

  // The route is `/v1/sync/order-refs/:tenantId/:channel`; a query-addressed variant would 404 in
  // production while every test that stubs the client kept passing.
  assert.equal(
    seen[0],
    "https://planes.example.test/v1/sync/order-refs/tnt-a/shopee?status=failed&limit=5"
  );
});

test("listOrderRefs unwraps the envelope the control-plane route returns", async () => {
  const seen: string[] = [];
  const client = new HttpSyncStateClient({
    baseUrl: "https://planes.example.test",
    serviceToken: "svc",
    transport: jsonTransport(
      { refs: [{ tenantId: "tnt-a", channel: "shopee", externalOrderId: "o-1", status: "failed" }] },
      seen
    )
  });

  const refs = await client.listOrderRefs({ tenantId: "tnt-a", channel: "shopee" });

  assert.equal(refs.length, 1);
  assert.equal(refs[0]?.externalOrderId, "o-1");
  assert.equal(seen[0], "https://planes.example.test/v1/sync/order-refs/tnt-a/shopee");
});

test("reopenOrderRef posts to the reopen route", async () => {
  const seen: string[] = [];
  const client = new HttpSyncStateClient({
    baseUrl: "https://planes.example.test",
    serviceToken: "svc",
    transport: jsonTransport({ tenantId: "tnt-a", channel: "shopee", status: "reserved" }, seen)
  });

  await client.reopenOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "o-1" });

  assert.equal(seen[0], "https://planes.example.test/v1/sync/order-refs/reopen");
});

/**
 * The stock-snapshot and capability hops (docs/adr/0015).
 *
 * These three paths are the seam where a capability check and the walk it guards can drift apart: if
 * the worker asked a route the plane does not serve, arming would silently fall back to "no channel
 * can report stock" and stock drift would never be detected. Pinning the paths here is what keeps
 * that from being a silent degradation.
 */
function transportSeen(body: unknown, seen: { url: string; method: string }[]): Transport {
  return async (url, init) => {
    seen.push({ url, method: init.method ?? "GET" });
    return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) };
  };
}

/** The same recorder shaped as `fetch`, which is what the gateway takes (it passes a full RequestInit). */
function fetchSeen(body: unknown, seen: { url: string; method: string }[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    seen.push({ url: String(input), method: init?.method ?? "GET" });
    return {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(body))
    } as Response;
  }) as unknown as typeof fetch;
}

test("capabilities asks the channel's capability route and unwraps the envelope", async () => {
  const seen: { url: string; method: string }[] = [];
  const gateway = new HttpChannelGateway({
    baseUrl: "https://planes.example.test",
    serviceToken: "svc",
    transport: fetchSeen({ channel: "shopee", capabilities: { supportsStockSnapshotRead: true } }, seen)
  });

  const capabilities = await gateway.capabilities({ channel: "shopee" });

  assert.equal(capabilities.supportsStockSnapshotRead, true);
  assert.equal(seen[0]?.url, "https://planes.example.test/v1/channels/shopee/capabilities");
});

test("fetchStockSnapshot posts to the snapshot page route with the cursor", async () => {
  const seen: { url: string; method: string }[] = [];
  const gateway = new HttpChannelGateway({
    baseUrl: "https://planes.example.test",
    serviceToken: "svc",
    transport: fetchSeen({ items: [], nextCursor: null }, seen)
  });

  await gateway.fetchStockSnapshot({ tenantId: "tnt-a", channel: "shopee", cursor: "c1" });

  assert.equal(seen[0]?.url, "https://planes.example.test/v1/channels/shopee/stock-snapshot/page");
  assert.equal(seen[0]?.method, "POST");
});

test("listStockLevels repeats the sku query param and unwraps the levels", async () => {
  const seen: { url: string; method: string }[] = [];
  const client = new HttpCommerceClient({
    resolver: {
      resolve: async () => ({ baseUrl: "https://a.medusa.example", secretKey: "key-a" })
    },
    transport: transportSeen({ levels: [{ sku: "SKU-1", available: 5 }] }, seen)
  });

  const levels = await client.listStockLevels({ tenantId: "tnt-a", skus: ["SKU-1", "SKU-2"] });

  assert.deepEqual(levels, [{ sku: "SKU-1", available: 5 }]);
  // One `sku=` per value, which is the shape the route's validator accepts.
  assert.equal(seen[0]?.url, "https://a.medusa.example/admin/stock-levels?sku=SKU-1&sku=SKU-2");
});

test("recordShipment posts the order, SKUs and waybill to the tenant's shipment route", async () => {
  const seen: { url: string; method: string; body: unknown }[] = [];
  const client = new HttpCommerceClient({
    resolver: {
      resolve: async () => ({ baseUrl: "https://a.medusa.example", secretKey: "key-a" })
    },
    transport: (async (url, init) => {
      seen.push({ url, method: init.method ?? "GET", body: JSON.parse(String(init.body)) });
      return {
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ fulfillmentId: "ful_1", trackingNumber: "JNE-1" }))
      };
    }) as Transport
  });

  const result = await client.recordShipment({
    tenantId: "tnt-a",
    orderId: "order_1",
    items: [{ sku: "SHIP-SKU", quantity: 2 }],
    shipment: {
      courier: "jne",
      serviceLevel: "regular",
      trackingNumber: "JNE-1",
      status: "created",
      createdAt: "2026-09-26T00:00:00.000Z"
    },
    trackingUrl: "https://track.example.test/JNE-1"
  });

  assert.deepEqual(result, { fulfillmentId: "ful_1", trackingNumber: "JNE-1" });
  assert.equal(seen[0]?.url, "https://a.medusa.example/admin/shipments");
  assert.equal(seen[0]?.method, "POST");
  // The route's validator names these fields exactly; the courier/service travel as the shipment's
  // own strings, and the waybill is flattened rather than nested, matching `RecordShipmentSchema`.
  assert.deepEqual(seen[0]?.body, {
    orderId: "order_1",
    items: [{ sku: "SHIP-SKU", quantity: 2 }],
    trackingNumber: "JNE-1",
    trackingUrl: "https://track.example.test/JNE-1",
    courier: "jne",
    serviceLevel: "regular"
  });
});
