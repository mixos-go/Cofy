import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AcceptOfferRequest {
    "return_sn": string;
}
export interface AcceptOfferResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "return_sn"?: string;
    };
}
export interface CancelDisputeRequest {
    "return_sn": string;
    "email": string;
}
export interface CancelDisputeResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "return_sn"?: string;
        "message"?: string;
    };
}
export interface ConfirmRequest {
    "return_sn": string;
}
export interface ConfirmResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "return_sn"?: string;
    };
}
export interface ConvertImageRequest {
    "return_sn": string;
    "upload_image": string;
}
export interface ConvertImageResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "url"?: string;
        "thumbnail"?: string;
    };
}
export interface DisputeRequest {
    "return_sn": string;
    "email": string;
    "dispute_reason_id": number;
    "image_list"?: Array<{
        "module_index"?: number;
        "requirement"?: string;
        "image_url"?: Array<string>;
    }>;
    "dispute_text_reason"?: string;
}
export interface DisputeResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "return_sn"?: string;
        "msg"?: string;
    };
}
export interface GetAvailableSolutionsRequest {
    /** The serial number of return. Example: 220106202649696 */
    "return_sn": string;
}
export interface GetAvailableSolutionsResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "return_sn"?: string;
        "offer_return_refund": {
            "eligibility"?: boolean;
            "refund_amount_adjustable"?: boolean;
            "max_refund_amount"?: number;
            "min_refund_amount"?: number;
        };
        "offer_refund": {
            "eligibility"?: boolean;
            "refund_amount_adjustable"?: boolean;
            "max_refund_amount"?: number;
            "min_refund_amount"?: number;
        };
    };
}
export interface GetReturnDetailRequest {
    /** The serial number of return. Example: 2206150VT13E3MQ */
    "return_sn": string;
}
export interface GetReturnDetailResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "image"?: Array<string>;
        "buyer_videos"?: Array<{
            "thumbnail_url"?: string;
            "video_url"?: string;
        }>;
        "reason"?: string;
        "text_reason"?: string;
        "return_sn"?: string;
        "refund_amount"?: number;
        "currency"?: string;
        "create_time"?: number;
        "update_time"?: number;
        "status"?: string;
        "due_date"?: number;
        "tracking_number"?: string;
        "dispute_reason"?: number;
        "dispute_text_reason"?: string;
        "needs_logistics"?: boolean;
        "amount_before_discount"?: number;
        "user": {
            "username"?: string;
            "email"?: string;
            "portrait"?: string;
        };
        "item"?: Array<{
            "model_id"?: number;
            "name"?: string;
            "images"?: Array<string>;
            "amount"?: number;
            "item_price"?: number;
            "is_add_on_deal"?: boolean;
            "is_main_item"?: boolean;
            "add_on_deal_id"?: number;
            "item_id"?: number;
            "item_sku"?: string;
            "variation_sku"?: string;
            "refund_amount"?: number;
        }>;
        "order_sn"?: string;
        "return_ship_due_date"?: number;
        "return_seller_due_date"?: number;
        "activity"?: Array<{
            "activity_id"?: number;
            "activity_type"?: string;
            "original_price"?: string;
            "discounted_price"?: string;
            "items"?: Array<{
                "item_id"?: number;
                "variation_id"?: number;
                "quantity_purchased"?: number;
                "original_price"?: string;
            }>;
            "refund_amount"?: number;
        }>;
        "seller_proof": {
            "seller_proof_status"?: string;
            "seller_evidence_deadline"?: number;
        };
        "seller_compensation": {
            "seller_compensation_status"?: string;
            "seller_compensation_due_date"?: number;
            "compensation_amount"?: number;
        };
        "negotiation": {
            "negotiation_status"?: string;
            "latest_solution"?: string;
            "latest_offer_amount"?: number;
            "latest_offer_creator"?: string;
            "counter_limit"?: number;
            "offer_due_date"?: number;
        };
        "logistics_status"?: string;
        "reverse_logistic_status"?: string;
        "return_pickup_address": {
            "address"?: string;
            "name"?: string;
            "phone"?: string;
            "town"?: string;
            "district"?: string;
            "city"?: string;
            "state"?: string;
            "region"?: string;
            "zipcode"?: string;
        };
        "virtual_contact_number"?: string;
        "package_query_number"?: string;
        "return_address": {
            "whs_id"?: string;
        };
        "return_refund_type"?: string;
        "return_solution"?: number;
        "is_seller_arrange"?: boolean;
        "is_shipping_proof_mandatory"?: boolean;
        "has_uploaded_shipping_proof"?: boolean;
        "is_reverse_logistics_channel_integrated"?: boolean;
        "reverse_logistic_channel_name"?: string;
        "return_refund_request_type"?: number;
        "validation_type"?: string;
        "is_arrived_at_warehouse"?: number;
        "follow_up_action_list"?: Array<{
            "item_id"?: number;
            "model_id"?: number;
            "qty"?: number;
            "current_status"?: number;
            "related_order_sn_list"?: unknown[];
            "resell_failed_next_step"?: string;
        }>;
    };
}
export interface GetReturnDisputeReasonRequest {
    /** The serial number of return. Example: 24112301K66SQXM */
    "return_sn": string;
}
export interface GetReturnDisputeReasonResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "dispute_reason_list"?: Array<{
            "dispute_reason"?: number;
            "dispute_requirement"?: string;
            "evidence_module_list"?: Array<{
                "is_required"?: boolean;
                "module_index"?: number;
                "requirement"?: string;
            }>;
            "sample_evidence"?: Array<{
                "thumbnail"?: string;
                "type"?: number;
                "url"?: string;
            }>;
        }>;
    };
}
export interface GetReturnListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0. if data is more than one page, the offset can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** if many items are available to retrieve, you may need to call GetReturnList multiple times to retrieve all the data. Each result set is returned as a page of entries. Default is 40. Use the Pagination filters to control the maximum number of entries (<= 100) to retrieve per page (i.e., per call), the offset number to start next call. This integer value is usUed to specify the maximum number of entries to return in a single ""page"" of data. Example: 10 */
    "page_size": number;
    /** The create_time_from and create_time_to fields specify a date range for retrieving orders (based on the order create time). The create_time_from field is the starting date range. The maximum date range that may be specified with the create_time_from and create_time_to fields is 15 days. Example: 1655392442 */
    "create_time_from"?: number;
    /** The create_time_from and create_time_to fields specify a date range for retrieving orders (based on the order create time). The create_time_from field is the starting date range. The maximum date range that may be specified with the create_time_from and create_time_to fields is 15 days. Example: 1655392542 */
    "create_time_to"?: number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the last return updated time). The update_time_from field is the starting date range. The maximum date range that may be specified with the update_time_from and update_time_to fields is 15 days. update_time_from should be >= create_time_from Example: 1655392442 */
    "update_time_from"?: number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the last return updated time). The update_time_from field is the starting date range. The maximum date range that may be specified with the update_time_from and update_time_to fields is 15 days. update_time_from should be >= create_time_from Example: 1655392542 */
    "update_time_to"?: number;
    /** This is for filtering return request by return status. See "Data Definition - ReturnStatus" Example: REQUESTED */
    "status"?: string;
    /** This is for filtering return request by counter status. See "Data Definition - NegotiationStatus" Example: TERMINATED */
    "negotiation_status"?: string;
    /** This is for filtering return request by proof status. See "Data Definition - SellerProofStatus" Example: PENDING */
    "seller_proof_status"?: string;
    /** This is for filtering return request by compensation status. See "Data Definition - SellerCompensationStatus" Example: NOT_REQUIRED */
    "seller_compensation_status"?: string;
}
export interface GetReturnListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "return"?: Array<{
            "image"?: Array<string>;
            "reason"?: string;
            "text_reason"?: string;
            "return_sn"?: string;
            "refund_amount"?: number;
            "currency"?: string;
            "create_time"?: number;
            "update_time"?: number;
            "status"?: string;
            "due_date"?: number;
            "tracking_number"?: string;
            "dispute_reason"?: Array<string>;
            "dispute_text_reason"?: Array<string>;
            "needs_logistics"?: boolean;
            "amount_before_discount"?: number;
            "user": {
                "username"?: string;
                "email"?: string;
                "portrait"?: string;
            };
            "item"?: Array<{
                "model_id"?: number;
                "name"?: string;
                "images"?: Array<string>;
                "amount"?: number;
                "item_price"?: number;
                "is_add_on_deal"?: boolean;
                "is_main_item"?: boolean;
                "add_on_deal_id"?: number;
                "item_id"?: number;
                "item_sku"?: string;
                "variation_sku"?: string;
            }>;
            "order_sn"?: string;
            "return_ship_due_date"?: number;
            "return_seller_due_date"?: number;
            "negotiation_status"?: string;
            "seller_proof_status"?: string;
            "seller_compensation_status"?: string;
            "return_refund_type"?: string;
            "return_solution"?: number;
            "is_seller_arrange"?: boolean;
            "is_shipping_proof_mandatory"?: boolean;
            "return_refund_request_type"?: number;
            "validation_type"?: string;
            "is_arrived_at_warehouse"?: number;
            "follow_up_action_list"?: Array<{
                "item_id"?: number;
                "model_id"?: number;
                "qty"?: number;
                "current_status"?: number;
                "related_order_sn_list"?: unknown[];
                "resell_failed_next_step"?: string;
            }>;
        }>;
    };
}
export interface GetReverseTrackingInfoRequest {
    /** Shopee's unique identifier for a return/refund request (serial number of return). Example: 2206150VT13E3MQ */
    "return_sn": string;
}
export interface GetReverseTrackingInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "return_sn"?: string;
        "return_refund_request_type"?: number;
        "validation_type"?: string;
        "reverse_logistics_status"?: string;
        "reverse_logistics_update_time"?: number;
        "estimated_delivery_date_max"?: string;
        "estimated_delivery_date_min"?: string;
        "tracking_number"?: string;
        "tracking_info"?: Array<{
            "update_time"?: number;
            "tracking_description"?: string;
            "epop_image_list"?: Array<string>;
            "epod_image_list"?: Array<string>;
        }>;
    };
}
export interface GetShippingCarrierRequest {
    /** The serial number of return. Example: 2206150VT13E3MQ */
    "return_sn": string;
}
export interface GetShippingCarrierResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "is_shipping_proof_mandatory"?: boolean;
        "has_uploaded_seller_arrange_proof"?: boolean;
        "shipping_proof_template"?: Array<{
            "is_tracking_number_required"?: boolean;
            "is_shipping_image_file_mandatory"?: boolean;
        }>;
        "reverse_logistics_carrier_list"?: Array<{
            "reverse_logistics_carrier_id"?: number;
            "reverse_logistics_carrier_name"?: string;
        }>;
    };
}
export interface OfferRequest {
    "return_sn": string;
    "proposed_solution": string;
    "proposed_adjusted_refund_amount"?: number;
}
export interface OfferResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "return_sn"?: string;
    };
}
export interface QueryProofRequest {
    /** The serial number of return. Example: 123456 */
    "return_sn": string;
}
export interface QueryProofResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "image"?: Array<{
            "url"?: string;
            "thumbnail"?: string;
        }>;
        "video"?: Array<{
            "url"?: string;
            "thumbnail"?: string;
        }>;
        "description"?: string;
    };
}
export interface UploadProofRequest {
    "return_sn": string;
    "photo"?: Array<{
        "url"?: string;
        "thumbnail"?: string;
    }>;
    "description"?: string;
}
export interface UploadProofResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: Record<string, unknown>;
}
export interface UploadShippingProofRequest {
    "return_sn": string;
    "reverse_logistics_carrier_id": number;
    "reverse_logistics_carrier_name"?: string;
    "tracking_number"?: string;
    "image_id_list"?: Array<{
        "image_id"?: string;
    }>;
    "remarks"?: string;
}
export interface UploadShippingProofResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export declare class ShopeeReturnsApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * accept offer
     * /api/v2/returns/accept_offer (POST)
     */
    acceptOffer(params: AcceptOfferRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AcceptOfferResponse>>;
    /**
     * cancel dispute
     * /api/v2/returns/cancel_dispute (POST)
     */
    cancelDispute(params: CancelDisputeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CancelDisputeResponse>>;
    /**
     * confirm
     * /api/v2/returns/confirm (POST)
     */
    confirm(params: ConfirmRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ConfirmResponse>>;
    /**
     * convert image
     * /api/v2/returns/convert_image (POST)
     */
    convertImage(params: ConvertImageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ConvertImageResponse>>;
    /**
     * dispute
     * /api/v2/returns/dispute (POST)
     */
    dispute(params: DisputeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DisputeResponse>>;
    /**
     * get available solutions
     * /api/v2/returns/get_available_solutions (GET)
     */
    getAvailableSolutions(params: GetAvailableSolutionsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAvailableSolutionsResponse>>;
    /**
     * get return detail
     * /api/v2/returns/get_return_detail (GET)
     */
    getReturnDetail(params: GetReturnDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetReturnDetailResponse>>;
    /**
     * get return dispute reason
     * /api/v2/returns/get_return_dispute_reason (GET)
     */
    getReturnDisputeReason(params: GetReturnDisputeReasonRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetReturnDisputeReasonResponse>>;
    /**
     * get return list
     * /api/v2/returns/get_return_list (GET)
     */
    getReturnList(params: GetReturnListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetReturnListResponse>>;
    /**
     * get reverse tracking info
     * /api/v2/returns/get_reverse_tracking_info (GET)
     */
    getReverseTrackingInfo(params: GetReverseTrackingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetReverseTrackingInfoResponse>>;
    /**
     * get shipping carrier
     * /api/v2/returns/get_shipping_carrier (GET)
     */
    getShippingCarrier(params: GetShippingCarrierRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingCarrierResponse>>;
    /**
     * offer
     * /api/v2/returns/offer (POST)
     */
    offer(params: OfferRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<OfferResponse>>;
    /**
     * query proof
     * /api/v2/returns/query_proof (GET)
     */
    queryProof(params: QueryProofRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryProofResponse>>;
    /**
     * upload proof
     * /api/v2/returns/upload_proof (POST)
     */
    uploadProof(params: UploadProofRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadProofResponse>>;
    /**
     * upload shipping proof
     * /api/v2/returns/upload_shipping_proof (POST)
     */
    uploadShippingProof(params: UploadShippingProofRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadShippingProofResponse>>;
}
