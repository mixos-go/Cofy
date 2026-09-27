"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/affiliate_seller).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAffiliateSellerApi = void 0;
class TikTokAffiliateSellerApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateConversationwithcreator
     * /affiliate_seller/202508/conversations (POST)
     */
    async createConversationwithcreator(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/conversations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["creator_open_id", "only_need_conversation_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateOpenCollaboration
     * /affiliate_seller/202412/open_collaborations (POST)
     */
    async createOpenCollaboration(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202412/open_collaborations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["commission_rate", "product_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateTargetCollaboration
     * /affiliate_seller/202508/target_collaborations (POST)
     */
    async createTargetCollaboration(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/target_collaborations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["creator_user_open_ids", "end_time", "free_sample_rule", "message", "name", "products", "seller_contact_info"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EditOpenCollaborationSampleRule
     * /affiliate_seller/202410/open_collaborations/sample_rules (POST)
     */
    async editOpenCollaborationSampleRule(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202410/open_collaborations/sample_rules", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_id", "sample_rule"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EditOpenCollaborationSettings
     * /affiliate_seller/202405/open_collaboration_settings (POST)
     */
    async editOpenCollaborationSettings(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202405/open_collaboration_settings", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["auto_add_product"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GenerateAffiliateProductPromotionLink
     * /affiliate_seller/202405/products/{product_id}/promotion_link/generate (POST)
     */
    async generateAffiliateProductPromotionLink(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202405/products/{product_id}/promotion_link/generate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * GenerateTargetCollaborationLink
     * /affiliate_seller/202509/target_collaboration/{target_collaboration_id}/link (POST)
     */
    async generateTargetCollaborationLink(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202509/target_collaboration/{target_collaboration_id}/link", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["target_collaboration_id"], "body": [] }, params, opts);
    }
    /**
     * GetConversationList
     * /affiliate_seller/202505/conversations (GET)
     */
    async getConversationList(params, body, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202505/conversations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "only_need_conversation_id", "shop_cipher"], "headers": [], "pathParams": [], "body": ["only_need_conversation_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetLatestUnreadMessages
     * /affiliate_seller/202412/conversations/messages/list/newest (GET)
     */
    async getLatestUnreadMessages(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202412/conversations/messages/list/newest", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetMarketplaceCreatorPerformance
     * /affiliate_seller/202508/marketplace_creators/{creator_user_id} (GET)
     */
    async getMarketplaceCreatorPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202508/marketplace_creators/{creator_user_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["creator_user_id"], "body": [] }, params, opts);
    }
    /**
     * GetMessageintheConversation
     * /affiliate_seller/202412/conversation/{conversation_id}/messages (GET)
     */
    async getMessageintheConversation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202412/conversation/{conversation_id}/messages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": [] }, params, opts);
    }
    /**
     * GetOpenCollaborationCreatorContentDetail
     * /affiliate_seller/202508/open_collaborations/creator_content_details (GET)
     */
    async getOpenCollaborationCreatorContentDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202508/open_collaborations/creator_content_details", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "product_id", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetOpenCollaborationSampleRules
     * /affiliate_seller/202410/open_collaborations/sample_rules (GET)
     */
    async getOpenCollaborationSampleRules(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202410/open_collaborations/sample_rules", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetOpenCollaborationSettings
     * /affiliate_seller/202409/open_collaboration_settings (GET)
     */
    async getOpenCollaborationSettings(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202409/open_collaboration_settings", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetSellerSearchCreatorMarketplaceAdvancedFilters
     * /affiliate_seller/202601/marketplace_creators/search/filter (POST)
     */
    async getSellerSearchCreatorMarketplaceAdvancedFilters(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202601/marketplace_creators/search/filter", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * MarkConversationRead
     * /affiliate_seller/202412/conversatons/read (POST)
     */
    async markConversationRead(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202412/conversatons/read", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["conversation_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * QueryTargetCollaborationDetail
     * /affiliate_seller/202508/target_collaborations/{target_collaboration_id} (GET)
     */
    async queryTargetCollaborationDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202508/target_collaborations/{target_collaboration_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["target_collaboration_id"], "body": [] }, params, opts);
    }
    /**
     * RemoveCreatorFromOpenCollaboration
     * /affiliate_seller/202508/open_collaborations/{open_collaboration_id}/remove_creator (POST)
     */
    async removeCreatorFromOpenCollaboration(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/open_collaborations/{open_collaboration_id}/remove_creator", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["open_collaboration_id"], "body": ["creator_user_open_id", "product_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RemoveOpenCollaboration
     * /affiliate_seller/202409/open_collaborations/products/{product_id} (DELETE)
     */
    async removeOpenCollaboration(params, opts) {
        return this.client.request({ "method": "DELETE", "path": "/affiliate_seller/202409/open_collaborations/products/{product_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * RemoveTargetCollaboration
     * /affiliate_seller/202409/target_collaborations/{target_collaboration_id} (DELETE)
     */
    async removeTargetCollaboration(params, opts) {
        return this.client.request({ "method": "DELETE", "path": "/affiliate_seller/202409/target_collaborations/{target_collaboration_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["target_collaboration_id"], "body": [] }, params, opts);
    }
    /**
     * SearchOpenCollaboration
     * /affiliate_seller/202412/open_collaborations/search (POST)
     */
    async searchOpenCollaboration(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202412/open_collaborations/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "sort_order", "sort_field", "shop_cipher"], "headers": [], "pathParams": [], "body": ["keyword", "keyword_type", "top_level_category_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchSellerAffiliateOrders
     * /affiliate_seller/202410/orders/search (POST)
     */
    async searchSellerAffiliateOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202410/orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_lt", "program_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchTargetCollaborations
     * /affiliate_seller/202508/target_collaborations/search (POST)
     */
    async searchTargetCollaborations(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/target_collaborations/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["collaboration_status", "creator_accept_status", "creator_user_open_id", "free_sample_setting", "search_param"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SellerGetSampleRequestDeeplink
     * /affiliate_seller/202512/sample_applications/deeplink (GET)
     */
    async sellerGetSampleRequestDeeplink(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_seller/202512/sample_applications/deeplink", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_id", "sku_id", "campaign_id", "collaboration_id", "valid_days", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * SellerReviewSampleApplications
     * /affiliate_seller/202507/sample_applications/{application_id}/review (POST)
     */
    async sellerReviewSampleApplications(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202507/sample_applications/{application_id}/review", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["application_id"], "body": ["reject_reason", "review_result"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SellerSearchAffiliateOpenCollaborationProduct
     * /affiliate_seller/202405/open_collaborations/products/search (POST)
     */
    async sellerSearchAffiliateOpenCollaborationProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202405/open_collaborations/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["sort_order", "sort_field", "page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": ["category", "commission_rate_range", "sales_price_range", "title_keywords"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SellerSearchCreatoronMarketplace
     * /affiliate_seller/202508/marketplace_creators/search (POST)
     */
    async sellerSearchCreatoronMarketplace(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/marketplace_creators/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": ["advanced_filters", "affiliate_data", "category", "content_performance", "follower_demographics", "gmv_ranges", "keyword", "search_key", "units_sold_ranges"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SellerSearchSampleApplications
     * /affiliate_seller/202508/sample_applications/search (POST)
     */
    async sellerSearchSampleApplications(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202508/sample_applications/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": ["creator_user_oepn_id", "order_id", "product_id", "status", "target_collabration_id", "title", "username"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SellerSearchSampleApplicationsFulfillments
     * /affiliate_seller/202409/sample_applications/{application_id}/fulfillments/search (POST)
     */
    async sellerSearchSampleApplicationsFulfillments(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202409/sample_applications/{application_id}/fulfillments/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["application_id"], "body": ["content_format"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SendIMMessage
     * /affiliate_seller/202412/conversations/{conversation_id}/messages (POST)
     */
    async sendIMMessage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202412/conversations/{conversation_id}/messages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["conversation_id"], "body": ["content", "msg_type"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateTargetCollaboration
     * /affiliate_seller/202508/target_collaborations/{target_collaboration_id} (PUT)
     */
    async updateTargetCollaboration(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/affiliate_seller/202508/target_collaborations/{target_collaboration_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["target_collaboration_id"], "body": ["creator_user_open_ids", "end_time", "free_sample_rule", "name", "products", "seller_contact_info"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadMessageImage
     * /affiliate_seller/202511/images/upload (POST)
     */
    async uploadMessageImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_seller/202511/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokAffiliateSellerApi = TikTokAffiliateSellerApi;
//# sourceMappingURL=index.js.map