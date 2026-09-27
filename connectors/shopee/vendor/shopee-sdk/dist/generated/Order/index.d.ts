import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface CancelOrderRequest {
    "order_sn": string;
    "cancel_reason": string;
    "partial_cancel_item_list"?: Array<{
        "item_id"?: number;
        "model_id"?: number;
        "order_item_id"?: number;
        "promotion_group_id"?: number;
        "model_quantity"?: number;
    }>;
}
export interface CancelOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "update_time"?: number;
    };
}
export interface DownloadFbsInvoicesRequest {
    /** list of request id (task identifiers) */
    "request_id_list"?: Record<string, unknown>;
    /** Example: [123,234,345] */
    "request_id": Array<number>;
}
export interface DownloadFbsInvoicesResponse {
    "response"?: Record<string, unknown>;
    "request_id"?: number;
    "file_link"?: string;
    "error"?: number;
    "error_msg"?: string;
    "timestamp"?: number;
}
export interface DownloadInvoiceDocRequest {
    /** Shopee's unique identifier for an order. Example: 201218V2Y6E59M */
    "order_sn": string;
}
export interface DownloadInvoiceDocResponse {
    "invoice_doc"?: unknown;
}
export interface GenerateFbsInvoicesRequest {
    "batch_download"?: Record<string, unknown>;
    /** Format YYYYMMDD e.g. 20240101 Example: 20250601 */
    "start": number;
    /** Format YYYYMMDD e.g. 20240101 Example: 20250601 */
    "end": number;
    /** 1 = Remessa 2 = Return 3 = Symbolic Return 4 = Sale 5 = Entrada 6 = Symbolic Remessa 7 = all Example: 1 */
    "document_type": number;
    /** 1 = xml only 2 = pdf only 3 = both */
    "file_type": number;
    /** 1= authorized only 2= cancelled Default: If document_status not passed or passed empty, means documents under ALL status (both authorized and cancelled) must be included */
    "document_status"?: number;
}
export interface GenerateFbsInvoicesResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: number;
    /** Error messages Example: Error messages */
    "error_msg"?: string;
    "result_list"?: Array<Record<string, unknown>>;
    /** Unique task identifier that includes one or more tax documents to be downloaded according to the filters sent in the request. Example: Unique task identifier that includes one or more tax documents to be downloaded according to the filters sent in the request. */
    "request_id"?: number;
    /** Indicate error type if one element hit error. Empty if no error happened. Example: Indicate error type if one element hit error. Empty if no error happened. */
    "fail_error"?: string;
    /** Indicate error details if one element hit error. Empty if no error happened. Example: Indicate error details if one element hit error. Empty if no error happened. */
    "fail_message"?: string;
}
export interface GetBookingDetailRequest {
    /** The set of booking_sn. If there are multiple booking_sn, you need to use English comma to connect them. limit [1,50] Example: 201214JAJXU6G7,201214JASXYXY6 */
    "booking_sn_list": string;
    /** The response fields you want to get. Please select from the below response parameters. If you input an object field, all the params under it will be included automatically in the response. If there are multiple response fields you want to get, you need to use English comma to connect them. Available values: item_list,cancel_by,cancel_reason,fulfillment_flag,pickup_done_time,shipping_carrier, recipient_address, dropshipper, dropshipper_phone Example: total_amount */
    "response_optional_fields"?: string;
}
export interface GetBookingDetailResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "booking_list"?: Array<{
            "booking_sn"?: string;
            "order_sn"?: string;
            "region"?: string;
            "booking_status"?: string;
            "match_status"?: string;
            "shipping_carrier"?: string;
            "create_time"?: number;
            "update_time"?: number;
            "recipient_address": {
                "name"?: string;
                "phone"?: string;
                "town"?: string;
                "district"?: string;
                "city"?: string;
                "state"?: string;
                "region"?: string;
                "zipcode"?: string;
                "full_address"?: string;
            };
            "item_list"?: Array<{
                "item_name"?: string;
                "item_sku"?: string;
                "model_name"?: string;
                "model_sku"?: string;
                "weight"?: number;
                "product_location_id"?: string;
                "image_info": {
                    "image_url"?: string;
                };
            }>;
            "dropshipper"?: string;
            "dropshipper_phone"?: string;
            "cancel_by"?: string;
            "cancel_reason"?: string;
            "fulfillment_flag"?: string;
            "pickup_done_time"?: number;
        }>;
    };
    "warning"?: string;
}
export interface GetBookingListRequest {
    /** The kind of time_from and time_to. Available value: create_time, update_time. Example: create_time */
    "time_range_field": string;
    /** The time_from and time_to fields specify a date range for retrieving bookings (based on the time_range_field). The time_from field is the starting date range. The maximum date range that may be specified with the time_from and time_to fields is 15 days. Example: 1607235072 */
    "time_from": number;
    /** The time_from and time_to fields specify a date range for retrieving bookings (based on the time_range_field). The time_from field is the starting date range. The maximum date range that may be specified with the time_from and time_to fields is 15 days. Example: 1608271872 */
    "time_to": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data.The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
    /** The booking_status filter for retrieving bookings and each one only every request. Available value: READY_TO_SHIP/PROCESSED/SHIPPED/CANCELLED/MATCHED Example: READY_TO_SHIP */
    "booking_status"?: string;
}
export interface GetBookingListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "booking_list"?: Array<{
            "booking_sn"?: string;
            "order_sn"?: string;
            "booking_status"?: string;
            "next_cursor"?: string;
        }>;
    };
}
export interface GetBuyerInvoiceInfoRequest {
    "queries"?: Array<{
        "order_sn"?: string;
    }>;
}
export interface GetBuyerInvoiceInfoResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "invoice_info_list"?: Array<{
        "order_sn"?: string;
        "invoice_type"?: string;
        "invoice_detail": {
            "name"?: string;
            "email"?: string;
            "address"?: string;
            "phone_number"?: string;
            "tax_id"?: string;
            "address_breakdown": {
                "region"?: string;
                "state"?: string;
                "city"?: string;
                "district"?: string;
                "town"?: string;
                "postcode"?: string;
                "detailed_address"?: string;
                "additional_info"?: string;
                "full_address"?: string;
            };
        };
        "is_requested"?: boolean;
        "error"?: string;
    }>;
}
export interface GetEstimateCancelValueRequest {
    "order_sn": string;
    "partial_cancel_item_list": Array<{
        "item_id"?: number;
        "model_id"?: number;
        "order_item_id"?: number;
        "promotion_group_id"?: number;
        "model_quantity"?: number;
    }>;
}
export interface GetEstimateCancelValueResponse {
    "cancel_value_price"?: string;
}
export interface GetFbsInvoicesResultRequest {
    /** - */
    "request_id_list": Record<string, unknown>;
    /** A list of integers representing the request IDs to be queried. Example: [123,234,456] */
    "request_id": Array<number>;
}
export interface GetFbsInvoicesResultResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: number;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "error_msg"?: string;
    "result_list"?: Array<Record<string, unknown>>;
    /** Represents the current status of the request Example: Represents the current status of the request */
    "request_id"?: number;
    /** Name of the file to be downloaded Example: Name of the file to be downloaded */
    "file_name"?: string;
    /** Represents the current status of the request Example: Represents the current status of the request */
    "status"?: string;
}
export interface GetOrderDetailRequest {
    /** The set of order_sn. If there are multiple order_sn, you need to use English comma to connect them. limit [1,50] Example: 201214JAJXU6G7,201214JASXYXY6 */
    "order_sn_list": string;
    /** Compatible parameter during migration period, send True will let API support PENDING status and return pending_terms, send False or don’t send will fallback to old logic Example: true */
    "request_order_status_pending"?: boolean;
    /** a response fields you want to get. Please select from the below response parameters. If you input an object field, all the params under it will be included automatically in the response. If there are multiple response fields you want to get, you need to use English comma to connect them. Available values: buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee ,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper, dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,buyer_username,invoice_data,order_chargeable_weight_gram,return_request_due_date,edt,payment_info,international_label Example: total_amount */
    "response_optional_fields"?: string;
}
export interface GetOrderDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "order_list"?: Array<{
            "actual_shipping_fee_confirmed"?: boolean;
            "buyer_cancel_reason"?: string;
            "buyer_cpf_id"?: null;
            "buyer_user_id"?: number;
            "buyer_username"?: string;
            "cancel_by"?: string;
            "cancel_reason"?: string;
            "cod"?: boolean;
            "create_time"?: number;
            "currency"?: string;
            "days_to_ship"?: number;
            "dropshipper"?: null;
            "dropshipper_phone"?: null;
            "estimated_shipping_fee"?: number;
            "fulfillment_flag"?: string;
            "goods_to_declare"?: boolean;
            "invoice_data"?: null;
            "item_list"?: Array<{
                "add_on_deal"?: boolean;
                "add_on_deal_id"?: number;
                "image_info": {
                    "image_url"?: string;
                };
                "is_b2c_owned_item"?: boolean;
                "is_prescription_item"?: boolean;
                "item_id"?: number;
                "item_name"?: string;
                "item_sku"?: string;
                "main_item"?: boolean;
                "model_discounted_price"?: number;
                "model_id"?: number;
                "model_name"?: string;
                "model_original_price"?: number;
                "model_quantity_purchased"?: number;
                "model_sku"?: string;
                "order_item_id"?: number;
                "product_location_id"?: Array<string>;
                "promotion_group_id"?: number;
                "promotion_id"?: number;
                "promotion_type"?: string;
                "weight"?: number;
                "wholesale"?: boolean;
            }>;
            "message_to_seller"?: string;
            "note"?: string;
            "note_update_time"?: number;
            "order_sn"?: string;
            "order_status"?: string;
            "package_list"?: Array<{
                "group_shipment_id"?: null;
                "item_list"?: Array<{
                    "item_id"?: number;
                    "model_id"?: number;
                    "model_quantity"?: number;
                    "order_item_id"?: number;
                    "product_location_id"?: string;
                    "promotion_group_id"?: number;
                }>;
                "logistics_status"?: string;
                "package_number"?: string;
                "parcel_chargeable_weight_gram"?: number;
                "shipping_carrier"?: string;
                "logistics_channel_id"?: number;
                "allow_self_design_awb"?: boolean;
                "sorting_group"?: string;
            }>;
            "pay_time"?: number;
            "payment_method"?: string;
            "pickup_done_time"?: number;
            "recipient_address": {
                "city"?: string;
                "district"?: string;
                "full_address"?: string;
                "name"?: string;
                "phone"?: string;
                "region"?: string;
                "state"?: string;
                "town"?: string;
                "zipcode"?: string;
            };
            "region"?: string;
            "reverse_shipping_fee"?: number;
            "ship_by_date"?: number;
            "shipping_carrier"?: string;
            "split_up"?: boolean;
            "total_amount"?: number;
            "update_time"?: number;
        }>;
    };
}
export interface GetOrderListRequest {
    /** The kind of time_from and time_to. Available value: create_time, update_time. Example: create_time */
    "time_range_field": string;
    /** The time_from and time_to fields specify a date range for retrieving orders (based on the time_range_field). The time_from field is the starting date range. The maximum date range that may be specified with the time_from and time_to fields is 15 days. Example: 1607235072 */
    "time_from": number;
    /** The time_from and time_to fields specify a date range for retrieving orders (based on the time_range_field). The time_from field is the starting date range. The maximum date range that may be specified with the time_from and time_to fields is 15 days. Example: 1608271872 */
    "time_to": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data.The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. The default is empty. If the data is more than one page, the offset can be some entry to start the next call. */
    "cursor"?: string;
    /** The order_status filter for retriveing orders and each one only every request. Available value: UNPAID/READY_TO_SHIP/PROCESSED/SHIPPED/COMPLETED/IN_CANCEL/CANCELLED/INVOICE_PENDING Example: READY_TO_SHIP */
    "order_status"?: string;
    /** Optional fields in response. Available value: order_status. Example: order_status */
    "response_optional_fields"?: string;
    /** Compatible parameter during migration period, send True will let API support PENDING status, send False or don’t send will fallback to old logic. Example: true */
    "request_order_status_pending"?: boolean;
    /** The identity of logistic channel. Valid only for BR. Example: 91007 */
    "logistics_channel_id"?: number;
}
export interface GetOrderListResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "next_cursor"?: string;
        "order_list"?: Array<{
            "order_sn"?: string;
        }>;
    };
    "request_id"?: string;
}
export interface GetPackageDetailRequest {
    /** The set of package_number. If there are multiple package_number, you need to use English comma to connect them. limit [1,50] Example: OFG1156498731071468,OFG199593509207187 */
    "package_number_list": string;
}
export interface GetPackageDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "package_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "fulfillment_status"?: string;
            "update_time"?: number;
            "logistics_channel_id"?: number;
            "shipping_carrier"?: string;
            "allow_self_design_awb"?: boolean;
            "days_to_ship"?: number;
            "ship_by_date"?: number;
            "pending_terms"?: Array<string>;
            "pending_description"?: Array<string>;
            "tracking_number"?: string;
            "tracking_number_expiration_date"?: number;
            "pickup_done_time"?: number;
            "is_split_up"?: boolean;
            "item_list"?: Array<{
                "item_id"?: number;
                "model_id"?: number;
                "item_sku"?: string;
                "model_sku"?: string;
                "model_quantity"?: number;
                "order_item_id"?: number;
                "promotion_group_id"?: number;
                "product_location_id"?: string;
                "consultation_id"?: string;
            }>;
            "recipient_address": {
                "name"?: string;
                "phone"?: string;
                "town"?: string;
                "district"?: string;
                "city"?: string;
                "state"?: string;
                "region"?: string;
                "zipcode"?: string;
                "full_address"?: string;
                "geolocation": {
                    "latitude"?: number;
                    "longitude"?: number;
                };
            };
            "parcel_chargeable_weight_gram"?: number;
            "group_shipment_id"?: number;
            "virtual_contact_number"?: string;
            "package_query_number"?: string;
            "sorting_group"?: string;
            "is_shipment_arranged"?: boolean;
            "status_info_tag": {
                "tag_id"?: number;
                "timestamp"?: number;
            };
            "can_split_order"?: boolean;
            "can_unsplit_order"?: boolean;
            "is_pre_order"?: boolean;
            "prescription_images"?: Array<string>;
            "pharmacist_name"?: string;
            "prescription_approval_time"?: number;
            "prescription_rejection_time"?: number;
            "is_buyer_shop_collection"?: boolean;
            "buyer_proof_of_collection"?: Array<string>;
            "preparation_end_time"?: number;
            "driver_info": {
                "driver_name"?: string;
                "driver_phone"?: string;
                "vehicle_type"?: string;
                "license_plate"?: string;
                "courier_photo"?: string;
                "eta_start_time"?: number;
                "eta_end_time"?: number;
                "driver_status"?: string;
            };
        }>;
    };
    "warning"?: string;
}
export interface GetPendingBuyerInvoiceOrderListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data.The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetPendingBuyerInvoiceOrderListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "next_cursor"?: string;
        "order_list"?: Array<{
            "order_sn"?: string;
        }>;
    };
}
export interface GetShipmentListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data.The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
}
export interface GetShipmentListResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "order_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
    "request_id"?: string;
}
export interface GetWarehouseFilterConfigRequest {
}
export interface GetWarehouseFilterConfigResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "warehouse_filters"?: Array<{
            "warehouse_name"?: string;
            "warehouse_type"?: number;
            "product_location_id"?: string;
            "address_id"?: number;
            "address"?: string;
        }>;
    };
}
export interface HandleBuyerCancellationRequest {
    "order_sn": string;
    "operation": string;
}
export interface HandleBuyerCancellationResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "update_time"?: number;
    };
}
export interface HandlePrescriptionCheckRequest {
    "order_sn": string;
    "is_approved": boolean;
    "items"?: Array<{
        "item_id"?: string;
        "group_id"?: string;
        "model_id"?: string;
    }>;
    "pharmacist_name"?: string;
    "free_text"?: string;
}
export interface HandlePrescriptionCheckResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "is_success"?: boolean;
    };
    "request_id"?: string;
}
export interface SearchPackageListRequest {
    "filter"?: {
        "package_status"?: number;
        "product_location_ids"?: Array<string>;
        "logistics_channel_ids"?: Array<number>;
        "fulfillment_type"?: number;
        "invoice_pending"?: boolean;
        "sorting_group"?: number;
        "order_type"?: number;
        "is_pre_order"?: number;
        "shipping_priority"?: number;
    };
    "pagination"?: {
        "page_size"?: number;
        "cursor"?: string;
    };
    "sort"?: {
        "sort_type"?: number;
        "ascending"?: boolean;
    };
}
export interface SearchPackageListResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "packages_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "logistics_channel_id"?: number;
            "product_location_id"?: string;
            "sorting_group"?: string;
            "is_shipment_arranged"?: boolean;
        }>;
        "pagination": {
            "total_count"?: number;
            "next_cursor"?: string;
            "more"?: boolean;
        };
        "sort": {
            "sort_type"?: number;
            "is_asc"?: boolean;
        };
    };
    "request_id"?: string;
}
export interface SetNoteRequest {
    "order_sn": string;
    "note": string;
}
export interface SetNoteResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface SplitOrderRequest {
    "order_sn": string;
    "package_list": Array<{
        "item_list"?: Array<{
            "item_id"?: number;
            "model_id"?: number;
            "order_item_id"?: number;
            "model_quantity"?: number;
        }>;
    }>;
}
export interface SplitOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "order_sn"?: string;
        "package_list"?: Array<{
            "item_list"?: Array<{
                "item_id"?: number;
                "model_id"?: number;
                "model_quantity"?: number;
                "order_item_id"?: number;
                "promotion_group_id"?: number;
            }>;
            "package_number"?: string;
        }>;
    };
}
export interface UnsplitOrderRequest {
    "order_sn": string;
}
export interface UnsplitOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UploadInvoiceDocRequest {
    "order_sn": string;
    "file_type": string;
    "file": string;
}
export interface UploadInvoiceDocResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export declare class ShopeeOrderApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * cancel order
     * /api/v2/order/cancel_order (POST)
     */
    cancelOrder(params: CancelOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CancelOrderResponse>>;
    /**
     * download fbs invoices
     * /api/v2/order/download_fbs_invoices (POST)
     */
    downloadFbsInvoices(params: DownloadFbsInvoicesRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadFbsInvoicesResponse>>;
    /**
     * download invoice doc
     * /api/v2/order/download_invoice_doc (GET)
     */
    downloadInvoiceDoc(params: DownloadInvoiceDocRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadInvoiceDocResponse>>;
    /**
     * generate fbs invoices
     * /api/v2/order/generate_fbs_invoices (POST)
     */
    generateFbsInvoices(params: GenerateFbsInvoicesRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateFbsInvoicesResponse>>;
    /**
     * get booking detail
     * /api/v2/order/get_booking_detail (GET)
     */
    getBookingDetail(params: GetBookingDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingDetailResponse>>;
    /**
     * get booking list
     * /api/v2/order/get_booking_list (GET)
     */
    getBookingList(params: GetBookingListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingListResponse>>;
    /**
     * get buyer invoice info
     * /api/v2/order/get_buyer_invoice_info (POST)
     */
    getBuyerInvoiceInfo(params: GetBuyerInvoiceInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBuyerInvoiceInfoResponse>>;
    /**
     * get estimate cancel value
     * /api/v2/order/get_estimate_cancel_value (POST)
     */
    getEstimateCancelValue(params: GetEstimateCancelValueRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetEstimateCancelValueResponse>>;
    /**
     * get fbs invoices result
     * /api/v2/order/get_fbs_invoices_result (POST)
     */
    getFbsInvoicesResult(params: GetFbsInvoicesResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetFbsInvoicesResultResponse>>;
    /**
     * get order detail
     * /api/v2/order/get_order_detail (GET)
     */
    getOrderDetail(params: GetOrderDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOrderDetailResponse>>;
    /**
     * get order list
     * /api/v2/order/get_order_list (GET)
     */
    getOrderList(params: GetOrderListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOrderListResponse>>;
    /**
     * get package detail
     * /api/v2/order/get_package_detail (GET)
     */
    getPackageDetail(params: GetPackageDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPackageDetailResponse>>;
    /**
     * get pending buyer invoice order list
     * /api/v2/order/get_pending_buyer_invoice_order_list (GET)
     */
    getPendingBuyerInvoiceOrderList(params: GetPendingBuyerInvoiceOrderListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPendingBuyerInvoiceOrderListResponse>>;
    /**
     * get shipment list
     * /api/v2/order/get_shipment_list (GET)
     */
    getShipmentList(params: GetShipmentListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShipmentListResponse>>;
    /**
     * get warehouse filter config
     * /api/v2/order/get_warehouse_filter_config (GET)
     */
    getWarehouseFilterConfig(params: GetWarehouseFilterConfigRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetWarehouseFilterConfigResponse>>;
    /**
     * handle buyer cancellation
     * /api/v2/order/handle_buyer_cancellation (POST)
     */
    handleBuyerCancellation(params: HandleBuyerCancellationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<HandleBuyerCancellationResponse>>;
    /**
     * handle prescription check
     * /api/v2/order/handle_prescription_check (POST)
     */
    handlePrescriptionCheck(params: HandlePrescriptionCheckRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<HandlePrescriptionCheckResponse>>;
    /**
     * search package list
     * /api/v2/order/search_package_list (POST)
     */
    searchPackageList(params: SearchPackageListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SearchPackageListResponse>>;
    /**
     * set note
     * /api/v2/order/set_note (POST)
     */
    setNote(params: SetNoteRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetNoteResponse>>;
    /**
     * split order
     * /api/v2/order/split_order (POST)
     */
    splitOrder(params: SplitOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SplitOrderResponse>>;
    /**
     * unsplit order
     * /api/v2/order/unsplit_order (POST)
     */
    unsplitOrder(params: UnsplitOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UnsplitOrderResponse>>;
    /**
     * upload invoice doc
     * /api/v2/order/upload_invoice_doc (POST)
     */
    uploadInvoiceDoc(params: UploadInvoiceDocRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadInvoiceDocResponse>>;
}
