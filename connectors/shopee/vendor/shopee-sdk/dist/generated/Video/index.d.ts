import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface DeleteVideoRequest {
    "video_upload_id_list"?: Array<string>;
}
export interface DeleteVideoResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "success_list"?: Array<{
            "success_video_upload_id"?: string;
            "success_post_id"?: null;
        }>;
        "failure_list"?: unknown[];
    };
    "request_id"?: string;
}
export interface EditVideoInfoRequest {
    "video_upload_list": Array<{
        "video_upload_id"?: string;
        "caption"?: string;
        "cover_image_url"?: string;
        "item_info"?: Array<{
            "item_id"?: number;
            "custom_item_name"?: string;
        }>;
        "allow_info": {
            "allow_duet"?: boolean;
            "allow_stitch"?: boolean;
        };
        "scheduled_info": {
            "scheduled_post"?: boolean;
            "scheduled_post_time"?: number;
        };
    }>;
    "aigc_label": boolean;
}
export interface EditVideoInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<string>;
        "failure_list"?: Array<{
            "fail_video_upload_id"?: string;
            "failed_reason"?: string;
        }>;
    };
}
export interface GetCoverListRequest {
    /** ID of uploaded video. Obtain from v2.media.get_video_upload_result. */
    "video_upload_id": string;
}
export interface GetCoverListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "image_url_list"?: Array<string>;
    };
}
export interface GetMetricTrendRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last15d Last30d Note: The end date must align with the Period Type. Example: Week */
    "period_type": string;
    /** The end_date format should be "YYYY-MM-DD". - For Day, Last7d, Last15d, and Last30d, the end_date must before current day. - For Week, the end_date must be Sunday and must be less than or equal to the current week. - For Month, the end_date must be the end of the month and must be less than or equal to the current month. Example: 2025-09-21 */
    "end_date": string;
}
export interface GetMetricTrendResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "video_total_metric_list"?: Array<{
            "placed_sales"?: number;
            "confirmed_sales"?: number;
            "placed_orders"?: number;
            "confirmed_orders"?: number;
            "placed_item_sold"?: number;
            "confirmed_item_sold"?: number;
            "total_viewers"?: number;
            "effective_views"?: number;
            "avg_view_duration"?: number;
            "placed_buyers"?: number;
            "confirmed_buyers"?: number;
            "total_atc"?: number;
            "ctr"?: number;
            "placed_co_rate"?: number;
            "confirmed_co_rate"?: number;
            "placed_abs"?: number;
            "confirmed_abs"?: number;
            "placed_gpm"?: number;
            "confirmed_gpm"?: number;
            "video_with_products"?: number;
            "placed_revenue_generating_videos"?: number;
            "confirmed_revenue_generating_videos"?: number;
            "total_views"?: number;
            "total_likes"?: number;
            "total_shares"?: number;
            "total_comments"?: number;
            "video_new_followers"?: number;
            "data_period"?: string;
        }>;
    };
}
export interface GetOverviewPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last15d Last30d Note: The end date must align with the Period Type. Example: Month */
    "period_type": string;
    /** The end_date format should be "YYYY-MM-DD". - For Day, Last7d, Last15d, and Last30d, the end_date must before current day. - For Week, the end_date must be Sunday and must be less than or equal to the current week. - For Month, the end_date must be the end of the month and must be less than or equal to the current month. Example: 2025-09-30 */
    "end_date": string;
}
export interface GetOverviewPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "key_metric": {
            "placed_sales"?: number;
            "confirmed_sales"?: number;
            "placed_orders"?: number;
            "confirmed_orders"?: number;
            "placed_item_sold"?: number;
            "confirmed_item_sold"?: number;
            "total_viewers"?: number;
            "effective_views"?: number;
            "avg_view_duration"?: number;
        };
        "conversion": {
            "placed_buyers"?: number;
            "confirmed_buyers"?: number;
            "total_atc"?: number;
            "ctr"?: number;
            "placed_co_rate"?: number;
            "confirmed_co_rate"?: number;
            "placed_abs"?: number;
            "confirmed_abs"?: number;
            "placed_gpm"?: number;
            "confirmed_gpm"?: number;
            "video_with_products"?: number;
            "placed_revenue_generating_videos"?: number;
            "confirmed_revenue_generating_videos"?: number;
        };
        "engagement": {
            "total_views"?: number;
            "total_likes"?: number;
            "total_shares"?: number;
            "total_comments"?: number;
            "video_new_followers"?: number;
        };
        "fetched_date_range"?: string;
    };
}
export interface GetProdcutPerformanceListRequest {
    /** The start index of request. Starting from 1. Example: 1 */
    "page_no": number;
    /** The number of item returned by this request. Max is 20. Example: 10 */
    "page_size": number;
    /** Period Type. Applicable values: Day Week Month Last7d Last15d Last30d Note: The end date must align with the Period Type. Example: Last7d */
    "period_type": string;
    /** The end_date format should be "YYYY-MM-DD". - For Day, Last7d, Last15d, and Last30d, the end_date must before current day. - For Week, the end_date must be Sunday and must be less than or equal to the current week. - For Month, the end_date must be the end of the month and must be less than or equal to the current month. Example: 2025-10-30 */
    "end_date": string;
    /** Use this field to specify which field to use to sort the returned list. Available values: PlacedOrders PlacedSales PlacedUniqueBuyers ConfirmedOrders ConfirmedSales ConfirmedUniqueBuyers Example: PlacedOrders */
    "order_by": string;
    /** Use this field to specify whether the returned list is sorted in ascending or descending order_by. Available values: asc desc Example: desc */
    "sort": string;
    /** Shopee's unique identifier for an item. Example: 1 */
    "item_id"?: number;
    /** Search by product name. Example: test item name */
    "item_name"?: string;
}
export interface GetProdcutPerformanceListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "has_more"?: boolean;
        "list"?: Array<{
            "shop_id"?: number;
            "item_id"?: number;
            "item_name"?: string;
            "item_cover_image_url"?: string;
            "item_description"?: string;
            "placed_orders"?: number;
            "confirmed_orders"?: number;
            "placed_sales"?: number;
            "confirmed_sales"?: number;
            "placed_unique_buyers"?: number;
            "confirmed_unique_buyers"?: number;
            "fetched_date_range"?: string;
        }>;
    };
}
export interface GetUserDemographicsRequest {
}
export interface GetUserDemographicsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "age": {
            "1"?: number;
            "2"?: number;
            "3"?: number;
            "4"?: number;
        };
        "gender": {
            "Male"?: number;
            "Female"?: number;
        };
        "identity": {
            "follow"?: number;
            "unfollow"?: number;
        };
        "location": {
            "KOTA JAKARTA SELATAN"?: number;
            "KAB. BADUNG"?: number;
        };
        "activity": {
            "0"?: number;
            "1"?: number;
            "2"?: number;
            "3"?: number;
            "4"?: number;
            "5"?: number;
            "6"?: number;
            "7"?: number;
            "8"?: number;
            "9"?: number;
            "10"?: number;
            "11"?: number;
            "12"?: number;
            "13"?: number;
            "14"?: number;
            "15"?: number;
            "16"?: number;
            "17"?: number;
            "18"?: number;
            "19"?: number;
            "20"?: number;
            "21"?: number;
            "22"?: number;
            "23"?: number;
        };
        "content": {
            "Beauty & Fashion"?: number;
            "Travel"?: number;
            "Auto & Vehicle"?: number;
            "Entertainment"?: number;
            "Technology"?: number;
            "Comedy & Acting"?: number;
            "Food & Drink"?: number;
        };
        "shopping": {
            "Beauty"?: number;
            "Home & Living"?: number;
            "Women Clothes"?: number;
            "Muslim Fashion"?: number;
            "Mom & Baby"?: number;
            "Health"?: number;
            "Mobile & Gadgets"?: number;
        };
    };
}
export interface GetVideoDetailRequest {
    /** You can only select one from video_upload_id and post_id: - If you want to get detail information of video with draft status, please pass video_upload_id. - If you want to get detail information of video with post status, please pass post_id. Example: sg-11110199-6v99e-mgezdwct5eyya0 */
    "video_upload_id"?: string;
    /** You can only select one from video_upload_id and post_id: - If you want to get detail information of video with draft status, please pass video_upload_id. - If you want to get detail information of video with post status, please pass post_id. Example: YwOo_gZqCACXbM0UAAAAAA== */
    "post_id"?: string;
}
export interface GetVideoDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "video_upload_id"?: string;
        "post_id"?: string;
        "post_time"?: number;
        "video_url"?: string;
        "status"?: number;
        "cover_image_url"?: string;
        "caption"?: string;
        "duration"?: number;
        "views"?: number;
        "likes"?: number;
        "comments"?: number;
        "has_performance"?: boolean;
        "item_list"?: Array<{
            "shop_id"?: number;
            "item_id"?: number;
            "item_name"?: string;
            "custom_item_name"?: string;
            "item_cover_image_url"?: string;
            "min_price"?: number;
            "max_price"?: number;
            "stock"?: number;
        }>;
        "allow_info": {
            "allow_stitch"?: boolean;
            "allow_duet"?: boolean;
        };
        "scheduled_info": {
            "scheduled_post"?: boolean;
            "scheduled_post_time"?: number;
        };
        "update_time"?: number;
    };
    "aigc_label"?: boolean;
}
export interface GetVideoDetailAudienceDistributionRequest {
    /** A unique identifier for Shopee videos. Example: YwOo_gZqCACXbM0UAAAAAA== */
    "post_id": string;
}
export interface GetVideoDetailAudienceDistributionResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "age": {
            "1"?: number;
            "2"?: number;
            "3"?: number;
            "4"?: number;
        };
        "gender": {
            "male"?: number;
            "female"?: number;
            "predictedMale"?: number;
            "predictedFemale"?: number;
            "unknown"?: number;
        };
        "location": {
            "KAB. MAGETAN"?: number;
            "KAB. SERDANG BEDAGAI"?: number;
            "KAB. ACEH TENGGARA"?: number;
            "KAB. LUWU UTARA"?: number;
            "KAB. MAJENE"?: number;
            "KAB. KLATEN"?: number;
            "KAB. MINAHASA TENGGARA"?: number;
            "KOTA BATU"?: number;
            "KAB. MOJOKERTO"?: number;
            "KAB. TANJUNG JABUNG BARAT"?: number;
            "KOTA BLITAR"?: number;
            "KAB. KEPULAUAN ANAMBAS"?: number;
            "KAB. SAROLANGUN"?: number;
            "KAB. KAYONG UTARA"?: number;
        };
        "activity": {
            "2"?: number;
            "7"?: number;
            "12"?: number;
            "14"?: number;
            "15"?: number;
            "18"?: number;
            "19"?: number;
        };
        "identity": {
            "0"?: number;
        };
        "content": {
            "Family & Relationships"?: number;
            "Beauty & Fashion"?: number;
            "Entertainment"?: number;
            "Comedy & Acting"?: number;
            "Society"?: number;
            "Daily Life"?: number;
        };
        "shopping": {
            "Beauty"?: number;
            "Women Clothes"?: number;
            "Food & Beverages"?: number;
            "Health"?: number;
            "Baby & Kids Fashion"?: number;
            "Men Clothes"?: number;
            "Home & Living"?: number;
        };
    };
    "request_id"?: string;
}
export interface GetVideoDetailMetricTrendRequest {
    /** A unique identifier for Shopee videos. Example: YwOo_gZqCACXbM0UAAAAAA== */
    "post_id": string;
    /** The name of metric that require obtaining trend data. Applicable values: Views, Likes, Comments, Shares, FollowersGrowth, PlacedOrders, PlacedSales, UniqueBuyers, ConversionRate, SoldItems, SalesPerOrder, SalesPerBuyer Example: Likes */
    "metric_name": string;
}
export interface GetVideoDetailMetricTrendResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "metric_trend": {
            "1763312400000"?: number;
            "1762016400000"?: number;
            "1762448400000"?: number;
            "1762880400000"?: number;
            "1761930000000"?: number;
            "1762362000000"?: number;
            "1762794000000"?: number;
            "1763226000000"?: number;
            "1763053200000"?: number;
            "1761757200000"?: number;
            "1762189200000"?: number;
            "1762621200000"?: number;
            "1761843600000"?: number;
            "1762275600000"?: number;
            "1762707600000"?: number;
            "1763139600000"?: number;
            "1762102800000"?: number;
            "1762534800000"?: number;
            "1762966800000"?: number;
            "1761670800000"?: number;
        };
    };
    "request_id"?: string;
}
export interface GetVideoDetailPerformanceRequest {
    /** A unique identifier for Shopee videos. Example: YwOo_gZqCACXbM0UAAAAAA== */
    "post_id": string;
}
export interface GetVideoDetailPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "video_info": {
            "post_id"?: string;
            "post_time"?: number;
            "video_url"?: string;
            "cover_image_url"?: string;
            "caption"?: string;
            "duration"?: number;
            "related_item_count"?: number;
        };
        "video_performance": {
            "views"?: number;
            "likes"?: number;
            "comments"?: number;
            "shares"?: number;
            "followers_growth"?: number;
            "placed_orders"?: number;
            "placed_sales"?: number;
            "unique_buyers"?: number;
            "conversion_rate"?: number;
            "sold_items"?: number;
            "product_clicks"?: number;
            "product_click_rate"?: number;
            "sales_per_order"?: number;
            "sales_per_buyer"?: number;
        };
    };
}
export interface GetVideoDetailProductPerformanceRequest {
    /** The start index of request. Starting from 1. */
    "page_no": number;
    /** The number of item returned by this request. Max is 20. */
    "page_size": number;
    /** The unique identifier for post Shopee Video. */
    "post_id": string;
    /** Shopee's unique identifier for an item. */
    "item_id"?: number;
    /** Name of the item. */
    "item_name"?: string;
}
export interface GetVideoDetailProductPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "total_count"?: number;
        "list"?: Array<{
            "shop_id"?: string;
            "item_id"?: string;
            "item_cover_image_url"?: string;
            "item_name"?: string;
            "item_description"?: string;
            "likes"?: number;
            "comments"?: number;
            "placed_orders"?: number;
            "placed_sales"?: number;
            "unique_buyers"?: number;
            "conversion_rate"?: number;
            "product_clicks"?: number;
            "product_click_rate"?: number;
            "sold_items"?: number;
            "sales_per_order"?: number;
            "sales_per_buyer"?: number;
        }>;
        "has_more"?: boolean;
    };
    "request_id"?: string;
}
export interface GetVideoListRequest {
    /** The start index of request. Starting from 1. Example: 1 */
    "page_no": number;
    /** The number of affiliate returned by this request, Max is 20. Example: 10 */
    "page_size": number;
    /** Search tpye for video in draft status or video already post to Shopee Video. 1: draft 2: post Example: 1 */
    "list_type": number;
}
export interface GetVideoListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "has_more"?: boolean;
        "list": {
            "video_upload_id"?: string;
            "post_id"?: string;
            "post_time"?: number;
            "video_url"?: string;
            "status"?: number;
            "cover_image_url"?: string;
            "caption"?: string;
            "duration"?: number;
            "views"?: number;
            "likes"?: number;
            "comments"?: number;
            "has_performance"?: boolean;
            "item_list": {
                "item_id"?: number;
                "item_name"?: string;
                "item_cover_image_url"?: string;
                "min_price"?: number;
                "max_price"?: number;
                "stock"?: number;
                "shop_id"?: number;
                "custom_item_name"?: string;
            };
            "allow_info": {
                "allow_stitch"?: boolean;
                "allow_duet"?: boolean;
            };
            "scheduled_info": {
                "scheduled_post"?: boolean;
                "scheduled_post_time"?: number;
            };
            "update_time"?: number;
        };
    };
}
export interface GetVideoPerformanceListRequest {
    /** The start index of request. Starting from 1. Example: 1 */
    "page_no": number;
    /** The number of video returned by this request. Max is 20. Example: 10 */
    "page_size": number;
    /** Period Type. Applicable values: Day Week Month Last7d Last15d Last30d Note: The end date must align with the Period Type. Example: Last7d */
    "period_type": string;
    /** The end_date format should be "YYYY-MM-DD". - For Day, Last7d, Last15d, and Last30d, the end_date must before current day. - For Week, the end_date must be Sunday and must be less than or equal to the current week. - For Month, the end_date must be the end of the month and must be less than or equal to the current month. Example: 2025-10-30 */
    "end_date": string;
    /** Description of the Shopee Video. */
    "caption"?: string;
    /** Use this field to specify which field to use to sort the returned list. Available values: Views Likes Comments AvgViewsDuration Example: Likes */
    "order_by": string;
    /** Use this field to specify whether the returned list is sorted in ascending or descending order_by. Available values: asc desc Example: desc */
    "sort": string;
}
export interface GetVideoPerformanceListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "has_more"?: boolean;
        "list"?: Array<{
            "video_upload_id"?: string;
            "post_id"?: string;
            "post_time"?: number;
            "video_url"?: string;
            "status"?: number;
            "cover_image_url"?: string;
            "caption"?: string;
            "duration"?: string;
            "views"?: number;
            "likes"?: number;
            "comments"?: number;
            "shares"?: number;
            "avg_views_duration"?: number;
            "completion_rate"?: number;
            "placed_orders"?: number;
            "confirmed_orders"?: number;
            "placed_sales"?: number;
            "confirmed_sales"?: number;
            "placed_item_sold"?: number;
            "confirmed_item_sold"?: number;
            "fetched_date_range"?: string;
        }>;
    };
}
export interface PostVideoRequest {
    "video_upload_id_list": Array<string>;
}
export interface PostVideoResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "success_list"?: Array<{
            "success_video_upload_id"?: string;
            "post_id"?: string;
        }>;
        "failure_list"?: unknown[];
    };
    "request_id"?: string;
}
export declare class ShopeeVideoApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * delete video
     * /api/v2/video/delete_video (POST)
     */
    deleteVideo(params: DeleteVideoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteVideoResponse>>;
    /**
     * edit video info
     * /api/v2/video/edit_video_info (POST)
     */
    editVideoInfo(params: EditVideoInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EditVideoInfoResponse>>;
    /**
     * get cover list
     * /api/v2/video/get_cover_list (GET)
     */
    getCoverList(params: GetCoverListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCoverListResponse>>;
    /**
     * get metric trend
     * /api/v2/video/get_metric_trend (GET)
     */
    getMetricTrend(params: GetMetricTrendRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMetricTrendResponse>>;
    /**
     * get overview performance
     * /api/v2/video/get_overview_performance (GET)
     */
    getOverviewPerformance(params: GetOverviewPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOverviewPerformanceResponse>>;
    /**
     * get prodcut performance list
     * /api/v2/video/get_prodcut_performance_list (GET)
     */
    getProdcutPerformanceList(params: GetProdcutPerformanceListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetProdcutPerformanceListResponse>>;
    /**
     * get user demographics
     * /api/v2/video/get_user_demographics (GET)
     */
    getUserDemographics(params: GetUserDemographicsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetUserDemographicsResponse>>;
    /**
     * get video detail
     * /api/v2/video/get_video_detail (GET)
     */
    getVideoDetail(params: GetVideoDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoDetailResponse>>;
    /**
     * get video detail audience distribution
     * /api/v2/video/get_video_detail_audience_distribution (GET)
     */
    getVideoDetailAudienceDistribution(params: GetVideoDetailAudienceDistributionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoDetailAudienceDistributionResponse>>;
    /**
     * get video detail metric trend
     * /api/v2/video/get_video_detail_metric_trend (GET)
     */
    getVideoDetailMetricTrend(params: GetVideoDetailMetricTrendRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoDetailMetricTrendResponse>>;
    /**
     * get video detail performance
     * /api/v2/video/get_video_detail_performance (GET)
     */
    getVideoDetailPerformance(params: GetVideoDetailPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoDetailPerformanceResponse>>;
    /**
     * get video detail product performance
     * /api/v2/video/get_video_detail_product_performance (GET)
     */
    getVideoDetailProductPerformance(params: GetVideoDetailProductPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoDetailProductPerformanceResponse>>;
    /**
     * get video list
     * /api/v2/video/get_video_list (GET)
     */
    getVideoList(params: GetVideoListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoListResponse>>;
    /**
     * get video performance list
     * /api/v2/video/get_video_performance_list (GET)
     */
    getVideoPerformanceList(params: GetVideoPerformanceListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoPerformanceListResponse>>;
    /**
     * post video
     * /api/v2/video/post_video (POST)
     */
    postVideo(params: PostVideoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<PostVideoResponse>>;
}
