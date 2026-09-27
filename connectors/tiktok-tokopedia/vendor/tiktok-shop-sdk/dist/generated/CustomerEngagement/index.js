"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/customer_engagement).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokCustomerEngagementApi = void 0;
class TikTokCustomerEngagementApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateCustomEngagementTask
     * /customer_engagement/202502/engagement_tasks/custom (POST)
     */
    async createCustomEngagementTask(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_engagement/202502/engagement_tasks/custom", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": [], "body": ["channel", "coupon_ids", "custom_message", "end_time", "product_ids", "task_name"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateEngagementTask
     * /customer_engagement/202412/engagement_tasks (POST)
     */
    async createEngagementTask(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_engagement/202412/engagement_tasks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": [], "body": ["channel", "coupon_ids", "end_time", "product_ids", "task_name", "template_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetCustomerTabVisibility
     * /customer_engagement/202501/customer_tab/visibility (GET)
     */
    async getCustomerTabVisibility(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_engagement/202501/customer_tab/visibility", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetFeaturePermissions
     * /customer_engagement/202502/permissions (GET)
     */
    async getFeaturePermissions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_engagement/202502/permissions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetMessageTemplates
     * /customer_engagement/202412/message_templates (GET)
     */
    async getMessageTemplates(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_engagement/202412/message_templates", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher", "locale"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetTaskPerformances
     * /customer_engagement/202412/performances (POST)
     */
    async getTaskPerformances(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_engagement/202412/performances", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["task_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SendEngagementMessage
     * /customer_engagement/202412/messages (POST)
     */
    async sendEngagementMessage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_engagement/202412/messages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["buyer_emails", "task_id"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokCustomerEngagementApi = TikTokCustomerEngagementApi;
//# sourceMappingURL=index.js.map