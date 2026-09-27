import type {
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  Cursor,
  Instant,
  Page,
  StockResult,
  StockUpdate
} from "@platform/contracts";

/**
 * The contract every marketplace connector implements.
 *
 * A connector is the only place that knows a marketplace's raw API shapes. Everything downstream
 * works with the normalised types in @platform/contracts.
 *
 * Rules (AGENTS.md §4):
 * - Never call a marketplace API from a workflow. Go through a connector.
 * - Declare capabilities() honestly; do not silently no-op.
 * - Rate limiting is the governor's job. Report it, do not sleep on it here.
 * - Webhook handlers verify and enqueue only. No outbound calls.
 */
export interface ChannelConnector {
  readonly channel: ChannelCode;

  /** Begin authorization. Returns the URL to send the seller to, plus the state to persist. */
  beginAuthorization(ctx: AuthorizationContext): Promise<AuthorizationRequest>;

  /** Complete authorization with the code the marketplace returned. */
  completeAuthorization(ctx: AuthorizationContext, params: OAuthCallbackParams): Promise<Credential>;

  /** Exchange a refresh token for a fresh credential before the current one expires. */
  refreshCredential(credential: Credential): Promise<Credential>;

  /** Pull a page of orders. The cursor is opaque outside this connector. */
  fetchOrders(cursor: Cursor, credential: Credential): Promise<Page<ChannelOrder>>;

  /**
   * Pull a page of listings, so our SKUs can be mapped to the identifiers a stock push needs
   * (docs/adr/0009). The cursor is opaque outside this connector, like the order cursor.
   *
   * A channel that addresses variants by our SKU directly may return one variant per product; a
   * channel that assigns its own ids must return them here. Declaring support is
   * `capabilities().supportsListingRead`.
   */
  fetchListings(cursor: Cursor, credential: Credential): Promise<Page<ChannelListing>>;

  /** Tell the marketplace we have accepted an order, when the channel requires it. */
  acknowledgeOrder(externalOrderId: string, credential: Credential): Promise<void>;

  /** Push available quantities to the marketplace. */
  pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]>;

  /** Webhook handlers keyed by the event type the marketplace sends. */
  webhookHandlers(): Readonly<Record<string, WebhookHandler>>;

  /** What this channel actually supports. Never assume a capability. */
  capabilities(): ChannelCapabilities;
}

export interface AuthorizationContext {
  readonly tenantId: string;
  readonly redirectUri: string;
  /** Single-use, tenant-scoped value echoed back by the marketplace. */
  readonly state: string;
}

export interface AuthorizationRequest {
  readonly url: string;
}

export interface OAuthCallbackParams {
  readonly code: string;
  readonly state: string;
}

/**
 * Per-seller credentials.
 *
 * This type is passed in memory only. It is persisted exclusively through @platform/secrets and
 * must never be logged (AGENTS.md §2.6).
 */
export interface Credential {
  readonly channel: ChannelCode;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: Instant | null;
  /** Marketplace-specific identifiers needed to operate, e.g. shop id, seller id. */
  readonly context: Readonly<Record<string, string>>;
}

export interface WebhookHandler {
  /** Throw when the signature does not validate. Nothing is persisted on rejection. */
  verify(rawBody: string, headers: Readonly<Record<string, string>>): void;
  /** Normalise the payload into the channel-neutral envelope that gets enqueued. */
  normalize(rawBody: string): WebhookEnvelope;
}

export interface WebhookEnvelope {
  readonly channel: ChannelCode;
  /** Marketplace event id, used as the dedup key. */
  readonly eventId: string;
  readonly eventType: string;
  readonly receivedAt: Instant;
}

/**
 * Declared support for a channel.
 *
 * `false` here is a promise to the rest of the system that the feature will not be attempted,
 * not an admission of a bug.
 */
export interface ChannelCapabilities {
  readonly supportsOrderPull: boolean;
  readonly supportsStockPush: boolean;
  readonly supportsWebhooks: boolean;
  readonly supportsOrderAcknowledgement: boolean;
  /** True when order history must be read from a second API (see docs/adr/0003). */
  readonly splitsOrderHistory: boolean;
  /** True when the channel exposes listings we can read to map our SKUs (docs/adr/0009). */
  readonly supportsListingRead: boolean;
}
