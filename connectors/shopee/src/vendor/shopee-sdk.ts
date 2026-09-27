/**
 * The single place the vendored Shopee SDK is imported.
 *
 * The vendored build is CommonJS, so its named exports only resolve because
 * `vendor/shopee-sdk/package.json` declares `"type": "commonjs"` (docs/adr/0007).
 * Routing every vendored import through this file keeps generated code at one boundary: nothing
 * else in the connector names a path inside `vendor/`, and the quirk below is explained exactly
 * once.
 */

export {
  Shopee,
  ShopeeClient,
  ShopeeError,
  sign,
  buildAuthUrl,
  verifyPushSignature
} from "../../vendor/shopee-sdk/dist/index.js";
export { ShopeeOrderApi } from "../../vendor/shopee-sdk/dist/index.js";
export { ShopeeProductApi } from "../../vendor/shopee-sdk/dist/index.js";

export type { ShopeeCredentials, ShopeeEnvironment } from "../../vendor/shopee-sdk/dist/index.js";
export type { ShopeeApiResult } from "../../vendor/shopee-sdk/dist/types.js";

// The category sub-clients are only reachable through `generated/`; the package root exports the
// classes but not their request/response shapes.
export type {
  GetOrderListRequest,
  GetOrderListResponse,
  GetOrderDetailRequest,
  GetOrderDetailResponse
} from "../../vendor/shopee-sdk/dist/generated/Order/index.js";
export type {
  GetItemListRequest,
  GetModelListRequest,
  UpdateStockRequest
} from "../../vendor/shopee-sdk/dist/generated/Product/index.js";
export type {
  GetAccessTokenRequest,
  GetAccessTokenResponse,
  RefreshAccessTokenRequest,
  RefreshAccessTokenResponse
} from "../../vendor/shopee-sdk/dist/generated/Public/index.js";

/**
 * The generated category methods are typed as `ApiResponse<XResponse>`, which is
 * `{ error, message, response?: XResponse }` — but `XResponse` already models that same envelope.
 * That is a double-wrap. The SDK in fact returns the parsed response body verbatim: verified
 * against the vendored build with a stubbed fetch for `getOrderList`, `getOrderDetail` and both
 * token calls, where the returned object was the wire body itself.
 *
 * So the correct reading of every one of these results is the response interface, not the envelope
 * around it. This helper narrows to that so the incorrect type stops at this file. It is a cast,
 * not a validation; callers still check every field they require.
 */
export function asResponseBody<T>(value: unknown): T {
  return value as T;
}
