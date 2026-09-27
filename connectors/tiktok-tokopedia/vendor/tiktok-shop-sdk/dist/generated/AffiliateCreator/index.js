"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/affiliate_creator).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAffiliateCreatorApi = void 0;
class TikTokAffiliateCreatorApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * AddShowcaseProducts
     * /affiliate_creator/202405/showcases/products/add (POST)
     */
    async addShowcaseProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202405/showcases/products/add", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["add_type", "product_ids", "product_link"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorGenerateGeneralLink
     * /affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch (POST)
     */
    async creatorGenerateGeneralLink(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["campaign_id", "link_type", "material"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorGeneratePublisherLink
     * /affiliate_creator/202504/affiliate_sharing_links/publisher/{publisher_id}/generate_batch (POST)
     */
    async creatorGeneratePublisherLink(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202504/affiliate_sharing_links/publisher/{publisher_id}/generate_batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["publisher_id"], "body": ["campaign_id", "link_type", "material"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorGetSampleRequestDeeplink
     * /affiliate_creator/202512/samples/deeplink (GET)
     */
    async creatorGetSampleRequestDeeplink(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202512/samples/deeplink", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_id", "sku_id", "redirect_schema", "campaign_id", "collaboration_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * CreatorSearchAffiliateTraceOrders
     * /affiliate_creator/202505/orders/trace/search (POST)
     */
    async creatorSearchAffiliateTraceOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202505/orders/trace/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["time_ge", "time_lt", "time_type"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorSearchOpenCollaborationProduct
     * /affiliate_creator/202405/open_collaborations/products/search (POST)
     */
    async creatorSearchOpenCollaborationProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202405/open_collaborations/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "sort_field", "sort_order"], "headers": [], "pathParams": [], "body": ["category", "commission_rate_range", "sales_price_range", "title_keywords"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorSearchSampleApplicationFulfillments
     * /affiliate_creator/202409/sample_applications/fulfillments/search (POST)
     */
    async creatorSearchSampleApplicationFulfillments(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202409/sample_applications/fulfillments/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["sort_order", "sort_field"], "headers": [], "pathParams": [], "body": ["fulfillment_statuses"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatorSelectAffiliateProduct
     * /affiliate_creator/202501/selection/products/search (POST)
     */
    async creatorSelectAffiliateProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202501/selection/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["filter_params", "sort_params"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GenerateAffiliateSharingLink
     * /affiliate_creator/202501/affiliate_sharing_links/generate_batch (POST)
     */
    async generateAffiliateSharingLink(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202501/affiliate_sharing_links/generate_batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["channel", "material", "tags"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetCreatorApplicableSampleLabel
     * /affiliate_creator/202412/samples/labels (GET)
     */
    async getCreatorApplicableSampleLabel(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202412/samples/labels", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetCreatorProfile
     * /affiliate_creator/202508/profiles (GET)
     */
    async getCreatorProfile(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202508/profiles", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetCreatorSampleApplicationDetail
     * /affiliate_creator/202412/sample_applications/single_query (POST)
     */
    async getCreatorSampleApplicationDetail(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202412/sample_applications/single_query", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["application_id", "application_type", "main_order_id", "product_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetOpenCollaborationProductListByProductIds
     * /affiliate_creator/202509/open_collaborations/products (POST)
     */
    async getOpenCollaborationProductListByProductIds(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202509/open_collaborations/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_ids"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShopProducts
     * /affiliate_creator/202509/shop_products (GET)
     */
    async getShopProducts(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202509/shop_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["title_keyword", "sort_field", "sort_order", "page_size", "page_token"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShoppableVideoPrecheckResult
     * /affiliate_creator/202601/videos/precheck_tasks/{task_id} (GET)
     */
    async getShoppableVideoPrecheckResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202601/videos/precheck_tasks/{task_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["task_id"], "body": [] }, params, opts);
    }
    /**
     * GetShoppableVideoStatus
     * /affiliate_creator/202509/videos/{video_id}/status (GET)
     */
    async getShoppableVideoStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202509/videos/{video_id}/status", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["video_id"], "body": [] }, params, opts);
    }
    /**
     * GetShowcaseProducts
     * /affiliate_creator/202405/showcases/products (GET)
     */
    async getShowcaseProducts(params, opts) {
        return this.client.request({ "method": "GET", "path": "/affiliate_creator/202405/showcases/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "origin"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * PostShoppableVideo
     * /affiliate_creator/202505/videos (POST)
     */
    async postShoppableVideo(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202505/videos", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_link_info", "video_info"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PrecheckVideoContent
     * /affiliate_creator/202511/videos/precheck_task (POST)
     */
    async precheckVideoContent(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202511/videos/precheck_task", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_link_info", "video_info"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RemoveShowcaseProducts
     * /affiliate_creator/202409/showcases/products (DELETE)
     */
    async removeShowcaseProducts(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/affiliate_creator/202409/showcases/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCreatorAffiliateOrders
     * /affiliate_creator/202410/orders/search (POST)
     */
    async searchCreatorAffiliateOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202410/orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_lt"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCreatorSampleApplications
     * /affiliate_creator/202412/sample_applications/search (POST)
     */
    async searchCreatorSampleApplications(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202412/sample_applications/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["application_statuses"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCreatorTargetCollaborations
     * /affiliate_creator/202405/target_collaborations/search (POST)
     */
    async searchCreatorTargetCollaborations(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202405/target_collaborations/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["keyword", "keyword_type", "shop_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * TopShowcaseProducts
     * /affiliate_creator/202409/showcases/products/top (POST)
     */
    async topShowcaseProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202409/showcases/products/top", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadShoppableVideoFile
     * /affiliate_creator/202505/videos/video_files (POST)
     */
    async uploadShoppableVideoFile(params, opts) {
        return this.client.request({ "method": "POST", "path": "/affiliate_creator/202505/videos/video_files", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokAffiliateCreatorApi = TikTokAffiliateCreatorApi;
//# sourceMappingURL=index.js.map