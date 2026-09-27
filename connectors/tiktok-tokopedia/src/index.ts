/**
 * Public surface of the TikTok Shop / Tokopedia connector.
 *
 * Only the connector class and its config are exported. Vendored SDK types are not re-exported:
 * nothing outside this package should be able to name a TikTok field (AGENTS.md §4).
 */

export { TikTokConnector } from "./connector.ts";
export { defaultTikTokConfig, DEFAULT_PAGE_SIZE } from "./config.ts";
export type { TikTokAppCredentials, TikTokConnectorConfig } from "./config.ts";
