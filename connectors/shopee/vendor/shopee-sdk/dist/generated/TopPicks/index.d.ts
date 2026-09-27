import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddTopPicksRequest {
    "is_activated": boolean;
    "item_id_list": Array<number>;
    "name": string;
}
export interface AddTopPicksResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "collection_list"?: Array<{
            "is_activated"?: boolean;
            "item_list"?: Array<{
                "item_name"?: string;
                "item_id"?: number;
                "current_price"?: string;
                "inflated_price_of_current_price"?: string;
                "sales"?: number;
            }>;
            "top_picks_id"?: number;
            "name"?: string;
        }>;
    };
}
export interface DeleteTopPicksRequest {
    "top_picks_id": number;
}
export interface DeleteTopPicksResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "top_picks_id"?: number;
    };
}
export interface GetTopPicksListRequest {
}
export interface GetTopPicksListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "collection_list"?: Array<{
            "is_activated"?: boolean;
            "item_list"?: Array<{
                "item_name"?: string;
                "item_id"?: number;
                "current_price"?: string;
                "inflated_price_of_current_price"?: string;
                "sales"?: number;
            }>;
            "top_picks_id"?: number;
            "name"?: string;
        }>;
    };
}
export interface UpdateTopPicksRequest {
    "name"?: string;
    "top_picks_id": number;
    "item_id_list"?: Array<number>;
    "is_activated"?: boolean;
}
export interface UpdateTopPicksResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "collection_list"?: Array<{
            "is_activated"?: boolean;
            "item_list"?: Array<{
                "item_name"?: string;
                "item_id"?: number;
                "current_price"?: string;
                "inflated_price_of_current_price"?: string;
                "sales"?: number;
            }>;
            "top_picks_id"?: number;
            "name"?: string;
        }>;
    };
}
export declare class ShopeeTopPicksApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add top picks
     * /api/v2/top_picks/add_top_picks (POST)
     */
    addTopPicks(params: AddTopPicksRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddTopPicksResponse>>;
    /**
     * delete top picks
     * /api/v2/top_picks/delete_top_picks (POST)
     */
    deleteTopPicks(params: DeleteTopPicksRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteTopPicksResponse>>;
    /**
     * get top picks list
     * /api/v2/top_picks/get_top_picks_list (GET)
     */
    getTopPicksList(params: GetTopPicksListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTopPicksListResponse>>;
    /**
     * update top picks
     * /api/v2/top_picks/update_top_picks (POST)
     */
    updateTopPicks(params: UpdateTopPicksRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateTopPicksResponse>>;
}
