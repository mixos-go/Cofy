/**
 * The single place the vendored TikTok Shop SDK is imported.
 *
 * The vendored build is CommonJS, so its named exports only resolve because
 * `vendor/tiktok-shop-sdk/package.json` declares `"type": "commonjs"` (docs/adr/0007). Routing
 * every vendored import through here keeps generated code at one boundary.
 */

export { TikTokShop, TikTokClient, TikTokError } from "../../vendor/tiktok-shop-sdk/dist/index.js";
export { exchangeAuthCode, refreshAccessToken, buildAuthUrl } from "../../vendor/tiktok-shop-sdk/dist/index.js";

export type { TikTokCredentials, TokenResponse } from "../../vendor/tiktok-shop-sdk/dist/index.js";
export type { GetOrderListBody } from "../../vendor/tiktok-shop-sdk/dist/generated/Order/index.js";
export type { GetAuthorizedShopsResponse } from "../../vendor/tiktok-shop-sdk/dist/generated/Authorization/index.js";
