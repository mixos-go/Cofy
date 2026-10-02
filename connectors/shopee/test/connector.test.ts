/**
 * Shopee connector contract tests.
 *
 * These run with no network: the connector is given a stubbed `fetch`, and every assertion is
 * about *our* code — field mapping, unit conversion, cursor progression, capability declarations,
 * webhook verification and error mapping. The HTTP stub is the outermost edge of the system, so
 * the mapping code under test is real (AGENTS.md §7).
 */

import test from "node:test";
import assert from "node:assert/strict";

import { PlatformError, RateLimitedError } from "@platform/contracts";

import { ShopeeConnector } from "../src/connector.ts";
import type { ShopeeConnectorConfig } from "../src/config.ts";
import { ShopeeError } from "../src/vendor/shopee-sdk.ts";

/** Records the requests we issue and replies with queued bodies. */
function transport(responses: readonly unknown[]): { fetch: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  let index = 0;
  const fetchImpl = async (input: Parameters<typeof fetch>[0]): Promise<Response> => {
    urls.push(String(input));
    const body = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  return { fetch: fetchImpl as typeof fetch, urls };
}

function failingTransport(status: number, body: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
}

function makeConfig(fetchImpl: typeof fetch): ShopeeConnectorConfig {
  return {
    app: { partnerId: 2001887, partnerKey: "partner-key-value" },
    environment: "sandbox",
    region: "GLOBAL",
    webhookUrl: "https://hooks.example.test/shopee",
    lookbackDays: 7,
    detailBatchSize: 50,
    pageSize: 50,
    transport: fetchImpl
  };
}

const credential = {
  channel: "shopee" as const,
  accessToken: "access-token-value",
  refreshToken: "refresh-token-value",
  expiresAt: null,
  context: { shopId: "14701711" }
};

const ORDER_DETAIL_BODY = {
  error: "",
  message: "",
  response: {
    order_list: [
      {
        order_sn: "201214JAJXU6G7",
        currency: "IDR",
        create_time: 1608271872,
        total_amount: 58000,
        estimated_shipping_fee: 5000,
        item_list: [
          {
            order_item_id: 111,
            item_name: "Kaos Polos",
            model_sku: "SKU-KAOS-M",
            model_quantity_purchased: 2,
            model_discounted_price: 24000
          },
          {
            order_item_id: 222,
            item_name: "Topi",
            item_sku: "SKU-TOPI",
            model_quantity_purchased: 1,
            model_discounted_price: 5000
          }
        ]
      }
    ]
  }
};

test("fetchOrders maps Shopee order detail into a normalised ChannelOrder", async () => {
  const { fetch: fetchImpl } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [{ order_sn: "201214JAJXU6G7" }] } },
    ORDER_DETAIL_BODY
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const page = await connector.fetchOrders({ value: null }, credential);

  assert.equal(page.items.length, 1);
  const order = page.items[0];
  assert.ok(order);
  assert.equal(order.channel, "shopee");
  assert.equal(order.externalOrderId, "201214JAJXU6G7");
  assert.equal(order.placedAt, new Date(1608271872 * 1000).toISOString());
  assert.equal(order.lines.length, 2);
  // `model_discounted_price` wins when present; `item_sku` is used when there is no model sku.
  assert.deepEqual(order.lines[0], {
    externalLineId: "111",
    sku: "SKU-KAOS-M",
    title: "Kaos Polos",
    quantity: 2,
    unitPrice: { amount: 2_400_000, currency: "IDR" }
  });
  assert.equal(order.lines[1]?.sku, "SKU-TOPI");
});

test("money is converted from whole rupiah to minor units exactly once", async () => {
  const { fetch: fetchImpl } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [{ order_sn: "201214JAJXU6G7" }] } },
    ORDER_DETAIL_BODY
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);

  // 2 x 24000 + 1 x 5000 = 53000 rupiah of goods. A 100x slip here is the exact bug this guards.
  assert.equal(order.totals.subtotal.amount, 5_300_000);
  assert.equal(order.totals.shipping.amount, 500_000);
  assert.equal(order.totals.grandTotal.amount, 5_800_000);
  // Grand total (58000) exceeds goods + shipping (58000) by nothing, so the discount is zero.
  assert.equal(order.totals.discount.amount, 0);
});

