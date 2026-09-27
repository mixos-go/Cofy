import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface GetAuthorisedResellerBrandRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 30. Example: 10 */
    "page_size": number;
}
export interface GetAuthorisedResellerBrandResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "authorised_brand_list"?: Array<{
            "brand_id"?: number;
            "brand_name"?: string;
        }>;
        "is_authorised_reseller"?: boolean;
        "more"?: boolean;
        "total_count"?: number;
    };
}
export interface GetBrShopOnboardingInfoRequest {
}
export interface GetBrShopOnboardingInfoResponse {
    "response"?: {
        "billing_address": {
            "address"?: string;
            "city"?: string;
            "name"?: string;
            "neighborhood"?: string;
            "phone"?: string;
            "state"?: string;
            "zipcode"?: string;
        };
        "cnae_main"?: string;
        "cnae_secondary"?: string;
        "cnpj_id"?: string;
        "legal_entity_name"?: string;
        "mei_check"?: string;
        "onboarding_passed"?: boolean;
        "onboarding_status"?: number;
        "state_registration"?: string;
        "submission_time"?: number;
        "tax_id"?: string;
        "tax_id_type"?: number;
    };
    "request_id"?: string;
}
export interface GetProfileRequest {
}
export interface GetProfileResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "shop_logo"?: string;
        "description"?: string;
        "shop_name"?: string;
    };
    "error"?: string;
}
export interface GetShopHolidayModeRequest {
}
export interface GetShopHolidayModeResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "holiday_mode_on"?: boolean;
        "holiday_mode_mtime"?: number;
        "holiday_mode_type"?: number;
        "holiday_mode_start_time"?: number;
        "holiday_mode_end_time"?: number;
        "holiday_mode_description"?: string;
        "debug_msg"?: string;
    };
}
export interface GetShopInfoRequest {
}
export interface GetShopInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "auth_time"?: number;
    "expire_time"?: number;
    "shop_name"?: string;
    "region"?: string;
    "status"?: string;
    "shop_fulfillment_flag"?: string;
    "is_cb"?: boolean;
    "is_upgraded_cbsc"?: boolean;
    "merchant_id"?: null;
    "is_sip"?: boolean;
    "sip_affi_shops"?: unknown[];
    "is_main_shop"?: boolean;
    "is_direct_shop"?: boolean;
    "linked_direct_shop_list"?: Array<{
        "direct_shop_id"?: number;
        "direct_shop_region"?: string;
    }>;
    "linked_main_shop_id"?: number;
}
export interface GetShopNotificationRequest {
    /** The last notification_id returned on the page. When using the cursor, notifications will start with the one following this cursor notification. If no cursor is provided, the latest message from the shop will be returned. Example: 1 */
    "cursor"?: number;
    /** Default 10; maximum 50 Example: 1 */
    "page_size"?: number;
}
export interface GetShopNotificationResponse {
    "cursor"?: number;
    "data"?: {
        "create_time"?: number;
        "content"?: string;
        "title"?: string;
        "url"?: string;
    };
}
export interface GetWarehouseDetailRequest {
    /** Type of warehouse. Applicable values: - 1: Pickup Warehouse - 2: Return Warehouse Default value is 1 (Pickup Warehouse) Example: 1 */
    "warehouse_type"?: number;
}
export interface GetWarehouseDetailResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: Array<{
        "warehouse_id"?: number;
        "warehouse_name"?: string;
        "warehouse_type"?: number;
        "location_id"?: string;
        "address_id"?: number;
        "region"?: string;
        "state"?: string;
        "city"?: string;
        "district"?: string;
        "town"?: string;
        "address"?: string;
        "zipcode"?: string;
        "state_code"?: string;
        "holiday_mode_state"?: number;
    }>;
}
export interface SetShopHolidayModeRequest {
    "holiday_mode_on": boolean;
    "holiday_mode_type"?: number;
    "holiday_mode_start_time"?: number;
    "holiday_mode_end_time"?: number;
    "holiday_mode_description"?: string;
}
export interface SetShopHolidayModeResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "debug_msg"?: string;
    };
}
export interface UpdateProfileRequest {
    "shop_logo"?: string;
    "description"?: string;
    "shop_name"?: string;
}
export interface UpdateProfileResponse {
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    "error"?: string;
}
export declare class ShopeeShopApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * get authorised reseller brand
     * /api/v2/shop/get_authorised_reseller_brand (GET)
     */
    getAuthorisedResellerBrand(params: GetAuthorisedResellerBrandRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAuthorisedResellerBrandResponse>>;
    /**
     * get br shop onboarding info
     * /api/v2/shop/get_br_shop_onboarding_info (GET)
     */
    getBrShopOnboardingInfo(params: GetBrShopOnboardingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBrShopOnboardingInfoResponse>>;
    /**
     * get profile
     * /api/v2/shop/get_profile (GET)
     */
    getProfile(params: GetProfileRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetProfileResponse>>;
    /**
     * get shop holiday mode
     * /api/v2/shop/get_shop_holiday_mode (GET)
     */
    getShopHolidayMode(params: GetShopHolidayModeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopHolidayModeResponse>>;
    /**
     * get shop info
     * /api/v2/shop/get_shop_info (GET)
     */
    getShopInfo(params: GetShopInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopInfoResponse>>;
    /**
     * get shop notification
     * /api/v2/shop/get_shop_notification (GET)
     */
    getShopNotification(params: GetShopNotificationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopNotificationResponse>>;
    /**
     * get warehouse detail
     * /api/v2/shop/get_warehouse_detail (GET)
     */
    getWarehouseDetail(params: GetWarehouseDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetWarehouseDetailResponse>>;
    /**
     * set shop holiday mode
     * /api/v2/shop/set_shop_holiday_mode (POST)
     */
    setShopHolidayMode(params: SetShopHolidayModeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetShopHolidayModeResponse>>;
    /**
     * update profile
     * /api/v2/shop/update_profile (POST)
     */
    updateProfile(params: UpdateProfileRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateProfileResponse>>;
}
