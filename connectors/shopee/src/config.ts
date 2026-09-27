/**
 * Shopee app configuration.
 *
 * These are platform-wide, not per-seller: one Shopee partner app fronts every tenant
 * (docs/adr/0003). Per-seller values such as `shop_id` travel inside `Credential.context`.
 */

import type { ShopeeEnvironment } from "./vendor/shopee-sdk.ts";

export interface ShopeeAppCredentials {
  readonly partnerId: number;
  readonly partnerKey: string;
}

export interface ShopeeConnectorConfig {
  readonly app: ShopeeAppCredentials;
  readonly environment: ShopeeEnvironment;
  readonly region: string;
  /**
   * Our registered webhook URL for this app. Shopee signs `url + '|' + body`, so verification
   * needs the exact URL we registered. It is config, never a request header: the sender controls
   * headers, and letting them choose the signing input would void the signature check.
   */
  readonly webhookUrl: string;
  /**
   * How far back the first `fetchOrders` call looks, in days. Shopee caps a single
   * `get_order_list` window at 15 days, so this must stay under that.
   */
  readonly lookbackDays: number;
  /** Orders requested per `get_order_detail` call. Shopee accepts 1..50. */
  readonly detailBatchSize: number;
  /** Page size for `get_order_list`. Shopee accepts 1..100. */
  readonly pageSize: number;
  /**
   * HTTP transport. Defaults to the global `fetch`; tests inject a stub so the mapping code runs
   * with no network. This is transport injection, not a mock of our own logic.
   */
  readonly transport?: typeof fetch;
}

export const DEFAULT_LOOKBACK_DAYS = 7;
export const DEFAULT_DETAIL_BATCH_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 50;

export function defaultShopeeConfig(
  app: ShopeeAppCredentials,
  webhookUrl: string
): ShopeeConnectorConfig {
  return {
    app,
    environment: "live",
    region: "GLOBAL",
    webhookUrl,
    lookbackDays: DEFAULT_LOOKBACK_DAYS,
    detailBatchSize: DEFAULT_DETAIL_BATCH_SIZE,
    pageSize: DEFAULT_PAGE_SIZE
  };
}