test("a discount is derived when the buyer paid less than the parts add up to", async () => {
  const { fetch: fetchImpl } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [{ order_sn: "ORD-D" }] } },
    {
      error: "",
      response: {
        order_list: [
          {
            order_sn: "ORD-D",
            currency: "IDR",
            create_time: 1608271872,
            total_amount: 45000,
            estimated_shipping_fee: 5000,
            item_list: [
              { order_item_id: 1, item_name: "Item", item_sku: "S", model_quantity_purchased: 1, model_discounted_price: 50000 }
            ]
          }
        ]
      }
    }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);
  assert.equal(order.totals.subtotal.amount, 5_000_000);
  assert.equal(order.totals.grandTotal.amount, 4_500_000);
  assert.equal(order.totals.discount.amount, 1_000_000);
});

test("a non-IDR order is refused rather than mislabelled as rupiah", async () => {
  const { fetch: fetchImpl } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [{ order_sn: "ORD-SGD" }] } },
    { error: "", response: { order_list: [{ order_sn: "ORD-SGD", currency: "SGD", create_time: 1 }] } }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("an order without create_time fails loudly instead of inventing a timestamp", async () => {
  const { fetch: fetchImpl } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [{ order_sn: "ORD-NT" }] } },
    { error: "", response: { order_list: [{ order_sn: "ORD-NT", currency: "IDR" }] } }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "UPSTREAM_ERROR"
  );
});

