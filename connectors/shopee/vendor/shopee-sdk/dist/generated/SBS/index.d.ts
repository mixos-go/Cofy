import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface GetBoundWhsInfoRequest {
}
export interface GetBoundWhsInfoResponse {
    "message"?: string;
    "response"?: {
        "list"?: Array<{
            "shop_id"?: number;
            "bound_whs"?: Array<{
                "whs_region"?: string;
                "whs_ids"?: string;
            }>;
        }>;
    };
    "error"?: string;
}
export interface GetCurrentInventoryRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. If empty, the default value is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. If empty, the default value is 10. The value should be between 1 and 100. Example: 10 */
    "page_size"?: number;
    /** 0-All data；1-Product Name；2-SKU ID；3-Variations；4-Item ID Example: 2 */
    "search_type"?: number;
    /** Bind Value and Search_type */
    "keyword"?: string;
    /** Whs ID list, comma-separated Example: IDL,IDG */
    "whs_ids"?: string;
    /** Blank-All；0-No；1-Yes Example: 0 */
    "not_moving_tag"?: number;
    /** Blank-All；0-No；1-Yes Example: 0 */
    "inbound_pending_approval"?: number;
    /** Blank-All；0-No；1-Yes Example: 0 */
    "products_with_inventory"?: number;
    /** Category id. Here you need to call the get_category API to retrieve the first-tier category_id. Example: 100002 */
    "category_id"?: number;
    /** 1-Low Stock & No Sellable stock; 2-Low Stock & To replenish; 3-Low Stock & Replenished; 4-Excess Example: 1,2 */
    "stock_levels"?: string;
    /** The warehouse region you want to query, can only query one region in a request Optional value: BR、CN、ID、MY、MX、TH、TW、PH、VN、SG If do not pass, will get error "block by gateway due to invalid cid" Example: CN */
    "whs_region": string;
}
export interface GetCurrentInventoryResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "cursor"?: string;
        "item_list"?: Array<{
            "item_id"?: string;
            "item_name"?: string;
            "item_image"?: string;
            "sku_list"?: Array<{
                "mtsku_id"?: string;
                "model_id"?: string;
                "fulfill_mapping_mode"?: number;
                "model_name"?: string;
                "not_moving_tag"?: number;
                "whs_list"?: Array<{
                    "whs_id"?: string;
                    "stock_level"?: number;
                    "ir_approval_qty"?: number;
                    "in_transit_pending_putaway_qty"?: number;
                    "sellable_qty"?: number;
                    "reserved_qty"?: number;
                    "unsellable_qty"?: number;
                    "excess_stock"?: number;
                    "coverage_days"?: number;
                    "in_whs_coverage_days"?: number;
                    "selling_speed"?: number;
                    "last_7_sold"?: number;
                    "last_15_sold"?: number;
                    "last_30_sold"?: number;
                    "last_60_sold"?: number;
                    "last_90_sold"?: number;
                }>;
            }>;
        }>;
    };
}
export interface GetExpiryReportRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. If empty, the default value is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. If empty, the default value is 10. The value should be between 1 and 40. Example: 10 */
    "page_size"?: number;
    /** Example: IDL,IDG */
    "whs_ids"?: string;
    /** 0-Expired，2-Expiring，4-expiry_blocked，5-damaged，6-normal。Multiple selections allowed, separated by commas. Example: 2,4 */
    "expiry_status"?: string;
    /** Only Level 1 Category can be filtered Example: 100002 */
    "category_id_l1"?: number;
    /** Example: 801866836_10006075010 */
    "sku_id"?: string;
    /** Example: 801866836 */
    "item_id"?: string;
    "variation"?: string;
    "item_name"?: string;
    /** Num value: BR、CN、ID、MY、MX、TH、TW、PH、VN、SG If do not pass, will get error "block by gateway due to invalid cid" Example: CN */
    "whs_region": string;
}
export interface GetExpiryReportResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: string;
            "item_name"?: string;
            "item_image"?: string;
            "sku_list"?: Array<{
                "mtsku_id"?: string;
                "model_id"?: string;
                "fulfill_mapping_mode"?: number;
                "variation"?: string;
                "whs_list"?: Array<{
                    "whs_id"?: string;
                    "expiring_qty"?: number;
                    "expired_qty"?: number;
                    "expiry_blocked_qty"?: number;
                    "damaged_qty"?: number;
                    "normal_qty"?: number;
                    "total_qty"?: number;
                }>;
            }>;
        }>;
    };
}
export interface GetFulfillmentMappingInventoryListRequest {
    /** The MTSKU ID of either a Bundle SKU or a Parent SKU in a fulfillment mapping relationship. Up to 100 comma-separated MTSKU IDs can be queried in one request. All MTSKU IDs must belong to the specified shop_id. When mtsku_ids is omitted, the API returns all fulfillment mapping records with available Bundle SKU stock under the shop. When mtsku_ids is provided, the API returns all matching fulfillment mapping records for the specified Bundle or Parent MTSKUs.For example, given the mapping relationship MTSKU A = MTSKU B + MTSKU C, MTSKU A is the Bundle SKU, while MTSKU B and MTSKU C are its Parent SKUs. The API can be queried using the MTSKU ID of A, B, or C. Regardless of which SKU is queried, the API returns the fulfillment mapping inventory information of MTSKU A and its Parent SKUs. Example: 58165469687_282851615193,58165469687_282851615192 */
    "mtsku_ids"?: string;
    /** The number of records returned by each query. You can fill in value from [1-100].If not filled in, the default value is 100. Example: 2 */
    "page_size"?: number;
    /** The cursor for the next page query. The next_cursor will be returned from the response. If this field is not provided, the query starts from the first page by default. Example: eyJzb3J0X3ZhbHVlcyI6WyI1ODE2NTQ2OTY4N18yODI4NTE2MTUxOTNfTVlTIl19 */
    "next_cursor"?: string;
}
export interface GetFulfillmentMappingInventoryListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "response"?: {
        "list"?: Array<{
            "bundle_mtsku_id"?: string;
            "mapping_type"?: number;
            "mapping_formula"?: string;
            "whs_id"?: string;
            "stock_context": {
                "physical_sellable_stock"?: number;
                "parent_mtsku_list"?: Array<{
                    "parent_mtsku_id"?: string;
                    "parent_mtsku_stock"?: number;
                }>;
                "mapping_sellable_stock"?: number;
            };
        }>;
        "total"?: number;
        "next_cursor"?: string;
    };
}
export interface GetStockAgingRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. If empty, the default value is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. If empty, the default value is 10. The value should be between 1 and 100. Example: 10 */
    "page_size"?: number;
    /** 1-Product Name；2-SKU ID；3-Variations；4-Item ID Example: 2 */
    "search_type"?: number;
    /** bound with search_type */
    "keyword"?: string;
    /** split by comma Example: IDL,IDG */
    "whs_ids"?: string;
    /** 0-false；1-true Example: 0 */
    "aging_storage_tag"?: number;
    /** 0-false；1-true Example: 0 */
    "excess_storage_tag"?: number;
    /** L1-level product category ID. You need to call the get_category API to obtain the first-level category_id Example: 100002 */
    "category_id"?: number;
    /** BR、CN、ID、MY、MX、TH、TW、PH、VN、SG If do not pass, will get error "block by gateway due to invalid cid" Example: CN */
    "whs_region": string;
}
export interface GetStockAgingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: string;
            "item_name"?: string;
            "item_image"?: string;
            "sku_list"?: Array<{
                "mtsku_id"?: string;
                "model_id"?: string;
                "fulfill_mapping_mode"?: number;
                "model_name"?: string;
                "barcode"?: string;
                "whs_list"?: Array<{
                    "whs_id"?: string;
                    "qty_of_stock_age_one"?: number;
                    "qty_of_stock_age_two"?: number;
                    "qty_of_stock_age_three"?: number;
                    "qty_of_stock_age_four"?: number;
                    "qty_of_stock_age_five"?: number;
                    "qty_of_stock_age_six"?: number;
                    "excess_stock"?: number;
                    "aging_storage_tag"?: number;
                }>;
            }>;
        }>;
    };
}
export interface GetStockMovementRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. If empty, the default value is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. If empty, the default value is 10. The value should be between 1 and 20. Example: 10 */
    "page_size"?: number;
    /** Start date in YYYY-MM-DD format. Only data within the past 1 year can be queried, and the time range must not exceed 90 days. Example: 2025-02-01 */
    "start_time": string;
    /** End date in YYYY-MM-DD format. Only data within the past 1 year can be queried, and the time range must not exceed 90 days. Example: 2025-02-24 */
    "end_time": string;
    /** Multiple warehouse_id values should be separated by commas. Example: IDL,IDG */
    "whs_ids"?: string;
    /** L1-level category_id. You need to call the get_category API to retrieve the first-level category_id. Example: 100002 */
    "category_id_l1"?: number;
    /** Example: 900626944_15359986 */
    "sku_id"?: string;
    /** Example: 900626944 */
    "item_id"?: string;
    /** Product Name Filter */
    "item_name"?: string;
    "variation"?: string;
    /** Warehouse Region. Enum values: BR, CN, ID, MY, MX, TH, TW, PH, VN, SG If do not pass, will get error "block by gateway due to invalid cid" Example: CN */
    "whs_region": string;
}
export interface GetStockMovementResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "total"?: number;
        "start_time"?: string;
        "end_time"?: string;
        "query_end_time"?: string;
        "item_list"?: Array<{
            "warehouse_item_id"?: string;
            "item_name"?: string;
            "item_image"?: string;
            "sku_list"?: Array<{
                "variation"?: string;
                "mtsku_id"?: string;
                "model_id"?: string;
                "fulfill_mapping_mode"?: number;
                "barcode"?: string;
                "shop_sku_list"?: Array<{
                    "shop_sku_id"?: string;
                    "shop_item_id"?: string;
                    "shop_model_id"?: string;
                }>;
                "whs_list"?: Array<{
                    "start_on_hand_total"?: number;
                    "inbound_total"?: number;
                    "outbound_total"?: number;
                    "adjust_total"?: number;
                    "end_on_hand_total"?: number;
                    "whs_id"?: string;
                }>;
                "start_qty": {
                    "start_on_hand_total"?: number;
                    "start_sellable"?: number;
                    "start_reserved"?: number;
                    "start_unsellable"?: number;
                };
                "end_qty": {
                    "end_on_hand_total"?: number;
                    "end_sellable"?: number;
                    "end_reserved"?: number;
                    "end_unsellable"?: number;
                };
                "inbound_qty": {
                    "inbound_total"?: number;
                    "inbound_my"?: number;
                    "inbound_returned"?: number;
                };
                "outbound_qty": {
                    "outbound_total"?: number;
                    "outbound_sold"?: number;
                    "outbound_returned"?: number;
                    "outbound_disposed"?: number;
                };
                "adjust_qty": {
                    "adjust_total"?: number;
                    "adjust_lost_found"?: number;
                    "adjust_trans_whs"?: number;
                };
            }>;
        }>;
    };
}
export declare class ShopeeSBSApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * get bound whs info
     * /api/v2/sbs/get_bound_whs_info (GET)
     */
    getBoundWhsInfo(params: GetBoundWhsInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBoundWhsInfoResponse>>;
    /**
     * get current inventory
     * /api/v2/sbs/get_current_inventory (GET)
     */
    getCurrentInventory(params: GetCurrentInventoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCurrentInventoryResponse>>;
    /**
     * get expiry report
     * /api/v2/sbs/get_expiry_report (GET)
     */
    getExpiryReport(params: GetExpiryReportRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetExpiryReportResponse>>;
    /**
     * get fulfillment mapping inventory list
     * /api/v2/sbs/get_fulfillment_mapping_inventory_list (GET)
     */
    getFulfillmentMappingInventoryList(params: GetFulfillmentMappingInventoryListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetFulfillmentMappingInventoryListResponse>>;
    /**
     * get stock aging
     * /api/v2/sbs/get_stock_aging (GET)
     */
    getStockAging(params: GetStockAgingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetStockAgingResponse>>;
    /**
     * get stock movement
     * /api/v2/sbs/get_stock_movement (GET)
     */
    getStockMovement(params: GetStockMovementRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetStockMovementResponse>>;
}
