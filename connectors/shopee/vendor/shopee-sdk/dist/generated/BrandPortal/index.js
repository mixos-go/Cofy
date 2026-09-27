"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/BrandPortal).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeBrandPortalApi = void 0;
class ShopeeBrandPortalApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get clip video performance
     * /api/v2/principal/get_clip_video_performance (POST)
     */
    async getClipVideoPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_clip_video_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "page_size", "cursor"], "scope": "shop" }, params, opts);
    }
    /**
     * get content affiliate performance
     * /api/v2/principal/get_content_affiliate_performance (POST)
     */
    async getContentAffiliatePerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_content_affiliate_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "page_size", "cursor"], "scope": "shop" }, params, opts);
    }
    /**
     * get principal affiliate performance
     * /api/v2/principal/get_principal_affiliate_performance (POST)
     */
    async getPrincipalAffiliatePerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_principal_affiliate_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "region_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get principal livestream performance
     * /api/v2/principal/get_principal_livestream_performance (POST)
     */
    async getPrincipalLivestreamPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_principal_livestream_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "region_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get principal sales performance detail
     * /api/v2/principal/get_principal_sales_performance_detail (POST)
     */
    async getPrincipalSalesPerformanceDetail(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_principal_sales_performance_detail", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "region_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get principal video performance
     * /api/v2/principal/get_principal_video_performance (POST)
     */
    async getPrincipalVideoPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_principal_video_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "region_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get session livestream performance
     * /api/v2/principal/get_session_livestream_performance (POST)
     */
    async getSessionLivestreamPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_session_livestream_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "page_size", "cursor"], "scope": "shop" }, params, opts);
    }
    /**
     * get shop affiliate performance
     * /api/v2/principal/get_shop_affiliate_performance (POST)
     */
    async getShopAffiliatePerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_shop_affiliate_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "shop_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get shop livestream performance
     * /api/v2/principal/get_shop_livestream_performance (POST)
     */
    async getShopLivestreamPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_shop_livestream_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "shop_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get shop sales performance detail
     * /api/v2/principal/get_shop_sales_performance_detail (POST)
     */
    async getShopSalesPerformanceDetail(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_shop_sales_performance_detail", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "shop_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get shop video performance
     * /api/v2/principal/get_shop_video_performance (POST)
     */
    async getShopVideoPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/principal/get_shop_video_performance", "query": [], "body": ["start_date", "end_date", "timezone", "granularity", "shop_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeBrandPortalApi = ShopeeBrandPortalApi;
//# sourceMappingURL=index.js.map