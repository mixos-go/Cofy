import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddBundleDealRequest {
    "rule_type": number;
    "discount_value": number;
    "fix_price": number;
    "discount_percentage": number;
    "min_amount": number;
    "start_time": number;
    "end_time": number;
    "name": string;
    "purchase_limit": number;
    "additional_tiers"?: Array<{
        "min_amount"?: number;
        "fix_price"?: number;
        "discount_value"?: number;
        "discount_percentage"?: number;
    }>;
}
export interface AddBundleDealResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_id"?: number;
    };
}
export interface AddBundleDealItemRequest {
    "bundle_deal_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "status"?: number;
    }>;
}
export interface AddBundleDealItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failed_list"?: Array<{
            "item_id"?: number;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
        "success_list"?: Array<number>;
    };
}
export interface DeleteBundleDealRequest {
    "bundle_deal_id": number;
}
export interface DeleteBundleDealResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_id"?: number;
    };
}
export interface DeleteBundleDealItemRequest {
    "bundle_deal_id": number;
    "item_list": Array<{
        "item_id"?: number;
    }>;
}
export interface DeleteBundleDealItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failed_list"?: Array<{
            "item_id"?: number;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
        "success_list"?: Array<number>;
    };
}
export interface EndBundleDealRequest {
    "bundle_deal_id": number;
}
export interface EndBundleDealResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_id"?: number;
    };
}
export interface GetBundleDealRequest {
    /** Shopee's unique identifier for a bundle deal activity. Example: 113891 */
    "bundle_deal_id": number;
}
export interface GetBundleDealResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_id"?: number;
        "name"?: string;
        "start_time"?: number;
        "end_time"?: number;
        "bundle_deal_rule": {
            "rule_type"?: number;
            "discount_value"?: number;
            "fix_price"?: number;
            "discount_percentage"?: number;
            "min_amount"?: number;
            "additional_tiers": {
                "min_amount"?: number;
                "fix_price"?: number;
                "discount_value"?: number;
                "discount_percentage"?: number;
            };
        };
        "purchase_limit"?: number;
    };
}
export interface GetBundleDealItemRequest {
    /** Shopee's unique identifier for a bundle deal activity. Example: 113891 */
    "bundle_deal_id": number;
}
export interface GetBundleDealItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: null;
}
export interface GetBundleDealListRequest {
    /** Data paging, representing the data size of each page, the maximum is 1000, the default is 20 Example: 100 */
    "page_size"?: number;
    /** The Status of bundle deal，all=1；upcoming=2；ongoing=3，expired=4 , the default is 1 Example: 2 */
    "time_status"?: number;
    /** Data paging, represents the page number, starting from 1, the default is 1 Example: 1 */
    "page_no"?: number;
}
export interface GetBundleDealListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_list"?: Array<{
            "bundle_deal_id"?: number;
            "name"?: string;
            "start_time"?: number;
            "end_time"?: number;
            "bundle_deal_rule": {
                "rule_type"?: number;
                "discount_value"?: number;
                "fix_price"?: number;
                "discount_percentage"?: number;
                "min_amount"?: number;
                "additional_tiers"?: Array<{
                    "min_amount"?: number;
                    "fix_price"?: number;
                    "discount_value"?: number;
                    "discount_percentage"?: number;
                }>;
            };
            "purchase_limit"?: number;
        }>;
        "more"?: boolean;
    };
}
export interface UpdateBundleDealRequest {
    "bundle_deal_id": number;
    "rule_type"?: number;
    "discount_value"?: number;
    "fix_price"?: number;
    "discount_percentage"?: number;
    "min_amount": number;
    "start_time"?: number;
    "end_time"?: number;
    "name"?: string;
    "purchase_limit"?: number;
}
export interface UpdateBundleDealResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "bundle_deal_id"?: number;
        "name"?: string;
        "start_time"?: number;
        "end_time"?: number;
        "bundle_deal_rule": {
            "rule_type"?: number;
            "discount_value"?: number;
            "fix_price"?: number;
            "discount_percentage"?: number;
            "min_amount"?: number;
        };
        "purchase_limit"?: number;
    };
}
export interface UpdateBundleDealItemRequest {
    "bundle_deal_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "status"?: number;
    }>;
}
export interface UpdateBundleDealItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failed_list"?: Array<{
            "item_id"?: number;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
        "success_list"?: Array<number>;
    };
}
export declare class ShopeeBundleDealApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add bundle deal
     * /api/v2/bundle_deal/add_bundle_deal (POST)
     */
    addBundleDeal(params: AddBundleDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddBundleDealResponse>>;
    /**
     * add bundle deal item
     * /api/v2/bundle_deal/add_bundle_deal_item (POST)
     */
    addBundleDealItem(params: AddBundleDealItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddBundleDealItemResponse>>;
    /**
     * delete bundle deal
     * /api/v2/bundle_deal/delete_bundle_deal (POST)
     */
    deleteBundleDeal(params: DeleteBundleDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteBundleDealResponse>>;
    /**
     * delete bundle deal item
     * /api/v2/bundle_deal/delete_bundle_deal_item (POST)
     */
    deleteBundleDealItem(params: DeleteBundleDealItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteBundleDealItemResponse>>;
    /**
     * end bundle deal
     * /api/v2/bundle_deal/end_bundle_deal (POST)
     */
    endBundleDeal(params: EndBundleDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EndBundleDealResponse>>;
    /**
     * get bundle deal
     * /api/v2/bundle_deal/get_bundle_deal (GET)
     */
    getBundleDeal(params: GetBundleDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBundleDealResponse>>;
    /**
     * get bundle deal item
     * /api/v2/bundle_deal/get_bundle_deal_item (GET)
     */
    getBundleDealItem(params: GetBundleDealItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBundleDealItemResponse>>;
    /**
     * get bundle deal list
     * /api/v2/bundle_deal/get_bundle_deal_list (GET)
     */
    getBundleDealList(params: GetBundleDealListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBundleDealListResponse>>;
    /**
     * update bundle deal
     * /api/v2/bundle_deal/update_bundle_deal (POST)
     */
    updateBundleDeal(params: UpdateBundleDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateBundleDealResponse>>;
    /**
     * update bundle deal item
     * /api/v2/bundle_deal/update_bundle_deal_item (POST)
     */
    updateBundleDealItem(params: UpdateBundleDealItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateBundleDealItemResponse>>;
}
