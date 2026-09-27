import type { ChannelCode, Instant } from "./ids.ts";

/**
 * A listing as a marketplace reports it, normalised (docs/adr/0009).
 *
 * Stock push addresses a variant by an identifier the *marketplace* assigns — TikTok's
 * `product_id` + `sku_id`, Shopee's `item_id` + `model_id` — which never appears in an order and
 * cannot be derived from our SKU. Reading listings is therefore the only way to make stock push
 * possible, and this is the type that carries the result. Nothing outside a connector may know a
 * marketplace's raw listing shape (AGENTS.md §4).
 */
export interface ChannelListing {
  readonly channel: ChannelCode;
  /** The marketplace's identifier for the product. */
  readonly externalProductId: string;
  readonly title: string;
  readonly status: ListingStatus;
  readonly variants: readonly ChannelListingVariant[];
  readonly updatedAt: Instant | null;
}

/**
 * The platform's best reading of whether a listing is sellable. A marketplace's own status strings
 * are mapped by the connector; this is the small vocabulary the platform reasons about.
 */
export type ListingStatus = "active" | "inactive" | "draft" | "unknown";

export interface ChannelListingVariant {
  /**
   * The marketplace's identifier for the variant, the one `pushStock` must address. For TikTok that
   * is `sku_id`; for Shopee it is `model_id`.
   */
  readonly externalSkuId: string;
  /**
   * The seller SKU as the marketplace reports it — the join key back to our catalogue. `null` when
   * the marketplace has none, which is a real state and must not be coerced to `""`.
   */
  readonly sku: string | null;
  /**
   * A second marketplace handle some channels need for inventory (TikTok's per-store inventory id).
   * `null` when the channel addresses inventory by `externalSkuId` alone.
   */
  readonly externalInventoryId: string | null;
}
