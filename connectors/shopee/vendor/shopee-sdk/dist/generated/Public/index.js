"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Public).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeePublicApi = void 0;
class ShopeePublicApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get access token
     * /api/v2/auth/token/get (POST)
     */
    async getAccessToken(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/auth/token/get", "query": [], "body": ["code", "partner_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get merchants by partner
     * /api/v2/public/get_merchants_by_partner (GET)
     */
    async getMerchantsByPartner(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/public/get_merchants_by_partner", "query": ["page_size", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shopee ip ranges
     * /api/v2/public/get_shopee_ip_ranges (GET)
     */
    async getShopeeIpRanges(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/public/get_shopee_ip_ranges", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shops by partner
     * /api/v2/public/get_shops_by_partner (GET)
     */
    async getShopsByPartner(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/public/get_shops_by_partner", "query": ["page_size", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get token by resend code
     * /api/v2/public/get_token_by_resend_code (POST)
     */
    async getTokenByResendCode(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/public/get_token_by_resend_code", "query": [], "body": ["resend_code"], "scope": "shop" }, params, opts);
    }
    /**
     * refresh access token
     * /api/v2/auth/access_token/get (POST)
     */
    async refreshAccessToken(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/auth/access_token/get", "query": [], "body": ["refresh_token", "partner_id", "shop_id"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeePublicApi = ShopeePublicApi;
//# sourceMappingURL=index.js.map