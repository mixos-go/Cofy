"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/customer_service).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokCustomerServiceApi = void 0;
class TikTokCustomerServiceApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateConversation
     * /customer_service/202309/conversations (POST)
     */
    async createConversation(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_service/202309/conversations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["buyer_user_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetAgentSettings
     * /customer_service/202309/agents/settings (GET)
     */
    async getAgentSettings(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_service/202309/agents/settings", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetConversation
     * /customer_service/202601/conversations/{conversation_id} (GET)
     */
    async getConversation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_service/202601/conversations/{conversation_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": [] }, params, opts);
    }
    /**
     * GetConversationMessages
     * /customer_service/202309/conversations/{conversation_id}/messages (GET)
     */
    async getConversationMessages(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_service/202309/conversations/{conversation_id}/messages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "locale", "sort_order", "sort_field", "need_data", "shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": [] }, params, opts);
    }
    /**
     * GetConversations
     * /customer_service/202309/conversations (GET)
     */
    async getConversations(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_service/202309/conversations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "locale", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetCustomerServicePerformance
     * /customer_service/202407/performance (GET)
     */
    async getCustomerServicePerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/customer_service/202407/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["support_date_ge", "support_date_lt", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * ReadMessage
     * /customer_service/202309/conversations/{conversation_id}/messages/read (POST)
     */
    async readMessage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_service/202309/conversations/{conversation_id}/messages/read", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": [] }, params, opts);
    }
    /**
     * SendMessage
     * /customer_service/202309/conversations/{conversation_id}/messages (POST)
     */
    async sendMessage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_service/202309/conversations/{conversation_id}/messages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": ["content", "type"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateAgentSettings
     * /customer_service/202309/agents/settings (PUT)
     */
    async updateAgentSettings(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/customer_service/202309/agents/settings", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["can_accept_chat"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadBuyerMessagesImage
     * /customer_service/202309/images/upload (POST)
     */
    async uploadBuyerMessagesImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/customer_service/202309/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokCustomerServiceApi = TikTokCustomerServiceApi;
//# sourceMappingURL=index.js.map