"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/analytics).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAnalyticsApi = void 0;
class TikTokAnalyticsApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GetGMVTrendPerformances
     * /analytics/202309/live_rooms/{live_room_id}/gmv_trend_performances (GET)
     */
    async getGMVTrendPerformances(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/gmv_trend_performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetInteractiveTrendPerformances
     * /analytics/202309/live_rooms/{live_room_id}/interactive_trend_performances (GET)
     */
    async getInteractiveTrendPerformances(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/interactive_trend_performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetLiveCoreStats
     * /analytics/202309/live_rooms/{live_room_id}/core_stats (GET)
     */
    async getLiveCoreStats(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/core_stats", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetProductStats
     * /analytics/202309/live_rooms/{live_room_id}/product_stats (GET)
     */
    async getProductStats(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/product_stats", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEPerformanceList
     * /analytics/202509/shop_lives/performance (GET)
     */
    async getShopLIVEPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_lives/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "page_size", "sort_field", "sort_order", "currency", "page_token", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEPerformanceListOLD
     * /analytics/202505/shop_lives/performance (POST)
     */
    async getShopLIVEPerformanceListOLD(params, opts) {
        return this.client.request({ "method": "POST", "path": "/analytics/202505/shop_lives/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "page_size", "sort_field", "sort_order", "currency", "page_token", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEPerformanceOverview
     * /analytics/202509/shop_lives/overview_performance (GET)
     */
    async getShopLIVEPerformanceOverview(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_lives/overview_performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "today", "granularity", "currency", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEPerformanceOverviewOLD
     * /analytics/202503/shop_lives/overview_performance (POST)
     */
    async getShopLIVEPerformanceOverviewOLD(params, opts) {
        return this.client.request({ "method": "POST", "path": "/analytics/202503/shop_lives/overview_performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "with_comparison", "granularity", "currency", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEPerformancePerMinutes
     * /analytics/202510/shop_lives/{live_id}/performance_per_minutes (GET)
     */
    async getShopLIVEPerformancePerMinutes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202510/shop_lives/{live_id}/performance_per_minutes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "currency", "shop_cipher"], "headers": [], "pathParams": ["live_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopLIVEProductsPerformanceList
     * /analytics/202512/shop/{live_id}/products_performance (GET)
     */
    async getShopLIVEProductsPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202512/shop/{live_id}/products_performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["sort_order", "sort_field", "currency", "shop_cipher"], "headers": [], "pathParams": ["live_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopPerformance
     * /analytics/202509/shop/performance (GET)
     */
    async getShopPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "granularity", "currency", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopPerformancePerHour
     * /analytics/202510/shop/performance/{date}/performance_per_hour (GET)
     */
    async getShopPerformancePerHour(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202510/shop/performance/{date}/performance_per_hour", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["currency", "shop_cipher"], "headers": [], "pathParams": ["date"], "body": [] }, params, opts);
    }
    /**
     * GetShopProductPerformanceDetail
     * /analytics/202509/shop_products/{product_id}/performance (GET)
     */
    async getShopProductPerformanceDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_products/{product_id}/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "granularity", "currency", "shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopProductPerformanceList
     * /analytics/202509/shop_products/performance (GET)
     */
    async getShopProductPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_products/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "page_size", "page_token", "sort_field", "sort_order", "currency", "category_filter", "product_status_filter", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopSKUPerformance
     * /analytics/202509/shop_skus/{sku_id}/performance (GET)
     */
    async getShopSKUPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_skus/{sku_id}/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "granularity", "currency", "shop_cipher"], "headers": [], "pathParams": ["sku_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopSKUPerformanceList
     * /analytics/202509/shop_skus/performance (GET)
     */
    async getShopSKUPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_skus/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "page_size", "page_token", "sort_field", "sort_order", "category_filter", "product_status_filter", "product_ids", "currency", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopVideoPerformanceDetails
     * /analytics/202509/shop_videos/{video_id}/performance (GET)
     */
    async getShopVideoPerformanceDetails(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_videos/{video_id}/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "granularity", "currency", "shop_cipher"], "headers": [], "pathParams": ["video_id"], "body": [] }, params, opts);
    }
    /**
     * GetShopVideoPerformanceList
     * /analytics/202509/shop_videos/performance (GET)
     */
    async getShopVideoPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_videos/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "page_size", "sort_field", "sort_order", "currency", "page_token", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopVideoPerformanceOverview
     * /analytics/202509/shop_videos/overview_performance (GET)
     */
    async getShopVideoPerformanceOverview(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_videos/overview_performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["start_date_ge", "end_date_lt", "today", "granularity", "currency", "account_type", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopVideoProductPerformanceList
     * /analytics/202509/shop_videos/{video_id}/products/performance (GET)
     */
    async getShopVideoProductPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202509/shop_videos/{video_id}/products/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["end_date_lt", "page_size", "sort_field", "sort_order", "currency", "page_token", "start_date_ge", "shop_cipher"], "headers": [], "pathParams": ["video_id"], "body": [] }, params, opts);
    }
    /**
     * GetTrafficPerformances
     * /analytics/202309/live_rooms/{live_room_id}/traffic_performances (GET)
     */
    async getTrafficPerformances(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/traffic_performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetUserPortraits
     * /analytics/202309/live_rooms/{live_room_id}/user_portraits (GET)
     */
    async getUserPortraits(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/user_portraits", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
    /**
     * GetVideoPerformances
     * /analytics/202403/videos/performances (GET)
     */
    async getVideoPerformances(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202403/videos/performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["video_ids", "start_time_ge", "end_time_le"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetViewTrendPerformances
     * /analytics/202309/live_rooms/{live_room_id}/view_trend_performances (GET)
     */
    async getViewTrendPerformances(params, opts) {
        return this.client.request({ "method": "GET", "path": "/analytics/202309/live_rooms/{live_room_id}/view_trend_performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["live_room_id"], "body": [] }, params, opts);
    }
}
exports.TikTokAnalyticsApi = TikTokAnalyticsApi;
//# sourceMappingURL=index.js.map