import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddFollowPrizeRequest {
    "follow_prize_name": string;
    "start_time": number;
    "end_time": number;
    "usage_quantity": number;
    "min_spend": number;
    "reward_type": number;
    "discount_amount"?: number;
}
export interface AddFollowPrizeResponse {
    "response"?: {
        "campagin_id"?: number;
    };
    "error"?: string;
    "request_id"?: string;
    "message"?: string;
}
export interface DeleteFollowPrizeRequest {
    "campagin_id"?: number;
}
export interface DeleteFollowPrizeResponse {
    "response"?: {
        "campaign_id"?: number;
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface EndFollowPrizeRequest {
    "campaign_id": number;
}
export interface EndFollowPrizeResponse {
    "response"?: {
        "campaign_id"?: number;
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface GetFollowPrizeDetailRequest {
    /** The unique identifier for the created follow prize. Example: 1551 */
    "campaign_id"?: number;
}
export interface GetFollowPrizeDetailResponse {
    "response"?: {
        "campaign_status"?: string;
        "campaign_id"?: number;
        "usage_quantity"?: number;
        "start_time"?: number;
        "end_time"?: number;
        "min_spend"?: number;
        "reward_type"?: number;
        "follow_prize_name"?: string;
        "percentage"?: number;
        "max_price"?: number;
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface GetFollowPrizeListRequest {
    /** Specifies the page number of data to return in the current call. Default to be 1. Example: 1 */
    "page_no"?: number;
    /** Use the 'page_size' filters to control the maximum number of entries to retrieve per page (i.e., per call). Default to be 20 and allowed input is from 1- 100. Example: 100 */
    "page_size"?: number;
    /** The status filter for retrieving follow prize list. Available value: upcoming/ongoing/expired/all. Example: upcoming */
    "status": string;
}
export interface GetFollowPrizeListResponse {
    "response"?: {
        "more"?: boolean;
        "follow_prize_list"?: Array<{
            "campaign_id"?: number;
            "campaign_status"?: string;
            "follow_prize_name"?: string;
            "start_time"?: number;
            "end_time"?: number;
            "usage_quantity"?: number;
            "claimed"?: number;
        }>;
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface UpdateFollowPrizeRequest {
    "follow_prize_name"?: string;
    "campaign_id": number;
    "start_time"?: number;
    "end_time"?: number;
    "usage_quantity"?: number;
    "min_spend"?: number;
}
export interface UpdateFollowPrizeResponse {
    "response"?: {
        "campaign_id"?: number;
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export declare class ShopeeFollowPrizeApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add follow prize
     * /api/v2/follow_prize/add_follow_prize (POST)
     */
    addFollowPrize(params: AddFollowPrizeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddFollowPrizeResponse>>;
    /**
     * delete follow prize
     * /api/v2/follow_prize/delete_follow_prize (POST)
     */
    deleteFollowPrize(params: DeleteFollowPrizeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteFollowPrizeResponse>>;
    /**
     * end follow prize
     * /api/v2/follow_prize/end_follow_prize (POST)
     */
    endFollowPrize(params: EndFollowPrizeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EndFollowPrizeResponse>>;
    /**
     * get follow prize detail
     * /api/v2/follow_prize/get_follow_prize_detail (GET)
     */
    getFollowPrizeDetail(params: GetFollowPrizeDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetFollowPrizeDetailResponse>>;
    /**
     * get follow prize list
     * /api/v2/follow_prize/get_follow_prize_list (GET)
     */
    getFollowPrizeList(params: GetFollowPrizeListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetFollowPrizeListResponse>>;
    /**
     * update follow prize
     * /api/v2/follow_prize/update_follow_prize (POST)
     */
    updateFollowPrize(params: UpdateFollowPrizeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateFollowPrizeResponse>>;
}
