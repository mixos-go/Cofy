import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface DeleteShopWebhookRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface DeleteShopWebhookBody {
    "event_type"?: string;
}
export interface DeleteShopWebhookResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface GetShopWebhooksRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetShopWebhooksResponse {
    "code"?: number;
    "data"?: {
        "total_count"?: number;
        "webhooks"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateShopWebhookRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdateShopWebhookBody {
    "address"?: string;
    "event_type"?: string;
}
export interface UpdateShopWebhookResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokEventApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * DeleteShopWebhook
     * /event/202309/webhooks (DELETE)
     */
    deleteShopWebhook(params: DeleteShopWebhookRequest, body?: DeleteShopWebhookBody, opts?: TikTokRequestOptions): Promise<DeleteShopWebhookResponse>;
    /**
     * GetShopWebhooks
     * /event/202309/webhooks (GET)
     */
    getShopWebhooks(params: GetShopWebhooksRequest, opts?: TikTokRequestOptions): Promise<GetShopWebhooksResponse>;
    /**
     * UpdateShopWebhook
     * /event/202309/webhooks (PUT)
     */
    updateShopWebhook(params: UpdateShopWebhookRequest, body?: UpdateShopWebhookBody, opts?: TikTokRequestOptions): Promise<UpdateShopWebhookResponse>;
}
