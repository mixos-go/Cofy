import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddItemListRequest {
    "session_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "shop_id"?: number;
    }>;
}
export interface AddItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface ApplyItemSetRequest {
    "session_id": number;
    "item_set_ids": Array<number>;
}
export interface ApplyItemSetResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface BanUserCommentRequest {
    "session_id": number;
    "ban_user_id": number;
}
export interface BanUserCommentResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface CreateSessionRequest {
    "title": string;
    "description"?: string;
    "cover_image_url": string;
    "is_test"?: boolean;
}
export interface CreateSessionResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "session_id"?: number;
    };
}
export interface DeleteItemListRequest {
    "session_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "shop_id"?: number;
    }>;
}
export interface DeleteItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface DeleteShowItemRequest {
    "session_id": number;
}
export interface DeleteShowItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface EndSessionRequest {
    "session_id": number;
}
export interface EndSessionResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface GetItemCountRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
}
export interface GetItemCountResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_count"?: number;
        "max_item_count"?: number;
    };
}
export interface GetItemListRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item_no"?: number;
            "item_id"?: number;
            "shop_id"?: number;
            "name"?: string;
            "image_url"?: string;
            "price_info": {
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
            };
            "affiliate_info": {
                "commission_rate"?: number;
                "is_campaign"?: boolean;
                "campaign_mcn_name"?: string;
                "campaign_start_time"?: number;
                "campaign_end_time"?: number;
            };
        }>;
    };
}
export interface GetItemSetItemListRequest {
    /** The identifier of the item set. Example: 1 */
    "item_set_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetItemSetItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item_id"?: number;
            "shop_id"?: number;
            "name"?: string;
            "image_url"?: string;
            "price_info": {
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
            };
            "affiliate_info": {
                "commission_rate"?: number;
                "is_campaign"?: boolean;
                "campaign_mcn_name"?: string;
                "campaign_start_time"?: number;
                "campaign_end_time"?: number;
            };
        }>;
    };
}
export interface GetItemSetListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
    /** Search the item set with it's name matching the keyword. Example: set */
    "keyword"?: string;
}
export interface GetItemSetListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item_set_id"?: number;
            "item_set_name"?: string;
            "item_count"?: number;
        }>;
    };
}
export interface GetLatestCommentListRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset"?: number;
}
export interface GetLatestCommentListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "next_offset"?: number;
        "list"?: Array<{
            "comment_id"?: number;
            "content"?: string;
            "timestamp"?: number;
            "user_id"?: number;
            "username"?: string;
        }>;
    };
}
export interface GetLikeItemListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
    /** Search items with name matching this keyword. */
    "keyword"?: string;
}
export interface GetLikeItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item_id"?: number;
            "shop_id"?: number;
            "name"?: string;
            "image_url"?: string;
            "price_info": {
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
            };
            "affiliate_info": {
                "commission_rate"?: number;
                "is_campaign"?: boolean;
                "campaign_mcn_name"?: string;
                "campaign_start_time"?: number;
                "campaign_end_time"?: number;
            };
        }>;
    };
}
export interface GetRecentItemListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetRecentItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item_id"?: number;
            "shop_id"?: number;
            "name"?: string;
            "image_url"?: string;
            "price_info": {
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
            };
            "affiliate_info": {
                "commission_rate"?: number;
                "is_campaign"?: boolean;
                "campaign_mcn_name"?: string;
                "campaign_start_time"?: number;
                "campaign_end_time"?: number;
            };
        }>;
    };
}
export interface GetSessionDetailRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
}
export interface GetSessionDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "session_id"?: number;
        "title"?: string;
        "description"?: string;
        "cover_image_url"?: string;
        "status"?: number;
        "share_url"?: string;
        "is_test"?: boolean;
        "create_time"?: number;
        "update_time"?: number;
        "start_time"?: number;
        "end_time"?: number;
        "stream_url_list": {
            "push_url"?: string;
            "push_key"?: string;
            "play_url"?: string;
            "domain_id"?: number;
        };
    };
}
export interface GetSessionItemMetricRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetSessionItemMetricResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "more"?: boolean;
        "next_offset"?: number;
        "list"?: Array<{
            "item": {
                "item_id"?: number;
                "shop_id"?: number;
                "name"?: string;
                "image_url"?: string;
                "price_info": {
                    "currency"?: string;
                    "current_price"?: number;
                    "original_price"?: number;
                };
            };
            "metric": {
                "item_clicks"?: number;
                "atc"?: number;
                "sold_items"?: number;
            };
        }>;
    };
}
export interface GetSessionMetricRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
}
export interface GetSessionMetricResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "gmv"?: number;
        "atc"?: number;
        "ctr"?: number;
        "co"?: number;
        "orders"?: number;
        "ccu"?: number;
        "engage_ccu_1m"?: number;
        "peak_ccu"?: number;
        "likes"?: number;
        "comments"?: number;
        "shares"?: number;
        "views"?: number;
        "avg_viewing_duration"?: number;
    };
}
export interface GetShowItemRequest {
    /** The identifier of livestream session. Example: 6236215 */
    "session_id": number;
}
export interface GetShowItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "has_show_item"?: boolean;
        "item": {
            "item_no"?: number;
            "item_id"?: number;
            "shop_id"?: number;
            "name"?: string;
            "image_url"?: string;
            "price_info": {
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
            };
        };
    };
}
export interface PostCommentRequest {
    "session_id": number;
    "content": string;
}
export interface PostCommentResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface StartSessionRequest {
    "session_id": number;
    "domain_id": number;
}
export interface StartSessionResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface UnbanUserCommentRequest {
    "session_id": number;
    "unban_user_id": number;
}
export interface UnbanUserCommentResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface UpdateItemListRequest {
    "session_id": number;
    "item_list": Array<{
        "item_id"?: number;
        "shop_id"?: number;
    }>;
}
export interface UpdateItemListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface UpdateSessionRequest {
    "session_id": number;
    "title": string;
    "description"?: string;
    "cover_image_url": string;
    "is_test": boolean;
}
export interface UpdateSessionResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface UpdateShowItemRequest {
    "session_id": number;
    "item_id": number;
    "shop_id": number;
}
export interface UpdateShowItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: Record<string, unknown>;
}
export interface UploadImageRequest {
    "image": string;
}
export interface UploadImageResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "image_url"?: string;
    };
}
export declare class ShopeeLivestreamApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add item list
     * /api/v2/livestream/add_item_list (POST)
     */
    addItemList(params: AddItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddItemListResponse>>;
    /**
     * apply item set
     * /api/v2/livestream/apply_item_set (POST)
     */
    applyItemSet(params: ApplyItemSetRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ApplyItemSetResponse>>;
    /**
     * ban user comment
     * /api/v2/livestream/ban_user_comment (POST)
     */
    banUserComment(params: BanUserCommentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BanUserCommentResponse>>;
    /**
     * create session
     * /api/v2/livestream/create_session (POST)
     */
    createSession(params: CreateSessionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateSessionResponse>>;
    /**
     * delete item list
     * /api/v2/livestream/delete_item_list (POST)
     */
    deleteItemList(params: DeleteItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteItemListResponse>>;
    /**
     * delete show item
     * /api/v2/livestream/delete_show_item (POST)
     */
    deleteShowItem(params: DeleteShowItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteShowItemResponse>>;
    /**
     * end session
     * /api/v2/livestream/end_session (POST)
     */
    endSession(params: EndSessionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EndSessionResponse>>;
    /**
     * get item count
     * /api/v2/livestream/get_item_count (GET)
     */
    getItemCount(params: GetItemCountRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemCountResponse>>;
    /**
     * get item list
     * /api/v2/livestream/get_item_list (GET)
     */
    getItemList(params: GetItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemListResponse>>;
    /**
     * get item set item list
     * /api/v2/livestream/get_item_set_item_list (GET)
     */
    getItemSetItemList(params: GetItemSetItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemSetItemListResponse>>;
    /**
     * get item set list
     * /api/v2/livestream/get_item_set_list (GET)
     */
    getItemSetList(params: GetItemSetListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemSetListResponse>>;
    /**
     * get latest comment list
     * /api/v2/livestream/get_latest_comment_list (GET)
     */
    getLatestCommentList(params: GetLatestCommentListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetLatestCommentListResponse>>;
    /**
     * get like item list
     * /api/v2/livestream/get_like_item_list (GET)
     */
    getLikeItemList(params: GetLikeItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetLikeItemListResponse>>;
    /**
     * get recent item list
     * /api/v2/livestream/get_recent_item_list (GET)
     */
    getRecentItemList(params: GetRecentItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetRecentItemListResponse>>;
    /**
     * get session detail
     * /api/v2/livestream/get_session_detail (GET)
     */
    getSessionDetail(params: GetSessionDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSessionDetailResponse>>;
    /**
     * get session item metric
     * /api/v2/livestream/get_session_item_metric (GET)
     */
    getSessionItemMetric(params: GetSessionItemMetricRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSessionItemMetricResponse>>;
    /**
     * get session metric
     * /api/v2/livestream/get_session_metric (GET)
     */
    getSessionMetric(params: GetSessionMetricRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSessionMetricResponse>>;
    /**
     * get show item
     * /api/v2/livestream/get_show_item (GET)
     */
    getShowItem(params: GetShowItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShowItemResponse>>;
    /**
     * post comment
     * /api/v2/livestream/post_comment (POST)
     */
    postComment(params: PostCommentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<PostCommentResponse>>;
    /**
     * start session
     * /api/v2/livestream/start_session (POST)
     */
    startSession(params: StartSessionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<StartSessionResponse>>;
    /**
     * unban user comment
     * /api/v2/livestream/unban_user_comment (POST)
     */
    unbanUserComment(params: UnbanUserCommentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UnbanUserCommentResponse>>;
    /**
     * update item list
     * /api/v2/livestream/update_item_list (POST)
     */
    updateItemList(params: UpdateItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateItemListResponse>>;
    /**
     * update session
     * /api/v2/livestream/update_session (POST)
     */
    updateSession(params: UpdateSessionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateSessionResponse>>;
    /**
     * update show item
     * /api/v2/livestream/update_show_item (POST)
     */
    updateShowItem(params: UpdateShowItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateShowItemResponse>>;
    /**
     * upload image
     * /api/v2/livestream/upload_image (POST)
     */
    uploadImage(params: UploadImageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadImageResponse>>;
}
