import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface AddLIVEProductsRequest {
}
export interface AddLIVEProductsBody {
    "product_ids"?: Array<string>;
}
export interface AddLIVEProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface AddShowcaseProductsoldRequest {
}
export interface AddShowcaseProductsoldBody {
    "product_ids"?: Array<string>;
}
export interface AddShowcaseProductsoldResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CheckAnchorContentRequest {
}
export interface CheckAnchorContentBody {
    "title"?: string;
}
export interface CheckAnchorContentResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface CheckAnchorPrerequisitesRequest {
}
export interface CheckAnchorPrerequisitesBody {
    "product_id"?: string;
}
export interface CheckAnchorPrerequisitesResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface GetCreatorProfileoldRequest {
}
export interface GetCreatorProfileoldResponse {
    "code"?: number;
    "data"?: {
        "avatar"?: {
            "height"?: number;
            "url"?: string;
            "width"?: number;
        };
        "partner_id"?: string;
        "partner_name"?: string;
        "permissions"?: Array<string>;
        "register_region"?: string;
        "selection_region"?: string;
        "seller_type"?: string;
        "user_name"?: string;
        "user_type"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetLIVEProductsRequest {
}
export interface GetLIVEProductsResponse {
    "code"?: number;
    "data"?: {
        "pinned_product_id"?: string;
        "products"?: Array<{
            "commission"?: {
                "commission_rate"?: number;
                "inclusive_reward_commission_rate"?: number;
            };
            "price"?: {
                "original_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
                "platform_discount_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
                "seller_discount_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
            };
            "status"?: {
                "added_status"?: string;
                "inventory_status"?: string;
                "review_status"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetLiveRoomInfoRequest {
}
export interface GetLiveRoomInfoResponse {
    "code"?: number;
    "data"?: {
        "id"?: string;
        "start_time"?: number;
        "status"?: string;
        "title"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShopProductslegacyRequest {
    /** The pagination offset that determines where you begin your search. If you are making your first request, this will be empty. */
    "page_token"?: string;
    /** Pagination count determines how many products you'll get after sending the request. 20 is a recommended number. */
    "page_size": number;
    /** The title keyword of the product you wish to search by. */
    "title_keyword"?: string;
    /** Sort fields include PRODUCT_ID, PRICE and SALE. If sort_field is empty or invalid, PRODUCT_ID will be set as default. */
    "sort_field"?: string;
    /** Sort orders include 0:DESC and 1:ASC. If sort order is empty or invalid, DESC will be set as default. */
    "sort_order"?: string;
}
export interface GetShopProductslegacyResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "price"?: {
                "amount"?: string;
                "currency"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShowcaseProductsoldRequest {
    /** The maximum number of products returned in the response. Default to be 50 if not set. */
    "page_size"?: number;
    /** The page token */
    "page_token"?: string;
    /** Where the request is sent from. LIVE: sent from live room. The response will return the product IDs in the LIVE as well. The "add_status" field will be whether the product is in the live bag, or whether the product is in the prelive product preparation list if the creator is not live streaming. SHOW */
    "origin"?: string;
}
export interface GetShowcaseProductsoldResponse {
    "code"?: number;
    "data"?: {
        "live_product_ids"?: Array<string>;
        "next_page_token"?: string;
        "products"?: Array<{
            "addition"?: Array<{
                "customized_main_image"?: Array<Record<string, unknown>>;
            }>;
            "commission"?: {
                "commission_rate"?: number;
                "inclusive_reward_commission_rate"?: number;
            };
            "price"?: {
                "original_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
                "platform_discount_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
                "seller_discount_price"?: {
                    "currency"?: string;
                    "highest_amount"?: string;
                    "lowest_amount"?: string;
                };
            };
            "status"?: {
                "added_status"?: string;
                "inventory_status"?: string;
                "is_hidden"?: boolean;
                "review_status"?: string;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PinLIVEProductRequest {
    /** The product IDs to move to the top in a creator's TikTok LIVE. (path) */
    "product_id": string;
}
export interface PinLIVEProductResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface RemoveLIVEProductsRequest {
}
export interface RemoveLIVEProductsBody {
    "product_ids"?: Array<string>;
}
export interface RemoveLIVEProductsResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface RemoveShowcaseProductsoldRequest {
}
export interface RemoveShowcaseProductsoldBody {
    "product_ids"?: Array<string>;
}
export interface RemoveShowcaseProductsoldResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface TopLIVEProductsRequest {
}
export interface TopLIVEProductsBody {
    "product_ids"?: Array<string>;
}
export interface TopLIVEProductsResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface TopShowcaseProductsoldRequest {
}
export interface TopShowcaseProductsoldBody {
    "product_ids"?: Array<string>;
}
export interface TopShowcaseProductsoldResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UnpinLIVEProductRequest {
    /** The product ID to unpin in a creator's TikTok LIVE. (path) */
    "product_id": string;
}
export interface UnpinLIVEProductResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokAffiliateApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * AddLIVEProducts
     * /affiliate/202309/live_rooms/products (POST)
     */
    addLIVEProducts(params: AddLIVEProductsRequest, body?: AddLIVEProductsBody, opts?: TikTokRequestOptions): Promise<AddLIVEProductsResponse>;
    /**
     * AddShowcaseProductsold
     * /affiliate/202309/showcases/products (POST)
     */
    addShowcaseProductsold(params: AddShowcaseProductsoldRequest, body?: AddShowcaseProductsoldBody, opts?: TikTokRequestOptions): Promise<AddShowcaseProductsoldResponse>;
    /**
     * CheckAnchorContent
     * /affiliate/202403/anchors/content_check (POST)
     */
    checkAnchorContent(params: CheckAnchorContentRequest, body?: CheckAnchorContentBody, opts?: TikTokRequestOptions): Promise<CheckAnchorContentResponse>;
    /**
     * CheckAnchorPrerequisites
     * /affiliate/202402/anchors/prerequisite_check (POST)
     */
    checkAnchorPrerequisites(params: CheckAnchorPrerequisitesRequest, body?: CheckAnchorPrerequisitesBody, opts?: TikTokRequestOptions): Promise<CheckAnchorPrerequisitesResponse>;
    /**
     * GetCreatorProfileold
     * /affiliate/202309/profiles (GET)
     */
    getCreatorProfileold(params: GetCreatorProfileoldRequest, opts?: TikTokRequestOptions): Promise<GetCreatorProfileoldResponse>;
    /**
     * GetLIVEProducts
     * /affiliate/202309/live_rooms/products (GET)
     */
    getLIVEProducts(params: GetLIVEProductsRequest, opts?: TikTokRequestOptions): Promise<GetLIVEProductsResponse>;
    /**
     * GetLiveRoomInfo
     * /affiliate/202309/live_rooms (GET)
     */
    getLiveRoomInfo(params: GetLiveRoomInfoRequest, opts?: TikTokRequestOptions): Promise<GetLiveRoomInfoResponse>;
    /**
     * GetShopProductslegacy
     * /affiliate/202309/shop_products (GET)
     */
    getShopProductslegacy(params: GetShopProductslegacyRequest, opts?: TikTokRequestOptions): Promise<GetShopProductslegacyResponse>;
    /**
     * GetShowcaseProductsold
     * /affiliate/202309/showcases/products (GET)
     */
    getShowcaseProductsold(params: GetShowcaseProductsoldRequest, opts?: TikTokRequestOptions): Promise<GetShowcaseProductsoldResponse>;
    /**
     * PinLIVEProduct
     * /affiliate/202309/live_rooms/products/{product_id}/pin (POST)
     */
    pinLIVEProduct(params: PinLIVEProductRequest, opts?: TikTokRequestOptions): Promise<PinLIVEProductResponse>;
    /**
     * RemoveLIVEProducts
     * /affiliate/202309/live_rooms/products (DELETE)
     */
    removeLIVEProducts(params: RemoveLIVEProductsRequest, body?: RemoveLIVEProductsBody, opts?: TikTokRequestOptions): Promise<RemoveLIVEProductsResponse>;
    /**
     * RemoveShowcaseProductsold
     * /affiliate/202309/showcases/products (DELETE)
     */
    removeShowcaseProductsold(params: RemoveShowcaseProductsoldRequest, body?: RemoveShowcaseProductsoldBody, opts?: TikTokRequestOptions): Promise<RemoveShowcaseProductsoldResponse>;
    /**
     * TopLIVEProducts
     * /affiliate/202309/live_rooms/products/top (POST)
     */
    topLIVEProducts(params: TopLIVEProductsRequest, body?: TopLIVEProductsBody, opts?: TikTokRequestOptions): Promise<TopLIVEProductsResponse>;
    /**
     * TopShowcaseProductsold
     * /affiliate/202309/showcases/products/top (POST)
     */
    topShowcaseProductsold(params: TopShowcaseProductsoldRequest, body?: TopShowcaseProductsoldBody, opts?: TikTokRequestOptions): Promise<TopShowcaseProductsoldResponse>;
    /**
     * UnpinLIVEProduct
     * /affiliate/202309/live_rooms/products/{product_id}/unpin (POST)
     */
    unpinLIVEProduct(params: UnpinLIVEProductRequest, opts?: TikTokRequestOptions): Promise<UnpinLIVEProductResponse>;
}
