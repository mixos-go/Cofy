import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddShopFlashSaleItemsRequest {
    "flash_sale_id": number;
    "items": Array<Record<string, unknown>>;
    "item_id": number;
    /** min=0, 0 means no limit */
    "purchase_limit": number;
    /** If the item has variation, this param is necessary. */
    "models"?: Array<Record<string, unknown>>;
    /** If the item has variation, this param is necessary. */
    "model_id": number;
    /** promotion price without tax */
    "input_promo_price": number;
    /** min=1, Campaign Stock, Campaign stock can only be reserved from either Shopee stock or Seller stock */
    "stock": number;
    /** promotion price without tax of the item. If the item has no variation, this param is necessary, otherwise don't use this field */
    "item_input_promo_price"?: number;
    /** min=1, The campaign stock of the item. If the item has no variation, this param is necessary, otherwise don't use this field */
    "item_stock"?: number;
}
export interface AddShopFlashSaleItemsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failed_items"?: Array<{
            "err_code"?: number;
            "err_msg"?: string;
            "item_id"?: number;
            "model_id"?: number;
        }>;
    };
}
export interface CreateShopFlashSaleRequest {
    /** can get it from v2.shop_flash_sale.get_time_slot_id API, and you can only use the timeslot which start_time > now */
    "timeslot_id": number;
}
export interface CreateShopFlashSaleResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "flash_sale_id"?: number;
        "status"?: number;
        "timeslot_id"?: number;
    };
}
export interface DeleteShopFlashSaleRequest {
    /** cannot delete ongoing and expired shop flash sale */
    "flash_sale_id": number;
}
export interface DeleteShopFlashSaleResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "flash_sale_id"?: number;
        "status"?: number;
        "timeslot_id"?: number;
    };
}
export interface DeleteShopFlashSaleItemsRequest {
    "flash_sale_id": number;
    /** if you delete a item, will delete all models of the item */
    "item_ids": Array<number>;
}
export interface DeleteShopFlashSaleItemsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface GetItemCriteriaRequest {
}
export interface GetItemCriteriaResponse {
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    "response"?: Record<string, unknown>;
    /** criteria detail Example: criteria detail */
    "criteria"?: Array<Record<string, unknown>>;
    "criteria_id"?: number;
    /** Product Rating(0.0-5.0), -1 means no limit Example: Product Rating(0.0-5.0), -1 means no limit */
    "min_product_rating"?: number;
    /** Likes(s), -1 means no limit Example: Likes(s), -1 means no limit */
    "min_likes"?: number;
    /** Pre-Order(s) Example: Pre-Order(s) */
    "must_not_pre_order"?: boolean;
    /** Orders in the last 30 day(s), -1 means no limit Example: Orders in the last 30 day(s), -1 means no limit */
    "min_order_total"?: number;
    /** Days to Ship, -1 means no limit Example: Days to Ship, -1 means no limit */
    "max_days_to_ship"?: number;
    /** Repetition Control (Same Product cannot Join ISFS within N Days) , -1 means no limit Example: Repetition Control (Same Product cannot Join ISFS within N Days) , -1 means no limit */
    "min_repetition_day"?: number;
    /** Promo Stock, -1 means no limit Example: Promo Stock, -1 means no limit */
    "min_promo_stock"?: number;
    /** Promo Stock, -1 means no limit Example: Promo Stock, -1 means no limit */
    "max_promo_stock"?: number;
    /** Discount Limit, 10 means 10%, -1 means no limit Example: Discount Limit, 10 means 10%, -1 means no limit */
    "min_discount"?: number;
    /** Discount Limit, 100 means 100%, -1 means no limit Example: Discount Limit, 100 means 100%, -1 means no limit */
    "max_discount"?: number;
    /** Discount Limit, -1 means no limit, real min discount price = min_discount_price / 100000 Example: Discount Limit, -1 means no limit, real min discount price = min_discount_price / 100000 */
    "min_discount_price"?: number;
    /** Discount Limit, -1 means no limit, real max discount price = max_discount_price / 100000 Example: Discount Limit, -1 means no limit, real max discount price = max_discount_price / 100000 */
    "max_discount_price"?: number;
    /** lower than lowest price in last 7 days (exclude Shopee Flash Deals) Example: lower than lowest price in last 7 days (exclude Shopee Flash Deals) */
    "need_lowest_price"?: boolean;
    /** the mapping relationship between criteria and category Example: the mapping relationship between criteria and category */
    "pair_ids"?: Array<Record<string, unknown>>;
    /** these are the categories that the shop has items, and the criteria will apply to these categories Example: these are the categories that the shop has items, and the criteria will apply to these categories */
    "category_list"?: Array<Record<string, unknown>>;
    /** o means this is All category Example: o means this is All category */
    "category_id"?: number;
    /** category name Example: category name */
    "name"?: string;
    /** the parent category id, 0 means this category is L1 category Example: the parent category id, 0 means this category is L1 category */
    "parent_id"?: number;
    /** Due to regulations, the promotion of some products in these categories are prohibited in this region Example: Due to regulations, the promotion of some products in these categories are prohibited in this region */
    "overlap_block_category_ids"?: Array<number>;
}
export interface GetShopFlashSaleRequest {
    "flash_sale_id": number;
}
export interface GetShopFlashSaleResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "enabled_item_count"?: number;
        "end_time"?: number;
        "flash_sale_id"?: number;
        "item_count"?: number;
        "start_time"?: number;
        "status"?: number;
        "timeslot_id"?: number;
        "type"?: number;
    };
}
export interface GetShopFlashSaleItemsRequest {
    "flash_sale_id": number;
    /** min=0,max=1000 */
    "offset": number;
    /** min=1,max=100 */
    "limit": number;
}
export interface GetShopFlashSaleItemsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_info"?: Array<{
            "image"?: string;
            "item_id"?: number;
            "item_name"?: string;
            "status"?: number;
        }>;
        "models"?: Array<{
            "campaign_stock"?: number;
            "input_promotion_price"?: number;
            "item_id"?: number;
            "model_id"?: number;
            "model_name"?: string;
            "original_price"?: number;
            "promotion_price_with_tax"?: number;
            "purchase_limit"?: number;
            "reject_reason"?: string;
            "status"?: number;
            "stock"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetShopFlashSaleListRequest {
    /** you can use this filed to search different state of shop flash sale 0: all state 1: upcoming state 2: ongoing state 3: expired state Example: 1 */
    "type": number;
    /** you should use start_time and end_time together, and start_time shoule be < end_time Example: 1721978628 */
    "start_time"?: number;
    /** you should use start_time and end_time together, and start_time shoule be < end_time Example: 1727335428 */
    "end_time"?: number;
    /** min=0,max=1000 Example: 0 */
    "offset": number;
    /** min=1,max=100 Example: 10 */
    "limit": number;
}
export interface GetShopFlashSaleListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "flash_sale_list"?: Array<{
            "click_count"?: number;
            "enabled_item_count"?: number;
            "end_time"?: number;
            "flash_sale_id"?: number;
            "item_count"?: number;
            "remindme_count"?: number;
            "start_time"?: number;
            "status"?: number;
            "timeslot_id"?: number;
            "type"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetTimeSlotIdRequest {
    /** min = now, max=2145887999, should be < end_time Example: 1721978628 */
    "start_time": number;
    /** should be > start_time, max=2145887999 Example: 1727335428 */
    "end_time": number;
}
export interface GetTimeSlotIdResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Array<{
        "end_time"?: number;
        "start_time"?: number;
        "timeslot_id"?: number;
    }>;
}
export interface UpdateShopFlashSaleRequest {
    "flash_sale_id": number;
    /** the status of shop flash sale you want to set, you cannot edit the shop flash sale in 'system_rejected' status Disabling this Flash Sale will disable all items in this session 1: enable 2: disbaled Example: 1 */
    "status": number;
}
export interface UpdateShopFlashSaleResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "flash_sale_id"?: number;
        "status"?: number;
        "timeslot_id"?: number;
    };
}
export interface UpdateShopFlashSaleItemsRequest {
    "flash_sale_id": number;
    "items": Array<Record<string, unknown>>;
    "item_id": number;
    /** min=0, 0 means no limit if the item is in enabled status or the item has models in enabled status, you can't set this field */
    "purchase_limit"?: number;
    /** If the item has variation, this param is necessary, otherwise please don't use this field */
    "models"?: Array<Record<string, unknown>>;
    /** If the item has variation, this param is necessary. */
    "model_id": number;
    /** you can use this field to set the status of model 0: disable 1: enable */
    "status": number;
    /** promotion price without tax if the model is enabled(status = 1) now, you can't set this field, you can only disable the model if the model is disabled(status = 0) now and you want to set this field, you should also set status to 1 */
    "input_promo_price"?: number;
    /** min=1, Campaign Stock, Campaign stock can only be reserved from either Shopee stock or Seller stock if the model is enabled(status = 1) now, you can't set this field, you can only disable the model if the model is disabled(status = 0) now and you want to set this field, you should also set status to 1 */
    "stock"?: number;
    /** The status of the item. If the item has no variation, this param is necessary, otherwise don't use this field you can use this field to set the status of item 0: disable 1: enable */
    "item_status"?: number;
    /** The promotion price of the item. If the item has no variation, you can use this field to update the promotion price of the item, otherwise don't use this field if the item is enabled(item_status = 1) now, you can't set this field, you can only disable the item if the item is disabled(item_status = 0) now and you want to set this field, you should also set item_status to 1 */
    "item_input_promo_price"?: number;
    /** min=1, The campaign stock of the item. If the item has no variation, you can use this field to update the campaign stock of the item, otherwise don't use this field if the item is enabled(item_status = 1) now, you can't set this field, you can only disable the item if the item is disabled(item_status = 0) now and you want to set this field, you should also set item_status to 1 */
    "item_stock"?: number;
}
export interface UpdateShopFlashSaleItemsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failed_items"?: Array<{
            "err_code"?: number;
            "err_msg"?: string;
            "item_id"?: number;
            "model_id"?: number;
            "unqualified_conditions"?: Array<{
                "unqualified_code"?: number;
                "unqualified_msg"?: string;
            }>;
        }>;
    };
}
export declare class ShopeeShopFlashSaleApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add shop flash sale items
     * /api/v2/shop_flash_sale/add_shop_flash_sale_items (POST)
     */
    addShopFlashSaleItems(params: AddShopFlashSaleItemsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddShopFlashSaleItemsResponse>>;
    /**
     * create shop flash sale
     * /api/v2/shop_flash_sale/create_shop_flash_sale (POST)
     */
    createShopFlashSale(params: CreateShopFlashSaleRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateShopFlashSaleResponse>>;
    /**
     * delete shop flash sale
     * /api/v2/shop_flash_sale/delete_shop_flash_sale (POST)
     */
    deleteShopFlashSale(params: DeleteShopFlashSaleRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteShopFlashSaleResponse>>;
    /**
     * delete shop flash sale items
     * /api/v2/shop_flash_sale/delete_shop_flash_sale_items (POST)
     */
    deleteShopFlashSaleItems(params: DeleteShopFlashSaleItemsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteShopFlashSaleItemsResponse>>;
    /**
     * get item criteria
     * /api/v2/shop_flash_sale/get_item_criteria (GET)
     */
    getItemCriteria(params: GetItemCriteriaRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemCriteriaResponse>>;
    /**
     * get shop flash sale
     * /api/v2/shop_flash_sale/get_shop_flash_sale (GET)
     */
    getShopFlashSale(params: GetShopFlashSaleRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopFlashSaleResponse>>;
    /**
     * get shop flash sale items
     * /api/v2/shop_flash_sale/get_shop_flash_sale_items (GET)
     */
    getShopFlashSaleItems(params: GetShopFlashSaleItemsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopFlashSaleItemsResponse>>;
    /**
     * get shop flash sale list
     * /api/v2/shop_flash_sale/get_shop_flash_sale_list (GET)
     */
    getShopFlashSaleList(params: GetShopFlashSaleListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopFlashSaleListResponse>>;
    /**
     * get time slot id
     * /api/v2/shop_flash_sale/get_time_slot_id (GET)
     */
    getTimeSlotId(params: GetTimeSlotIdRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTimeSlotIdResponse>>;
    /**
     * update shop flash sale
     * /api/v2/shop_flash_sale/update_shop_flash_sale (POST)
     */
    updateShopFlashSale(params: UpdateShopFlashSaleRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateShopFlashSaleResponse>>;
    /**
     * update shop flash sale items
     * /api/v2/shop_flash_sale/update_shop_flash_sale_items (POST)
     */
    updateShopFlashSaleItems(params: UpdateShopFlashSaleItemsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateShopFlashSaleItemsResponse>>;
}
