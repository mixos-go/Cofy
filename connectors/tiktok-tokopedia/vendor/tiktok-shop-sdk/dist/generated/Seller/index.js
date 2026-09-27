"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/seller).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokSellerApi = void 0;
class TikTokSellerApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GetActiveShops
     * /seller/202309/shops (GET)
     */
    async getActiveShops(params, opts) {
        return this.client.request({ "method": "GET", "path": "/seller/202309/shops", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetSellerPermissions
     * /seller/202309/permissions (GET)
     */
    async getSellerPermissions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/seller/202309/permissions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetSellerStatus
     * /seller/202508/status (GET)
     */
    async getSellerStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/seller/202508/status", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopCreators
     * /seller/202407/shop_creators (GET)
     */
    async getShopCreators(params, opts) {
        return this.client.request({ "method": "GET", "path": "/seller/202407/shop_creators", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * SyncCollections
     * /seller/202508/collections/sync (POST)
     */
    async syncCollections(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/seller/202508/collections/sync", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["collections", "logo_url", "source"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokSellerApi = TikTokSellerApi;
//# sourceMappingURL=index.js.map