import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface QueryBrShopBlockStatusRequest {
}
export interface QueryBrShopBlockStatusResponse {
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    "response"?: Record<string, unknown>;
    /** Shopee's unique identifier for a shop. Example: Shopee's unique identifier for a shop. */
    "shop_id"?: number;
    /** shop blocked status Example: shop blocked status */
    "is_block"?: boolean;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
}
export interface QueryBrShopEnrollmentStatusRequest {
}
export interface QueryBrShopEnrollmentStatusResponse {
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    "response"?: Record<string, unknown>;
    /** Shopee's unique identifier for a shop Example: Shopee's unique identifier for a shop */
    "shop_id"?: number;
    /** 1: enable enrollment 2: disable enrollment 3: already enrollment Example: 1: enable enrollment 2: disable enrollment 3: already enrollment */
    "enrollment_status"?: number;
    /** The time of this shop able to enroll FBS. Example: The time of this shop able to enroll FBS. */
    "enable_enrollment_time"?: number;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
}
export interface QueryBrShopInvoiceErrorRequest {
    /** Example: 1 */
    "page_no"?: number;
    /** max: 100 Example: 10 */
    "page_size"?: number;
}
export interface QueryBrShopInvoiceErrorResponse {
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    "response"?: Record<string, unknown>;
    "total"?: number;
    "list"?: Array<Record<string, unknown>>;
    /** Shopee's unique identifier for a shop. Example: Shopee's unique identifier for a shop. */
    "shop_id"?: number;
    /** 1: Inbound 2: Return From Warehouse 3: Sales order invoice 4: Move Transfer 5：IA Example: 1: Inbound 2: Return From Warehouse 3: Sales order invoice 4: Move Transfer 5：IA */
    "biz_request_type"?: number;
    /** Return by default. The business FBS request order ID. Example: Return by default. The business FBS request order ID. */
    "biz_request_id"?: string;
    /** Invoice issuance failed reason. Example: Invoice issuance failed reason. */
    "fail_reason"?: string;
    /** 1: sku tax info error 2: seller tax info error Example: 1: sku tax info error 2: seller tax info error */
    "fail_type"?: number;
    /** The expired time of this failed invoice. If expired, then this request order would be cancelled. Example: The expired time of this failed invoice. If expired, then this request order would be cancelled. */
    "invoice_deadline_time"?: number;
    "shop_sku_list"?: Array<Record<string, unknown>>;
    /** ID of item Example: ID of item */
    "shop_item_id"?: number;
    /** ID of model Example: ID of model */
    "shop_model_id"?: number;
    /** Name of item Example: Name of item */
    "shop_item_name"?: string;
    /** Name of model Example: Name of model */
    "shop_model_name"?: string;
    /** Invoice ID Example: Invoice ID */
    "invoice_id"?: string;
    /** remind seller if this block issue is not solved , it will block the shop or item Example: remind seller if this block issue is not solved , it will block the shop or item */
    "reminder_desc"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
}
export interface QueryBrSkuBlockStatusRequest {
    /** Example: 123_234 */
    "shop_sku_id": string;
}
export interface QueryBrSkuBlockStatusResponse {
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    "response"?: Record<string, unknown>;
    /** itemID_modelID Example: itemID_modelID */
    "shop_sku_id"?: string;
    /** product is blocked and warehouse stock cannot be sold Example: product is blocked and warehouse stock cannot be sold */
    "is_block"?: boolean;
    /** ID of item Example: ID of item */
    "shop_item_id"?: number;
    /** ID of model Example: ID of model */
    "shop_model_id"?: number;
    /** Name of Item Example: Name of Item */
    "shop_item_name"?: string;
    /** Name of model Example: Name of model */
    "shop_model_name"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
}
export declare class ShopeeFBSApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * query br shop block status
     * /api/v2/fbs/query_br_shop_block_status (GET)
     */
    queryBrShopBlockStatus(params: QueryBrShopBlockStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryBrShopBlockStatusResponse>>;
    /**
     * query br shop enrollment status
     * /api/v2/fbs/query_br_shop_enrollment_status (GET)
     */
    queryBrShopEnrollmentStatus(params: QueryBrShopEnrollmentStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryBrShopEnrollmentStatusResponse>>;
    /**
     * query br shop invoice error
     * /api/v2/fbs/query_br_shop_invoice_error (GET)
     */
    queryBrShopInvoiceError(params: QueryBrShopInvoiceErrorRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryBrShopInvoiceErrorResponse>>;
    /**
     * query br sku block status
     * /api/v2/fbs/query_br_sku_block_status (GET)
     */
    queryBrSkuBlockStatus(params: QueryBrSkuBlockStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryBrSkuBlockStatusResponse>>;
}
