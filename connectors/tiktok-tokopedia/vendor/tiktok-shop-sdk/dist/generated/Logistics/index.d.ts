import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface CreateWarehouseRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateWarehouseBody {
    "warehouse"?: {
        "address"?: {
            "address_line_1"?: string;
            "address_line_2"?: string;
            "address_line_3"?: string;
            "address_line_4"?: string;
            "city"?: string;
            "district"?: string;
            "postcode"?: string;
            "region"?: string;
            "state"?: string;
        };
        "contact_person"?: string;
        "cover_address_detail"?: Array<Record<string, unknown>>;
        "cover_region_code"?: string;
        "default_warehouse"?: boolean;
        "external_warehouse_id"?: string;
        "first_name"?: string;
        "first_name_local_script"?: string;
        "last_name"?: string;
        "last_name_local_script"?: string;
        "name"?: string;
        "phone_number"?: string;
        "type"?: string;
    };
}
export interface CreateWarehouseResponse {
    "code"?: number;
    "data"?: {
        "error_list"?: Array<Record<string, unknown>>;
        "warehouse_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetAvailableShippingTemplateRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetAvailableShippingTemplateBody {
    "product_attribute"?: {
        "dimension"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: number;
            "width"?: string;
        };
        "weight"?: {
            "unit"?: number;
            "weight"?: string;
        };
    };
}
export interface GetAvailableShippingTemplateResponse {
    "code"?: number;
    "data"?: {
        "templates"?: Array<{
            "template"?: {
                "is_default"?: boolean;
                "template_id"?: string;
                "template_name"?: string;
                "template_party"?: number;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalSellerWarehouseRequest {
}
export interface GetGlobalSellerWarehouseResponse {
    "code"?: number;
    "data"?: {
        "global_warehouses"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShippingProvidersRequest {
    /** The specific delivery option identifier for getting the shipping provider list. (path) */
    "delivery_option_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetShippingProvidersResponse {
    "code"?: number;
    "data"?: {
        "shipping_providers"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetWarehouseDeliveryOptionsRequest {
    /** The warehouse ID. (path) */
    "warehouse_id": string;
    /** Specify the scope of delivery options to retrieve. - WAREHOUSE: Returns all delivery options currently active for the warehouse. By default, orders will be shipped based on these options. - PRODUCT: Returns the delivery options that can be assigned directly to a product. Use this if you want to */
    "scope"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetWarehouseDeliveryOptionsResponse {
    "code"?: number;
    "data"?: {
        "delivery_options"?: Array<{
            "dimension_limit"?: {
                "max_height"?: number;
                "max_length"?: number;
                "max_width"?: number;
                "unit"?: string;
            };
            "weight_limit"?: {
                "max_weight"?: number;
                "min_weight"?: number;
                "unit"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetWarehouseListRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetWarehouseListResponse {
    "code"?: number;
    "data"?: {
        "warehouses"?: Array<{
            "address"?: {
                "address_line1"?: string;
                "address_line2"?: string;
                "address_line3"?: string;
                "address_line4"?: string;
                "city"?: string;
                "contact_person"?: string;
                "distict"?: string;
                "first_name"?: string;
                "first_name_local_script"?: string;
                "full_address"?: string;
                "geolocation"?: {
                    "latitude"?: string;
                    "longitude"?: string;
                };
                "last_name"?: string;
                "last_name_local_script"?: string;
                "phone_number"?: string;
                "postal_code"?: string;
                "region"?: string;
                "region_code"?: string;
                "state"?: string;
                "town"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface StandardizeWarehouseAddressRequest {
    /** Shop_cipher is required for cross-border shops, and optional for local shops. It's unique for each shop. Get the this property from the Get Authorized Shop API dynamically. Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API */
    "shop_cipher": string;
}
export interface StandardizeWarehouseAddressBody {
    "address"?: {
        "address_line1"?: string;
        "address_line2"?: string;
        "city"?: string;
        "district"?: string;
        "postal_code"?: string;
        "region_code"?: string;
        "state"?: string;
        "town"?: string;
    };
}
export interface StandardizeWarehouseAddressResponse {
    "code"?: number;
    "data"?: {
        "standardization_result"?: {
            "standardized_address"?: {
                "address_line1"?: string;
                "address_line2"?: string;
                "city"?: string;
                "district"?: string;
                "postal_code"?: string;
                "region_code"?: string;
                "state"?: string;
                "town"?: string;
            };
            "updated"?: boolean;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateWarehouseRequest {
    /** The warehouse ID, a unique and immutable primary key, used for all warehouse logistics. (path) */
    "warehouse_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdateWarehouseBody {
    "warehouse"?: {
        "address"?: {
            "address_line_1"?: string;
            "address_line_2"?: string;
            "address_line_3"?: string;
            "address_line_4"?: string;
            "city"?: string;
            "district"?: string;
            "postcode"?: string;
            "region"?: string;
            "state"?: string;
        };
        "contact_person"?: string;
        "cover_address_detail"?: Array<Record<string, unknown>>;
        "cover_region_code"?: string;
        "default_warehouse"?: boolean;
        "external_warehouse_id"?: string;
        "first_name"?: string;
        "first_name_local_script"?: string;
        "last_name"?: string;
        "last_name_local_script"?: string;
        "name"?: string;
        "phone_number"?: string;
        "type"?: string;
    };
}
export interface UpdateWarehouseResponse {
    "code"?: number;
    "data"?: {
        "error_list"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokLogisticsApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * CreateWarehouse
     * /logistics/202502/warehouses (POST)
     */
    createWarehouse(params: CreateWarehouseRequest, body?: CreateWarehouseBody, opts?: TikTokRequestOptions): Promise<CreateWarehouseResponse>;
    /**
     * GetAvailableShippingTemplate
     * /logistics/202510/seller_templates (GET)
     */
    getAvailableShippingTemplate(params: GetAvailableShippingTemplateRequest, body?: GetAvailableShippingTemplateBody, opts?: TikTokRequestOptions): Promise<GetAvailableShippingTemplateResponse>;
    /**
     * GetGlobalSellerWarehouse
     * /logistics/202309/global_warehouses (GET)
     */
    getGlobalSellerWarehouse(params: GetGlobalSellerWarehouseRequest, opts?: TikTokRequestOptions): Promise<GetGlobalSellerWarehouseResponse>;
    /**
     * GetShippingProviders
     * /logistics/202309/delivery_options/{delivery_option_id}/shipping_providers (GET)
     */
    getShippingProviders(params: GetShippingProvidersRequest, opts?: TikTokRequestOptions): Promise<GetShippingProvidersResponse>;
    /**
     * GetWarehouseDeliveryOptions
     * /logistics/202309/warehouses/{warehouse_id}/delivery_options (GET)
     */
    getWarehouseDeliveryOptions(params: GetWarehouseDeliveryOptionsRequest, opts?: TikTokRequestOptions): Promise<GetWarehouseDeliveryOptionsResponse>;
    /**
     * GetWarehouseList
     * /logistics/202309/warehouses (GET)
     */
    getWarehouseList(params: GetWarehouseListRequest, opts?: TikTokRequestOptions): Promise<GetWarehouseListResponse>;
    /**
     * StandardizeWarehouseAddress
     * /logistics/202412/addresses/standardize (POST)
     */
    standardizeWarehouseAddress(params: StandardizeWarehouseAddressRequest, body?: StandardizeWarehouseAddressBody, opts?: TikTokRequestOptions): Promise<StandardizeWarehouseAddressResponse>;
    /**
     * UpdateWarehouse
     * /logistics/202502/warehouses/{warehouse_id} (POST)
     */
    updateWarehouse(params: UpdateWarehouseRequest, body?: UpdateWarehouseBody, opts?: TikTokRequestOptions): Promise<UpdateWarehouseResponse>;
}
