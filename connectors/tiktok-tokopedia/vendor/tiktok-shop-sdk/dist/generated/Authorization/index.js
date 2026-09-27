"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/authorization).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAuthorizationApi = void 0;
class TikTokAuthorizationApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * DeauthorizeShop
     * /authorization/202403/shops (DELETE)
     */
    async deauthorizeShop(params, opts) {
        return this.client.request({ "method": "DELETE", "path": "/authorization/202403/shops", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetAuthorizedCategoryAssets
     * /authorization/202405/category_assets (GET)
     */
    async getAuthorizedCategoryAssets(params, opts) {
        return this.client.request({ "method": "GET", "path": "/authorization/202405/category_assets", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetAuthorizedShops
     * /authorization/202309/shops (GET)
     */
    async getAuthorizedShops(params, opts) {
        return this.client.request({ "method": "GET", "path": "/authorization/202309/shops", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetWidgetToken
     * /authorization/202401/widget_token (GET)
     */
    async getWidgetToken(params, opts) {
        return this.client.request({ "method": "GET", "path": "/authorization/202401/widget_token", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokAuthorizationApi = TikTokAuthorizationApi;
//# sourceMappingURL=index.js.map