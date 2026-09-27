/**
 * The listing shapes Shopee returns, narrowed to the fields we use.
 *
 * As with the order schema, the vendored generated types describe the envelope but not every field
 * we need reliably (`get_item_list` returns only ids and status; the seller SKU and the model id
 * come from `get_model_list`). This file is a local, reviewed description built from the generated
 * types; it does not patch `dist/` (docs/adr/0007).
 */

import type { ListingStatus } from "@platform/contracts";

/** One entry of `product/get_item_list`. Only ids and status; details come per item. */
export interface ShopeeItemSummary {
  readonly item_id?: number;
  readonly item_status?: string;
  readonly update_time?: number;
}

export interface ShopeeItemListResponse {
  readonly error?: string;
  readonly message?: string;
  readonly request_id?: string;
  readonly response?: {
    readonly item?: readonly ShopeeItemSummary[];
    readonly total_count?: number;
    readonly has_next_page?: boolean;
    readonly next_offset?: number;
  };
}

export interface ShopeeModel {
  readonly model_id?: number;
  readonly model_sku?: string;
  readonly model_status?: string;
  readonly stock_info_v2?: {
    readonly summary_info?: {
      readonly total_available_stock?: number;
    };
  };
}

export interface ShopeeModelListResponse {
  readonly error?: string;
  readonly message?: string;
  readonly request_id?: string;
  readonly response?: {
    readonly model?: readonly ShopeeModel[];
  };
}

export interface ShopeeItemBaseInfo {
  readonly item_id?: number;
  readonly item_name?: string;
  readonly item_sku?: string;
}

export interface ShopeeItemBaseInfoResponse {
  readonly error?: string;
  readonly message?: string;
  readonly request_id?: string;
  readonly response?: {
    readonly item_list?: readonly ShopeeItemBaseInfo[];
  };
}

/**
 * Map Shopee's item status to the platform vocabulary.
 *
 * Shopee's statuses include `NORMAL`, `BANNED`, `UNLIST`, `REVIEWING`, `SELLER_DELETE`,
 * `SHOPEE_DELETE`. Only `NORMAL` is sellable; anything unrecognised becomes `unknown` so it is not
 * mistaken for an active listing.
 */
export function shopeeListingStatus(status: string | undefined): ListingStatus {
  switch (status) {
    case "NORMAL":
      return "active";
    case "REVIEWING":
      return "draft";
    case "BANNED":
    case "UNLIST":
    case "SELLER_DELETE":
    case "SHOPEE_DELETE":
      return "inactive";
    default:
      return "unknown";
  }
}
