"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/affiliate_partner).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAffiliatePartnerApi = void 0;
class TikTokAffiliatePartnerApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateAffiliatePartnerCampaign
     * /affiliate_partner/202405/campaigns (POST)
     */
    async createAffiliatePartnerCampaign(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202405/campaigns", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": [], "body": ["campaign_end_time", "campaign_start_time", "commission_rate", "contact_info", "description", "name", "registration_end_time", "registration_start_time", "target_seller_types", "target_shop_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EditAffiliatePartnerCampaign
     * /affiliate_partner/202405/campaigns/{campaign_id}/partial_edit (POST)
     */
    async editAffiliatePartnerCampaign(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202405/campaigns/{campaign_id}/partial_edit", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id"], "body": ["campaign_end_time", "campaign_start_time", "commission_rate", "contact_info", "description", "name", "registration_end_time", "registration_start_time", "target_seller_types", "target_shop_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GenerateAffiliatePartnerCampaignProductLink
     * /affiliate_partner/202405/campaigns/{campaign_id}/products/{product_id}/promotion_link/generate (POST)
     */
    async generateAffiliatePartnerCampaignProductLink(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202405/campaigns/{campaign_id}/products/{product_id}/promotion_link/generate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id", "product_id"], "body": ["creator_commission_rate"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetAffiliateCampaignCreatorFulfillmentStatusInfo
     * /affiliate_partner/202501/campaigns/{campaign_id}/products/{product_id}/performance (GET)
     */
    async getAffiliateCampaignCreatorFulfillmentStatusInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202501/campaigns/{campaign_id}/products/{product_id}/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": ["campaign_id", "product_id"], "body": [] }, params, opts);
    }
    /**
     * GetAffiliateCampaignCreatorFulfillmentStatusList
     * /affiliate_partner/202501/campaigns/{campaign_id}/products/performance (GET)
     */
    async getAffiliateCampaignCreatorFulfillmentStatusList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202501/campaigns/{campaign_id}/products/performance", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": ["campaign_id"], "body": [] }, params, opts);
    }
    /**
     * GetAffiliateCampaignCreatorProductContentStatistics
     * /affiliate_partner/202508/campaigns/{campaign_id}/products/{product_id}/creator/{creator_temp_id}/content/statistics (GET)
     */
    async getAffiliateCampaignCreatorProductContentStatistics(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202508/campaigns/{campaign_id}/products/{product_id}/creator/{creator_temp_id}/content/statistics", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["affiliate_product_id", "content_type"], "headers": [], "pathParams": ["campaign_id", "product_id", "creator_temp_id"], "body": [] }, params, opts);
    }
    /**
     * GetAffiliateCampaignCreatorProductSampleStatus
     * /affiliate_partner/202508/campaigns/{campaign_id}/products/{product_id}/creator/{creator_temp_id}/content/statistics/sample/status (GET)
     */
    async getAffiliateCampaignCreatorProductSampleStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202508/campaigns/{campaign_id}/products/{product_id}/creator/{creator_temp_id}/content/statistics/sample/status", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["campaign_id", "product_id", "creator_temp_id"], "body": [] }, params, opts);
    }
    /**
     * GetAffiliatePartnerCampaignDetail
     * /affiliate_partner/202405/campaigns/{campaign_id} (GET)
     */
    async getAffiliatePartnerCampaignDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202405/campaigns/{campaign_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id"], "body": [] }, params, opts);
    }
    /**
     * GetAffiliatePartnerCampaignList
     * /affiliate_partner/202405/campaigns (GET)
     */
    async getAffiliatePartnerCampaignList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202405/campaigns", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher", "page_size", "page_token", "status", "type", "query_type_filter"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetAffiliatePartnerCampaignProductList
     * /affiliate_partner/202405/campaigns/{campaign_id}/products (GET)
     */
    async getAffiliatePartnerCampaignProductList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_partner/202405/campaigns/{campaign_id}/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher", "page_size", "page_token", "review_status", "product_name", "product_id", "shop_name", "category_id"], "headers": [], "pathParams": ["campaign_id"], "body": [] }, params, opts);
    }
    /**
     * PartnerGenerateMultiAffiliateCampaignProductLink
     * /affiliate_partner/202505/campaigns/{campaign_id}/products/promotion_links/generate_batch (POST)
     */
    async partnerGenerateMultiAffiliateCampaignProductLink(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202505/campaigns/{campaign_id}/products/promotion_links/generate_batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id"], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PublishAffiliatePartnerCampaign
     * /affiliate_partner/202405/campaigns/{campaign_id}/publish (POST)
     */
    async publishAffiliatePartnerCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202405/campaigns/{campaign_id}/publish", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id"], "body": [] }, params, opts);
    }
    /**
     * ReviewAffiliatePartnerCampaignProduct
     * /affiliate_partner/202405/campaigns/{campaign_id}/products/{product_id}/review (POST)
     */
    async reviewAffiliatePartnerCampaignProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202405/campaigns/{campaign_id}/products/{product_id}/review", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_asset_cipher"], "headers": [], "pathParams": ["campaign_id", "product_id"], "body": ["reject_reasons", "review_result"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCAPAffiliateOrders
     * /affiliate_partner/202504/cap_order/search (POST)
     */
    async searchCAPAffiliateOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202504/cap_order/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "category_asset_cipher"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_lt", "order_id", "order_status", "product_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchTapAffiliateOrders
     * /affiliate_partner/202411/orders/search (POST)
     */
    async searchTapAffiliateOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_partner/202411/orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "category_asset_cipher"], "headers": [], "pathParams": [], "body": ["campaign_id", "create_time_ge", "create_time_lt"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokAffiliatePartnerApi = TikTokAffiliatePartnerApi;
//# sourceMappingURL=index.js.map