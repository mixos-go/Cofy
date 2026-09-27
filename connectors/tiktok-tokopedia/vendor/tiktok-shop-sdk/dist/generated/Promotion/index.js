"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/promotion).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokPromotionApi = void 0;
class TikTokPromotionApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateActivity
     * /promotion/202309/activities (POST)
     */
    async createActivity(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/promotion/202309/activities", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["activity_type", "begin_time", "discount", "duration_type", "end_time", "participation_limit", "product_level", "target_user_info", "title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * DeactivateActivity
     * /promotion/202309/activities/{activity_id}/deactivate (POST)
     */
    async deactivateActivity(params, opts) {
        return this.client.request({ "method": "POST", "path": "/promotion/202309/activities/{activity_id}/deactivate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["activity_id"], "body": [] }, params, opts);
    }
    /**
     * GetActivity
     * /promotion/202309/activities/{activity_id} (GET)
     */
    async getActivity(params, opts) {
        return this.client.request({ "method": "GET", "path": "/promotion/202309/activities/{activity_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["activity_id"], "body": [] }, params, opts);
    }
    /**
     * GetCoupon
     * /promotion/202406/coupons/{coupon_id} (GET)
     */
    async getCoupon(params, opts) {
        return this.client.request({ "method": "GET", "path": "/promotion/202406/coupons/{coupon_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["coupon_id"], "body": [] }, params, opts);
    }
    /**
     * RemoveActivityProduct
     * /promotion/202309/activities/{activity_id}/products (DELETE)
     */
    async removeActivityProduct(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/promotion/202309/activities/{activity_id}/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["activity_id"], "body": ["product_ids", "sku_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchActivities
     * /promotion/202309/activities/search (POST)
     */
    async searchActivities(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/promotion/202309/activities/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["activity_title", "activity_type", "page_size", "page_token", "status"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCoupons
     * /promotion/202406/coupons/search (POST)
     */
    async searchCoupons(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/promotion/202406/coupons/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": ["display_type", "status", "title_keyword"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateActivity
     * /promotion/202309/activities/{activity_id} (PUT)
     */
    async updateActivity(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/promotion/202309/activities/{activity_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["activity_id"], "body": ["begin_time", "discount", "duration_type", "end_time", "participation_limit", "product_level", "target_user_info", "title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateActivityProduct
     * /promotion/202309/activities/{activity_id}/products (PUT)
     */
    async updateActivityProduct(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/promotion/202309/activities/{activity_id}/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["activity_id"], "body": ["activity_id", "products"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokPromotionApi = TikTokPromotionApi;
//# sourceMappingURL=index.js.map