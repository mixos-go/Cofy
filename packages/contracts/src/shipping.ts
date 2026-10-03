import type { Instant, Money } from "./ids.ts";
import type { ServiceLevel, ShipmentStatus, TrackingEvent } from "./fulfillment.ts";

/**
 * Channel shipping-arrangement shapes (docs/adr/0021).
 *
 * For Shopee and TikTok Shop/Tokopedia the marketplace is the logistics orchestrator: it offers the
 * couriers and services an order may use, books the waybill, issues the printable label and owns the
 * buyer's tracking page. These types are the courier-neutral vocabulary for that path, mirroring how
 * `ChannelOrder` and `ChannelStockLevel` neutralise the other marketplace surfaces. A connector maps
 * its own API into them; nothing outside a connector may know a channel's raw field names
 * (AGENTS.md §4).
 *
 * They are deliberately separate from the courier-provider types in `fulfillment.ts`: a
 * channel-arranged shipment is booked by the marketplace, while a self-arranged shipment is booked
 * by one of our `CourierProvider`s. Both end as the same tenant-side Medusa Fulfillment.
 */

/**
 * One courier/service a channel offers for an order, as a candidate the seller can pick.
 *
 * `channelOptionId` is the channel's own handle for this choice, carried so `arrangeShipment` can
 * address the exact option that was shown. It is opaque to everything but the connector that issued
 * it. `courier` is the channel's display name (for example "J&T Express"), kept as a string rather
 * than our `CourierCode`: this is the marketplace's courier, not necessarily one we have a provider
 * for, and forcing it into our vocabulary would leak the provider list onto the channel surface.
 */
export interface ChannelShippingOption {
  readonly channelOptionId: string;
  readonly courier: string;
  readonly serviceLevel: ServiceLevel;
  /** The channel's price for this option, when it quotes one. `null` when it does not. */
  readonly price: Money | null;
  /** The channel's transit estimate, when it gives one. `null` when it does not. */
  readonly estimatedDays: { readonly min: number; readonly max: number } | null;
}

/**
 * What a channel needs to arrange one order's shipment.
 *
 * This is the answer to "what are my choices for this order", read before the seller commits. A
 * channel that needs a pickup address lists the ones it holds; `requiresPickup`/`requiresDropoff`
 * tell the caller which shape `arrangeShipment` must take. An empty `options` list is the honest
 * answer that the channel offers no arrangement for this order (for example it is already arranged).
 */
export interface ShippingArrangementParameters {
  readonly externalOrderId: string;
  readonly options: readonly ChannelShippingOption[];
  /** True when `arrangeShipment` must name a pickup address. */
  readonly requiresPickup: boolean;
  /** True when `arrangeShipment` must name a dropoff branch. */
  readonly requiresDropoff: boolean;
  /** Pickup addresses the channel holds for this shop, when it exposes them. */
  readonly pickupAddressIds: readonly string[];
}

/**
 * The seller's arrangement choice for one order.
 *
 * Either the channel books the courier (`channelOptionId` names which, `pickupAddressId` where the
 * channel requires pickup), or the seller already has a waybill from their own courier and hands it
 * to the channel (`selfShipTrackingNumber`). The two are mutually exclusive: a channel decides which
 * applies from its own arrangement parameters, so a caller sends exactly one.
 */
export interface ShippingArrangementRequest {
  readonly externalOrderId: string;
  /** The chosen `ChannelShippingOption.channelOptionId`, for a channel-booked shipment. */
  readonly channelOptionId: string | null;
  /** The pickup address, when the channel requires one. */
  readonly pickupAddressId: string | null;
  /** The seller's own waybill, for a self-arranged shipment the channel must record. */
  readonly selfShipTrackingNumber: string | null;
}

/**
 * A shipment a channel has arranged.
 *
 * `trackingNumber` is the marketplace-issued waybill (or the seller's own, echoed back). `status` is
 * the channel's own shipping status normalised to our `ShipmentStatus` vocabulary, so the tenant's
 * Fulfillment record and the seller UI read one set of statuses regardless of channel.
 */
export interface ArrangedShipment {
  readonly externalOrderId: string;
  readonly trackingNumber: string;
  readonly status: ShipmentStatus;
  /** When the channel says the shipment was arranged. `null` when it does not report one. */
  readonly arrangedAt: Instant | null;
}

/**
 * The printable document a channel produces for a shipment it arranged.
 *
 * A channel returns it one of two ways and never both: TikTok Shop answers with a `doc_url`, while
 * Shopee returns the file itself. Exactly one of `url` / `inlineBase64` is set, so a caller that
 * needs the bytes knows to decode one and a caller that stores a reference knows to take the other.
 */
export interface ShippingLabel {
  readonly externalOrderId: string;
  /** Where to fetch the document, when the channel returns a URL. */
  readonly url: string | null;
  /** The document bytes as base64, when the channel returns the file inline. */
  readonly inlineBase64: string | null;
  readonly format: "pdf" | "zpl";
  /** The channel's document kind, for example `SHIPPING_LABEL` or `PACKING_SLIP`. */
  readonly documentType: string;
}

/** A page of channel tracking events, normalised to the courier-neutral `TrackingEvent` shape. */
export interface ChannelTrackingPage {
  readonly externalOrderId: string;
  readonly events: readonly TrackingEvent[];
}
