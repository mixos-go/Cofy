import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface CancelFBTMCFOrderRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CancelFBTMCFOrderBody {
    "consign_orders"?: Array<Record<string, unknown>>;
    "mcf_order_id"?: string;
}
export interface CancelFBTMCFOrderResponse {
    "code"?: number;
    "data"?: {
        "mcf_order"?: {
            "consign_orders"?: Array<Record<string, unknown>>;
            "external_order_id"?: string;
            "mcf_order_id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateFBTMCFOrderRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateFBTMCFOrderBody {
    "consignee"?: {
        "address"?: {
            "address_line_1"?: string;
            "address_line_2"?: string;
            "city"?: string;
            "country_code"?: string;
            "district_or_county"?: string;
            "postal_code"?: string;
            "state_or_region"?: string;
        };
        "email"?: string;
        "name"?: string;
        "phone_number"?: string;
    };
    "external_order_id"?: string;
    "goods"?: Array<Record<string, unknown>>;
}
export interface CreateFBTMCFOrderResponse {
    "code"?: number;
    "data"?: {
        "mcf_order"?: {
            "create_time"?: number;
            "external_order_id"?: string;
            "mcf_order_id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetFBFMCFOrderStatusRequest {
    /** A unique ID that identifies different MCF orders */
    "mcf_order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetFBFMCFOrderStatusResponse {
    "code"?: number;
    "data"?: {
        "mcf_order"?: {
            "consign_orders"?: Array<{
                "shipping_provider"?: {
                    "id"?: string;
                    "name"?: string;
                };
            }>;
            "create_time"?: number;
            "external_order_id"?: string;
            "mcf_order_id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetFBTMerchantOnboardedRegionsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetFBTMerchantOnboardedRegionsResponse {
    "code"?: number;
    "data"?: {
        "onboarded_regions"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetFBTWarehouseListRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetFBTWarehouseListResponse {
    "code"?: number;
    "data"?: {
        "warehouses"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetInboundOrderRequest {
    /** A list of inbound order IDs needs to be queried. The API will return the inbound order information for these IDs. Note: The inbound ID consists of a series of numbers without the "IBR" prefix. You can get the value in data.inbound_order_id in [Inbound FBT order status change](6708f866a88d1103246fe */
    "ids": Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetInboundOrderResponse {
    "code"?: number;
    "data"?: {
        "inbound_orders"?: Array<{
            "merchant"?: {
                "id"?: string;
                "name"?: string;
            };
            "warehouse"?: {
                "fbt_warehouse_id"?: string;
                "name"?: string;
                "type"?: string;
                "warehouse_ids"?: Array<string>;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface QueryGoodsInventoryForMCFRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface QueryGoodsInventoryForMCFBody {
    "goods"?: Array<Record<string, unknown>>;
}
export interface QueryGoodsInventoryForMCFResponse {
    "code"?: number;
    "data"?: {
        "goods_inventory_list"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchFBTInventoryRequest {
    /** The number of results to be returned per page. Valid range: [1-100]. */
    "page_size": number;
    /** Pagination page token. It should be empty for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchFBTInventoryBody {
    "fbt_warehouse_ids"?: Array<string>;
    "goods_ids"?: Array<string>;
    "sku_ids"?: Array<string>;
}
export interface SearchFBTInventoryResponse {
    "code"?: number;
    "data"?: {
        "inventory"?: Array<{
            "goods"?: {
                "id"?: string;
                "name"?: string;
                "reference_code"?: string;
                "skus"?: Array<{
                    "on_hand_detail"?: {
                        "available_quantity"?: number;
                        "reserved_quantity"?: number;
                        "total_quantity"?: number;
                    };
                }>;
            };
            "on_hand_detail"?: {
                "available_quantity"?: number;
                "reserved_quantity"?: number;
                "total_quantity"?: number;
                "unfulfillable_quantity"?: number;
            };
        }>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchFBTInventoryRecordRequest {
    /** The number of results to be returned per page. Valid range: [1-100]. */
    "page_size": number;
    /** Pagination page token. It should be empty for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchFBTInventoryRecordBody {
    "create_time_ge"?: number;
    "create_time_le"?: number;
    "fbt_warehouse_ids"?: Array<string>;
    "goods_ids"?: Array<string>;
}
export interface SearchFBTInventoryRecordResponse {
    "code"?: number;
    "data"?: {
        "inventory_records"?: Array<{
            "goods"?: {
                "id"?: string;
                "name"?: string;
                "reference_code"?: string;
            };
            "order"?: {
                "id"?: string;
                "type"?: string;
            };
        }>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchGoodsInfoRequest {
    /** The number of results to be returned per page. Valid range: [1-100]. */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchGoodsInfoBody {
    "goods_ids"?: Array<string>;
    "product_ids"?: Array<string>;
    "reference_codes"?: Array<string>;
    "sku_ids"?: Array<string>;
}
export interface SearchGoodsInfoResponse {
    "code"?: number;
    "data"?: {
        "goods"?: Array<{
            "lot_expiration_info"?: {
                "addresses"?: {
                    "address_line_1"?: string;
                    "address_line_2"?: string;
                    "address_line_3"?: string;
                    "city"?: string;
                    "district"?: string;
                    "name"?: string;
                    "phone_number"?: string;
                    "postal_code"?: string;
                    "region_code"?: string;
                    "state"?: string;
                };
                "expiration_alert_days"?: number;
                "handling_method"?: string;
                "inbound_cutoff_days"?: number;
                "is_expiration_management"?: boolean;
                "is_lot_control"?: boolean;
                "return_cycle"?: string;
                "sales_cutoff_days"?: number;
                "shelf_life_days"?: number;
            };
            "merchant_declaration_info"?: {
                "dimension"?: {
                    "height"?: string;
                    "length"?: string;
                    "unit"?: string;
                    "width"?: string;
                };
                "weight"?: {
                    "unit"?: string;
                    "value"?: string;
                };
            };
            "skus"?: {
                "product"?: {
                    "id"?: string;
                    "image_url"?: string;
                    "name"?: string;
                };
            };
            "warehouse_confirmation_info"?: {
                "dimension"?: {
                    "height"?: string;
                    "length"?: string;
                    "unit"?: string;
                    "width"?: string;
                };
                "weight"?: {
                    "unit"?: string;
                    "value"?: string;
                };
            };
        }>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetfbtmerchantmcfstatusRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetfbtmerchantmcfstatusResponse {
    "code"?: number;
    "data"?: {
        "mcf_status"?: {
            "is_mcf"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokFbtApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * CancelFBTMCFOrder
     * /fbt/202601/mcf_outbound_orders/cancel (POST)
     */
    cancelFBTMCFOrder(params: CancelFBTMCFOrderRequest, body?: CancelFBTMCFOrderBody, opts?: TikTokRequestOptions): Promise<CancelFBTMCFOrderResponse>;
    /**
     * CreateFBTMCFOrder
     * /fbt/202601/mcf_outbound_orders (POST)
     */
    createFBTMCFOrder(params: CreateFBTMCFOrderRequest, body?: CreateFBTMCFOrderBody, opts?: TikTokRequestOptions): Promise<CreateFBTMCFOrderResponse>;
    /**
     * GetFBFMCFOrderStatus
     * /fbt/202601/mcf_outbound_orders (GET)
     */
    getFBFMCFOrderStatus(params: GetFBFMCFOrderStatusRequest, opts?: TikTokRequestOptions): Promise<GetFBFMCFOrderStatusResponse>;
    /**
     * GetFBTMerchantOnboardedRegions
     * /fbt/202409/merchants/onboarded_regions (GET)
     */
    getFBTMerchantOnboardedRegions(params: GetFBTMerchantOnboardedRegionsRequest, opts?: TikTokRequestOptions): Promise<GetFBTMerchantOnboardedRegionsResponse>;
    /**
     * GetFBTWarehouseList
     * /fbt/202408/warehouses (GET)
     */
    getFBTWarehouseList(params: GetFBTWarehouseListRequest, opts?: TikTokRequestOptions): Promise<GetFBTWarehouseListResponse>;
    /**
     * GetInboundOrder
     * /fbt/202409/inbound_orders (GET)
     */
    getInboundOrder(params: GetInboundOrderRequest, opts?: TikTokRequestOptions): Promise<GetInboundOrderResponse>;
    /**
     * QueryGoodsInventoryForMCF
     * /fbt/202601/mcf/goods/inventory/search (POST)
     */
    queryGoodsInventoryForMCF(params: QueryGoodsInventoryForMCFRequest, body?: QueryGoodsInventoryForMCFBody, opts?: TikTokRequestOptions): Promise<QueryGoodsInventoryForMCFResponse>;
    /**
     * SearchFBTInventory
     * /fbt/202408/inventory/search (POST)
     */
    searchFBTInventory(params: SearchFBTInventoryRequest, body?: SearchFBTInventoryBody, opts?: TikTokRequestOptions): Promise<SearchFBTInventoryResponse>;
    /**
     * SearchFBTInventoryRecord
     * /fbt/202410/inventory_records/search (POST)
     */
    searchFBTInventoryRecord(params: SearchFBTInventoryRecordRequest, body?: SearchFBTInventoryRecordBody, opts?: TikTokRequestOptions): Promise<SearchFBTInventoryRecordResponse>;
    /**
     * SearchGoodsInfo
     * /fbt/202409/goods/search (POST)
     */
    searchGoodsInfo(params: SearchGoodsInfoRequest, body?: SearchGoodsInfoBody, opts?: TikTokRequestOptions): Promise<SearchGoodsInfoResponse>;
    /**
     * getfbtmerchantmcfstatus
     * /fbt/202601/merchants/mcf_status (GET)
     */
    getfbtmerchantmcfstatus(params: GetfbtmerchantmcfstatusRequest, opts?: TikTokRequestOptions): Promise<GetfbtmerchantmcfstatusResponse>;
}