test("the window walk terminates with a null cursor once it reaches the horizon", async () => {
  // Two pages inside one window, then the window is exhausted.
  const { fetch: fetchImpl } = transport([
    {
      error: "",
      response: { more: true, next_cursor: "CUR-1", order_list: [{ order_sn: "A" }] }
    },
    ORDER_DETAIL_BODY,
    { error: "", response: { more: false, next_cursor: "", order_list: [] } }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const first = await connector.fetchOrders({ value: null }, credential);
  assert.notEqual(first.next.value, null, "first page must hand back a resumable cursor");

  // The lookback is 7 days and the max window is 15 days, so the first window already ends at the
  // horizon and the next page has nowhere further to walk.
  const second = await connector.fetchOrders(first.next, credential);
  assert.equal(second.next.value, null, "reconciliation must be able to detect completion");
  assert.deepEqual(second.items, []);
});

test("a lookback longer than 15 days walks forward in valid steps", async () => {
  const { fetch: fetchImpl, urls } = transport([
    { error: "", response: { more: false, next_cursor: "", order_list: [] } },
    { error: "", response: { more: false, next_cursor: "", order_list: [] } }
  ]);
  const connector = new ShopeeConnector({ ...makeConfig(fetchImpl), lookbackDays: 40 });

  const first = await connector.fetchOrders({ value: null }, credential);
  assert.notEqual(first.next.value, null);

  await connector.fetchOrders(first.next, credential);

  // Every request must respect Shopee's 15-day maximum window.
  for (const url of urls) {
    const params = new URL(url).searchParams;
    const from = Number(params.get("time_from"));
    const to = Number(params.get("time_to"));
    assert.ok(to > from, "window must make forward progress");
    assert.ok(to - from <= 15 * 24 * 60 * 60, "window must not exceed 15 days");
  }
});

test("a cursor we did not produce is rejected instead of being misread", async () => {
  const { fetch: fetchImpl } = transport([{ error: "", response: {} }]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: "not-our-payload" }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("a credential without a shop id cannot be used", async () => {
  const { fetch: fetchImpl } = transport([{ error: "", response: {} }]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, { ...credential, context: {} }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("completeAuthorization persists the shop id and token expiry", async () => {
  const { fetch: fetchImpl } = transport([
    { access_token: "AT", refresh_token: "RT", expire_in: 14400, shop_id_list: [14701711] }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const result = await connector.completeAuthorization(
    { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "state-1" },
    { code: "auth-code", state: "state-1" }
  );

  assert.equal(result.accessToken, "AT");
  assert.equal(result.refreshToken, "RT");
  assert.equal(result.context["shopId"], "14701711");
  assert.notEqual(result.expiresAt, null);
});

test("completeAuthorization rejects a state we did not issue", async () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () =>
      connector.completeAuthorization(
        { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "expected" },
        { code: "auth-code", state: "forged" }
      ),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("refreshCredential requires a refresh token rather than silently reusing the access token", async () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () => connector.refreshCredential({ ...credential, refreshToken: null }),
    (error: unknown) => error instanceof PlatformError && error.code === "CREDENTIAL_EXPIRED"
  );
});

test("an HTTP 429 becomes a RateLimitedError for the governor", async () => {
  const connector = new ShopeeConnector(
    makeConfig(failingTransport(429, { error: "rate_limit", message: "too many requests" }))
  );

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof RateLimitedError && error.retryable
  );
});

test("a rate-limit body inside an HTTP 200 also becomes a RateLimitedError", async () => {
  const connector = new ShopeeConnector(
    makeConfig(transport([{ error: "error_rate_limit", message: "Too many requests" }]).fetch)
  );

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof RateLimitedError
  );
});

test("a 5xx becomes a retryable upstream error and a 401 does not", async () => {
  const serverError = new ShopeeConnector(
    makeConfig(failingTransport(503, { error: "server_error", message: "unavailable" }))
  );
  await assert.rejects(
    () => serverError.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "UPSTREAM_ERROR" && error.retryable
  );

  const unauthorized = new ShopeeConnector(
    makeConfig(failingTransport(401, { error: "invalid_access_token", message: "unauthorized" }))
  );
  await assert.rejects(
    () => unauthorized.fetchOrders({ value: null }, credential),
    (error: unknown) =>
      error instanceof PlatformError && error.code === "UNAUTHENTICATED" && !error.retryable
  );
});

test("capabilities advertise the implemented listing read and stock push", () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));
  const capabilities = connector.capabilities();

  assert.deepEqual(capabilities, {
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: true,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: false,
    supportsListingRead: true,
    supportsStockSnapshotRead: true,
    supportsTrackingWriteBack: false
  });
});

test("pushStock rejects unmapped SKUs as unknown_sku without calling Shopee", async () => {
  const { fetch: fetchImpl, urls } = transport([{ error: "", response: {} }]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const results = await connector.pushStock(
    [
      { sku: "SKU-1", available: 5 },
      { sku: "SKU-2", available: 0 }
    ],
    credential
  );

  assert.equal(results.length, 2);
  assert.ok(results.every((result) => !result.accepted && result.reason === "unknown_sku"));
  assert.equal(urls.length, 0);
});

test("pushStock sends a mapped SKU and accepts it when Shopee reports no failure", async () => {
  const { fetch: fetchImpl, urls } = transport([{ error: "", response: { success_list: [{ model_id: 11 }] } }]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const results = await connector.pushStock(
    [{ sku: "SKU-1", available: 9, externalProductId: "1001", externalSkuId: "11" }],
    credential
  );

  assert.deepEqual(results, [{ sku: "SKU-1", accepted: true, reason: null }]);
  assert.ok(urls[0]?.includes("update_stock"), "the request must go to update_stock");
});

test("pushStock reports channel_error for a model Shopee rejected inside a success envelope", async () => {
  const connector = new ShopeeConnector(
    makeConfig(transport([{ error: "", response: { failure_list: [{ model_id: 11, failed_reason: "invalid" }] } }]).fetch)
  );

  const results = await connector.pushStock(
    [{ sku: "SKU-1", available: 1, externalProductId: "1001", externalSkuId: "11" }],
    credential
  );

  assert.deepEqual(results, [{ sku: "SKU-1", accepted: false, reason: "channel_error" }]);
});

test("fetchListings resolves item ids and models into the platform shape", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL", update_time: 1_700_000_000 }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1001, item_name: "Kaos", item_sku: "SKU-1" }] } },
        { error: "", response: { model: [{ model_id: 11, model_sku: "SKU-1", model_status: "MODEL_NORMAL" }] } }
      ]).fetch
    )
  );

  const page = await connector.fetchListings({ value: null }, credential);

  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.externalProductId, "1001");
  assert.equal(page.items[0]?.status, "active");
  assert.deepEqual(page.items[0]?.variants, [{ externalSkuId: "11", sku: "SKU-1", externalInventoryId: null }]);
  assert.equal(page.next.value, null);
});

