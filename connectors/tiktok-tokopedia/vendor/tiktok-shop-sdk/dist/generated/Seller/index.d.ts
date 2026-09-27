import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface GetActiveShopsRequest {
}
export interface GetActiveShopsResponse {
    "code"?: number;
    "data"?: {
        "shops"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetSellerPermissionsRequest {
}
export interface GetSellerPermissionsResponse {
    "code"?: number;
    "data"?: {
        "permissions"?: Array<string>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetSellerStatusRequest {
}
export interface GetSellerStatusResponse {
    "code"?: number;
    "data"?: {
        "seller_status_data"?: {
            "partner_channel"?: string;
            "seller_status"?: string;
            "shop_statuses"?: Array<Record<string, unknown>>;
            "tax_form_status"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShopCreatorsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetShopCreatorsResponse {
    "code"?: number;
    "data"?: {
        "shop_creators"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SyncCollectionsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SyncCollectionsBody {
    "collections"?: Array<Record<string, unknown>>;
    "logo_url"?: string;
    "source"?: number;
}
export interface SyncCollectionsResponse {
    "code"?: number;
    "data"?: {
        "failed_info"?: {
            "ids"?: Array<string>;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokSellerApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * GetActiveShops
     * /seller/202309/shops (GET)
     */
    getActiveShops(params: GetActiveShopsRequest, opts?: TikTokRequestOptions): Promise<GetActiveShopsResponse>;
    /**
     * GetSellerPermissions
     * /seller/202309/permissions (GET)
     */
    getSellerPermissions(params: GetSellerPermissionsRequest, opts?: TikTokRequestOptions): Promise<GetSellerPermissionsResponse>;
    /**
     * GetSellerStatus
     * /seller/202508/status (GET)
     */
    getSellerStatus(params: GetSellerStatusRequest, opts?: TikTokRequestOptions): Promise<GetSellerStatusResponse>;
    /**
     * GetShopCreators
     * /seller/202407/shop_creators (GET)
     */
    getShopCreators(params: GetShopCreatorsRequest, opts?: TikTokRequestOptions): Promise<GetShopCreatorsResponse>;
    /**
     * SyncCollections
     * /seller/202508/collections/sync (POST)
     */
    syncCollections(params: SyncCollectionsRequest, body?: SyncCollectionsBody, opts?: TikTokRequestOptions): Promise<SyncCollectionsResponse>;
}
