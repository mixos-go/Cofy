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
  /**
   * True when the channel arranges its own logistics: we can ask it what a shipment needs
   * (`getShippingArrangementParameters`), have it book the waybill (`arrangeShipment`) and read the
   * waybill it issued (docs/adr/0021). This is the primary fulfillment path for Shopee and TikTok
   * Shop/Tokopedia, where the marketplace is the logistics orchestrator. `false` means the channel
   * offers no such operation and the arrangement is never attempted; a connector flips this to
   * `true` only when it implements and tests the methods (ADR 0009's rule).
   */
  readonly supportsShippingArrangement: boolean;
  /**
   * True when the channel can produce the printable label for a shipment it arranged
   * (`fetchShippingLabel`), typically a PDF the warehouse prints (docs/adr/0021). Gated separately
   * from arrangement: a channel can arrange a shipment without exposing the label document.
   */
  readonly supportsShippingLabel: boolean;
  /**
   * True when the channel reports tracking events for an order it arranged
   * (`fetchChannelTracking`), so the delivery-status pull path has a source (docs/adr/0021). A
   * self-arranged shipment is tracked at the courier instead.
   */
  readonly supportsChannelTracking: boolean;
}
