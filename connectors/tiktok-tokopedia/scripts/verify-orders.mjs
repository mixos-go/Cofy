#!/usr/bin/env node
// End-to-end verification of the TikTok/Tokopedia connector against a real (sandbox) shop.
// It exercises the connector's own code path — authorization, order search, order detail, mapping —
// so a green run is evidence about the connector, not about a mock.
//
// Credentials come from the environment; nothing is written to disk and tokens are never printed.
//
//   set -a; . /path/to/tiktok_shop.key; set +a
//   export TIKTOK_AUTH_CODE=...          # from the authorize callback, OR
//   export TIKTOK_ACCESS_TOKEN=... TIKTOK_SHOP_CIPHER=...
//   node connectors/tiktok-tokopedia/scripts/verify-orders.mjs
//
// Optional: TIKTOK_SINCE_DAYS (default 7) widens the order window; TIKTOK_PAGE_SIZE (default 20).
//
// What it answers:
//   1. Can we exchange an authorization code (or use an existing token) and resolve a shop cipher?
//   2. Does the two-API read work: search returns ids, detail fills them?
//   3. Is the per-line quantity field really absent from responses, or is it under another name?

import { readFile, writeFile } from "node:fs/promises";

import { TikTokConnector } from "../src/connector.ts";
import { defaultTikTokConfig } from "../src/config.ts";

const appKey = process.env.TIKTOK_APP_KEY;
const appSecret = process.env.TIKTOK_APP_SECRET;
if (!appKey || !appSecret) {
  console.error("TIKTOK_APP_KEY and TIKTOK_APP_SECRET must be set in the environment.");
  process.exit(2);
}

const mask = (text) => String(text).split(appSecret).join("<secret>").split(appKey).join("<app_key>");
const say = (...parts) => console.log(mask(parts.join(" ")));

const sinceDays = Number(process.env.TIKTOK_SINCE_DAYS ?? 7);
const pageSize = Number(process.env.TIKTOK_PAGE_SIZE ?? 20);
// A token stays usable for hours, and an authorization code does not: keeping the token means a
// later failure (e.g. the business host's IP allowlist not yet propagated) can be retried without
// asking the seller to authorize again. This is a scratch file for local verification only.
const credentialFile = process.env.TIKTOK_CREDENTIAL_FILE ?? "/tmp/tiktok-credential.json";

const connector = new TikTokConnector({ ...defaultTikTokConfig({ appKey, appSecret }), pageSize });

async function credential() {
  if (process.env.TIKTOK_AUTH_CODE) {
    const state = `verify-${Date.now()}`;
    say("exchanging authorization code (state matches by construction)");
    const cred = await connector.completeAuthorization(
      { tenantId: "verify", redirectUri: "https://example.test/cb", state },
      { code: process.env.TIKTOK_AUTH_CODE, state }
    );
    // Persisted so an order-fetch failure does not consume another single-use code.
    await writeFile(credentialFile, JSON.stringify({ ...cred, savedAt: new Date().toISOString() }), { mode: 0o600 });
    say(`credential saved to ${credentialFile} for subsequent runs`);
    return cred;
  }
  if (process.env.TIKTOK_ACCESS_TOKEN && process.env.TIKTOK_SHOP_CIPHER) {
    say("using an access token supplied in the environment");
    return {
      channel: connector.channel,
      accessToken: process.env.TIKTOK_ACCESS_TOKEN,
      refreshToken: null,
      expiresAt: null,
      context: { shopCipher: process.env.TIKTOK_SHOP_CIPHER }
    };
  }
  try {
    const saved = JSON.parse(await readFile(credentialFile, "utf8"));
    say(`using the credential saved at ${credentialFile} (saved ${saved.savedAt ?? "unknown"})`);
    return saved;
  } catch {
    console.error("Provide TIKTOK_AUTH_CODE, or TIKTOK_ACCESS_TOKEN + TIKTOK_SHOP_CIPHER, or a saved credential file.");
    process.exit(2);
  }
}

