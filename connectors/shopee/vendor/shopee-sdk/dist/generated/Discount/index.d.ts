import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddDiscountRequest {
    "start_time": number;
    "end_time": number;
    "discount_name": string;
}
export interface AddDiscountResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_id"?: number;
    };
    "error"?: string;
}
export interface AddDiscountItemRequest {
    "discount_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "purchase_limit"?: number;
        "model_list"?: Array<{
            "model_id"?: number;
            "model_promotion_price"?: number;
        }>;
    }>;
}
export interface AddDiscountItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_id"?: number;
        "count"?: number;
        "error_list"?: unknown[];
        "warning"?: string;
    };
    "error"?: string;
}
export interface DeleteDiscountRequest {
    "discount_id": number;
}
export interface DeleteDiscountResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "discount_id"?: number;
        "modify_time"?: number;
    };
    "request_id"?: string;
}
export interface DeleteDiscountItemRequest {
    "discount_id": number;
    "item_id": number;
    "model_id"?: number;
}
export interface DeleteDiscountItemResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_id"?: number;
        "error_list"?: unknown[];
    };
    "error"?: string;
}
export interface DeleteSipDiscountRequest {
    "region": string;
}
export interface DeleteSipDiscountResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "region"?: string;
    };
}
export interface EndDiscountRequest {
    "discount_id": number;
}
export interface EndDiscountResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_id"?: number;
        "modify_time"?: number;
    };
}
export interface GetDiscountRequest {
    /** Shopee's unique identifier for a discount activity. Example: 1000029882 */
    "discount_id": number;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. Example: 50 */
    "page_size": number;
}
export interface GetDiscountResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "status"?: string;
        "discount_name"?: string;
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "normal_stock"?: number;
            "item_promotion_stock"?: number;
            "item_original_price"?: number;
            "item_promotion_price"?: number;
            "item_inflated_price_of_original_price"?: number;
            "item_inflated_price_of_promotion_price"?: number;
            "item_local_price"?: number;
            "item_local_promotion_price"?: number;
            "model_list"?: Array<{
                "model_id"?: number;
                "model_name"?: string;
                "model_normal_stock"?: number;
                "model_promotion_stock"?: number;
                "model_original_price"?: number;
                "model_promotion_price"?: number;
                "model_inflated_price_of_original_price"?: number;
                "model_inflated_price_of_promotion_price"?: number;
                "model_local_price"?: number;
                "model_local_promotion_price"?: number;
            }>;
            "purchase_limit"?: number;
        }>;
        "start_time"?: number;
        "discount_id"?: number;
        "end_time"?: number;
        "more"?: boolean;
    };
}
export interface GetDiscountListRequest {
    /** The status filter for retriveing discount list. Available value: upcoming/ongoing/expired/all. Example: ongoing */
    "discount_status": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** If many items are available to retrieve, you may need to call GetDiscountsList multiple times to retrieve all the data. Each result set is returned as a page of entries. Use the Pagination filters to control the maximum number of entries (<= 100) to retrieve per page (i.e., per call), the offset number to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. Example: 100 */
    "page_size": number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the discount update time). The maximum date range that may be specified with the update_time_from and update_time_to fields is 30 days. Example: 1643860467 */
    "update_time_from"?: number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the discount update time). The maximum date range that may be specified with the update_time_from and update_time_to fields is 30 days. Example: 1646020467 */
    "update_time_to"?: number;
}
export interface GetDiscountListResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_list"?: Array<{
            "status"?: string;
            "discount_name"?: string;
            "start_time"?: number;
            "discount_id"?: number;
            "source"?: number;
            "end_time"?: number;
        }>;
        "more"?: boolean;
    };
    "error"?: string;
}
export interface GetSipDiscountsRequest {
    /** The region of SIP affiliate shop that needs to get discount information. If do not pass, will return the discount information set for all SIP affiliate shops. Example: SG */
    "region"?: string;
}
export interface GetSipDiscountsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_list"?: Array<{
            "create_time"?: number;
            "end_time"?: number;
            "region"?: string;
            "sip_discount_rate"?: number;
            "start_time"?: number;
            "status"?: string;
            "update_time"?: number;
        }>;
    };
}
export interface SetSipDiscountRequest {
    "region": string;
    "sip_discount_rate": number;
}
export interface SetSipDiscountResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "create_time"?: number;
        "end_time"?: number;
        "region"?: string;
        "sip_discount_rate"?: number;
        "start_time"?: number;
        "status"?: string;
        "update_time"?: number;
    };
}
export interface UpdateDiscountRequest {
    "discount_id": number;
    "start_time"?: number;
    "end_time"?: number;
    "discount_name"?: string;
}
export interface UpdateDiscountResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "discount_id"?: number;
        "modify_time"?: number;
    };
    "error"?: string;
}
export interface UpdateDiscountItemRequest {
    "discount_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "purchase_limit"?: number;
        "model_list"?: Array<{
            "model_id"?: number;
            "model_promotion_price"?: number;
        }>;
    }>;
}
export interface UpdateDiscountItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "warning"?: string;
    "response"?: {
        "discount_id"?: number;
        "count"?: number;
        "error_list"?: Array<{
            "item_id"?: number;
            "model_id"?: number;
            "fail_message"?: string;
            "fail_error"?: string;
        }>;
    };
}
export declare class ShopeeDiscountApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add discount
     * /api/v2/discount/add_discount (POST)
     */
    addDiscount(params: AddDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddDiscountResponse>>;
    /**
     * add discount item
     * /api/v2/discount/add_discount_item (POST)
     */
    addDiscountItem(params: AddDiscountItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddDiscountItemResponse>>;
    /**
     * delete discount
     * /api/v2/discount/delete_discount (POST)
     */
    deleteDiscount(params: DeleteDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteDiscountResponse>>;
    /**
     * delete discount item
     * /api/v2/discount/delete_discount_item (POST)
     */
    deleteDiscountItem(params: DeleteDiscountItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteDiscountItemResponse>>;
    /**
     * delete sip discount
     * /api/v2/discount/delete_sip_discount (POST)
     */
    deleteSipDiscount(params: DeleteSipDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteSipDiscountResponse>>;
    /**
     * end discount
     * /api/v2/discount/end_discount (POST)
     */
    endDiscount(params: EndDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EndDiscountResponse>>;
    /**
     * get discount
     * /api/v2/discount/get_discount (GET)
     */
    getDiscount(params: GetDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetDiscountResponse>>;
    /**
     * get discount list
     * /api/v2/discount/get_discount_list (GET)
     */
    getDiscountList(params: GetDiscountListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetDiscountListResponse>>;
    /**
     * get sip discounts
     * /api/v2/discount/get_sip_discounts (GET)
     */
    getSipDiscounts(params: GetSipDiscountsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSipDiscountsResponse>>;
    /**
     * set sip discount
     * /api/v2/discount/set_sip_discount (POST)
     */
    setSipDiscount(params: SetSipDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetSipDiscountResponse>>;
    /**
     * update discount
     * /api/v2/discount/update_discount (POST)
     */
    updateDiscount(params: UpdateDiscountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateDiscountResponse>>;
    /**
     * update discount item
     * /api/v2/discount/update_discount_item (POST)
     */
    updateDiscountItem(params: UpdateDiscountItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateDiscountItemResponse>>;
}
