import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface ConfirmConsumedLostPushMessageRequest {
    "last_message_id": number;
}
export interface ConfirmConsumedLostPushMessageResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface GetAppPushConfigRequest {
}
export interface GetAppPushConfigResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "callback_url"?: string;
        "live_push_status"?: string;
        "suspended_time"?: number;
        "blocked_shop_id"?: Array<number>;
        "push_config_on_list"?: Array<number>;
        "push_config_off_list"?: Array<number>;
    };
}
export interface GetLostPushMessageRequest {
}
export interface GetLostPushMessageResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "push_message_list"?: Array<{
            "shop_id"?: number;
            "code"?: number;
            "timestamp"?: number;
            "data"?: string;
        }>;
        "has_next_page"?: boolean;
        "last_message_id"?: number;
    };
}
export interface SetAppPushConfigRequest {
    "callback_url"?: string;
    "set_push_config_on"?: Array<number>;
    "set_push_config_off"?: Array<number>;
    "blocked_shop_id_list"?: Array<number>;
}
export interface SetAppPushConfigResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "result"?: string;
    };
}
export declare class ShopeePushApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * confirm consumed lost push message
     * /api/v2/push/confirm_consumed_lost_push_message (POST)
     */
    confirmConsumedLostPushMessage(params: ConfirmConsumedLostPushMessageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ConfirmConsumedLostPushMessageResponse>>;
    /**
     * get app push config
     * /api/v2/push/get_app_push_config (GET)
     */
    getAppPushConfig(params: GetAppPushConfigRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAppPushConfigResponse>>;
    /**
     * get lost push message
     * /api/v2/push/get_lost_push_message (GET)
     */
    getLostPushMessage(params: GetLostPushMessageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetLostPushMessageResponse>>;
    /**
     * set app push config
     * /api/v2/push/set_app_push_config (POST)
     */
    setAppPushConfig(params: SetAppPushConfigRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetAppPushConfigResponse>>;
}
