import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface BindCourierDeliveryFirstMileTrackingNumberRequest {
    "shipment_method": string;
    "binding_id": string;
    "order_list": Array<{
        "order_sn"?: string;
    }>;
}
export interface BindCourierDeliveryFirstMileTrackingNumberResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "binding_id"?: string;
        "success_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
        }>;
        "fail_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export interface BindFirstMileTrackingNumberRequest {
    "first_mile_tracking_number": string;
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
    "shipment_method": string;
    "logistics_channel_id": number;
    "region": string;
    "weight"?: number;
    "volume"?: number;
    "length"?: number;
    "width"?: number;
    "height"?: number;
}
export interface BindFirstMileTrackingNumberResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "first_mile_tracking_number"?: string;
        "order_list"?: Array<{
            "order_sn"?: string;
        }>;
    };
    "request_id"?: string;
}
export interface GenerateAndBindFirstMileTrackingNumberRequest {
    "shipment_method": string;
    "region"?: string;
    "order_list": Array<{
        "order_sn"?: string;
    }>;
    "courier_delivery_info"?: {
        "address_id"?: number;
        "warehouse_id"?: string;
        "logistics_product_id"?: number;
        "prepaid_account_id"?: number;
        "courier_service_id"?: string;
    };
}
export interface GenerateAndBindFirstMileTrackingNumberResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "binding_id"?: string;
        "success_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: null;
        }>;
        "fail_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export interface GenerateFirstMileTrackingNumberRequest {
    "declare_date": string;
    "quantity"?: number;
}
export interface GenerateFirstMileTrackingNumberResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "first_mile_tracking_number_list"?: Array<string>;
    };
}
export interface GetChannelListRequest {
    /** Use this field to specify the region you want to ship parcel. Available value: CN, KR Example: CN */
    "region"?: string;
}
export interface GetChannelListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "logistics_channel_list"?: Array<{
            "shipment_method"?: string;
            "logistics_channel_id"?: number;
            "logistics_channel_name"?: string;
        }>;
    };
}
export interface GetCourierDeliveryChannelListRequest {
    /** Use this field to specify the region you want to ship parcel. Available value: CN Example: CN */
    "region"?: string;
}
export interface GetCourierDeliveryChannelListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "logistics_channel_list"?: Array<{
            "logistics_product_id"?: number;
            "logistics_product_name"?: string;
            "courier_list"?: Array<{
                "courier_name"?: string;
                "courier_service_id"?: string;
                "courier_service_name"?: string;
            }>;
        }>;
    };
}
export interface GetCourierDeliveryDetailRequest {
    /** Binding ID Example: DCN249237197572VU */
    "binding_id": string;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. limit [1, 50]. Example: 10 */
    "page_size"?: number;
}
export interface GetCourierDeliveryDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "binding_id"?: string;
        "declare_date"?: string;
        "first_mile_tracking_number"?: string;
        "more"?: boolean;
        "next_cursor"?: string;
        "order_list"?: Array<{
            "arrived_transit_warehouse"?: boolean;
            "order_sn"?: string;
            "package_number"?: string;
            "pick_up_done"?: boolean;
            "sls_tracking_number"?: string;
        }>;
        "status"?: string;
    };
}
export interface GetCourierDeliveryTrackingNumberListRequest {
    "from_date": string;
    "to_date": string;
    "page_size"?: number;
    "cursor"?: string;
}
export interface GetCourierDeliveryTrackingNumberListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_cursor"?: string;
        "tracking_number_list"?: Array<{
            "binding_id"?: string;
            "declare_date"?: string;
            "first_mile_tracking_number"?: string;
            "status"?: string;
        }>;
    };
}
export interface GetCourierDeliveryWaybillRequest {
    "binding_id_list": Array<string>;
}
export interface GetCourierDeliveryWaybillResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "waybill_list"?: Array<{
            "binding_id"?: string;
            "shipping_label_url"?: string;
        }>;
    };
}
export interface GetDetailRequest {
    /** The first mile tracking number. Example: CNF731738838434210105 */
    "first_mile_tracking_number": string;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
}
export interface GetDetailResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "first_mile_tracking_number"?: string;
        "shipment_method"?: string;
        "logistics_channel_id"?: number;
        "status"?: string;
        "declare_date"?: string;
        "order_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "sls_tracking_number"?: string;
            "pick_up_done"?: boolean;
            "arrived_transit_warehouse"?: boolean;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
}
export interface GetTrackingNumberListRequest {
    /** The start time of declare_date. Example: 2020-01-01 */
    "from_date": string;
    /** The end time of declare_date. Example: 2020-12-29 */
    "to_date": string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. limit [1, 50] Example: 10 */
    "page_size"?: number;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
}
export interface GetTrackingNumberListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "first_mile_tracking_number_list"?: Array<{
            "first_mile_tracking_number"?: string;
            "status"?: string;
            "declare_date"?: string;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
}
export interface GetTransitWarehouseListRequest {
    /** Use this field to specify the region you want to ship parcel. Available value: CN. Example: CN */
    "region"?: string;
    /** Use this field to specify the shipment method you want to ship parcel. Available value: pickup, dropoff, self_deliver, courier_delivery. Note: Only when shipment_method = dropoff, the API response will include warehouses where warehouse_type = 1 (vendor warehouse). Example: pickup */
    "shipment_method"?: string;
}
export interface GetTransitWarehouseListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "transit_warehouse_list"?: Array<{
            "warehouse_id"?: string;
            "warehouse_name_en"?: string;
            "warehouse_name_cn"?: string;
            "warehouse_type"?: number;
        }>;
    };
}
export interface GetUnbindOrderListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor"?: string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. limit [1, 100] Example: 10 */
    "page_size"?: number;
    /** Indicate response fields you want to get. Please select from the below response parameters. If you input an object field, all the params under it will be included automatically in the response. If there are multiple response fields you want to get, you need to use English comma to connect them. Available values: logistics_status,package_number. Example: logistics_status,package_number */
    "response_optional_fields"?: string;
}
export interface GetUnbindOrderListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "order_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "logistics_status"?: string;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
}
export interface GetWaybillRequest {
    "first_mile_tracking_number_list": Array<string>;
}
export interface GetWaybillResponse {
    /** The waybill file. Example: The waybill file. */
    "waybill"?: unknown;
}
export interface UnbindFirstMileTrackingNumberRequest {
    "first_mile_tracking_number": string;
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
}
export interface UnbindFirstMileTrackingNumberResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "first_mile_tracking_number"?: string;
        "order_list"?: Array<{
            "order_sn"?: string;
            "fail_message"?: string;
            "fail_error"?: string;
        }>;
    };
    "warning"?: Array<{
        "order_sn"?: string;
    }>;
}
export interface UnbindFirstMileTrackingNumberAllRequest {
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
}
export interface UnbindFirstMileTrackingNumberAllResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "binding_id"?: string;
            "first_mile_tracking_number"?: string;
        }>;
        "fail_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export declare class ShopeeFirstMileApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * bind courier delivery first mile tracking number
     * /api/v2/first_mile/bind_courier_delivery_first_mile_tracking_number (POST)
     */
    bindCourierDeliveryFirstMileTrackingNumber(params: BindCourierDeliveryFirstMileTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BindCourierDeliveryFirstMileTrackingNumberResponse>>;
    /**
     * bind first mile tracking number
     * /api/v2/first_mile/bind_first_mile_tracking_number (POST)
     */
    bindFirstMileTrackingNumber(params: BindFirstMileTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BindFirstMileTrackingNumberResponse>>;
    /**
     * generate and bind first mile tracking number
     * /api/v2/first_mile/generate_and_bind_first_mile_tracking_number (POST)
     */
    generateAndBindFirstMileTrackingNumber(params: GenerateAndBindFirstMileTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateAndBindFirstMileTrackingNumberResponse>>;
    /**
     * generate first mile tracking number
     * /api/v2/first_mile/generate_first_mile_tracking_number (POST)
     */
    generateFirstMileTrackingNumber(params: GenerateFirstMileTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateFirstMileTrackingNumberResponse>>;
    /**
     * get channel list
     * /api/v2/first_mile/get_channel_list (GET)
     */
    getChannelList(params: GetChannelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetChannelListResponse>>;
    /**
     * get courier delivery channel list
     * /api/v2/first_mile/get_courier_delivery_channel_list (GET)
     */
    getCourierDeliveryChannelList(params: GetCourierDeliveryChannelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCourierDeliveryChannelListResponse>>;
    /**
     * get courier delivery detail
     * /api/v2/first_mile/get_courier_delivery_detail (GET)
     */
    getCourierDeliveryDetail(params: GetCourierDeliveryDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCourierDeliveryDetailResponse>>;
    /**
     * get courier delivery tracking number list
     * /api/v2/first_mile/get_courier_delivery_tracking_number_list (POST)
     */
    getCourierDeliveryTrackingNumberList(params: GetCourierDeliveryTrackingNumberListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCourierDeliveryTrackingNumberListResponse>>;
    /**
     * get courier delivery waybill
     * /api/v2/first_mile/get_courier_delivery_waybill (POST)
     */
    getCourierDeliveryWaybill(params: GetCourierDeliveryWaybillRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCourierDeliveryWaybillResponse>>;
    /**
     * get detail
     * /api/v2/first_mile/get_detail (GET)
     */
    getDetail(params: GetDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetDetailResponse>>;
    /**
     * get tracking number list
     * /api/v2/first_mile/get_tracking_number_list (GET)
     */
    getTrackingNumberList(params: GetTrackingNumberListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTrackingNumberListResponse>>;
    /**
     * get transit warehouse list
     * /api/v2/first_mile/get_transit_warehouse_list (GET)
     */
    getTransitWarehouseList(params: GetTransitWarehouseListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTransitWarehouseListResponse>>;
    /**
     * get unbind order list
     * /api/v2/first_mile/get_unbind_order_list (GET)
     */
    getUnbindOrderList(params: GetUnbindOrderListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetUnbindOrderListResponse>>;
    /**
     * get waybill
     * /api/v2/first_mile/get_waybill (POST)
     */
    getWaybill(params: GetWaybillRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetWaybillResponse>>;
    /**
     * unbind first mile tracking number
     * /api/v2/first_mile/unbind_first_mile_tracking_number (POST)
     */
    unbindFirstMileTrackingNumber(params: UnbindFirstMileTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UnbindFirstMileTrackingNumberResponse>>;
    /**
     * unbind first mile tracking number all
     * /api/v2/first_mile/unbind_first_mile_tracking_number_all (POST)
     */
    unbindFirstMileTrackingNumberAll(params: UnbindFirstMileTrackingNumberAllRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UnbindFirstMileTrackingNumberAllResponse>>;
}