test("fetchListings falls back to the item SKU when a single-variant model has none", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL" }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1001, item_sku: "SKU-ITEM" }] } },
        { error: "", response: { model: [{ model_id: 11, model_sku: "" }] } }
      ]).fetch
    )
  );

  const page = await connector.fetchListings({ value: null }, credential);

  assert.equal(page.items[0]?.variants[0]?.sku, "SKU-ITEM");
});

test("fetchListings returns a resumable offset while Shopee reports another page", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL" }], has_next_page: true, next_offset: 50 } },
        { error: "", response: { item_list: [{ item_id: 1001, item_sku: "SKU-1" }] } },
        { error: "", response: { model: [{ model_id: 11, model_sku: "SKU-1" }] } },
        { error: "", response: { item: [{ item_id: 1002, item_status: "NORMAL" }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1002, item_sku: "SKU-2" }] } },
        { error: "", response: { model: [{ model_id: 12, model_sku: "SKU-2" }] } }
      ]).fetch
    )
  );

  const first = await connector.fetchListings({ value: null }, credential);
  assert.notEqual(first.next.value, null);

  const second = await connector.fetchListings(first.next, credential);
  assert.equal(second.items[0]?.externalProductId, "1002");
  assert.equal(second.next.value, null);
});

test("fetchStockSnapshot reports the level each model holds, keyed by the seller SKU", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL" }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1001, item_sku: "SKU-1" }] } },
        {
          error: "",
          response: {
            model: [
              { model_id: 11, model_sku: "SKU-1", stock_info_v2: { summary_info: { total_available_stock: 4 } } }
            ]
          }
        }
      ]).fetch
    )
  );

  const page = await connector.fetchStockSnapshot({ value: null }, credential);

  assert.deepEqual(page.items, [{ channel: "shopee", externalSkuId: "11", sku: "SKU-1", available: 4 }]);
  assert.equal(page.next.value, null);
});

test("fetchStockSnapshot reads an omitted stock field as zero, not as uncomparable", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL" }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1001, item_sku: "SKU-1" }] } },
        { error: "", response: { model: [{ model_id: 11, model_sku: "SKU-1" }] } }
      ]).fetch
    )
  );

  const page = await connector.fetchStockSnapshot({ value: null }, credential);

  assert.equal(page.items[0]?.available, 0);
});

test("fetchStockSnapshot returns a resumable offset while Shopee reports another page", async () => {
  const connector = new ShopeeConnector(
    makeConfig(
      transport([
        { error: "", response: { item: [{ item_id: 1001, item_status: "NORMAL" }], has_next_page: true, next_offset: 50 } },
        { error: "", response: { item_list: [{ item_id: 1001, item_sku: "SKU-1" }] } },
        { error: "", response: { model: [{ model_id: 11, model_sku: "SKU-1", stock_info_v2: { summary_info: { total_available_stock: 1 } } }] } },
        { error: "", response: { item: [{ item_id: 1002, item_status: "NORMAL" }], has_next_page: false } },
        { error: "", response: { item_list: [{ item_id: 1002, item_sku: "SKU-2" }] } },
        { error: "", response: { model: [{ model_id: 12, model_sku: "SKU-2", stock_info_v2: { summary_info: { total_available_stock: 2 } } }] } }
      ]).fetch
    )
  );

  const first = await connector.fetchStockSnapshot({ value: null }, credential);
  assert.notEqual(first.next.value, null);
  const second = await connector.fetchStockSnapshot(first.next, credential);

  assert.deepEqual(second.items.map((item) => [item.sku, item.available]), [["SKU-2", 2]]);
  assert.equal(second.next.value, null);
});

