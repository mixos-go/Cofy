import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface GSFullServiceQueryVirtualInventoryRequest {
}
export interface GSFullServiceQueryVirtualInventoryBody {
    "skus"?: Array<string>;
}
export interface GSFullServiceQueryVirtualInventoryResponse {
    "code"?: number;
    "data"?: {
        "inventory"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GSFullServiceUpdateVirtualInventoryRequest {
}
export interface GSFullServiceUpdateVirtualInventoryBody {
    "skus"?: Array<Record<string, unknown>>;
}
export interface GSFullServiceUpdateVirtualInventoryResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface QueryGlobalSellingVirtualInventoryRequest {
}
export interface QueryGlobalSellingVirtualInventoryBody {
    "skus"?: Array<string>;
    "supplier_id"?: string;
}
export interface QueryGlobalSellingVirtualInventoryResponse {
    "code"?: number;
    "data"?: {
        "inventory"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SetGlobalSellingVirtualInventoryRequest {
}
export interface SetGlobalSellingVirtualInventoryBody {
    "skus"?: Array<Record<string, unknown>>;
    "supplier_id"?: string;
}
export interface SetGlobalSellingVirtualInventoryResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokGsFullServiceInventoryApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * GSFullServiceQueryVirtualInventory
     * /gs_full_service_inventory/202405/beta/virtual_inventory/query (POST)
     */
    gSFullServiceQueryVirtualInventory(params: GSFullServiceQueryVirtualInventoryRequest, body?: GSFullServiceQueryVirtualInventoryBody, opts?: TikTokRequestOptions): Promise<GSFullServiceQueryVirtualInventoryResponse>;
    /**
     * GSFullServiceUpdateVirtualInventory
     * /gs_full_service_inventory/202405/beta/virtual_inventory/update (POST)
     */
    gSFullServiceUpdateVirtualInventory(params: GSFullServiceUpdateVirtualInventoryRequest, body?: GSFullServiceUpdateVirtualInventoryBody, opts?: TikTokRequestOptions): Promise<GSFullServiceUpdateVirtualInventoryResponse>;
    /**
     * QueryGlobalSellingVirtualInventory
     * /gs_full_service_inventory/202404/preview/virtual_inventory/query (POST)
     */
    queryGlobalSellingVirtualInventory(params: QueryGlobalSellingVirtualInventoryRequest, body?: QueryGlobalSellingVirtualInventoryBody, opts?: TikTokRequestOptions): Promise<QueryGlobalSellingVirtualInventoryResponse>;
    /**
     * SetGlobalSellingVirtualInventory
     * /gs_full_service_inventory/202404/preview/virtual_inventory/update (POST)
     */
    setGlobalSellingVirtualInventory(params: SetGlobalSellingVirtualInventoryRequest, body?: SetGlobalSellingVirtualInventoryBody, opts?: TikTokRequestOptions): Promise<SetGlobalSellingVirtualInventoryResponse>;
}
