#!/usr/bin/env node
// Print the seller-authorization URL for the platform TikTok Shop app.
//
//   set -a; . /path/to/tiktok_shop.key; set +a
//   REDIRECT_URL=https://your-real-callback node connectors/tiktok-tokopedia/scripts/print-authorize-url.mjs
//
// The `path` parameter must equal the redirect URL registered for the app in Partner Center, byte
// for byte, or TikTok rejects the authorization page. The app_key is an identifier, not a secret,
// so it is printed in full; the app_secret is never printed.

import { TikTokConnector } from "../src/connector.ts";

const appKey = process.env.TIKTOK_APP_KEY;
const appSecret = process.env.TIKTOK_APP_SECRET;
if (!appKey || !appSecret) {
  console.error("TIKTOK_APP_KEY and TIKTOK_APP_SECRET must be set in the environment.");
  process.exit(2);
}

const redirectUri = process.env.REDIRECT_URL;
if (!redirectUri) {
  console.error("Set REDIRECT_URL to the exact redirect URL registered in Partner Center.");
  process.exit(2);
}

const state = process.env.STATE ?? `m2-verify-${Date.now()}`;
const connector = new TikTokConnector({
  app: { appKey, appSecret },
  allowedRedirectHosts: [],
  pageSize: 50
});

const request = await connector.beginAuthorization({
  tenantId: process.env.TENANT_ID ?? "m2-verify",
  redirectUri,
  state
});

console.log(request.url);
console.error(`state to expect on the callback: ${state}`);
