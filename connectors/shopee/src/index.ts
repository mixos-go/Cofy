/**
 * Public surface of the Shopee connector.
 *
 * Only the connector class and its config are exported. Vendored SDK types are deliberately not
 * re-exported: nothing outside this package should be able to name a Shopee field (AGENTS.md §4).
 */

export { ShopeeConnector } from "./connector.ts";
export { defaultShopeeConfig, DEFAULT_LOOKBACK_DAYS, DEFAULT_DETAIL_BATCH_SIZE, DEFAULT_PAGE_SIZE } from "./config.ts";
export type { ShopeeAppCredentials, ShopeeConnectorConfig } from "./config.ts";
