import type { ChannelCode, Instant, Money, OrderId } from "./ids.ts";

/**
 * The normalised shape of an order pulled from any marketplace.
 *
 * Every connector maps its marketplace's raw response into this. Nothing outside a connector may
 * know the raw shape (AGENTS.md §4).
 */
export interface ChannelOrder {
  readonly channel: ChannelCode;
  readonly externalOrderId: string;
  readonly placedAt: Instant;
  readonly buyerEmail: string | null;
  readonly currency: "IDR";
  readonly lines: readonly ChannelOrderLine[];
  readonly totals: ChannelOrderTotals;
}

export interface ChannelOrderLine {
  readonly externalLineId: string;
  readonly sku: string | null;
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: Money;
}

export interface ChannelOrderTotals {
  readonly subtotal: Money;
  readonly shipping: Money;
  readonly discount: Money;
  readonly grandTotal: Money;
}

/** A stock level we want reflected on a channel. */
export interface StockUpdate {
  readonly sku: string;
  readonly available: number;
}

export interface StockResult {
  readonly sku: string;
  readonly accepted: boolean;
  readonly reason: StockRejectionReason | null;
}

export type StockRejectionReason = "unknown_sku" | "rate_limited" | "channel_error" | "invalid_quantity";

/** Opaque pagination cursor. Only the connector that produced it may interpret it. */
export interface Cursor {
  readonly value: string | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly next: Cursor;
}

/** Placement of a local order back onto a channel, so the seller sees it as processed. */
export interface OrderAcknowledgement {
  readonly orderId: OrderId;
  readonly externalOrderId: string;
}