test("acknowledgeOrder fails loudly because the channel has no such operation", async () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () => connector.acknowledgeOrder("201214JAJXU6G7", credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("attachTrackingNumber refuses loudly while Shopee's write-back shape is unresolved", async () => {
  // The capability is `false`; the method must throw rather than no-op, so a caller cannot mistake
  // silence for a written waybill. See the connector comment and M7 known limits.
  const { fetch: fetchImpl, urls } = transport([{ error: "", response: {} }]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.attachTrackingNumber("201214JAJXU6G7", { trackingNumber: "JX1", trackingUrl: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
  assert.equal(urls.length, 0);
});

test("bench begin and complete authorization produce a usable URL and credential", async () => {
  const { fetch: fetchImpl } = transport([
    { access_token: "AT", refresh_token: "RT", expire_in: 14400, shop_id_list: [14701711] }
  ]);
  const connector = new ShopeeConnector(makeConfig(fetchImpl));

  const request = await connector.beginAuthorization({
    tenantId: "tnt-a",
    redirectUri: "https://app.test/cb",
    state: "state-1"
  });
  const url = new URL(request.url);
  assert.equal(url.searchParams.get("partner_id"), "2001887");
  assert.equal(url.searchParams.get("state"), "state-1");
  assert.equal(url.searchParams.get("redirect"), "https://app.test/cb");

  const completed = await connector.completeAuthorization(
    { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "state-1" },
    { code: "auth-code", state: "state-1" }
  );
  assert.equal(completed.context["shopId"], "14701711");
});

test("a push payload is rejected when the signature header is absent", () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));
  const handler = connector.webhookHandlers()["order_status"];
  assert.ok(handler);

  assert.throws(
    () => handler.verify('{"code":3}', {}),
    (error: unknown) => error instanceof PlatformError && error.code === "UNAUTHENTICATED"
  );
});

test("a push payload with a forged signature is rejected", () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));
  const handler = connector.webhookHandlers()["order_status"];
  assert.ok(handler);

  assert.throws(
    () => handler.verify('{"code":3}', { authorization: "deadbeef" }),
    (error: unknown) => error instanceof PlatformError && error.code === "UNAUTHENTICATED"
  );
});

test("normalize yields a stable event id so redelivery dedups", () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));
  const handler = connector.webhookHandlers()["order_status"];
  assert.ok(handler);

  const body = '{"code":3,"shop_id":14701711,"data":{"ordersn":"201214JAJXU6G7"}}';
  const first = handler.normalize(body);
  const second = handler.normalize(body);

  assert.equal(first.eventId, second.eventId);
  assert.equal(first.eventType, "3");
  assert.equal(first.channel, "shopee");
  assert.notEqual(first.eventId, handler.normalize(`${body} `).eventId);
});

test("a non-JSON push body is rejected as a validation failure", () => {
  const connector = new ShopeeConnector(makeConfig(transport([{}]).fetch));
  const handler = connector.webhookHandlers()["order_status"];
  assert.ok(handler);

  assert.throws(
    () => handler.normalize("not json"),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("ShopeeError is recognised so its status can drive retry policy", () => {
  // Guards the import used by errors.ts; a renamed export would break mapping at runtime only.
  const error = new ShopeeError("boom", { error: "boom", status: 500 });
  assert.equal(error.status, 500);
});