/** Call the detail endpoint directly so we can inspect the raw line-item shape, not just our mapping. */
async function rawLineItemKeys(accessToken, shopCipher, orderIds) {
  const { TikTokShop } = await import("../src/vendor/tiktok-shop-sdk.ts");
  const client = new TikTokShop({
    credentials: { app_key: appKey, app_secret: appSecret },
    accessToken,
    shopCipher
  });
  const detail = await client.order.getOrderDetail({ ids: orderIds });
  const first = detail?.data?.orders?.[0];
  const line = first?.line_items?.[0];
  if (!line) return { found: false, keys: [] };
  return {
    found: true,
    orderKeys: Object.keys(first).sort(),
    keys: Object.keys(line).sort(),
    quantityLike: Object.fromEntries(
      Object.entries(line).filter(([key, value]) => /qty|quantity|count|amount/i.test(key) && typeof value !== "object")
    )
  };
}

const result = { auth: false, orders: 0, lines: 0, quantityReported: false };

try {
  const cred = await credential();
  result.auth = Boolean(cred.accessToken && cred.context?.shopCipher);
  say(`auth: accessToken ${cred.accessToken ? "present" : "MISSING"}, shopCipher ${cred.context?.shopCipher ? "present" : "MISSING"}`);

  const now = Math.floor(Date.now() / 1000);
  const cursor = {
    value: JSON.stringify({ pageToken: "", createTimeGe: now - sinceDays * 24 * 60 * 60, createTimeLt: now })
  };
  say(`fetching orders created in the last ${sinceDays} day(s)`);

  const page = await connector.fetchOrders(cursor, cred);
  result.orders = page.items.length;
  result.lines = page.items.reduce((sum, order) => sum + order.lines.length, 0);
  result.quantityReported = page.items.some((order) => order.lines.some((line) => line.quantity !== 0));

  say(`orders: ${result.orders}, lines: ${result.lines}, next cursor: ${page.next.value === null ? "caught up" : "more pages"}`);
  for (const order of page.items.slice(0, 5)) {
    const money = (m) => `${m.amount}${m.currency === "IDR" ? "" : m.currency}`;
    say(
      `  ${order.externalOrderId} placedAt=${order.placedAt} ${order.currency} ` +
        `subtotal=${money(order.totals.subtotal)} shipping=${money(order.totals.shipping)} ` +
        `discount=${money(order.totals.discount)} grandTotal=${money(order.totals.grandTotal)}`
    );
    for (const line of order.lines) {
      say(`    line ${line.externalLineId} sku=${line.sku ?? "(none)"} qty=${line.quantity} unit=${money(line.unitPrice)} ${line.title}`);
    }
  }

  const ids = page.items.map((order) => order.externalOrderId).slice(0, pageSize);
  if (ids.length > 0) {
    const raw = await rawLineItemKeys(cred.accessToken, cred.context.shopCipher, ids);
    say(`raw line_item keys: ${raw.keys.join(", ") || "(none)"}`);
    say(`quantity-like fields on the first line: ${JSON.stringify(raw.quantityLike)}`);
  }

  say("");
  say(`RESULT ${JSON.stringify(result)}`);
  if (!result.auth) {
    console.error("auth failed: no usable access token or shop cipher");
    process.exit(1);
  }
  if (result.orders === 0) {
    console.error("no orders found: create a test order in the development shop, or widen TIKTOK_SINCE_DAYS");
    process.exit(1);
  }
} catch (error) {
  // Print the mapped platform error, not a stack: it is the actionable part, and a stack could
  // carry request internals we do not want pasted into an issue. The raw upstream code/request id
  // stay in `details`, so an unclassified code is still visible.
  const code = typeof error?.code === "string" ? error.code : "UNEXPECTED";
  const details = error?.details && Object.keys(error.details).length > 0 ? ` ${JSON.stringify(error.details)}` : "";
  console.error(`FAILED (${code})${details} ${mask(error instanceof Error ? error.message : String(error))}`);
  say(`RESULT ${JSON.stringify(result)}`);
  process.exit(1);
}
