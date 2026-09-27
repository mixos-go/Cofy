import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddAllProductsToOpenCampaignRequest {
    "commission_rate": number;
    "period_start_time"?: number;
    "period_end_time"?: number;
}
export interface AddAllProductsToOpenCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "task_type"?: string;
        "task_id"?: string;
    };
}
export interface BatchAddProductsToOpenCampaignRequest {
    "item_id_list": Array<number>;
    "commission_rate": number;
    "period_start_time"?: number;
    "period_end_time"?: number;
}
export interface BatchAddProductsToOpenCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<number>;
    };
}
export interface BatchEditProductsOpenCampaignSettingRequest {
    "campaign_ids": Array<number>;
    "commission_rate"?: number;
    "period_start_time"?: number;
    "period_end_time"?: number;
}
export interface BatchEditProductsOpenCampaignSettingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<number>;
    };
}
export interface BatchGetProductsSuggestedRateRequest {
    /** The list of item_id, different item id should be split by comma and at most 20 items Example: 1,12,123 */
    "item_id_list": string;
}
export interface BatchGetProductsSuggestedRateResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "rates"?: Array<{
            "item_id"?: number;
            "min_rate"?: number;
            "max_rate"?: number;
        }>;
    };
}
export interface BatchRemoveProductsOpenCampaignSettingRequest {
    "campaign_ids": Array<number>;
}
export interface BatchRemoveProductsOpenCampaignSettingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<number>;
    };
}
export interface CreateNewTargetedCampaignRequest {
    "campaign_name": string;
    "period_start_time": number;
    "period_end_time": number;
    "is_set_budget"?: boolean;
    "budget"?: number;
    "seller_message": string;
    "item_list": Array<{
        "item_id"?: number;
        "rate"?: number;
    }>;
    "affiliate_list": Array<{
        "affiliate_id"?: number;
    }>;
}
export interface CreateNewTargetedCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "campaign_id"?: number;
        "fail_item_list"?: unknown[];
        "fail_affiliate_list"?: unknown[];
    };
}
export interface EditAffiliateListOfTargetedCampaignRequest {
    "campaign_id": number;
    "edit_type": string;
    "affiliate_list": Array<{
        "affiliate_id"?: number;
    }>;
}
export interface EditAffiliateListOfTargetedCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "fail_affiliate_list"?: unknown[];
    };
}
export interface EditAllProductsOpenCampaignSettingRequest {
    "commission_rate"?: number;
    "period_start_time"?: number;
    "period_end_time"?: number;
}
export interface EditAllProductsOpenCampaignSettingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "task_type"?: string;
        "task_id"?: string;
    };
}
export interface EditProductListOfTargetedCampaignRequest {
    "campaign_id": number;
    "edit_type": string;
    "item_list": Array<{
        "item_id"?: number;
        "rate"?: number;
    }>;
}
export interface EditProductListOfTargetedCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "fail_item_list"?: unknown[];
    };
}
export interface GetAffiliatePerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 20. Example: 20 */
    "page_size": number;
    /** Order Type. Applicable values: PlacedOrder ConfirmedOrder: Note: - Placed orders are orders (COD and non-COD) that buyers have successfully placed, including paid and unpaid orders. - Confirmed orders are either non-COD orders that have been paid for or COD orders that have been confirmed for shipping (usually 30 mins after placing the order). Example: ConfirmedOrder */
    "order_type": string;
    /** Channel. Applicable values: - AllChannel - SocialMedia - ShopeeVideo - LiveStreaming Example: AllChannel */
    "channel": string;
    /** Affiliate ID for query. Example: 16142330000 */
    "affiliate_id"?: number;
}
export interface GetAffiliatePerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "affiliate_id"?: number;
            "affiliate_name"?: string;
            "affiliate_username"?: string;
            "sales"?: string;
            "items_sold"?: number;
            "orders"?: number;
            "clicks"?: number;
            "est_commission"?: string;
            "roi"?: string;
            "total_buyers"?: number;
            "new_buyers"?: number;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
        "fetched_date_range"?: string;
    };
}
export interface GetAutoAddNewProductToggleStatusRequest {
}
export interface GetAutoAddNewProductToggleStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "is_open"?: boolean;
        "commission_rate"?: number;
    };
}
export interface GetCampaignKeyMetricsPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
}
export interface GetCampaignKeyMetricsPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "open_campaign_key_metircs": {
            "affiliates"?: number;
            "items_sold"?: number;
            "sales"?: string;
            "est_commission"?: string;
        };
        "targeted_campaign_key_metircs": {
            "affiliates"?: number;
            "items_sold"?: number;
            "sales"?: string;
            "est_commission"?: string;
        };
        "fetched_date_range"?: string;
    };
}
export interface GetContentPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 20. Example: 20 */
    "page_size": number;
    /** Order Type. Applicable values: PlacedOrder ConfirmedOrder: Note: - Placed orders are orders (COD and non-COD) that buyers have successfully placed, including paid and unpaid orders. - Confirmed orders are either non-COD orders that have been paid for or COD orders that have been confirmed for shipping (usually 30 mins after placing the order). Example: ConfirmedOrder */
    "order_type": string;
    /** Channel. Applicable values: - ShopeeVideo - LiveStreaming Example: ShopeeVideo */
    "channel": string;
    /** Search for the contents published by affiliates with the affiliate id entered. Example: 11146330000 */
    "affiliate_id"?: number;
    /** Search for the contents with the searched product included (precise search). Example: 14016184405 */
    "item_id"?: number;
}
export interface GetContentPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "content_id"?: string;
            "content_title"?: string;
            "post_time"?: number;
            "affiliate_name"?: string;
            "affiliate_username"?: string;
            "products"?: number;
            "views"?: number;
            "likes"?: number;
            "comments"?: number;
            "sales"?: string;
            "orders"?: number;
            "items_sold"?: number;
            "channel"?: string;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
        "fetched_date_range"?: string;
    };
}
export interface GetConversionReportRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. If data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Number of records returned per page, the maximum limit is 500, and page_no * page_size must be <= 10000. Example: 20 */
    "page_size": number;
    /** Unique identifier of the order. Example: YSWVY8D7OU */
    "order_sn"?: string;
    /** ID of the affiliate who promoted the item. Example: 11346460002 */
    "affiliate_id"?: number;
    /** ID of the product purchased. Example: 3903624400 */
    "item_id"?: number;
    /** Product's name. Example: item1 */
    "item_name"?: string;
    /** Hierarchical product category classification. (L1 Category) Example: 104136 */
    "l1_category_id"?: number;
    /** Hierarchical product category classification. (L2 category) Example: 241360 */
    "l2_category_id"?: number;
    /** Hierarchical product category classification. (L3 Category) Example: 404136 */
    "l3_category_id"?: number;
    /** Order Status. Applicable values: Unpaid Pending Completed Cancelled Example: Unpaid */
    "order_status"?: string;
    /** Verified Status. Applicable values: Unverified Valid Invalid Example: Unverified */
    "verified_status"?: string;
    /** Buyer Status. Applicable values: New Existing Example: New */
    "buyer_status"?: string;
    /** ID referencing the campaign rule applied. Example: 18017 */
    "attr_campaign_id"?: number;
    /** Name/ID of campaign partner. Example: auto.1 */
    "campaign_partner"?: string;
    /** Seller Campaign Type. Applicable values: TargetCampaign OpenCampaign MCNCampaign Example: TargetCampaign */
    "seller_campaign_type"?: string;
    /** Deduction Status. Applicable values: PendingDeduction Deducted Example: PendingDeduction */
    "deduction_status"?: string;
    /** Deduction Method. Applicable values: OrderEscrow SellerWallet AutoAdjustment SVSPaymentLink OfflineSettlement AMSCredit Example: OrderEscrow */
    "deduction_method"?: string;
    /** Start time (inclusive) of order placement, in timestamp format. Example: 1753459200 */
    "place_order_time_start"?: number;
    /** End time (inclusive) of order placement, in timestamp format. Example: 1756051199 */
    "place_order_time_end"?: number;
    /** Start time (inclusive) of order completion, in timestamp format. Example: 1753459200 */
    "order_completed_time_start"?: number;
    /** End time (inclusive) of order completion, in timestamp format. Example: 1756051199 */
    "order_completed_time_end"?: number;
    /** Start time (inclusive) of final completion, in timestamp format. Example: 1753459200 */
    "conversion_completed_time_start"?: number;
    /** End time (inclusive) of final completion, in timestamp format. Example: 1756051199 */
    "conversion_completed_time_end"?: number;
    /** Start time (inclusive) of fee deduction, in timestamp format. Example: 1753459200 */
    "ams_deduction_time_start"?: number;
    /** End time (inclusive) of fee deduction, in timestamp format. Example: 1756051199 */
    "ams_deduction_time_end"?: number;
}
export interface GetConversionReportResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "order_sn"?: string;
            "order_status"?: string;
            "verified_status"?: string;
            "place_order_time"?: string;
            "order_completed_time"?: string;
            "conversion_completed_time"?: string;
            "affiliate_id"?: number;
            "affiliate_name"?: string;
            "affiliate_username"?: string;
            "linked_mcn"?: string;
            "order_brand_commission"?: string;
            "channel"?: string;
            "order_type"?: string;
            "buyer_status"?: string;
            "items"?: Array<{
                "item_id"?: number;
                "item_name"?: string;
                "model_id"?: number;
                "l1_category_id"?: number;
                "l2_category_id"?: number;
                "l3_category_id"?: number;
                "promotion_id"?: string;
                "price"?: number;
                "qty"?: number;
                "seller_campaign_type"?: string;
                "attr_campaign_id"?: number;
                "purchase_value"?: number;
                "refund_amount"?: string;
                "item_brand_commission"?: string;
                "item_brand_commission_rate_to_affiliate"?: string;
                "item_brand_commission_to_affiliate"?: string;
                "item_brand_commission_rate_to_mcn"?: string;
                "item_brand_commission_to_mcn"?: string;
                "seller_service_fee_rate"?: string;
                "seller_service_fee"?: string;
            }>;
            "campaign_partner"?: string;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
    };
}
export interface GetManagedAffiliateListRequest {
    /** The start index of request. The max managed affiliates of affiliate is 2000. Zero count will returned if offset > 2000 or offset > real managed count. Example: 1 */
    "page_no": number;
    /** The number of affiliate returned by this request, Max is 100, default is 20. The max managed affiliates of affiliate is 2000. Example: 20 */
    "page_size": number;
}
export interface GetManagedAffiliateListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "affiliate_list"?: Array<{
            "affiliate_id"?: number;
            "affiliate_name"?: string;
            "user_name"?: string;
            "portrait_url"?: string;
            "popular_social_media": {
                "platform"?: string;
                "follower_count"?: number;
            };
            "social_medias"?: Array<{
                "platform"?: string;
                "follower_count"?: number;
                "social_media_user_name"?: string;
            }>;
            "total_click"?: number;
            "order_range"?: Array<number>;
            "gmv_range"?: Array<number>;
            "is_orange_tick_kol"?: boolean;
            "is_good_fulfillment"?: boolean;
            "promote_category_ids"?: Array<number>;
            "top_popular_contents"?: Array<{
                "platform"?: string;
                "comment_count"?: number;
                "like_count"?: number;
                "view_count"?: number;
                "cover_url"?: string;
                "media_url"?: string;
            }>;
            "top_selling_products"?: Array<{
                "item_id"?: number;
            }>;
        }>;
    };
}
export interface GetOpenCampaignAddedProductRequest {
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is "" or not passed. If data is more than one page, the cursor can be some entry to start next call. Example: 1234,5678 */
    "cursor"?: string;
    /** Use this field to specify which field to use to sort the returned item list. Sort by update_time and commission_id in descending order by default. Available values: commission_rate: Sort by commission_rate in ascending order -commission_rate: Sort by commission_rate in descending order Example: commission_rate */
    "sort_by"?: string;
    /** Search type: ITEM_NAME or ITEM_ID Example: ITEM_NAME */
    "search_type"?: string;
    /** Search for item_name or item_id, item_id should be split by comma and at most 50 items. Example: test */
    "search_content"?: string;
}
export interface GetOpenCampaignAddedProductResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "campaign_id"?: number;
            "campaign_status"?: string;
            "commission_rate"?: number;
            "period_start_time"?: number;
            "period_end_time"?: number;
            "pending_terminated_time"?: number;
            "commission_protection_list"?: Array<{
                "commission_rate"?: number;
                "protection_period_end_time"?: number;
            }>;
            "max_commission_rate_current_day"?: number;
        }>;
        "total_count"?: number;
        "cursor"?: string;
        "has_more"?: boolean;
    };
}
export interface GetOpenCampaignBatchTaskResultRequest {
    /** Task id, used to query task progress Example: abcd-abcd-abcd */
    "task_id": string;
}
export interface GetOpenCampaignBatchTaskResultResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "status"?: string;
        "progress_rate"?: number;
        "fail_reason"?: string;
    };
}
export interface GetOpenCampaignNotAddedProductRequest {
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is "" or not passed. If data is more than one page, the cursor can be some entry to start next call. Example: 1234,5678 */
    "cursor"?: string;
    /** Use this field to specify which field to use to sort the returned item list. Available values: -sales: Sort by sales in descending order (default value) sales: Sort by sales in ascending order -stock: Sort by inventory in descending order stock: Sort by inventory in ascending order -price: Sort by price in descending order price: Sort by price in ascending order Example: -sales */
    "sort_by"?: string;
    /** Search type: ITEM_ID or ITEM_NAME Example: ITEM_NAME */
    "search_type"?: string;
    /** Search for item name or item id. item id should be split by comma and at most 50 items. When search_content is passed, search_type is required. Example: test */
    "search_content"?: string;
}
export interface GetOpenCampaignNotAddedProductResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "sales"?: number;
            "display_price"?: string;
            "stock"?: number;
            "is_in_blacklist"?: boolean;
            "with_open_campaign"?: boolean;
        }>;
        "total_count"?: number;
        "cursor"?: string;
        "has_more"?: boolean;
    };
}
export interface GetOpenCampaignPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 20. Example: 20 */
    "page_size": number;
    /** Item ID for query. */
    "item_id"?: number;
}
export interface GetOpenCampaignPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "affiliates"?: number;
            "sales"?: string;
            "item_sold"?: number;
            "est_commission"?: string;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
        "fetched_date_range"?: string;
    };
}
export interface GetOptimizationSuggestionProductRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data.The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Recommended types. Applicable values: product_opportunities optimize_increase_commission_rate optimize_extend_promotion_period Example: product_opportunities */
    "rcmd_reason_filter": string;
}
export interface GetOptimizationSuggestionProductResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "rcmd_reason"?: Array<string>;
            "campaign_id"?: number;
            "commission_rate"?: number;
            "period_start_time"?: number;
            "period_end_time"?: number;
            "affiliate_count"?: number;
            "item_sold"?: number;
            "campaign_status"?: string;
            "l2_category_order_count"?: number;
            "suggest_min_rate"?: number;
            "suggest_max_rate"?: number;
            "prefill_rate"?: number;
            "prefill_subsidy_rate"?: number;
            "display_price"?: string;
            "has_subsidy_data"?: boolean;
        }>;
        "total"?: number;
        "has_more"?: boolean;
    };
}
export interface GetPerformanceDataUpdateTimeRequest {
    /** Marker type. Applicable values: - AmsMarker: Used to query the data update date for ams metrics. Example: AmsMarker */
    "marker_type": string;
}
export interface GetPerformanceDataUpdateTimeResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "last_report_date"?: string;
    };
}
export interface GetProductPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. If data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 20. Example: 20 */
    "page_size": number;
    /** Order Type. Applicable values: PlacedOrder ConfirmedOrder: Note: - Placed orders are orders (COD and non-COD) that buyers have successfully placed, including paid and unpaid orders. - Confirmed orders are either non-COD orders that have been paid for or COD orders that have been confirmed for shipping (usually 30 mins after placing the order). Example: ConfirmedOrder */
    "order_type": string;
    /** Channel. Applicable values: - AllChannel - SocialMedia - ShopeeVideo - LiveStreaming Example: AllChannel */
    "channel": string;
    /** Item ID for query. Example: 123 */
    "item_id"?: number;
}
export interface GetProductPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "sales"?: string;
            "items_sold"?: number;
            "orders"?: number;
            "clicks"?: number;
            "est_commission"?: string;
            "roi"?: string;
            "total_buyers"?: number;
            "new_buyers"?: number;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
        "fetched_date_range"?: string;
    };
}
export interface GetRecommendedAffiliateListRequest {
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. Note: The response size will up to 200. Example: 50 */
    "page_size": number;
}
export interface GetRecommendedAffiliateListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "affiliate_list"?: Array<{
            "affiliate_id"?: number;
            "affiliate_name"?: string;
            "user_name"?: string;
            "portrait_url"?: string;
            "popular_social_media": {
                "platform"?: string;
                "follower_count"?: number;
            };
            "social_medias"?: Array<{
                "platform"?: string;
                "follower_count"?: number;
                "social_media_user_name"?: string;
            }>;
            "total_click"?: number;
            "order_range"?: Array<number>;
            "gmv_range"?: Array<number>;
            "is_orange_tick_kol"?: boolean;
            "is_good_fulfillment"?: boolean;
            "promote_category_ids"?: Array<number>;
            "top_popular_contents"?: Array<{
                "platform"?: string;
                "comment_count"?: number;
                "like_count"?: number;
                "view_count"?: number;
                "cover_url"?: string;
                "media_url"?: string;
            }>;
            "top_selling_products"?: Array<{
                "item_id"?: number;
            }>;
        }>;
    };
}
export interface GetShopPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Order Type. Applicable values: PlacedOrder ConfirmedOrder: Note: - Placed orders are orders (COD and non-COD) that buyers have successfully placed, including paid and unpaid orders. - Confirmed orders are either non-COD orders that have been paid for or COD orders that have been confirmed for shipping (usually 30 mins after placing the order). Example: ConfirmedOrder */
    "order_type": string;
    /** Channel. Applicable values: - AllChannel - SocialMedia - ShopeeVideo - LiveStreaming Example: AllChannel */
    "channel": string;
}
export interface GetShopPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "sales"?: string;
        "gross_item_sold"?: number;
        "orders"?: number;
        "clicks"?: number;
        "est_commission"?: string;
        "roi"?: string;
        "total_buyers"?: number;
        "new_buyers"?: number;
        "fetched_date_range"?: string;
    };
}
export interface GetShopSuggestedRateRequest {
}
export interface GetShopSuggestedRateResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "min_rate"?: number;
        "max_rate"?: number;
    };
}
export interface GetTargetedCampaignAddableProductListRequest {
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is "" or not passed. If data is more than one page, the cursor can be some entry to start next call. Example: abcd */
    "cursor"?: string;
    /** Use this field to specify which field to use to sort the returned item list. Available values: -sales: Sort by sales in descending order (default value) sales: Sort by sales in ascending order -stock: Sort by inventory in descending order stock: Sort by inventory in ascending order -price: Sort by price in descending order price: Sort by price in ascending order Example: -sales */
    "sort_by"?: string;
    /** Search type: ITEM_NAME or ITEM_ID, used with search_content. Example: ITEM_ID */
    "search_type"?: string;
    /** Search by item name or item ID, item_id should be split by comma and at most 50 items. Please specify search_type for it to be effective, otherwise search_content will be ignored. Example: 101,102 */
    "search_content"?: string;
}
export interface GetTargetedCampaignAddableProductListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "sales"?: number;
            "display_price"?: string;
            "stock"?: number;
            "is_in_blacklist"?: boolean;
        }>;
        "total_count"?: number;
        "cursor"?: string;
    };
}
export interface GetTargetedCampaignListRequest {
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 20 */
    "page_size": number;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** The list of campaign_id for query, different campaign id should be split by comma and at most 50 campaigns. Example: 101,102,103 */
    "campaign_id_list"?: string;
    /** Campaign name for query. Example: campaign a */
    "campaign_name"?: string;
    /** Campaign status for query. Applicable values: Upcoming Ongoing Ended Cancelled Draft Terminating Terminated Paused Example: Upcoming */
    "campaign_status"?: string;
    /** Campaign period start time for query. Example: 1735660800 */
    "period_start_time"?: number;
    /** Campaign period end time for query. Example: 32503651199 */
    "period_end_time"?: number;
    /** Item id for query. Example: 101 */
    "item_id"?: number;
    /** Item name for query. Example: product a */
    "item_name"?: string;
}
export interface GetTargetedCampaignListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "campaign_list"?: Array<{
            "campaign_id"?: number;
            "campaign_name"?: string;
            "campaign_status"?: string;
            "campaign_source"?: string;
            "period_start_time"?: number;
            "period_end_time"?: number;
            "last_editor"?: string;
            "last_edit_time"?: number;
            "affiliate_count"?: number;
            "item_count"?: number;
            "min_rate"?: number;
            "max_rate"?: number;
        }>;
    };
}
export interface GetTargetedCampaignPerformanceRequest {
    /** Period Type. Applicable values: Day Week Month Last7d Last30d Note: The start date and end date must align with the Period Type. Example: Last30d */
    "period_type": string;
    /** The start_date must be: - Any day in the past three calendar months for "Day" period type - Sunday for "Week" period type - The 1st day of a Month for "Month" period type - The date that is 6 days prior to the latest data date for "Last7d" period type - The date that is 29 days prior to the latest data date for "Last30d" period type Note: The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250801 */
    "start_date": string;
    /** The end_date must be: - Equal to start_date for "Day" period type - Saturday for "Week" period type - The last day of a Month for "Month" period type. If the selected month is the current month, the end_date should be the latest data date - The latest data date for "Last7d" period type - The latest data date for "Last30d" period type Note: - The end_date must be later than the start_date and earlier than the latest data date - The latest data date can be obtained by using "AmsMarker" in the v2.ams.get_performance_data_update_time API. Example: 20250831 */
    "end_date": string;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 20. Example: 20 */
    "page_size": number;
    /** Campaign ID for query. */
    "campaign_id"?: number;
}
export interface GetTargetedCampaignPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "campaign_id"?: number;
            "affiliates"?: number;
            "sales"?: string;
            "item_sold"?: number;
            "est_commission"?: string;
            "campaign_name"?: string;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
        "fetched_date_range"?: string;
    };
}
export interface GetTargetedCampaignSettingsRequest {
    /** Campaign id for query. Note: For campaigns with campaign_source = ShopeeManaged, cannot be queried for details through this API. Example: 101 */
    "campaign_id": number;
}
export interface GetTargetedCampaignSettingsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "campaign_name"?: string;
        "commission_status"?: string;
        "period_start_time"?: number;
        "period_end_time"?: number;
        "is_set_budget"?: boolean;
        "budget"?: number;
        "budget_cost"?: number;
        "seller_message"?: string;
        "pending_terminated_time"?: number;
        "affiliate_list"?: Array<{
            "affiliate_id"?: number;
        }>;
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "rate"?: number;
            "max_commission_rate_current_day"?: number;
            "commission_protection_list"?: Array<{
                "commission_rate"?: number;
                "protection_period_end_time"?: number;
            }>;
        }>;
    };
}
export interface GetValidationListRequest {
}
export interface GetValidationListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "validation_list"?: Array<{
            "validation_id"?: string;
            "payment_method"?: number;
            "validation_month"?: number;
            "campaign_source"?: string;
            "online_bill": {
                "total_amount"?: number;
                "bill_status"?: number;
                "deducted_amount"?: number;
                "ams_credit_deducted_amount"?: number;
                "pending_amount"?: number;
            };
            "offline_bills"?: Array<{
                "order_place_month"?: number;
                "total_amount"?: number;
                "commission_amount"?: number;
                "commission_amount_after_tax"?: number;
                "ams_credit_deducted_amount"?: number;
            }>;
        }>;
    };
}
export interface GetValidationReportRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. If data is more than one page, the page_no can be some entry to start next call. Example: 1 */
    "page_no": number;
    /** Number of records returned per page, the maximum limit is 500, and page_no * page_size must be <= 10000. Example: 20 */
    "page_size": number;
    /** Unique identifier of the billing entry. Example: 602516439202502 */
    "validation_id": string;
    /** Billing month in the format YYYYMM (e.g., 202405). Example: 202502 */
    "validation_month": number;
    /** Source of campaign setup. Applicable values: ShopeeManaged Seller Example: ShopeeManaged */
    "campaign_source": string;
    /** Unique identifier of the order. Example: CWTUQ80EF9 */
    "order_sn"?: string;
    /** Hierarchical product category classification. (L1 Category) Example: 104136 */
    "l1_category_id"?: number;
    /** Hierarchical product category classification. (L2 Category) Example: 241360 */
    "l2_category_id"?: number;
    /** Hierarchical product category classification. (L3 Category) Example: 404136 */
    "l3_category_id"?: number;
    /** Unique identifier of the product. Example: 3702824955 */
    "item_id"?: number;
    /** The product's name. Example: item1 */
    "item_name"?: string;
    /** Verified Status. Applicable values: Valid Invalid Example: Valid */
    "verified_status"?: string;
    /** ID referencing the campaign rule applied. (Ties to the campaign seller created). Example: 18071 */
    "attr_campaign_id"?: number;
    /** Start time (inclusive) of order placement, in timestamp format. Example: 1753459200 */
    "place_order_time_start": number;
    /** End time (inclusive) of order placement, in timestamp format. Example: 1756051199 */
    "place_order_time_end": number;
}
export interface GetValidationReportResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "order_sn"?: string;
            "order_status"?: string;
            "verified_status"?: string;
            "place_order_time"?: string;
            "order_completed_time"?: string;
            "conversion_completed_time"?: string;
            "affiliate_name"?: string;
            "affiliate_username"?: string;
            "linked_mcn"?: string;
            "campaign_partner"?: string;
            "order_type"?: string;
            "order_brand_commission"?: string;
            "channel"?: string;
            "affiliate_id"?: number;
            "buyer_status"?: string;
            "items"?: Array<{
                "item_id"?: number;
                "item_name"?: string;
                "model_id"?: number;
                "l1_category_id"?: number;
                "l2_category_id"?: number;
                "l3_category_id"?: number;
                "promotion_id"?: string;
                "price"?: number;
                "qty"?: number;
                "seller_campaign_type"?: string;
                "attr_campaign_id"?: number;
                "purchase_value"?: number;
                "refund_amount"?: string;
                "item_brand_commission"?: string;
                "item_brand_commission_rate_to_affiliate"?: string;
                "item_brand_commission_to_affiliate"?: string;
                "item_brand_commission_rate_to_mcn"?: string;
                "item_brand_commission_to_mcn"?: string;
                "seller_service_fee_rate"?: string;
                "seller_service_fee"?: string;
            }>;
        }>;
        "total_count"?: number;
        "has_more"?: boolean;
    };
}
export interface QueryAffiliateListRequest {
    /** Query type: 1: query affiliate information by id list 2: query affiliate id by name(fuzzy matching), only return affiliate id and affiliate name Example: 1 */
    "query_type": number;
    /** Query affiliate information by affiliate id list. Max count of affiliate id is 200. Will return first 200 affiliates' information if length > 200. Example: 1,2,3 */
    "affiliate_id_list"?: string;
    /** Query affiliate information by name use fuzzy matching. Will return first 200 affiliates' information is match number > 200. Example: ddd */
    "name"?: string;
}
export interface QueryAffiliateListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "affiliate_list": {
            "affiliate_id"?: number;
            "affiliate_name"?: string;
            "user_name"?: string;
            "portrait_url"?: string;
            "popular_social_media"?: Array<{
                "platform"?: string;
                "follower_count"?: number;
            }>;
            "social_medias"?: Array<{
                "platform"?: string;
                "follower_count"?: number;
                "social_media_user_name"?: string;
            }>;
            "total_click"?: number;
            "order_range"?: Array<number>;
            "gmv_range"?: Array<number>;
            "is_orange_tick_kol"?: boolean;
            "is_good_fulfillment"?: boolean;
            "promote_category_ids"?: Array<number>;
            "top_popular_contents"?: Array<{
                "platform"?: string;
                "comment_count"?: number;
                "like_count"?: number;
                "view_count"?: number;
                "cover_url"?: string;
                "media_url"?: string;
            }>;
            "top_selling_products"?: Array<{
                "item_id"?: number;
            }>;
        };
    };
}
export interface RemoveAllProductsOpenCampaignSettingRequest {
}
export interface RemoveAllProductsOpenCampaignSettingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "task_type"?: string;
        "task_id"?: string;
    };
}
export interface TerminateTargetedCampaignRequest {
    "campaign_id": number;
}
export interface TerminateTargetedCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateAutoAddNewProductSettingRequest {
    "open": boolean;
    "commission_rate"?: number;
}
export interface UpdateAutoAddNewProductSettingResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateBasicInfoOfTargetedCampaignRequest {
    "campaign_id": number;
    "campaign_name"?: string;
    "period_start_time"?: number;
    "period_end_time"?: number;
    "is_set_budget"?: boolean;
    "budget"?: number;
}
export interface UpdateBasicInfoOfTargetedCampaignResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export declare class ShopeeAMSApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add all products to open campaign
     * /api/v2/ams/add_all_products_to_open_campaign (POST)
     */
    addAllProductsToOpenCampaign(params: AddAllProductsToOpenCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddAllProductsToOpenCampaignResponse>>;
    /**
     * batch add products to open campaign
     * /api/v2/ams/batch_add_products_to_open_campaign (POST)
     */
    batchAddProductsToOpenCampaign(params: BatchAddProductsToOpenCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchAddProductsToOpenCampaignResponse>>;
    /**
     * batch edit products open campaign setting
     * /api/v2/ams/batch_edit_products_open_campaign_setting (POST)
     */
    batchEditProductsOpenCampaignSetting(params: BatchEditProductsOpenCampaignSettingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchEditProductsOpenCampaignSettingResponse>>;
    /**
     * batch get products suggested rate
     * /api/v2/ams/batch_get_products_suggested_rate (GET)
     */
    batchGetProductsSuggestedRate(params: BatchGetProductsSuggestedRateRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchGetProductsSuggestedRateResponse>>;
    /**
     * batch remove products open campaign setting
     * /api/v2/ams/batch_remove_products_open_campaign_setting (POST)
     */
    batchRemoveProductsOpenCampaignSetting(params: BatchRemoveProductsOpenCampaignSettingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchRemoveProductsOpenCampaignSettingResponse>>;
    /**
     * create new targeted campaign
     * /api/v2/ams/create_new_targeted_campaign (POST)
     */
    createNewTargetedCampaign(params: CreateNewTargetedCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateNewTargetedCampaignResponse>>;
    /**
     * edit affiliate list of targeted campaign
     * /api/v2/ams/edit_affiliate_list_of_targeted_campaign (POST)
     */
    editAffiliateListOfTargetedCampaign(params: EditAffiliateListOfTargetedCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EditAffiliateListOfTargetedCampaignResponse>>;
    /**
     * edit all products open campaign setting
     * /api/v2/ams/edit_all_products_open_campaign_setting (POST)
     */
    editAllProductsOpenCampaignSetting(params: EditAllProductsOpenCampaignSettingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EditAllProductsOpenCampaignSettingResponse>>;
    /**
     * edit product list of targeted campaign
     * /api/v2/ams/edit_product_list_of_targeted_campaign (POST)
     */
    editProductListOfTargetedCampaign(params: EditProductListOfTargetedCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<EditProductListOfTargetedCampaignResponse>>;
    /**
     * get affiliate performance
     * /api/v2/ams/get_affiliate_performance (GET)
     */
    getAffiliatePerformance(params: GetAffiliatePerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAffiliatePerformanceResponse>>;
    /**
     * get auto add new product toggle status
     * /api/v2/ams/get_auto_add_new_product_toggle_status (GET)
     */
    getAutoAddNewProductToggleStatus(params: GetAutoAddNewProductToggleStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAutoAddNewProductToggleStatusResponse>>;
    /**
     * get campaign key metrics performance
     * /api/v2/ams/get_campaign_key_metrics_performance (GET)
     */
    getCampaignKeyMetricsPerformance(params: GetCampaignKeyMetricsPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCampaignKeyMetricsPerformanceResponse>>;
    /**
     * get content performance
     * /api/v2/ams/get_content_performance (GET)
     */
    getContentPerformance(params: GetContentPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetContentPerformanceResponse>>;
    /**
     * get conversion report
     * /api/v2/ams/get_conversion_report (GET)
     */
    getConversionReport(params: GetConversionReportRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetConversionReportResponse>>;
    /**
     * get managed affiliate list
     * /api/v2/ams/get_managed_affiliate_list (GET)
     */
    getManagedAffiliateList(params: GetManagedAffiliateListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetManagedAffiliateListResponse>>;
    /**
     * get open campaign added product
     * /api/v2/ams/get_open_campaign_added_product (GET)
     */
    getOpenCampaignAddedProduct(params: GetOpenCampaignAddedProductRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOpenCampaignAddedProductResponse>>;
    /**
     * get open campaign batch task result
     * /api/v2/ams/get_open_campaign_batch_task_result (GET)
     */
    getOpenCampaignBatchTaskResult(params: GetOpenCampaignBatchTaskResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOpenCampaignBatchTaskResultResponse>>;
    /**
     * get open campaign not added product
     * /api/v2/ams/get_open_campaign_not_added_product (GET)
     */
    getOpenCampaignNotAddedProduct(params: GetOpenCampaignNotAddedProductRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOpenCampaignNotAddedProductResponse>>;
    /**
     * get open campaign performance
     * /api/v2/ams/get_open_campaign_performance (GET)
     */
    getOpenCampaignPerformance(params: GetOpenCampaignPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOpenCampaignPerformanceResponse>>;
    /**
     * get optimization suggestion product
     * /api/v2/ams/get_optimization_suggestion_product (GET)
     */
    getOptimizationSuggestionProduct(params: GetOptimizationSuggestionProductRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOptimizationSuggestionProductResponse>>;
    /**
     * get performance data update time
     * /api/v2/ams/get_performance_data_update_time (GET)
     */
    getPerformanceDataUpdateTime(params: GetPerformanceDataUpdateTimeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPerformanceDataUpdateTimeResponse>>;
    /**
     * get product performance
     * /api/v2/ams/get_product_performance (GET)
     */
    getProductPerformance(params: GetProductPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetProductPerformanceResponse>>;
    /**
     * get recommended affiliate list
     * /api/v2/ams/get_recommended_affiliate_list (GET)
     */
    getRecommendedAffiliateList(params: GetRecommendedAffiliateListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetRecommendedAffiliateListResponse>>;
    /**
     * get shop performance
     * /api/v2/ams/get_shop_performance (GET)
     */
    getShopPerformance(params: GetShopPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopPerformanceResponse>>;
    /**
     * get shop suggested rate
     * /api/v2/ams/get_shop_suggested_rate (GET)
     */
    getShopSuggestedRate(params: GetShopSuggestedRateRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopSuggestedRateResponse>>;
    /**
     * get targeted campaign addable product list
     * /api/v2/ams/get_targeted_campaign_addable_product_list (GET)
     */
    getTargetedCampaignAddableProductList(params: GetTargetedCampaignAddableProductListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTargetedCampaignAddableProductListResponse>>;
    /**
     * get targeted campaign list
     * /api/v2/ams/get_targeted_campaign_list (GET)
     */
    getTargetedCampaignList(params: GetTargetedCampaignListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTargetedCampaignListResponse>>;
    /**
     * get targeted campaign performance
     * /api/v2/ams/get_targeted_campaign_performance (GET)
     */
    getTargetedCampaignPerformance(params: GetTargetedCampaignPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTargetedCampaignPerformanceResponse>>;
    /**
     * get targeted campaign settings
     * /api/v2/ams/get_targeted_campaign_settings (GET)
     */
    getTargetedCampaignSettings(params: GetTargetedCampaignSettingsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTargetedCampaignSettingsResponse>>;
    /**
     * get validation list
     * /api/v2/ams/get_validation_list (GET)
     */
    getValidationList(params: GetValidationListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetValidationListResponse>>;
    /**
     * get validation report
     * /api/v2/ams/get_validation_report (GET)
     */
    getValidationReport(params: GetValidationReportRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetValidationReportResponse>>;
    /**
     * query affiliate list
     * /api/v2/ams/query_affiliate_list (GET)
     */
    queryAffiliateList(params: QueryAffiliateListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<QueryAffiliateListResponse>>;
    /**
     * remove all products open campaign setting
     * /api/v2/ams/remove_all_products_open_campaign_setting (POST)
     */
    removeAllProductsOpenCampaignSetting(params: RemoveAllProductsOpenCampaignSettingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<RemoveAllProductsOpenCampaignSettingResponse>>;
    /**
     * terminate targeted campaign
     * /api/v2/ams/terminate_targeted_campaign (POST)
     */
    terminateTargetedCampaign(params: TerminateTargetedCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<TerminateTargetedCampaignResponse>>;
    /**
     * update auto add new product setting
     * /api/v2/ams/update_auto_add_new_product_setting (POST)
     */
    updateAutoAddNewProductSetting(params: UpdateAutoAddNewProductSettingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateAutoAddNewProductSettingResponse>>;
    /**
     * update basic info of targeted campaign
     * /api/v2/ams/update_basic_info_of_targeted_campaign (POST)
     */
    updateBasicInfoOfTargetedCampaign(params: UpdateBasicInfoOfTargetedCampaignRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateBasicInfoOfTargetedCampaignResponse>>;
}
