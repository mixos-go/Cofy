#!/usr/bin/env node
// Live credential probe for the TikTok Shop app. Reads credentials from the environment and never
// writes them out; output is masked so it is safe to paste into an issue.
//
//   set -a; . /path/to/tiktok_shop.key; set +a
//   node connectors/tiktok-tokopedia/scripts/live-auth-probe.mjs
//
// A valid, registered app answers `token/get` with code 36004004 ("invalid auth code") and
// `token/refresh` with 36004005. An unknown app answers with an app_key error instead, which is
// the signal that the credentials or their environment (sandbox vs production) are wrong.

import { buildAuthUrl } from "../vendor/tiktok-shop-sdk/dist/index.js";

const appKey = process.env.TIKTOK_APP_KEY;
const appSecret = process.env.TIKTOK_APP_SECRET;
if (!appKey || !appSecret) {
  console.error("TIKTOK_APP_KEY and TIKTOK_APP_SECRET must be set in the environment.");
  process.exit(2);
}

const mask = (text) => String(text).split(appSecret).join("<secret>").split(appKey).join("<app_key>");
const log = (label, value) => console.log(`${label}: ${mask(value)}`);

const tokenBase = process.env.TIKTOK_TOKEN_BASE ?? "https://auth.tiktok-shops.com";

async function token(path, params) {
  const search = new URLSearchParams(params);
  const response = await fetch(`${tokenBase}${path}?${search.toString()}`);
  return { status: response.status, body: await response.json().catch(() => ({ raw: "non-JSON" })) };
}

log(
  "authorize URL",
  buildAuthUrl({ app_key: appKey, app_secret: appSecret }, "https://example.test/cb", { state: "probe" })
);

const exchange = await token("/api/v2/token/get", {
  app_key: appKey,
  app_secret: appSecret,
  auth_code: "invalid-probe-code",
  grant_type: "authorized_code"
});
log("token/get", `${exchange.status} ${JSON.stringify(exchange.body)}`);

const refresh = await token("/api/v2/token/refresh", {
  app_key: appKey,
  app_secret: appSecret,
  refresh_token: "invalid-refresh-probe",
  grant_type: "refresh_token"
});
log("token/refresh", `${refresh.status} ${JSON.stringify(refresh.body)}`);
