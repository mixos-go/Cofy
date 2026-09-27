"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/affiliate).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAffiliateApi = void 0;
class TikTokAffiliateApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * AddLIVEProducts
     * /affiliate/202309/live_rooms/products (POST)
     */
    async addLIVEProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/live_rooms/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * AddShowcaseProductsold
     * /affiliate/202309/showcases/products (POST)
     */
    async addShowcaseProductsold(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/showcases/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CheckAnchorContent
     * /affiliate/202403/anchors/content_check (POST)
     */
    async checkAnchorContent(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202403/anchors/content_check", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CheckAnchorPrerequisites
     * /affiliate/202402/anchors/prerequisite_check (POST)
     */
    async checkAnchorPrerequisites(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202402/anchors/prerequisite_check", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetCreatorProfileold
     * /affiliate/202309/profiles (GET)
     */
    async getCreatorProfileold(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate/202309/profiles", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetLIVEProducts
     * /affiliate/202309/live_rooms/products (GET)
     */
    async getLIVEProducts(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate/202309/live_rooms/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetLiveRoomInfo
     * /affiliate/202309/live_rooms (GET)
     */
    async getLiveRoomInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate/202309/live_rooms", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopProductslegacy
     * /affiliate/202309/shop_products (GET)
     */
    async getShopProductslegacy(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate/202309/shop_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "title_keyword", "sort_field", "sort_order"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShowcaseProductsold
     * /affiliate/202309/showcases/products (GET)
     */
    async getShowcaseProductsold(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate/202309/showcases/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "origin"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * PinLIVEProduct
     * /affiliate/202309/live_rooms/products/{product_id}/pin (POST)
     */
    async pinLIVEProduct(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/live_rooms/products/{product_id}/pin", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * RemoveLIVEProducts
     * /affiliate/202309/live_rooms/products (DELETE)
     */
    async removeLIVEProducts(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/affiliate/202309/live_rooms/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RemoveShowcaseProductsold
     * /affiliate/202309/showcases/products (DELETE)
     */
    async removeShowcaseProductsold(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/affiliate/202309/showcases/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * TopLIVEProducts
     * /affiliate/202309/live_rooms/products/top (POST)
     */
    async topLIVEProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/live_rooms/products/top", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * TopShowcaseProductsold
     * /affiliate/202309/showcases/products/top (POST)
     */
    async topShowcaseProductsold(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/showcases/products/top", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UnpinLIVEProduct
     * /affiliate/202309/live_rooms/products/{product_id}/unpin (POST)
     */
    async unpinLIVEProduct(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate/202309/live_rooms/products/{product_id}/unpin", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
}
exports.TikTokAffiliateApi = TikTokAffiliateApi;
//# sourceMappingURL=index.js.map