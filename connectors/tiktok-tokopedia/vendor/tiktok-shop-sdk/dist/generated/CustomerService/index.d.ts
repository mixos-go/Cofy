import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface CreateConversationRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateConversationBody {
    "buyer_user_id"?: string;
}
export interface CreateConversationResponse {
    "code"?: number;
    "data"?: {
        "conversation_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetAgentSettingsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetAgentSettingsResponse {
    "code"?: number;
    "data"?: {
        "can_accept_chat"?: boolean;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetConversationRequest {
    /** Conversation ID (path) */
    "conversation_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetConversationResponse {
    "code"?: number;
    "data"?: {
        "conversation"?: {
            "create_time"?: number;
            "id"?: string;
            "participant_count"?: number;
            "participants"?: Array<Record<string, unknown>>;
            "unread_count"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetConversationMessagesRequest {
    /** Conversation ID (path) */
    "conversation_id": string;
    /** Paging cursor, this means where this query should start. For the next page, use "next_page_token" in response. */
    "page_token"?: string;
    /** Number of conversations in one page Max 10. */
    "page_size": number;
    /** System message's display language. The messages sent by System will be returned in the setting language; The messages sent by the buyer, the shop, the CS agent will not be affected. The default value is en (English). Possible enumerations: - de-DE (German, Germany) - en (English) - en-GB (English, U */
    "locale"?: string;
    /** Sort order. Possible enumerations: - DESC(default) - ASC */
    "sort_order"?: string;
    /** Sort messages by one of the following properties: - create_time (default) - index */
    "sort_field"?: string;
    /** Need message.data */
    "need_data"?: boolean;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetConversationMessagesResponse {
    "code"?: number;
    "data"?: {
        "messages"?: Array<{
            "sender"?: {
                "avatar"?: string;
                "im_user_id"?: string;
                "nickname"?: string;
                "role"?: string;
            };
        }>;
        "next_page_token"?: string;
        "unsupported_msg_tips"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetConversationsRequest {
    /** Paging cursor, this means where this query should start. For the next page, use "next_page_token" in response. */
    "page_token"?: string;
    /** Number of conversations on one page Max 20. */
    "page_size": number;
    /** System message's display language. The messages sent by System will be returned in the setting language; The messages sent by the buyer, the shop, the CS agent will not be affected. The default value is en (English). Possible enumerations: - de-DE (German, Germany) - en (English) - en-GB (English, U */
    "locale"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetConversationsResponse {
    "code"?: number;
    "data"?: {
        "conversations"?: Array<{
            "latest_message"?: {
                "content"?: string;
                "create_time"?: number;
                "id"?: string;
                "index"?: string;
                "is_visible"?: boolean;
                "sender"?: {
                    "avatar"?: string;
                    "im_user_id"?: string;
                    "nickname"?: string;
                    "role"?: string;
                };
                "type"?: string;
            };
        }>;
        "next_page_token"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCustomerServicePerformanceRequest {
    /** The start date (YYYY-MM-DD) of the period for selecting chat support sessions to be included in the performance evaluation. */
    "support_date_ge": string;
    /** The end date (YYYY-MM-DD) of the period for selecting chat support sessions to be included in the performance evaluation. */
    "support_date_lt": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get by API [Get Authorization Shop](https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9?external_id=650 */
    "shop_cipher": string;
}
export interface GetCustomerServicePerformanceResponse {
    "code"?: number;
    "data"?: {
        "performance"?: {
            "response_percentage"?: string;
            "response_time_mins"?: string;
            "satisfaction_percentage"?: string;
            "support_session_count"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ReadMessageRequest {
    /** (path) */
    "conversation_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ReadMessageResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface SendMessageRequest {
    /** Conversation ID (path) */
    "conversation_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SendMessageBody {
    "content"?: string;
    "type"?: string;
}
export interface SendMessageResponse {
    "code"?: number;
    "data"?: {
        "message_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateAgentSettingsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdateAgentSettingsBody {
    "can_accept_chat"?: boolean;
}
export interface UpdateAgentSettingsResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UploadBuyerMessagesImageRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UploadBuyerMessagesImageResponse {
    "code"?: number;
    "data"?: {
        "height"?: number;
        "url"?: string;
        "width"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokCustomerServiceApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * CreateConversation
     * /customer_service/202309/conversations (POST)
     */
    createConversation(params: CreateConversationRequest, body?: CreateConversationBody, opts?: TikTokRequestOptions): Promise<CreateConversationResponse>;
    /**
     * GetAgentSettings
     * /customer_service/202309/agents/settings (GET)
     */
    getAgentSettings(params: GetAgentSettingsRequest, opts?: TikTokRequestOptions): Promise<GetAgentSettingsResponse>;
    /**
     * GetConversation
     * /customer_service/202601/conversations/{conversation_id} (GET)
     */
    getConversation(params: GetConversationRequest, opts?: TikTokRequestOptions): Promise<GetConversationResponse>;
    /**
     * GetConversationMessages
     * /customer_service/202309/conversations/{conversation_id}/messages (GET)
     */
    getConversationMessages(params: GetConversationMessagesRequest, opts?: TikTokRequestOptions): Promise<GetConversationMessagesResponse>;
    /**
     * GetConversations
     * /customer_service/202309/conversations (GET)
     */
    getConversations(params: GetConversationsRequest, opts?: TikTokRequestOptions): Promise<GetConversationsResponse>;
    /**
     * GetCustomerServicePerformance
     * /customer_service/202407/performance (GET)
     */
    getCustomerServicePerformance(params: GetCustomerServicePerformanceRequest, opts?: TikTokRequestOptions): Promise<GetCustomerServicePerformanceResponse>;
    /**
     * ReadMessage
     * /customer_service/202309/conversations/{conversation_id}/messages/read (POST)
     */
    readMessage(params: ReadMessageRequest, opts?: TikTokRequestOptions): Promise<ReadMessageResponse>;
    /**
     * SendMessage
     * /customer_service/202309/conversations/{conversation_id}/messages (POST)
     */
    sendMessage(params: SendMessageRequest, body?: SendMessageBody, opts?: TikTokRequestOptions): Promise<SendMessageResponse>;
    /**
     * UpdateAgentSettings
     * /customer_service/202309/agents/settings (PUT)
     */
    updateAgentSettings(params: UpdateAgentSettingsRequest, body?: UpdateAgentSettingsBody, opts?: TikTokRequestOptions): Promise<UpdateAgentSettingsResponse>;
    /**
     * UploadBuyerMessagesImage
     * /customer_service/202309/images/upload (POST)
     */
    uploadBuyerMessagesImage(params: UploadBuyerMessagesImageRequest, opts?: TikTokRequestOptions): Promise<UploadBuyerMessagesImageResponse>;
}
