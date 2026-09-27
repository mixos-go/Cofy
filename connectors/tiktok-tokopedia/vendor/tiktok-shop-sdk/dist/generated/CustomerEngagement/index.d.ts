import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface CreateCustomEngagementTaskRequest {
    /** A unique key to recognize a request and prevent duplicate processing of the same request, especially in cases of connection issues. Ensure this key is unique for each request to avoid accidental duplicates. Note: We recommend that you generate v4 UUIDs for use as keys. */
    "idempotency_key": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateCustomEngagementTaskBody {
    "channel"?: string;
    "coupon_ids"?: Array<string>;
    "custom_message"?: {
        "body"?: string;
        "title"?: string;
    };
    "end_time"?: number;
    "product_ids"?: Array<string>;
    "task_name"?: string;
}
export interface CreateCustomEngagementTaskResponse {
    "code"?: number;
    "data"?: {
        "task_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateEngagementTaskRequest {
    /** A unique key to recognize a request and prevent duplicate processing of the same request, especially in cases of connection issues. Ensure this key is unique for each request to avoid accidental duplicates. **Note**: We recommend that you generate v4 UUIDs for use as keys. */
    "idempotency_key": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateEngagementTaskBody {
    "channel"?: string;
    "coupon_ids"?: Array<string>;
    "end_time"?: number;
    "product_ids"?: Array<string>;
    "task_name"?: string;
    "template_id"?: string;
}
export interface CreateEngagementTaskResponse {
    "code"?: number;
    "data"?: {
        "task_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCustomerTabVisibilityRequest {
    /** Shop_cipher is required for cross-border shops, and optional for local shops. It's unique for each shop. Get the this property from the Get Authorized Shop API dynamically. Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API */
    "shop_cipher": string;
}
export interface GetCustomerTabVisibilityResponse {
    "code"?: number;
    "data"?: {
        "is_visible"?: boolean;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetFeaturePermissionsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetFeaturePermissionsResponse {
    "code"?: number;
    "data"?: {
        "features"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetMessageTemplatesRequest {
    /** Shop_cipher is required for cross-border shops, and optional for local shops. It's unique for each shop. Get the this property from the Get Authorized Shop API dynamically. Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API */
    "shop_cipher": string;
    /** The BCP-47 locale codes for displaying the message content, delimited by commas. Default: en-US Refer to [Locale codes](678e3a47bae28f030a8c7523) for the list of supported locale codes. */
    "locale": string;
}
export interface GetMessageTemplatesResponse {
    "code"?: number;
    "data"?: {
        "message_templates"?: Array<{
            "coupon_card_rules"?: {
                "coupon_type"?: Array<string>;
                "max_count"?: number;
                "min_count"?: number;
            };
            "product_card_rules"?: {
                "max_count"?: number;
                "min_count"?: number;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetTaskPerformancesRequest {
    /** Shop_cipher is required for cross-border shops, and optional for local shops. It's unique for each shop. Get the this property from the Get Authorized Shop API dynamically. Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API */
    "shop_cipher": string;
}
export interface GetTaskPerformancesBody {
    "task_ids"?: Array<string>;
}
export interface GetTaskPerformancesResponse {
    "code"?: number;
    "data"?: {
        "task_performances"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SendEngagementMessageRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SendEngagementMessageBody {
    "buyer_emails"?: Array<string>;
    "task_id"?: string;
}
export interface SendEngagementMessageResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "buyer_email"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokCustomerEngagementApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * CreateCustomEngagementTask
     * /customer_engagement/202502/engagement_tasks/custom (POST)
     */
    createCustomEngagementTask(params: CreateCustomEngagementTaskRequest, body?: CreateCustomEngagementTaskBody, opts?: TikTokRequestOptions): Promise<CreateCustomEngagementTaskResponse>;
    /**
     * CreateEngagementTask
     * /customer_engagement/202412/engagement_tasks (POST)
     */
    createEngagementTask(params: CreateEngagementTaskRequest, body?: CreateEngagementTaskBody, opts?: TikTokRequestOptions): Promise<CreateEngagementTaskResponse>;
    /**
     * GetCustomerTabVisibility
     * /customer_engagement/202501/customer_tab/visibility (GET)
     */
    getCustomerTabVisibility(params: GetCustomerTabVisibilityRequest, opts?: TikTokRequestOptions): Promise<GetCustomerTabVisibilityResponse>;
    /**
     * GetFeaturePermissions
     * /customer_engagement/202502/permissions (GET)
     */
    getFeaturePermissions(params: GetFeaturePermissionsRequest, opts?: TikTokRequestOptions): Promise<GetFeaturePermissionsResponse>;
    /**
     * GetMessageTemplates
     * /customer_engagement/202412/message_templates (GET)
     */
    getMessageTemplates(params: GetMessageTemplatesRequest, opts?: TikTokRequestOptions): Promise<GetMessageTemplatesResponse>;
    /**
     * GetTaskPerformances
     * /customer_engagement/202412/performances (POST)
     */
    getTaskPerformances(params: GetTaskPerformancesRequest, body?: GetTaskPerformancesBody, opts?: TikTokRequestOptions): Promise<GetTaskPerformancesResponse>;
    /**
     * SendEngagementMessage
     * /customer_engagement/202412/messages (POST)
     */
    sendEngagementMessage(params: SendEngagementMessageRequest, body?: SendEngagementMessageBody, opts?: TikTokRequestOptions): Promise<SendEngagementMessageResponse>;
}
