/**
 * Declared support for a channel.
 *
 * `false` here is a promise to the rest of the system that the feature will not be attempted, not
 * an admission of a bug.
 *
 * It lives in `contracts` rather than `channel-sdk` because the worker reads it over the integration
 * plane's HTTP surface (docs/adr/0015) and may only import `packages/*` (AGENTS.md §3); `channel-sdk`
 * re-exports it, so a connector still imports it from one place.
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
  /** True when the channel can report variant stock we can compare against Medusa (docs/adr/0015). */
  readonly supportsStockSnapshotRead: boolean;
  /**
   * True when the channel accepts a tracking number written back after a courier issues one
   * (docs/adr/0020). `false` means the channel has no such operation and the write-back is never
   * attempted; a connector flips this to `true` only when it implements and tests the method
   * (ADR 0009's rule).
   */
  readonly supportsTrackingWriteBack: boolean;
}
