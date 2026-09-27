import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddAddOnDealRequest {
    "add_on_deal_name": string;
    "start_time": string;
    "end_time": string;
    "promotion_type": string;
    "purchase_min_spend"?: string;
    "per_gift_num"?: string;
    "promotion_purchase_limit"?: string;
}
export interface AddAddOnDealResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface AddAddOnDealMainItemRequest {
    "add_on_deal_id": number;
    "main_item_list": Array<{
        "status"?: number;
        "item_id"?: number;
    }>;
}
export interface AddAddOnDealMainItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "main_item_list"?: Array<{
            "item_id"?: number;
            "status"?: number;
        }>;
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface AddAddOnDealSubItemRequest {
    "sub_item_list": Array<{
        "status"?: number;
        "model_id"?: number;
        "item_id"?: number;
        "sub_item_input_price"?: number;
        "sub_item_limit"?: number;
    }>;
    "add_on_deal_id": number;
}
export interface AddAddOnDealSubItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
        "sub_item_list"?: Array<{
            "item_id"?: number;
            "model_id"?: number;
            "fail_message"?: string;
            "fail_error"?: string;
        }>;
    };
    "error"?: string;
}
export interface DeleteAddOnDealRequest {
    "add_on_deal_id": number;
}
export interface DeleteAddOnDealResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface DeleteAddOnDealMainItemRequest {
    "main_item_list": Array<number>;
    "add_on_deal_id": number;
}
export interface DeleteAddOnDealMainItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "main_item_list"?: Array<{
            "item_id"?: number;
        }>;
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface DeleteAddOnDealSubItemRequest {
    "sub_item_list": Array<{
        "model_id"?: number;
        "item_id"?: number;
    }>;
    "add_on_deal_id": number;
}
export interface DeleteAddOnDealSubItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
        "sub_item_list"?: Array<{
            "item_id"?: number;
            "model_id"?: number;
            "fail_message"?: string;
            "fail_error"?: string;
        }>;
    };
    "error"?: string;
}
export interface EndAddOnDealRequest {
    "add_on_deal_id": number;
}
export interface EndAddOnDealResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface GetAddOnDealRequest {
    /** Shopee's unique identifier for an add on deal activity. Example: 12069 */
    "add_on_deal_id": number;
}
export interface GetAddOnDealResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "start_time"?: number;
        "purchase_min_spend"?: number;
        "source"?: number;
        "add_on_deal_id"?: number;
        "promotion_purchase_limit"?: number;
        "end_time"?: number;
        "add_on_deal_name"?: string;
        "per_gift_num"?: number;
        "promotion_type"?: number;
        "sub_item_priority"?: unknown[];
    };
    "error"?: string;
}
export interface GetAddOnDealListRequest {
    /** The Status of add on deal，default status is all Example: all */
    "promotion_status": string;
    /** The default page number is 1 Example: 1 */
    "page_no"?: number;
    /** The default page size is 100 Example: 100 */
    "page_size"?: number;
}
export interface GetAddOnDealListResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_list"?: Array<{
            "start_time"?: number;
            "purchase_min_spend"?: string;
            "promotion_type"?: number;
            "source"?: number;
            "add_on_deal_id"?: number;
            "end_time"?: number;
            "add_on_deal_name"?: string;
            "per_gift_num"?: number;
            "promotion_purchase_limit"?: number;
            "sub_item_priority"?: unknown[];
        }>;
        "more"?: boolean;
    };
    "error"?: string;
}
export interface GetAddOnDealMainItemRequest {
    /** Shopee's unique identifier for add on deal activity. Example: 12069 */
    "add_on_deal_id": number;
}
export interface GetAddOnDealMainItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "main_item_list"?: Array<{
            "status"?: number;
            "item_id"?: number;
        }>;
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface GetAddOnDealSubItemRequest {
    /** Shopee's unique identifier for add on deal activity. Example: 12069 */
    "add_on_deal_id": number;
}
export interface GetAddOnDealSubItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
        "sub_item_list"?: Array<{
            "status"?: number;
            "item_id"?: number;
            "sub_item_limit"?: number;
            "price": {
                "promo_input_price"?: number;
                "promo_price"?: number;
            };
        }>;
    };
    "error"?: string;
}
export interface UpdateAddOnDealRequest {
    "add_on_deal_id": number;
    "add_on_deal_name"?: string;
    "sub_item_priority"?: unknown[];
    "sub_item_limit"?: number;
}
export interface UpdateAddOnDealResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "start_time"?: number;
        "purchase_min_spend"?: number;
        "source"?: number;
        "add_on_deal_id"?: number;
        "promotion_purchase_limit"?: number;
        "end_time"?: number;
        "add_on_deal_name"?: string;
        "per_gift_num"?: number;
        "promotion_type"?: number;
        "sub_item_priority"?: Array<number>;
    };
    "error"?: string;
}
export interface UpdateAddOnDealMainItemRequest {
    "add_on_deal_id": number;
    "main_item_list": Array<{
        "status"?: number;
        "item_id"?: number;
    }>;
}
export interface UpdateAddOnDealMainItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "main_item_list"?: Array<{
            "item_id"?: number;
            "status"?: number;
        }>;
        "add_on_deal_id"?: number;
    };
    "error"?: string;
}
export interface UpdateAddOnDealSubItemRequest {
    "add_on_deal_id": number;
    "sub_item_list": Array<{
        "status"?: number;
        "item_id"?: number;
        "sub_item_input_price"?: number;
        "sub_item_limit"?: number;
    }>;
}
export interface UpdateAddOnDealSubItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "add_on_deal_id"?: number;
        "sub_item_list"?: Array<{
            "status"?: number;
            "item_id"?: number;
            "sub_item_limit"?: number;
            "sub_item_input_price"?: number;
        }>;
    };
    "error"?: string;
}
export declare class ShopeeAddOnDealApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add add on deal
     * /api/v2/add_on_deal/add_add_on_deal (POST)
     */
    addAddOnDeal(params: AddAddOnDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddAddOnDealResponse>>;
    /**
     * add add on deal main item
     * /api/v2/add_on_deal/add_add_on_deal_main_item (POST)
     */
    addAddOnDealMainItem(params: AddAddOnDealMainItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddAddOnDealMainItemResponse>>;
    /**
     * add add on deal sub item
     * /api/v2/add_on_deal/add_add_on_deal_sub_item (POST)
     */
    addAddOnDealSubItem(params: AddAddOnDealSubItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddAddOnDealSubItemResponse>>;
    /**
     * delete add on deal
     * /api/v2/add_on_deal/delete_add_on_deal (POST)
     */
    deleteAddOnDeal(params: DeleteAddOnDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteAddOnDealResponse>>;
    /**
     * delete add on deal main item
     * /api/v2/add_on_deal/delete_add_on_deal_main_item (POST)
     */
    deleteAddOnDealMainItem(params: DeleteAddOnDealMainItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteAddOnDealMainItemResponse>>;
    /**
     * delete add on deal sub item
     * /api/v2/add_on_deal/delete_add_on_deal_sub_item (POST)
     */
    deleteAddOnDealSubItem(params: DeleteAddOnDealSubItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteAddOnDealSubItemResponse>>;
    /**
     * end add on deal
     * /api/v2/add_on_deal/end_add_on_deal (POST)
     */
    endAddOnDeal(params: EndAddOnDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EndAddOnDealResponse>>;
    /**
     * get add on deal
     * /api/v2/add_on_deal/get_add_on_deal (GET)
     */
    getAddOnDeal(params: GetAddOnDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAddOnDealResponse>>;
    /**
     * get add on deal list
     * /api/v2/add_on_deal/get_add_on_deal_list (GET)
     */
    getAddOnDealList(params: GetAddOnDealListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAddOnDealListResponse>>;
    /**
     * get add on deal main item
     * /api/v2/add_on_deal/get_add_on_deal_main_item (GET)
     */
    getAddOnDealMainItem(params: GetAddOnDealMainItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAddOnDealMainItemResponse>>;
    /**
     * get add on deal sub item
     * /api/v2/add_on_deal/get_add_on_deal_sub_item (GET)
     */
    getAddOnDealSubItem(params: GetAddOnDealSubItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAddOnDealSubItemResponse>>;
    /**
     * update add on deal
     * /api/v2/add_on_deal/update_add_on_deal (POST)
     */
    updateAddOnDeal(params: UpdateAddOnDealRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateAddOnDealResponse>>;
    /**
     * update add on deal main item
     * /api/v2/add_on_deal/update_add_on_deal_main_item (POST)
     */
    updateAddOnDealMainItem(params: UpdateAddOnDealMainItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateAddOnDealMainItemResponse>>;
    /**
     * update add on deal sub item
     * /api/v2/add_on_deal/update_add_on_deal_sub_item (POST)
     */
    updateAddOnDealSubItem(params: UpdateAddOnDealSubItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateAddOnDealSubItemResponse>>;
}
