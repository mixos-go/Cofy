/**
 * TikTok Shop / Tokopedia app configuration.
 *
 * Platform-wide, not per-seller: one partner app fronts every tenant (docs/adr/0003). Per-seller
 * `shop_cipher` and `open_id` travel inside `Credential.context`.
 */

export interface TikTokAppCredentials {
  readonly appKey: string;
  readonly appSecret: string;
}

export interface TikTokConnectorConfig {
  readonly app: TikTokAppCredentials;
  /**
   * Reject webhook/redirect payloads whose host is not one of these, when the channel lets us
   * choose. Empty means "do not check", which is only correct while webhooks are unsupported.
   */
  readonly allowedRedirectHosts: readonly string[];
  /** Orders requested per search page. TikTok accepts 1..100. */
  readonly pageSize: number;
  /**
   * HTTP transport. Defaults to the global `fetch`; tests inject a stub so mapping code runs with
   * no network. This is transport injection, not a mock of our own logic.
   */
  readonly transport?: typeof fetch;
}

export const DEFAULT_PAGE_SIZE = 50;

export function defaultTikTokConfig(app: TikTokAppCredentials): TikTokConnectorConfig {
  return {
    app,
    allowedRedirectHosts: [],
    pageSize: DEFAULT_PAGE_SIZE
  };
}
