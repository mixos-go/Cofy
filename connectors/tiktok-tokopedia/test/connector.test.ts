/**
 * TikTok Shop / Tokopedia connector contract tests.
 *
 * No network: the connector is given a stubbed `fetch`, and every assertion is about *our* code —
 * decimal-string to minor-unit conversion, the two-API order read, cursor progression, capability
 * declarations and error mapping (AGENTS.md §7).
 *
 * Note on quantities: TikTok sends one line item per unit and no quantity field, confirmed against a
 * live sandbox order on 2026-09-28. Tests pin that a line item is one unit; see order-schema.ts.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { PlatformError, RateLimitedError } from "@platform/contracts";

import { TikTokConnector } from "../src/connector.ts";
import type { TikTokConnectorConfig } from "../src/config.ts";
import { toPlatformError } from "../src/errors.ts";
import { TikTokError } from "../src/vendor/tiktok-shop-sdk.ts";
import { decimalToMinor, sumDecimals } from "../src/money.ts";

function transport(responses: readonly unknown[]): { fetch: typeof fetch; urls: string[]; bodies: string[] } {
  const urls: string[] = [];
  const bodies: string[] = [];
  let index = 0;
  const fetchImpl = async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    urls.push(String(input));
    bodies.push(typeof init?.body === "string" ? init.body : "");
    const body = responses[Math.min(index, responses.length - 1)];
    index += 1;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  return { fetch: fetchImpl as typeof fetch, urls, bodies };
}

function makeConfig(fetchImpl: typeof fetch): TikTokConnectorConfig {
  return {
    app: { appKey: "app-key-value", appSecret: "app-secret-value" },
    allowedRedirectHosts: [],
    pageSize: 50,
    transport: fetchImpl
  };
}

const credential = {
  channel: "tiktok_tokopedia" as const,
  accessToken: "access-token-value",
  refreshToken: "refresh-token-value",
  expiresAt: null,
  context: { shopCipher: "ROW_cipher-value" }
};

const SEARCH_IDS_ONLY = {
  code: 0,
  data: { orders: [{ id: "576461413038785752" }], next_page_token: "" }
};

const DETAIL_BODY = {
  code: 0,
  data: {
    orders: [
      {
        id: "576461413038785752",
        create_time: 1619611561,
        payment: {
          currency: "IDR",
          sub_total: "53000.00",
          shipping_fee: "5000.00",
          seller_discount: "3000.00",
          total_amount: "58000.00"
        },
        line_items: [
          {
            id: "576461413032342720",
            seller_sku: "SKU-KAOS-M",
            product_name: "Kaos Polos",
            sale_price: "24000.00"
          },
          // Real responses send the same sku on its own line once per unit; there is no quantity.
          {
            id: "576461413032342721",
            seller_sku: "SKU-KAOS-M",
            product_name: "Kaos Polos",
            sale_price: "24000.00"
          },
          {
            id: "576461413032342722",
            seller_sku: "",
            product_name: "Topi",
            sale_price: "5000.00"
          }
        ]
      }
    ]
  }
};

test("decimal strings become integer minor units without float error", () => {
  assert.equal(decimalToMinor("100.00", "IDR").amount, 10_000);
  assert.equal(decimalToMinor("99.5", "IDR").amount, 9_950);
  assert.equal(decimalToMinor("7", "IDR").amount, 700);
  assert.equal(decimalToMinor("0.01", "IDR").amount, 1);
  assert.equal(decimalToMinor("-12.34", "IDR").amount, -1_234);
  // Truncates toward zero rather than rounding, so we never overstate money owed.
  assert.equal(decimalToMinor("1.999", "IDR").amount, 199);
  // The classic float trap: 1.1 * 100 is 110.00000000000001 in floating point.
  assert.equal(decimalToMinor("1.1", "IDR").amount, 110);
  assert.equal(sumDecimals(["0.1", "0.2"], "IDR").amount, 30);
});

test("a non-decimal amount is refused instead of becoming NaN", () => {
  assert.throws(
    () => decimalToMinor("Rp 5.000", "IDR"),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("fetchOrders reads ids from search and details from the detail endpoint", async () => {
  const { fetch: fetchImpl, urls } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const page = await connector.fetchOrders({ value: null }, credential);

  assert.equal(urls.length, 2);
  assert.match(urls[0] ?? "", /\/order\/202309\/orders\/search(\?|$)/);
  // The detail endpoint's version tracks the API, not the search endpoint's; match the path shape.
  assert.match(urls[1] ?? "", /\/order\/\d+\/orders(\?|$)/);
  assert.equal(page.items.length, 1);
  const order = page.items[0];
  assert.ok(order);
  assert.equal(order.channel, "tiktok_tokopedia");
  assert.equal(order.externalOrderId, "576461413038785752");
  assert.equal(order.placedAt, new Date(1619611561 * 1000).toISOString());
});

test("money from the payment block is converted to sen exactly once", async () => {
  const { fetch: fetchImpl } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);

  assert.equal(order.totals.subtotal.amount, 5_300_000);
  assert.equal(order.totals.shipping.amount, 500_000);
  assert.equal(order.totals.grandTotal.amount, 5_800_000);
  // Only the seller-funded discount is ours; the platform funds its own.
  assert.equal(order.totals.discount.amount, 300_000);
});

test("line items map sku, title and unit price", async () => {
  const { fetch: fetchImpl } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);

  assert.equal(order.lines[0]?.sku, "SKU-KAOS-M");
  assert.equal(order.lines[0]?.title, "Kaos Polos");
  assert.equal(order.lines[0]?.unitPrice.amount, 2_400_000);
  assert.equal(order.lines[2]?.unitPrice.amount, 500_000);
});

test("a line item is one unit, because TikTok sends one line per unit and no quantity field", async () => {
  const { fetch: fetchImpl } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);

  // Confirmed against a live sandbox order (2026-09-28): two identical line items summed to twice
  // the unit price. Reading quantity as 0 would have made every order look empty. See order-schema.ts.
  assert.equal(order.lines.length, 3);
  assert.deepEqual(
    order.lines.map((line) => line.quantity),
    [1, 1, 1]
  );
});

test("an empty seller_sku is reported as null, not an empty string", async () => {
  const { fetch: fetchImpl } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const order = (await connector.fetchOrders({ value: null }, credential)).items[0];
  assert.ok(order);

  assert.equal(order.lines[2]?.sku, null);
});

test("the create-time window is sent as a body bound", async () => {
  const { fetch: fetchImpl, bodies } = transport([SEARCH_IDS_ONLY, DETAIL_BODY]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  await connector.fetchOrders({ value: null }, credential);

  const searchBody = JSON.parse(bodies[0] ?? "{}") as Record<string, unknown>;
  assert.equal(typeof searchBody["create_time_ge"], "number");
  assert.equal(typeof searchBody["create_time_lt"], "number");
  assert.ok(Number(searchBody["create_time_lt"]) > Number(searchBody["create_time_ge"]));
});

test("a next_page_token keeps the cursor resumable, and an empty one ends the walk", async () => {
  const summary = { code: 0, data: { orders: [{ id: "A" }], next_page_token: "TOKEN-2" } };
  const summaryLast = { code: 0, data: { orders: [{ id: "A" }], next_page_token: "" } };
  const detail = {
    code: 0,
    data: { orders: [{ id: "A", create_time: 1619611561, payment: { currency: "IDR", total_amount: "1000.00" } }] }
  };
  const { fetch: fetchImpl } = transport([summary, detail, summaryLast, detail]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const first = await connector.fetchOrders({ value: null }, credential);
  assert.notEqual(first.next.value, null, "a next page token must make the cursor resumable");

  const second = await connector.fetchOrders(first.next, credential);
  assert.equal(second.next.value, null, "reconciliation must be able to detect completion");
});

test("an empty-second-page search does not call the detail endpoint", async () => {
  const { fetch: fetchImpl, urls } = transport([{ code: 0, data: { orders: [] } }]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const page = await connector.fetchOrders({ value: null }, credential);

  assert.deepEqual(page.items, []);
  assert.equal(urls.length, 1, "no ids means no detail call");
});

test("a cursor we did not produce is rejected", async () => {
  const { fetch: fetchImpl } = transport([{ code: 0, data: {} }]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: "bogus" }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("a credential without a shop cipher cannot be used", async () => {
  const { fetch: fetchImpl } = transport([{ code: 0, data: {} }]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, { ...credential, context: {} }),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("a non-IDR order is refused rather than mislabelled as rupiah", async () => {
  const { fetch: fetchImpl } = transport([
    SEARCH_IDS_ONLY,
    { code: 0, data: { orders: [{ id: "X", create_time: 1, payment: { currency: "USD" } }] } }
  ]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("an order without create_time fails loudly", async () => {
  const { fetch: fetchImpl } = transport([
    SEARCH_IDS_ONLY,
    { code: 0, data: { orders: [{ id: "X", payment: { currency: "IDR" } }] } }
  ]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "UPSTREAM_ERROR"
  );
});

test("completeAuthorization binds the shop cipher from the token response", async () => {
  const { fetch: fetchImpl } = transport([
    {
      code: 0,
      data: {
        access_token: "AT",
        refresh_token: "RT",
        access_token_expire_in: 1893456000,
        shop_cipher: "ROW_cipher-x"
      }
    }
  ]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const result = await connector.completeAuthorization(
    { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "state-1" },
    { code: "auth-code", state: "state-1" }
  );

  assert.equal(result.accessToken, "AT");
  assert.equal(result.context["shopCipher"], "ROW_cipher-x");
  assert.equal(result.expiresAt, new Date(1893456000 * 1000).toISOString());
});

test("completeAuthorization falls back to the authorized-shops API when the token omits the cipher", async () => {
  const { fetch: fetchImpl, urls } = transport([
    { code: 0, data: { access_token: "AT", refresh_token: "RT" } },
    { code: 0, data: { shops: [{ id: "S1", cipher: "ROW_cipher-y" }] } }
  ]);
  const connector = new TikTokConnector(makeConfig(fetchImpl));

  const result = await connector.completeAuthorization(
    { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "state-1" },
    { code: "auth-code", state: "state-1" }
  );

  assert.equal(result.context["shopCipher"], "ROW_cipher-y");
  assert.match(urls[1] ?? "", /\/authorization\/202309\/shops(\?|$)/);
});

test("completeAuthorization rejects a forged state", async () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () =>
      connector.completeAuthorization(
        { tenantId: "tnt-a", redirectUri: "https://app.test/cb", state: "expected" },
        { code: "auth-code", state: "forged" }
      ),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("refreshCredential requires a refresh token", async () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () => connector.refreshCredential({ ...credential, refreshToken: null }),
    (error: unknown) => error instanceof PlatformError && error.code === "CREDENTIAL_EXPIRED"
  );
});

test("a rate-limit code becomes a RateLimitedError for the governor", async () => {
  const connector = new TikTokConnector(makeConfig(transport([{ code: 105004, message: "rate limit" }]).fetch));

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof RateLimitedError && error.retryable
  );
});

test("an unknown refresh token becomes a re-authorization requirement", async () => {
  // Code 36004005 is what TikTok actually returns for a refresh token it does not know.
  const connector = new TikTokConnector(
    makeConfig(transport([{ code: 36004005, message: "can not find related auth record" }]).fetch)
  );

  await assert.rejects(
    () => connector.refreshCredential(credential),
    (error: unknown) => error instanceof PlatformError && error.code === "CREDENTIAL_EXPIRED" && !error.retryable
  );
});

test("a business error code becomes a non-retryable upstream error", async () => {
  const connector = new TikTokConnector(
    makeConfig(transport([{ code: 105001, message: "invalid parameter" }]).fetch)
  );

  await assert.rejects(
    () => connector.fetchOrders({ value: null }, credential),
    (error: unknown) => error instanceof PlatformError && error.code === "UPSTREAM_ERROR" && !error.retryable
  );
});

test("capabilities advertise the implemented listing read and stock push", () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));

  assert.deepEqual(connector.capabilities(), {
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: false,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: true,
    supportsListingRead: true
  });
});

test("no webhook handlers are exposed while verification is unimplemented", () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));
  assert.deepEqual(Object.keys(connector.webhookHandlers()), []);
});

test("pushStock rejects an unmapped SKU as unknown_sku without calling TikTok", async () => {
  const t = transport([{ code: 0, data: {} }]);
  const connector = new TikTokConnector(makeConfig(t.fetch));

  const results = await connector.pushStock([{ sku: "SKU-1", available: 4 }], credential);

  assert.equal(results.length, 1);
  assert.equal(results[0]?.accepted, false);
  assert.equal(results[0]?.reason, "unknown_sku");
  // An unmapped SKU has no address, so nothing may reach the network.
  assert.equal(t.urls.length, 0);
});

test("pushStock accepts a mapped SKU and sends the resolved product, sku and warehouse", async () => {
  const t = transport([{ code: 0, data: {} }]);
  const connector = new TikTokConnector(makeConfig(t.fetch));

  const results = await connector.pushStock(
    [{ sku: "SKU-1", available: 7, externalProductId: "p1", externalSkuId: "s1", externalInventoryId: "w1" }],
    credential
  );

  assert.deepEqual(results, [{ sku: "SKU-1", accepted: true, reason: null }]);
  const sent = JSON.parse(t.bodies[0] ?? "{}") as { skus?: readonly { id?: string }[] };
  assert.equal(sent.skus?.[0]?.id, "s1");
});

test("pushStock reports channel_error for a SKU TikTok rejected inside a success envelope", async () => {
  const connector = new TikTokConnector(
    makeConfig(transport([{ code: 0, data: { errors: [{ detail: [{ sku_id: "s1" }] }] } }]).fetch)
  );

  const results = await connector.pushStock(
    [{ sku: "SKU-1", available: 1, externalProductId: "p1", externalSkuId: "s1" }],
    credential
  );

  assert.deepEqual(results, [{ sku: "SKU-1", accepted: false, reason: "channel_error" }]);
});

test("fetchListings maps marketplace ids, seller SKU and warehouse into the platform shape", async () => {
  const connector = new TikTokConnector(
    makeConfig(
      transport([
        {
          code: 0,
          data: {
            products: [
              {
                id: "p1",
                title: "Kaos",
                status: "ACTIVATE",
                update_time: 1_700_000_000,
                skus: [{ id: "s1", seller_sku: "SKU-1", inventory: [{ warehouse_id: "w1", quantity: 3 }] }]
              }
            ],
            next_page_token: ""
          }
        }
      ]).fetch
    )
  );

  const page = await connector.fetchListings({ value: null }, credential);

  assert.equal(page.items.length, 1);
  assert.equal(page.items[0]?.externalProductId, "p1");
  assert.equal(page.items[0]?.status, "active");
  assert.deepEqual(page.items[0]?.variants, [
    { externalSkuId: "s1", sku: "SKU-1", externalInventoryId: "w1" }
  ]);
  // A short page with no token is "caught up", the one cursor convention (AGENTS.md §9).
  assert.equal(page.next.value, null);
});

test("fetchListings treats an unknown status as unknown, never as active", async () => {
  const connector = new TikTokConnector(
    makeConfig(transport([{ code: 0, data: { products: [{ id: "p1", status: "SOMETHING_NEW", skus: [] }] } }]).fetch)
  );

  const page = await connector.fetchListings({ value: null }, credential);

  assert.equal(page.items[0]?.status, "unknown");
});

test("fetchListings returns a resumable cursor while a page token remains", async () => {
  const connector = new TikTokConnector(
    makeConfig(transport([{ code: 0, data: { products: [{ id: "p1", skus: [] }], next_page_token: "tok-2" } }]).fetch)
  );

  const page = await connector.fetchListings({ value: null }, credential);

  assert.notEqual(page.next.value, null);
  // The cursor must round-trip: the connector only ever reads back what it wrote.
  const resumed = await connector.fetchListings(page.next, credential);
  assert.equal(resumed.items.length, 1);
});

test("acknowledgeOrder fails loudly because the channel has no such operation", async () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));

  await assert.rejects(
    () => connector.acknowledgeOrder("576461413038785752", credential),
    (error: unknown) => error instanceof PlatformError && error.code === "VALIDATION_FAILED"
  );
});

test("beginAuthorization exposes app_key, the redirect and state, never the secret", async () => {
  const connector = new TikTokConnector(makeConfig(transport([{}]).fetch));

  const request = await connector.beginAuthorization({
    tenantId: "tnt-a",
    redirectUri: "https://app.test/cb",
    state: "state-1"
  });
  const url = new URL(request.url);

  assert.equal(url.searchParams.get("app_key"), "app-key-value");
  assert.equal(url.searchParams.get("state"), "state-1");
  // The vendored builder names the redirect parameter `path`; see beginAuthorization's note.
  assert.equal(url.searchParams.get("path"), "https://app.test/cb");
  assert.ok(!request.url.includes("app-secret-value"), "the app secret must never leave in a URL");
});

test("a transport-level 429 becomes a RateLimitedError even without a body code", () => {
  const mapped = toPlatformError(new TikTokError("too many requests", { status: 429 }), "fetchOrders");
  assert.ok(mapped instanceof RateLimitedError);
  assert.equal(mapped.retryable, true);
});

test("TikTokError is recognised so its code can drive retry policy", () => {
  const error = new TikTokError("boom", { code: 105004 });
  assert.equal(error.code, 105004);
});

test("an IP allowlist rejection is a non-retryable FORBIDDEN, not a retryable upstream error", () => {
  const mapped = toPlatformError(
    new TikTokError("Access denied. Your IP address is not in the IP allow list configured for this app."),
    "completeAuthorization"
  );
  assert.equal(mapped.code, "FORBIDDEN");
  assert.equal(mapped.retryable, false);
});

test("an IP allowlist rejection is classified even when it carries a numeric code", () => {
  const mapped = toPlatformError(
    new TikTokError("Access denied. Your IP address is not in the IP allow list configured for this app.", {
      code: 105002
    }),
    "completeAuthorization"
  );
  assert.equal(mapped.code, "FORBIDDEN");
  assert.equal(mapped.retryable, false);
});
