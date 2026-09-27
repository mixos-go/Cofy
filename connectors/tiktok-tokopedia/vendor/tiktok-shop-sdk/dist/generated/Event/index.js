"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/event).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokEventApi = void 0;
class TikTokEventApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * DeleteShopWebhook
     * /event/202309/webhooks (DELETE)
     */
    async deleteShopWebhook(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/event/202309/webhooks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["event_type"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetShopWebhooks
     * /event/202309/webhooks (GET)
     */
    async getShopWebhooks(params, opts) {
        return this.client.request({ "method": "GET", "path": "/event/202309/webhooks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * UpdateShopWebhook
     * /event/202309/webhooks (PUT)
     */
    async updateShopWebhook(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/event/202309/webhooks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["address", "event_type"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokEventApi = TikTokEventApi;
//# sourceMappingURL=index.js.map