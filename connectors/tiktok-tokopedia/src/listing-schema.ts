/**
 * The listing shapes TikTok Shop actually returns, narrowed to the fields we use.
 *
 * Hand-written for the same reason as `order-schema.ts`: the vendored
 * `SearchProductsResponse` types a product as only `{ audit, skus: { price, pre_sale, status_info } }`
 * with no `products[].id`, no `title`, no `products[].status` and no per-SKU id or seller SKU. The
 * official TikTok Shop OAS includes all of them, so the generated type is incomplete, not the API
 * (AGENTS.md §9). Confirming each field against a live Development Shop is recorded as an open gap
 * in docs/PLAN.md; until then no stock push is claimed to work end to end.
 */

import type { ListingStatus } from "@platform/contracts";

export interface TikTokProductSku {
  readonly id?: string;
  readonly seller_sku?: string;
  readonly inventory?: readonly TikTokInventoryEntry[];
  readonly status_info?: { readonly status?: string };
}

export interface TikTokInventoryEntry {
  readonly warehouse_id?: string;
  readonly quantity?: number;
}

export interface TikTokProduct {
  readonly id?: string;
  readonly title?: string;
  readonly status?: string;
  readonly update_time?: number;
  readonly skus?: readonly TikTokProductSku[];
}

export interface TikTokSearchProductsResponse {
  readonly code?: number;
  readonly message?: string;
  readonly request_id?: string;
  readonly data?: {
    readonly products?: readonly TikTokProduct[];
    readonly next_page_token?: string;
    readonly total_count?: number;
  };
}

export interface TikTokUpdateInventoryResponse {
  readonly code?: number;
  readonly message?: string;
  readonly request_id?: string;
  readonly data?: {
    readonly errors?: readonly {
      readonly detail?: readonly { readonly sku_id?: string }[];
    }[];
  };
}

/**
 * Map TikTok's product status to the platform vocabulary.
 *
 * TikTok's documented statuses include `ACTIVATE`, `DRAFT`, `PENDING`, `FAILED`, `DEACTIVATED`.
 * Anything unrecognised becomes `unknown` rather than being coerced to `active`: treating an
 * unreadable status as sellable is how a stock push goes to a product nobody can buy.
 */
export function listingStatusOf(status: string | undefined): ListingStatus {
  switch (status) {
    case "ACTIVATE":
      return "active";
    case "DRAFT":
    case "PENDING":
      return "draft";
    case "DEACTIVATED":
    case "FAILED":
      return "inactive";
    default:
      return "unknown";
  }
}
