import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface GetLateOrdersRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Default is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Default is 10. Example: 10 */
    "page_size"?: number;
}
export interface GetLateOrdersResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "late_order_list"?: Array<{
            "late_by_days"?: number;
            "order_sn"?: string;
            "shipping_deadline"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetListingsWithIssuesRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Default is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Default is 10. Example: 10 */
    "page_size"?: number;
}
export interface GetListingsWithIssuesResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "listing_list"?: Array<{
            "item_id"?: number;
            "reason"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetMetricSourceDetailRequest {
    /** ID of metric. Supported values: 1: Late Shipment Rate (All Channels) 3: Non-Fulfilment Rate (All Channels) 4: Preparation Time 12: Pre-order Listing % 15: Days of Pre-order Listing Violation 25: Fast Handover Rate 28: On-time Pickup Failure Rate Violation Value 42: Cancellation Rate (All Channels) 43: Return-refund Rate (All Channels) 52: Severe Listing Violations 53: Other Listing Violations 85: Late Shipment Rate (NDD) 88: Non-fulfilment Rate (NDD 91: Cancellation Rate (NDD) 92: Return-refund Rate (NDD) 96: % SDD Listings 97: % NDD Listings 2001: Fast Handover Rate - SLS 2002: Fast Handover Rate - FBS 2003: Fast Handover Rate - 3PF 2030: % HD Listings 2031: % HD Free Shipping Enabled 2032: Saturday Shipment 2033: Preparation Time PS 2033: Preparation Time PS 2036: OTDR Logistic Rate 2037: OTDR DD Rate Example: 1 */
    "metric_id": number;
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Default is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Default is 10. Example: 10 */
    "page_size"?: number;
}
export interface GetMetricSourceDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "lsr_order_list"?: Array<{
            "actual_shipping_time"?: number;
            "late_by_days"?: number;
            "order_sn"?: string;
            "shipping_deadline"?: number;
        }>;
        "metrics_id"?: number;
        "total_count"?: number;
    };
}
export interface GetPenaltyPointHistoryRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Default is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Default is 10. Example: 10 */
    "page_size"?: number;
    /** Applicable values: 5: High Late Shipment Rate 6: High Non-fulfilment Rate 7: High number of non-fulfilled orders 8: High number of late shipped orders 9: Prohibited Listings 10: Counterfeit / IP infringement 11: Spam 12: Copy/Steal images 13: Re-uploading deleted listings with no change 14: Bought counterfeit from mall 15: Counterfeit caught by Shopee 16: High percentage of pre-order listings 17: Confirmed Fraud attempts (total) 18: Confirmed Fraud attempts per week (All with vouchers only) 19: Fake return address 20: Shipping fraud/abuse 21: High No. of Non-responded Chat 22: Rude chat replies 23: Request buyer to cancel order 24: Rude reply to buyer's review 25: Violate Return/Refund policy 101: Tier Reason 3026: Misuse of Shopee’s IP 3028: Violate Shop Name Regulations 3030: Direct transactions outside of the Shopee platform 3032: Shipping empty / incomplete parcels 3034: Severe Violations on Shopee Feed 3036: Severe Violations on Shopee LIVE 3038: Misuse of Local Vendor Tag 3040: Use of misleading shop tag in listing image 3042: Counterfeit / IP Infringement test 3044: Repeat Offender - IP infringement and Counterfeit listings 3046: Violation of Live Animals Selling Policy 3048: Chat Spam 3050: High Overseas Return Refunds Rate 3052: Privacy breach in buyer's review reply 3054: Order Brushing 3056: porn image 3058: Incorrect Product Categories 3060: Extremely High Non-Fulfilment Rate 3062: Penalty of Affiliate Marketing Solution (AMS) Overdue Invoice Payment 3064: Government-related listing 3066: Listing invalid gifted items 3068: High non-fulfilment rate (Next Day Delivery Orders) 3070: High Late Shipment Rate (Next Day Delivery Orders) 3072: OPFR Violation Value 3074: Direct transactions outside Shopee platform via chat 3090: Prohibited Listings-Extreme Violations 3091: Prohibited Listings-High Violations 3092: Prohibited Listings-Mid Violations 3093: Prohibited Listings-Low Violations 3094: Counterfeit Listings-Extreme Violations 3095: Counterfeit Listings-High Violations 3096: Counterfeit Listings-Mid Violations 3097: Counterfeit Listings-Low Violations 3098: Spam Listings-Extreme Violations 3099: Spam Listings-High Violations 3100: Spam Listings-Mid Violations 3101: Spam Listings-Low Violations 3145: Return/Refund Rate (Non-integrated Channel) 4130: Poor Product Quality Example: 5 */
    "violation_type"?: number;
}
export interface GetPenaltyPointHistoryResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "penalty_point_list"?: Array<{
            "issue_time"?: number;
            "latest_point_num"?: number;
            "original_point_num"?: number;
            "reference_id"?: number;
            "violation_type"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetPunishmentHistoryRequest {
    /** Specifies the page number of data to return in the current call. Starting from 1. if data is more than one page, the page_no can be some entry to start next call. Default is 1. Example: 1 */
    "page_no"?: number;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call), and the "page_no" to start next call. This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Default is 10. Example: 10 */
    "page_size"?: number;
    /** The status of punishment. Applicable values: 1: Ongoing 2: Ended Example: 1 */
    "punishment_status": number;
}
export interface GetPunishmentHistoryResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "punishment_list"?: Array<{
            "end_time"?: number;
            "issue_time"?: number;
            "punishment_type"?: number;
            "reason"?: number;
            "reference_id"?: number;
            "start_time"?: number;
        }>;
        "total_count"?: number;
    };
}
export interface GetShopPerformanceRequest {
}
export interface GetShopPerformanceResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "metric_list"?: Array<{
            "current_period"?: null;
            "last_period"?: null;
            "metric_id"?: number;
            "metric_name"?: string;
            "metric_type"?: number;
            "parent_metric_id"?: number;
            "target": {
                "comparator"?: string;
                "value"?: number;
            };
            "unit"?: number;
        }>;
        "overall_performance": {
            "custom_service_failed"?: number;
            "fulfillment_failed"?: number;
            "listing_failed"?: number;
            "rating"?: number;
        };
    };
}
export declare class ShopeeAccountHealthApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * get late orders
     * /api/v2/account_health/get_late_orders (GET)
     */
    getLateOrders(params: GetLateOrdersRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetLateOrdersResponse>>;
    /**
     * get listings with issues
     * /api/v2/account_health/get_listings_with_issues (GET)
     */
    getListingsWithIssues(params: GetListingsWithIssuesRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetListingsWithIssuesResponse>>;
    /**
     * get metric source detail
     * /api/v2/account_health/get_metric_source_detail (GET)
     */
    getMetricSourceDetail(params: GetMetricSourceDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMetricSourceDetailResponse>>;
    /**
     * get penalty point history
     * /api/v2/account_health/get_penalty_point_history (GET)
     */
    getPenaltyPointHistory(params: GetPenaltyPointHistoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPenaltyPointHistoryResponse>>;
    /**
     * get punishment history
     * /api/v2/account_health/get_punishment_history (GET)
     */
    getPunishmentHistory(params: GetPunishmentHistoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPunishmentHistoryResponse>>;
    /**
     * get shop performance
     * /api/v2/account_health/get_shop_performance (GET)
     */
    getShopPerformance(params: GetShopPerformanceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopPerformanceResponse>>;
}
