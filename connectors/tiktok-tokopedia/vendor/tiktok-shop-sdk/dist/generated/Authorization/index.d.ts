import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface DeauthorizeShopRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get by API [Get Authorization Shop](https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9?external_id=650 */
    "shop_cipher": string;
}
export interface DeauthorizeShopResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface GetAuthorizedCategoryAssetsRequest {
}
export interface GetAuthorizedCategoryAssetsResponse {
    "code"?: number;
    "data"?: {
        "category_assets"?: Array<{
            "category"?: {
                "id"?: number;
                "name"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetAuthorizedShopsRequest {
}
export interface GetAuthorizedShopsResponse {
    "code"?: number;
    "data"?: {
        "shops"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetWidgetTokenRequest {
    /** shopID is not needed */
    "shop_id"?: number;
}
export interface GetWidgetTokenResponse {
    "code"?: number;
    "data"?: {
        "widget_token"?: {
            "expire_at"?: number;
            "token"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokAuthorizationApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * DeauthorizeShop
     * /authorization/202403/shops (DELETE)
     */
    deauthorizeShop(params: DeauthorizeShopRequest, opts?: TikTokRequestOptions): Promise<DeauthorizeShopResponse>;
    /**
     * GetAuthorizedCategoryAssets
     * /authorization/202405/category_assets (GET)
     */
    getAuthorizedCategoryAssets(params: GetAuthorizedCategoryAssetsRequest, opts?: TikTokRequestOptions): Promise<GetAuthorizedCategoryAssetsResponse>;
    /**
     * GetAuthorizedShops
     * /authorization/202309/shops (GET)
     */
    getAuthorizedShops(params: GetAuthorizedShopsRequest, opts?: TikTokRequestOptions): Promise<GetAuthorizedShopsResponse>;
    /**
     * GetWidgetToken
     * /authorization/202401/widget_token (GET)
     */
    getWidgetToken(params: GetWidgetTokenRequest, opts?: TikTokRequestOptions): Promise<GetWidgetTokenResponse>;
}
