import type {
  ChannelCapabilities,
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  ChannelStockLevel,
  Cursor,
  Instant,
  Page,
  StockResult,
  StockUpdate,
  TrackingWriteBack
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

  /**
   * Pull a page of stock levels, so a corrupted level on the channel can be detected (docs/adr/0015).
   *
   * This is the read direction of stock: `pushStock` tells a marketplace a number, this asks what it
   * currently thinks, and reconciliation compares the two. The cursor is opaque outside this
   * connector, like the order and listing cursors.
   *
   * A channel that cannot report a variant's stock does not implement this, and declares
   * `capabilities().supportsStockSnapshotRead` as `false`.
   */
  fetchStockSnapshot(cursor: Cursor, credential: Credential): Promise<Page<ChannelStockLevel>>;

  /** Tell the marketplace we have accepted an order, when the channel requires it. */
  acknowledgeOrder(externalOrderId: string, credential: Credential): Promise<void>;

  /** Push available quantities to the marketplace. */
  pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]>;

  /**
   * Write a courier's tracking number back to the marketplace, so the buyer sees the waybill
   * (docs/adr/0020). This is the approval-gated extension of this interface; a channel that has no
   * such operation declares `capabilities().supportsTrackingWriteBack` as `false` and this method
   * throws rather than silently doing nothing (ADR 0009's rule).
   *
   * `tracking` is courier-neutral: the connector maps it into its own acknowledgement/ship call. A
   * retried write-back is safe to repeat — setting the same waybill twice is idempotent at the
   * channel — but the worker still records an idempotency key, so the platform's own audit of the
   * outbound write is complete (AGENTS.md §2.4).
   */
  attachTrackingNumber(
    externalOrderId: string,
    tracking: TrackingWriteBack,
    credential: Credential
  ): Promise<void>;

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
 * Re-exported from `@platform/contracts` so a connector has one import site and the worker, which
 * cannot import this package, can still read the same type (docs/adr/0015, AGENTS.md §3).
 */
export type { ChannelCapabilities } from "@platform/contracts";
