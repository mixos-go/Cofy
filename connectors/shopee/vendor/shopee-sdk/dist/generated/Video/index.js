"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Video).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeVideoApi = void 0;
class ShopeeVideoApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * delete video
     * /api/v2/video/delete_video (POST)
     */
    async deleteVideo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/video/delete_video", "query": [], "body": ["video_upload_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * edit video info
     * /api/v2/video/edit_video_info (POST)
     */
    async editVideoInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/video/edit_video_info", "query": [], "body": ["video_upload_list", "aigc_label"], "scope": "shop" }, params, opts);
    }
    /**
     * get cover list
     * /api/v2/video/get_cover_list (GET)
     */
    async getCoverList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_cover_list", "query": ["video_upload_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get metric trend
     * /api/v2/video/get_metric_trend (GET)
     */
    async getMetricTrend(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_metric_trend", "query": ["period_type", "end_date"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get overview performance
     * /api/v2/video/get_overview_performance (GET)
     */
    async getOverviewPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_overview_performance", "query": ["period_type", "end_date"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get prodcut performance list
     * /api/v2/video/get_prodcut_performance_list (GET)
     */
    async getProdcutPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_prodcut_performance_list", "query": ["page_no", "page_size", "period_type", "end_date", "order_by", "sort", "item_id", "item_name"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get user demographics
     * /api/v2/video/get_user_demographics (GET)
     */
    async getUserDemographics(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_user_demographics", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video detail
     * /api/v2/video/get_video_detail (GET)
     */
    async getVideoDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_detail", "query": ["video_upload_id", "post_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video detail audience distribution
     * /api/v2/video/get_video_detail_audience_distribution (GET)
     */
    async getVideoDetailAudienceDistribution(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_detail_audience_distribution", "query": ["post_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video detail metric trend
     * /api/v2/video/get_video_detail_metric_trend (GET)
     */
    async getVideoDetailMetricTrend(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_detail_metric_trend", "query": ["post_id", "metric_name"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video detail performance
     * /api/v2/video/get_video_detail_performance (GET)
     */
    async getVideoDetailPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_detail_performance", "query": ["post_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video detail product performance
     * /api/v2/video/get_video_detail_product_performance (GET)
     */
    async getVideoDetailProductPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_detail_product_performance", "query": ["page_no", "page_size", "post_id", "item_id", "item_name"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video list
     * /api/v2/video/get_video_list (GET)
     */
    async getVideoList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_list", "query": ["page_no", "page_size", "list_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get video performance list
     * /api/v2/video/get_video_performance_list (GET)
     */
    async getVideoPerformanceList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/video/get_video_performance_list", "query": ["page_no", "page_size", "period_type", "end_date", "caption", "order_by", "sort"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * post video
     * /api/v2/video/post_video (POST)
     */
    async postVideo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/video/post_video", "query": [], "body": ["video_upload_id_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeVideoApi = ShopeeVideoApi;
//# sourceMappingURL=index.js.map