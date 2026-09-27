/**
 * The order shapes TikTok Shop actually returns, narrowed to the fields we use.
 *
 * Why this is hand-written rather than imported from the vendored SDK: the vendored
 * `GetOrderDetailResponse` types an order as only `{ handling_duration, payment, recipient_address }`
 * and has no `orders[].id`, no `create_time` and no `line_items`. The published TikTok Shop OAS
 * (checked in the official `@tts-open-toolkit/cli` specs) does include all three, so the generated
 * type is incomplete, not the API.
 *
 * This schema therefore mirrors the official OAS. That is not editing generated code (docs/adr/0007
 * forbids that); it is a local, reviewed description of the response, and it is the only shape the
 * connector maps from.
 *
 * Confirmed against a live sandbox order (2026-09-28): TikTok does not send a per-line quantity at
 * all. It sends one line item per unit — the observed order had two identical line items and
 * `payment.sub_total` equal to twice the unit price. Per-line quantity is therefore `lineQuantity()`
 * below, which is 1 unless a future response ever carries the chargeable `quantity` field.
 */

export interface TikTokOrderLine {
  readonly id?: string;
  readonly package_id?: string;
  readonly product_id?: string;
  readonly sku_id?: string;
  readonly seller_sku?: string;
  readonly product_name?: string;
  readonly sku_name?: string;
  readonly currency?: string;
  readonly original_price?: string;
  readonly sale_price?: string;
  readonly platform_discount?: string;
  readonly seller_discount?: string;
  readonly is_gift?: boolean;
  /**
   * Not present in live responses. Kept optional so that if TikTok ever adds a chargeable quantity
   * we honour it instead of double-counting; `lineQuantity()` is the single reader.
   */
  readonly quantity?: number;
}

export interface TikTokOrderPayment {
  readonly currency?: string;
  readonly sub_total?: string;
  readonly shipping_fee?: string;
  readonly original_shipping_fee?: string;
  readonly total_amount?: string;
  readonly seller_discount?: string;
  readonly platform_discount?: string;
}

export interface TikTokOrder {
  readonly id?: string;
  readonly create_time?: number;
  readonly line_items?: readonly TikTokOrderLine[];
  readonly payment?: TikTokOrderPayment;
}

export interface TikTokOrderSearchResponse {
  readonly code?: number;
  readonly message?: string;
  readonly request_id?: string;
  readonly data?: {
    readonly orders?: readonly TikTokOrder[];
    readonly next_page_token?: string;
    readonly total_count?: number;
  };
}

export interface TikTokOrderDetailResponse {
  readonly code?: number;
  readonly message?: string;
  readonly request_id?: string;
  readonly data?: {
    readonly orders?: readonly TikTokOrder[];
  };
}

/**
 * Per-line quantity. The API reference does not document a quantity field, and a live sandbox order
 * (2026-09-28) confirmed there is none: TikTok sends one line item per unit. `lineQuantity()` below
 * returns 1 for such lines rather than inventing 0, which would read as "no items".
 */
export function extractOrderLines(order: TikTokOrder): readonly TikTokOrderLine[] {
  return order.line_items ?? [];
}

/**
 * Quantity for one line item. TikTok sends one line item per unit and no quantity field (confirmed
 * against a live sandbox order, 2026-09-28), so the default is 1 — reading it as 0 would make every
 * imported order look empty. The documented `quantity` field is still honoured if it ever appears.
 */
export function lineQuantity(line: TikTokOrderLine): number {
  if (typeof line.quantity === "number" && line.quantity > 0) return line.quantity;
  return 1;
}
