"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/gs_full_service_commodity).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokGsFullServiceCommodityApi = void 0;
class TikTokGsFullServiceCommodityApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GSCalculateProductAuditInfo
     * /gs_full_service_commodity/202509/calculate_audit_info (POST)
     */
    async gSCalculateProductAuditInfo(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202509/calculate_audit_info", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["spu"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSCreateProduct
     * /gs_full_service_commodity/202405/preview/products (POST)
     */
    async gSCreateProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/preview/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["spu"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSCreateProductv2
     * /gs_full_service_commodity/202509/beta/products (POST)
     */
    async gSCreateProductv2(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202509/beta/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["idempotent_key", "spu"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSFullServiceGetBrands
     * /gs_full_service_commodity/202405/beta/brands (GET)
     */
    async gSFullServiceGetBrands(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202405/beta/brands", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSFullServiceGetCategoryinformation
     * /gs_full_service_commodity/202405/beta/categories/{category_id} (GET)
     */
    async gSFullServiceGetCategoryinformation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202405/beta/categories/{category_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSFullServiceGetCertifications
     * /gs_full_service_commodity/202507/beta/categories/{category_id}/certifications (GET)
     */
    async gSFullServiceGetCertifications(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202507/beta/categories/{category_id}/certifications", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSFullServiceGetattributes
     * /gs_full_service_commodity/202507/beta/categories/{category_id}/attributes (GET)
     */
    async gSFullServiceGetattributes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202507/beta/categories/{category_id}/attributes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSFullServicePreviewGetBrands
     * /gs_full_service_commodity/202404/preview/brands (GET)
     */
    async gSFullServicePreviewGetBrands(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202404/preview/brands", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSFullServicePreviewGetattributes
     * /gs_full_service_commodity/202404/preview/categories/{category_id}/attributes (GET)
     */
    async gSFullServicePreviewGetattributes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202404/preview/categories/{category_id}/attributes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSFullServicePreviewGetcategoryinformation
     * /gs_full_service_commodity/202404/preview/categories/{category_id} (GET)
     */
    async gSFullServicePreviewGetcategoryinformation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202404/preview/categories/{category_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSFullServiceSearchCategories
     * /gs_full_service_commodity/202405/beta/categories/search (POST)
     */
    async gSFullServiceSearchCategories(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/beta/categories/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["page_offset", "page_size"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSGetSupplierRP
     * /gs_full_service_commodity/202508/supplier_rps (GET)
     */
    async gSGetSupplierRP(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202508/supplier_rps", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSGetgradingtemplatesconfigV2
     * /gs_full_service_commodity/202406/beta/grading_templates (GET)
     */
    async gSGetgradingtemplatesconfigV2(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202406/beta/grading_templates", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSGetsizegroupsconfigV2
     * /gs_full_service_commodity/202406/beta/size_groups (GET)
     */
    async gSGetsizegroupsconfigV2(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202406/beta/size_groups", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSImageUploadV2
     * /gs_full_service_commodity/202406/beta/images/upload (POST)
     */
    async gSImageUploadV2(params, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202406/beta/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSListSupplierManufacturer
     * /gs_full_service_commodity/202508/supplier_manufacturers (GET)
     */
    async gSListSupplierManufacturer(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202508/supplier_manufacturers", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSProductimageuploadrequirementsquery
     * /gs_full_service_commodity/202405/beta/categories/{category_id}/image_upload_requirements (GET)
     */
    async gSProductimageuploadrequirementsquery(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202405/beta/categories/{category_id}/image_upload_requirements", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GSQualificationfileupload
     * /gs_full_service_commodity/202405/beta/certification_files/upload (POST)
     */
    async gSQualificationfileupload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/beta/certification_files/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSQuerySKUsandtheapprovalstatusofSKUsV2
     * /gs_full_service_commodity/202504/beta/products/search (POST)
     */
    async gSQuerySKUsandtheapprovalstatusofSKUsV2(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202504/beta/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["external_sku_codes", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "push_time_ge", "push_time_lt", "sku_status"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSVideoUpload
     * /gs_full_service_commodity/202405/beta/videos/upload (POST)
     */
    async gSVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/beta/videos/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetGlobalSellingFullServiceCategories
     * /gs_full_service_commodity/202404/preview/categories/search (POST)
     */
    async getGlobalSellingFullServiceCategories(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202404/preview/categories/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["page_offset", "page_size"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetSizeGroups
     * /gs_full_service_commodity/202408/size_groups (GET)
     */
    async getSizeGroups(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202408/size_groups", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * Getgradingtemplatesconfig
     * /gs_full_service_commodity/202405/preview/grading_templates (GET)
     */
    async getgradingtemplatesconfig(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202405/preview/grading_templates", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * Getsizegroupsconfig
     * /gs_full_service_commodity/202405/preview/size_groups (GET)
     */
    async getsizegroupsconfig(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202405/preview/size_groups", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GlobalSellingGetSupplierAddresses
     * /gs_full_service_commodity/202407/supplier_addresses (GET)
     */
    async globalSellingGetSupplierAddresses(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_commodity/202407/supplier_addresses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * QuerySKUsandtheapprovalstatusofSKUs
     * /gs_full_service_commodity/202405/preview/products/search (POST)
     */
    async querySKUsandtheapprovalstatusofSKUs(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/preview/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["external_sku_codes", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "push_time_ge", "push_time_lt", "sku_status"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * imageupload
     * /gs_full_service_commodity/202405/preview/images/upload (POST)
     */
    async imageupload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_commodity/202405/preview/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokGsFullServiceCommodityApi = TikTokGsFullServiceCommodityApi;
//# sourceMappingURL=index.js.map