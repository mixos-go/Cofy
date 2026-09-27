import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface BatchShipPackagesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface BatchShipPackagesBody {
    "packages"?: Array<{
        "pickup_slot"?: {
            "end_time"?: number;
            "start_time"?: number;
        };
        "self_shipment"?: {
            "shipping_provider_id"?: string;
            "tracking_number"?: string;
        };
    }>;
}
export interface BatchShipPackagesResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "package_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CombinePackageRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CombinePackageBody {
    "combinable_packages"?: Array<Record<string, unknown>>;
}
export interface CombinePackageResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "package_id"?: string;
            };
        }>;
        "packages"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateFirstMileBundleRequest {
}
export interface CreateFirstMileBundleBody {
    "handover_method"?: string;
    "order_ids"?: Array<string>;
    "phone_tail_number"?: string;
    "shipping_provider_id"?: string;
    "tracking_number"?: string;
}
export interface CreateFirstMileBundleResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "order_id"?: string;
            };
        }>;
        "first_mile_bundle_id"?: string;
        "url"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateFirstMileBundleV2Request {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateFirstMileBundleV2Body {
    "handover_method"?: string;
    "order_ids"?: Array<string>;
    "phone_tail_number"?: string;
    "shipping_provider_id"?: string;
    "tracking_number"?: string;
}
export interface CreateFirstMileBundleV2Response {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "order_id"?: string;
            };
        }>;
        "first_mile_bundle_id"?: string;
        "url"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateLastMileBundleRequest {
}
export interface CreateLastMileBundleBody {
    "fulfillment_unit_ids"?: Array<string>;
    "last_mile_bundle"?: {
        "dimensions"?: {
            "height"?: number;
            "length"?: number;
            "unit"?: string;
            "width"?: number;
        };
        "external_bundle_id"?: string;
        "fulfillment_unit_count"?: number;
        "outbound_time"?: number;
        "weight"?: {
            "unit"?: string;
            "value"?: number;
        };
    };
    "logistics_group_id"?: number;
}
export interface CreateLastMileBundleResponse {
    "code"?: number;
    "data"?: {
        "last_mile_bundle_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatePackagesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreatePackagesBody {
    "dimension"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "order_id"?: string;
    "order_line_item"?: Array<Record<string, unknown>>;
    "order_list_ids"?: Array<string>;
    "ship_type"?: string;
    "shipping_service_id"?: string;
    "weight"?: {
        "unit"?: string;
        "value"?: string;
    };
}
export interface CreatePackagesResponse {
    "code"?: number;
    "data"?: {
        "create_time"?: number;
        "dimension"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "package_id"?: string;
        "shipping_service_info"?: {
            "currency"?: string;
            "earliest_delivery_days"?: number;
            "id"?: string;
            "latest_delivery_days"?: number;
            "name"?: string;
            "price"?: string;
            "shipping_provider_id"?: string;
            "shipping_provider_name"?: string;
        };
        "weight"?: {
            "unit"?: string;
            "value"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface FulfillmentUploadDeliveryFileRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface FulfillmentUploadDeliveryFileResponse {
    "code"?: number;
    "data"?: {
        "name"?: string;
        "url"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface FulfillmentUploadDeliveryImageRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface FulfillmentUploadDeliveryImageResponse {
    "code"?: number;
    "data"?: {
        "height"?: number;
        "url"?: string;
        "width"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetEligibleShippingServiceRequest {
    /** TikTok Shop order ID (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetEligibleShippingServiceBody {
    "dimension"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "order_line_item_ids"?: Array<string>;
    "weight"?: {
        "unit"?: string;
        "value"?: string;
    };
}
export interface GetEligibleShippingServiceResponse {
    "code"?: number;
    "data"?: {
        "dimension"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "order_id"?: string;
        "order_line_id"?: Array<string>;
        "shipping_services"?: Array<Record<string, unknown>>;
        "weight"?: {
            "unit"?: string;
            "value"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetHandoverTimeslotsRequest {
    /** TikTok shop order ID. (path) */
    "order_id": string;
    /** Order line item ID list */
    "order_line_item_ids"?: Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetHandoverTimeslotsResponse {
    "code"?: number;
    "data"?: {
        "can_drop_off"?: boolean;
        "can_pickup"?: boolean;
        "can_van_collection"?: boolean;
        "drop_off_point_url"?: string;
        "pickup_slots"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetOrderSplitAttributesRequest {
    /** Query list of TikTok Shop order IDs. */
    "order_ids": Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetOrderSplitAttributesResponse {
    "code"?: number;
    "data"?: {
        "split_attributes"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetPackageDetailRequest {
    /** TikTok Shop package ID. (path) */
    "package_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get by API [Get Authorization Shop](https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9?external_id=650 */
    "shop_cipher"?: string;
}
export interface GetPackageDetailResponse {
    "code"?: number;
    "data"?: {
        "create_time"?: number;
        "delivery_option_id"?: string;
        "delivery_option_name"?: string;
        "dimension"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "handover_method"?: string;
        "has_multi_skus"?: boolean;
        "insurance"?: {
            "claim_status"?: string;
            "coverage_amount"?: string;
            "is_claim_eligible"?: boolean;
            "is_purchased"?: boolean;
        };
        "last_mile_tracking_number"?: string;
        "note_tag"?: string;
        "order_line_item_ids"?: Array<string>;
        "orders"?: Array<Record<string, unknown>>;
        "package_id"?: string;
        "package_status"?: string;
        "pickup_slot"?: {
            "end_time"?: number;
            "start_time"?: number;
        };
        "recipient_address"?: {
            "address_detail"?: string;
            "address_line1"?: string;
            "address_line2"?: string;
            "address_line3"?: string;
            "address_line4"?: string;
            "full_address"?: string;
            "name"?: string;
            "phone_number"?: string;
            "postal_code"?: string;
            "region_code"?: string;
        };
        "sender_address"?: {
            "address_detail"?: string;
            "address_line1"?: string;
            "address_line2"?: string;
            "address_line3"?: string;
            "address_line4"?: string;
            "full_address"?: string;
            "name"?: string;
            "phone_number"?: string;
            "postal_code"?: string;
            "region_code"?: string;
        };
        "shipping_provider_id"?: string;
        "shipping_provider_name"?: string;
        "shipping_type"?: string;
        "split_and_combine_tag"?: string;
        "tracking_number"?: string;
        "update_time"?: number;
        "weight"?: {
            "unit"?: string;
            "value"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetPackageHandoverTimeSlotsRequest {
    /** TikTok Shop package ID. (path) */
    "package_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetPackageHandoverTimeSlotsResponse {
    "code"?: number;
    "data"?: {
        "can_drop_off"?: boolean;
        "can_pickup"?: boolean;
        "can_van_collection"?: boolean;
        "drop_off_point_url"?: string;
        "pickup_slots"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetPackageShippingDocumentRequest {
    /** TikTok Shop package ID. (path) */
    "package_id": string;
    /** Available document types: - SHIPPING_LABEL: Returns the shipping label in PDF format by default. - PACKING_SLIP: Returns the packing slip in PDF format by default. - SHIPPING_LABEL_AND_PACKING_SLIP: Returns both the shipping label and the packing slip for the package, both in PDF format by def */
    "document_type": string;
    /** Use this field to specify the size of the document to obtain. This parameter is only applicable to shipping labels, picking slips, and packing slips that are in the PDF format. It is not applicable for hazmat labels as these are fixed to A4. If you specify SHIPPING_LABEL_PICTURE for the document_ */
    "document_size"?: string;
    /** The format of the shipping document. Possible values: - PDF (Default) - ZPL (Only for BR and MX market) **Note**: Not applicable for SHIPPING_LABEL_PICTURE document type. */
    "document_format"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetPackageShippingDocumentResponse {
    "code"?: number;
    "data"?: {
        "doc_url"?: string;
        "tracking_number"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetTrackingRequest {
    /** TikTok Shop order ID. (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetTrackingResponse {
    "code"?: number;
    "data"?: {
        "tracking"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface MarkPackageAsShippedRequest {
    /** The unique identifier for a TikTok Shop order. (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface MarkPackageAsShippedBody {
    "order_line_item_ids"?: Array<string>;
    "shipping_provider_id"?: string;
    "tracking_number"?: string;
}
export interface MarkPackageAsShippedResponse {
    "code"?: number;
    "data"?: {
        "order_id"?: string;
        "order_line_item_ids"?: Array<string>;
        "package_id"?: string;
        "warning"?: {
            "message"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RedeemInfoCallbackRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface RedeemInfoCallbackBody {
    "order_id"?: string;
    "order_info_list"?: Array<{
        "redeem_info"?: {
            "redeem_data"?: string;
            "redeem_type"?: string;
        };
    }>;
}
export interface RedeemInfoCallbackResponse {
    "code"?: number;
    "data"?: {
        "order_statuses"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SchedulePackageHandoverRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SchedulePackageHandoverBody {
    "handover_method"?: string;
    "order_id"?: string;
    "order_line_item_ids"?: Array<string>;
    "pickup_slot"?: {
        "end_time"?: number;
        "start_time"?: number;
    };
}
export interface SchedulePackageHandoverResponse {
    "code"?: number;
    "data"?: {
        "create_time"?: number;
        "dimension"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "handover_method"?: string;
        "order_id"?: string;
        "order_line_item_ids"?: Array<string>;
        "package_id"?: string;
        "shipping_provider_id"?: string;
        "shipping_provider_name"?: string;
        "tracking_number"?: string;
        "update_time"?: number;
        "weight"?: {
            "unit"?: string;
            "value"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCombinablePackagesRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Valid range: [1-50]. */
    "page_size": number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchCombinablePackagesResponse {
    "code"?: number;
    "data"?: {
        "combinable_packages"?: Array<Record<string, unknown>>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchPackageRequest {
    /** The number of results to be returned per page. Valid range: [1-50]. */
    "page_size": number;
    /** The returned results will be sorted by the specified field. Default: create_time Possible values: - create_time - update_time - order_pay_time Specify the order for sorting the returned results by using the sort_order parameter. */
    "sort_field"?: string;
    /** The sort order for the sort_field parameter. Default: DESC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get by API [Get Authorization Shop](https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9?external_id=650 */
    "shop_cipher"?: string;
}
export interface SearchPackageBody {
    "create_time_ge"?: number;
    "create_time_lt"?: number;
    "package_status"?: string;
    "update_time_ge"?: number;
    "update_time_lt"?: number;
}
export interface SearchPackageResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "packages"?: Array<Record<string, unknown>>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ShipPackageRequest {
    /** TikTok Shop package ID. (path) */
    "package_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ShipPackageBody {
    "handover_method"?: string;
    "pickup_slot"?: {
        "end_time"?: number;
        "start_time"?: number;
    };
    "self_shipment"?: {
        "shipping_provider_id"?: string;
        "tracking_number"?: string;
    };
}
export interface ShipPackageResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface SplitOrdersRequest {
    /** TikTok Shop order ID. (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SplitOrdersBody {
    "splittable_groups"?: Array<Record<string, unknown>>;
}
export interface SplitOrdersResponse {
    "code"?: number;
    "data"?: {
        "packages"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface TTSTrackingValidationRequest {
    /** The tracking number provided by shipping provider */
    "tracking_number": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface TTSTrackingValidationResponse {
    "code"?: number;
    "data"?: {
        "is_tiktok_collection"?: boolean;
        "is_tiktok_shipping"?: boolean;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UncombinePackagesRequest {
    /** Package ID you wish to uncombine an order(s) from. (path) */
    "package_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UncombinePackagesBody {
    "order_ids"?: Array<string>;
}
export interface UncombinePackagesResponse {
    "code"?: number;
    "data"?: {
        "packages"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePackageDeliveryStatusRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePackageDeliveryStatusBody {
    "packages"?: Array<Record<string, unknown>>;
}
export interface UpdatePackageDeliveryStatusResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "package_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePackageShippingInfoRequest {
    /** TikTok Shop package ID. (path) */
    "package_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePackageShippingInfoBody {
    "shipping_provider_id"?: string;
    "tracking_number"?: string;
}
export interface UpdatePackageShippingInfoResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateShippingInfoRequest {
    /** TikTok Shop order ID. (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdateShippingInfoBody {
    "shipping_provider_id"?: string;
    "tracking_number"?: string;
}
export interface UpdateShippingInfoResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UploadInvoiceRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UploadInvoiceBody {
    "invoices"?: Array<Record<string, unknown>>;
}
export interface UploadInvoiceResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "order_ids"?: Array<string>;
                "package_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokFulfillmentApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * BatchShipPackages
     * /fulfillment/202309/packages/ship (POST)
     */
    batchShipPackages(params: BatchShipPackagesRequest, body?: BatchShipPackagesBody, opts?: TikTokRequestOptions): Promise<BatchShipPackagesResponse>;
    /**
     * CombinePackage
     * /fulfillment/202309/packages/combine (POST)
     */
    combinePackage(params: CombinePackageRequest, body?: CombinePackageBody, opts?: TikTokRequestOptions): Promise<CombinePackageResponse>;
    /**
     * CreateFirstMileBundle
     * /fulfillment/202407/bundles (POST)
     */
    createFirstMileBundle(params: CreateFirstMileBundleRequest, body?: CreateFirstMileBundleBody, opts?: TikTokRequestOptions): Promise<CreateFirstMileBundleResponse>;
    /**
     * CreateFirstMileBundleV2
     * /fulfillment/202510/first_mile_bundle (POST)
     */
    createFirstMileBundleV2(params: CreateFirstMileBundleV2Request, body?: CreateFirstMileBundleV2Body, opts?: TikTokRequestOptions): Promise<CreateFirstMileBundleV2Response>;
    /**
     * CreateLastMileBundle
     * /fulfillment/202408/last_mile_bundles (POST)
     */
    createLastMileBundle(params: CreateLastMileBundleRequest, body?: CreateLastMileBundleBody, opts?: TikTokRequestOptions): Promise<CreateLastMileBundleResponse>;
    /**
     * CreatePackages
     * /fulfillment/202512/packages (POST)
     */
    createPackages(params: CreatePackagesRequest, body?: CreatePackagesBody, opts?: TikTokRequestOptions): Promise<CreatePackagesResponse>;
    /**
     * FulfillmentUploadDeliveryFile
     * /fulfillment/202309/files/upload (POST)
     */
    fulfillmentUploadDeliveryFile(params: FulfillmentUploadDeliveryFileRequest, opts?: TikTokRequestOptions): Promise<FulfillmentUploadDeliveryFileResponse>;
    /**
     * FulfillmentUploadDeliveryImage
     * /fulfillment/202309/images/upload (POST)
     */
    fulfillmentUploadDeliveryImage(params: FulfillmentUploadDeliveryImageRequest, opts?: TikTokRequestOptions): Promise<FulfillmentUploadDeliveryImageResponse>;
    /**
     * GetEligibleShippingService
     * /fulfillment/202309/orders/{order_id}/shipping_services/query (POST)
     */
    getEligibleShippingService(params: GetEligibleShippingServiceRequest, body?: GetEligibleShippingServiceBody, opts?: TikTokRequestOptions): Promise<GetEligibleShippingServiceResponse>;
    /**
     * GetHandoverTimeslots
     * /fulfillment/202309/orders/{order_id}/handover_time_slots (GET)
     */
    getHandoverTimeslots(params: GetHandoverTimeslotsRequest, opts?: TikTokRequestOptions): Promise<GetHandoverTimeslotsResponse>;
    /**
     * GetOrderSplitAttributes
     * /fulfillment/202309/orders/split_attributes (GET)
     */
    getOrderSplitAttributes(params: GetOrderSplitAttributesRequest, opts?: TikTokRequestOptions): Promise<GetOrderSplitAttributesResponse>;
    /**
     * GetPackageDetail
     * /fulfillment/202309/packages/{package_id} (GET)
     */
    getPackageDetail(params: GetPackageDetailRequest, opts?: TikTokRequestOptions): Promise<GetPackageDetailResponse>;
    /**
     * GetPackageHandoverTimeSlots
     * /fulfillment/202309/packages/{package_id}/handover_time_slots (GET)
     */
    getPackageHandoverTimeSlots(params: GetPackageHandoverTimeSlotsRequest, opts?: TikTokRequestOptions): Promise<GetPackageHandoverTimeSlotsResponse>;
    /**
     * GetPackageShippingDocument
     * /fulfillment/202309/packages/{package_id}/shipping_documents (GET)
     */
    getPackageShippingDocument(params: GetPackageShippingDocumentRequest, opts?: TikTokRequestOptions): Promise<GetPackageShippingDocumentResponse>;
    /**
     * GetTracking
     * /fulfillment/202309/orders/{order_id}/tracking (GET)
     */
    getTracking(params: GetTrackingRequest, opts?: TikTokRequestOptions): Promise<GetTrackingResponse>;
    /**
     * MarkPackageAsShipped
     * /fulfillment/202309/orders/{order_id}/packages (POST)
     */
    markPackageAsShipped(params: MarkPackageAsShippedRequest, body?: MarkPackageAsShippedBody, opts?: TikTokRequestOptions): Promise<MarkPackageAsShippedResponse>;
    /**
     * RedeemInfoCallback
     * /fulfillment/202601/redeem_info/callback (POST)
     */
    redeemInfoCallback(params: RedeemInfoCallbackRequest, body?: RedeemInfoCallbackBody, opts?: TikTokRequestOptions): Promise<RedeemInfoCallbackResponse>;
    /**
     * SchedulePackageHandover
     * /fulfillment/202309/packages/schedule (POST)
     */
    schedulePackageHandover(params: SchedulePackageHandoverRequest, body?: SchedulePackageHandoverBody, opts?: TikTokRequestOptions): Promise<SchedulePackageHandoverResponse>;
    /**
     * SearchCombinablePackages
     * /fulfillment/202309/combinable_packages/search (GET)
     */
    searchCombinablePackages(params: SearchCombinablePackagesRequest, opts?: TikTokRequestOptions): Promise<SearchCombinablePackagesResponse>;
    /**
     * SearchPackage
     * /fulfillment/202309/packages/search (POST)
     */
    searchPackage(params: SearchPackageRequest, body?: SearchPackageBody, opts?: TikTokRequestOptions): Promise<SearchPackageResponse>;
    /**
     * ShipPackage
     * /fulfillment/202309/packages/{package_id}/ship (POST)
     */
    shipPackage(params: ShipPackageRequest, body?: ShipPackageBody, opts?: TikTokRequestOptions): Promise<ShipPackageResponse>;
    /**
     * SplitOrders
     * /fulfillment/202309/orders/{order_id}/split (POST)
     */
    splitOrders(params: SplitOrdersRequest, body?: SplitOrdersBody, opts?: TikTokRequestOptions): Promise<SplitOrdersResponse>;
    /**
     * TTSTrackingValidation
     * /fulfillment/202508/tts_tracking_validation (GET)
     */
    tTSTrackingValidation(params: TTSTrackingValidationRequest, opts?: TikTokRequestOptions): Promise<TTSTrackingValidationResponse>;
    /**
     * UncombinePackages
     * /fulfillment/202309/packages/{package_id}/uncombine (POST)
     */
    uncombinePackages(params: UncombinePackagesRequest, body?: UncombinePackagesBody, opts?: TikTokRequestOptions): Promise<UncombinePackagesResponse>;
    /**
     * UpdatePackageDeliveryStatus
     * /fulfillment/202309/packages/deliver (POST)
     */
    updatePackageDeliveryStatus(params: UpdatePackageDeliveryStatusRequest, body?: UpdatePackageDeliveryStatusBody, opts?: TikTokRequestOptions): Promise<UpdatePackageDeliveryStatusResponse>;
    /**
     * UpdatePackageShippingInfo
     * /fulfillment/202309/packages/{package_id}/shipping_info/update (POST)
     */
    updatePackageShippingInfo(params: UpdatePackageShippingInfoRequest, body?: UpdatePackageShippingInfoBody, opts?: TikTokRequestOptions): Promise<UpdatePackageShippingInfoResponse>;
    /**
     * UpdateShippingInfo
     * /fulfillment/202309/orders/{order_id}/shipping_info/update (POST)
     */
    updateShippingInfo(params: UpdateShippingInfoRequest, body?: UpdateShippingInfoBody, opts?: TikTokRequestOptions): Promise<UpdateShippingInfoResponse>;
    /**
     * UploadInvoice
     * /fulfillment/202502/invoice/upload (POST)
     */
    uploadInvoice(params: UploadInvoiceRequest, body?: UploadInvoiceBody, opts?: TikTokRequestOptions): Promise<UploadInvoiceResponse>;
}
