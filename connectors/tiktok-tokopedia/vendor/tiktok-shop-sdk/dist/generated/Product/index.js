"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/product).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokProductApi = void 0;
class TikTokProductApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * ActivateProduct
     * /product/202309/products/activate (POST)
     */
    async activateProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/activate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["listing_platforms", "product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ApplyOpportunities
     * /product/202409/products/{product_id}/opportunities (PUT)
     */
    async applyOpportunities(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/product/202409/products/{product_id}/opportunities", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["opportunity_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * BindLocalProducts
     * /product/202503/global_products/{global_product_id}/bind_local_products (POST)
     */
    async bindLocalProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202503/global_products/{global_product_id}/bind_local_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": ["local_products"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CheckGlobalProductListing
     * /product/202404/global_products/listing_check (POST)
     */
    async checkGlobalProductListing(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202404/global_products/listing_check", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["brand_id", "category_id", "certifications", "description", "main_images", "manufacturer", "package_dimensions", "package_weight", "product_attributes", "size_chart", "skus", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CheckListingPrerequisites
     * /product/202312/prerequisites (GET)
     */
    async checkListingPrerequisites(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202312/prerequisites", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * CheckProductListing
     * /product/202309/products/listing_check (POST)
     */
    async checkProductListing(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/listing_check", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["is_diagnosis_required", "shop_cipher"], "headers": [], "pathParams": [], "body": ["brand_id", "category_id", "certifications", "delivery_option_ids", "description", "external_product_id", "is_cod_allowed", "is_pre_owned", "listing_platforms", "main_images", "manufacturer_ids", "minimum_order_quantity", "option", "package_dimensions", "package_weight", "primary_combined_product_id", "product_attributes", "responsible_person_ids", "shipping_insurance_requirement", "shipping_template_id", "size_chart", "skus", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateAttributeRecommendationRequest
     * /product/202501/attribute_recommendation_request (POST)
     */
    async createAttributeRecommendationRequest(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202501/attribute_recommendation_request", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["external_product"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateCategoryUpgradeTask
     * /product/202407/products/category_upgrade_task (POST)
     */
    async createCategoryUpgradeTask(params, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202407/products/category_upgrade_task", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * CreateCustomBrands
     * /product/202309/brands (POST)
     */
    async createCustomBrands(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/brands", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["name"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateGlobalProduct
     * /product/202309/global_products (POST)
     */
    async createGlobalProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/global_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["brand_id", "category_id", "category_version", "certifications", "description", "external_global_product_id", "main_images", "manufacturer", "manufacturer_ids", "package_dimensions", "package_weight", "product_attributes", "responsible_person_ids", "size_chart", "skus", "source_locale", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateImageTranslationTasks
     * /product/202505/images/translation_tasks (POST)
     */
    async createImageTranslationTasks(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202505/images/translation_tasks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["images"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateManufacturer
     * /product/202409/compliance/manufacturers (POST)
     */
    async createManufacturer(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/compliance/manufacturers", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["address", "email", "locale", "name", "phone_number", "registered_trade_name"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateProduct
     * /product/202309/products (POST)
     */
    async createProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["brand_id", "category_id", "category_version", "certifications", "delivery_option_ids", "description", "external_product_id", "idempotency_key", "is_cod_allowed", "is_not_for_sale", "is_pre_owned", "listing_platforms", "main_images", "manufacturer_ids", "minimum_order_quantity", "package_dimensions", "package_weight", "primary_combined_product_id", "product_attributes", "responsible_person_ids", "save_mode", "shipping_insurance_requirement", "shipping_template_id", "size_chart", "skus", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateResponsiblePerson
     * /product/202409/compliance/responsible_persons (POST)
     */
    async createResponsiblePerson(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/compliance/responsible_persons", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["address", "email", "locale", "name", "phone_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * DeactivateProducts
     * /product/202309/products/deactivate (POST)
     */
    async deactivateProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/deactivate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["listing_platforms", "product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * DeleteGlobalProducts
     * /product/202309/global_products (DELETE)
     */
    async deleteGlobalProducts(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/product/202309/global_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["global_product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * DeleteProducts
     * /product/202309/products (DELETE)
     */
    async deleteProducts(params, body, opts) {
        return this.client.request({ "method": "DELETE", "path": "/product/202309/products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * DiagnoseandOptimizeProduct
     * /product/202411/products/diagnose_optimize (POST)
     */
    async diagnoseandOptimizeProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202411/products/diagnose_optimize", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["brand_id", "category_id", "description", "main_images", "optimization_fields", "product_attributes", "product_id", "size_chart", "title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EditGlobalProduct
     * /product/202309/global_products/{global_product_id} (PUT)
     */
    async editGlobalProduct(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/product/202309/global_products/{global_product_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": ["brand_id", "category_id", "category_version", "certifications", "description", "external_global_product_id", "main_images", "manufacturer", "manufacturer_ids", "package_dimensions", "package_weight", "product_attributes", "responsible_person_ids", "size_chart", "skus", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EditProduct
     * /product/202509/products/{product_id} (PUT)
     */
    async editProduct(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/product/202509/products/{product_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["brand_id", "category_id", "category_version", "certifications", "delivery_option_ids", "description", "external_product_id", "is_cod_allowed", "is_pre_owned", "listing_platforms", "main_images", "manufacturer_ids", "minimum_order_quantity", "package_dimensions", "package_weight", "product_attributes", "replicated_products", "responsible_person_ids", "save_mode", "shipping_insurance_requirement", "shipping_template_id", "size_chart", "skus", "subscribe_info_edit", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * EnableStrikethroughPrices
     * /product/202502/products/{product_id}/strikethrough_prices/enable (POST)
     */
    async enableStrikethroughPrices(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202502/products/{product_id}/strikethrough_prices/enable", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["external_product_id", "skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetAttributes
     * /product/202309/categories/{category_id}/attributes (GET)
     */
    async getAttributes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/categories/{category_id}/attributes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "category_version", "shop_cipher"], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GetBrands
     * /product/202309/brands (GET)
     */
    async getBrands(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/brands", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_id", "is_authorized", "brand_name", "page_size", "page_token", "category_version", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetCategories
     * /product/202309/categories (GET)
     */
    async getCategories(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/categories", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "keyword", "category_version", "listing_platform", "include_prohibited_categories", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetCategoryRules
     * /product/202309/categories/{category_id}/rules (GET)
     */
    async getCategoryRules(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/categories/{category_id}/rules", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_version", "locale", "shop_cipher"], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GetGlobalAttributes
     * /product/202309/categories/{category_id}/global_attributes (GET)
     */
    async getGlobalAttributes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/categories/{category_id}/global_attributes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "category_version"], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GetGlobalCategories
     * /product/202309/global_categories (GET)
     */
    async getGlobalCategories(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/global_categories", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "keyword", "category_version"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetGlobalCategoryRules
     * /product/202309/categories/{category_id}/global_rules (GET)
     */
    async getGlobalCategoryRules(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/categories/{category_id}/global_rules", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_version", "locale"], "headers": [], "pathParams": ["category_id"], "body": [] }, params, opts);
    }
    /**
     * GetGlobalListingRules
     * /product/202507/global_listing_rules (GET)
     */
    async getGlobalListingRules(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202507/global_listing_rules", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetGlobalProduct
     * /product/202309/global_products/{global_product_id} (GET)
     */
    async getGlobalProduct(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/global_products/{global_product_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": [] }, params, opts);
    }
    /**
     * GetGlobalReplicatedProducts
     * /product/202507/products/{product_id}/replicated_products (GET)
     */
    async getGlobalReplicatedProducts(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202507/products/{product_id}/replicated_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * GetImageTranslationTasks
     * /product/202506/images/translation_tasks (GET)
     */
    async getImageTranslationTasks(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202506/images/translation_tasks", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["translation_task_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetProduct
     * /product/202309/products/{product_id} (GET)
     */
    async getProduct(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202309/products/{product_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["return_under_review_version", "return_draft_version", "locale", "shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": [] }, params, opts);
    }
    /**
     * GetProductsSEOWords
     * /product/202405/products/seo_words (GET)
     */
    async getProductsSEOWords(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202405/products/seo_words", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetRecommendedProductTitleAndDescription
     * /product/202405/products/suggestions (GET)
     */
    async getRecommendedProductTitleAndDescription(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202405/products/suggestions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * ImportExternalProductInfo
     * /product/202508/import_external (POST)
     */
    async importExternalProductInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202508/import_external", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * InventorySearch
     * /product/202309/inventory/search (POST)
     */
    async inventorySearch(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/inventory/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_ids", "sku_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ListingSchemas
     * /product/202407/listing_schemas (GET)
     */
    async listingSchemas(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202407/listing_schemas", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["category_ids", "locale", "category_version"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * OptimizedImages
     * /product/202404/images/optimize (POST)
     */
    async optimizedImages(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202404/images/optimize", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["images"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PartialEditCandidateProducts
     * /product/202409/candidate_products/partial_edit/batch (POST)
     */
    async partialEditCandidateProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/candidate_products/partial_edit/batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["candidate_products"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PartialEditGlobalProduct
     * /product/202509/global_products/{global_product_id}/partial_edit (PUT)
     */
    async partialEditGlobalProduct(params, body, opts) {
        return this.client.request({ "method": "PUT", "path": "/product/202509/global_products/{global_product_id}/partial_edit", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": ["brand_id", "category_id", "category_version", "certifications", "description", "external_global_product_id", "main_images", "manufacturer", "manufacturer_ids", "package_dimensions", "package_weight", "product_attributes", "responsible_person_ids", "size_chart", "skus", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PartialEditManufacturer
     * /product/202409/compliance/manufacturers/{manufacturer_id}/partial_edit (POST)
     */
    async partialEditManufacturer(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/compliance/manufacturers/{manufacturer_id}/partial_edit", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["manufacturer_id"], "body": ["address", "email", "locale", "name", "phone_number", "registered_trade_name"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PartialEditProduct
     * /product/202509/products/{product_id}/partial_edit (POST)
     */
    async partialEditProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202509/products/{product_id}/partial_edit", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["brand_id", "certifications", "description", "external_product_id", "is_cod_allowed", "listing_platforms", "main_images", "manufacturer_ids", "package_dimensions", "package_weight", "product_attributes", "replicated_products", "responsible_person_ids", "save_mode", "size_chart", "skus", "subscribe_info_edit", "title", "video"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * PartialEditResponsiblePerson
     * /product/202409/compliance/responsible_persons/{responsible_person_id}/partial_edit (POST)
     */
    async partialEditResponsiblePerson(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/compliance/responsible_persons/{responsible_person_id}/partial_edit", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["responsible_person_id"], "body": ["address", "email", "locale", "name", "phone_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ProductAuditingResearch
     * /product/202601/compliance/auditing/research (POST)
     */
    async productAuditingResearch(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202601/compliance/auditing/research", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size"], "headers": [], "pathParams": [], "body": ["brand_ids", "category_ids", "product_ids", "product_title", "seller_id", "seller_name"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ProductInformationIssueDiagnosis
     * /product/202405/products/diagnoses (GET)
     */
    async productInformationIssueDiagnosis(params, opts) {
        return this.client.request({ "method": "GET", "path": "/product/202405/products/diagnoses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["product_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * PublishGlobalProduct
     * /product/202309/global_products/{global_product_id}/publish (POST)
     */
    async publishGlobalProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/global_products/{global_product_id}/publish", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": ["publish_target"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RecommendBrand
     * /product/202309/brands/recommend (POST)
     */
    async recommendBrand(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/brands/recommend", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["language", "product_title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RecommendCategory
     * /product/202309/categories/recommend (POST)
     */
    async recommendCategory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/categories/recommend", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["category_version", "description", "images", "include_prohibited_categories", "listing_platform", "product_title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RecommendGlobalCategories
     * /product/202309/global_categories/recommend (POST)
     */
    async recommendGlobalCategories(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/global_categories/recommend", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["category_version", "description", "images", "product_title"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RecommendSizechart
     * /product/202309/images/size_charts/identify (POST)
     */
    async recommendSizechart(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/images/size_charts/identify", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["images"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RecoverProducts
     * /product/202309/products/recover (POST)
     */
    async recoverProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/recover", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ReplicateProduct
     * /product/202507/products/{product_id}/global_replicate (POST)
     */
    async replicateProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202507/products/{product_id}/global_replicate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["replicate_target"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCandidateProducts
     * /product/202409/candidate_products/search (POST)
     */
    async searchCandidateProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/candidate_products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["external_product_ids", "opportunity_matching_statuses"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCombinedListingRecommendations
     * /product/202506/combined_listing_recommendations/search (POST)
     */
    async searchCombinedListingRecommendations(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202506/combined_listing_recommendations/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": [], "body": ["product_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchGlobalProducts
     * /product/202312/global_products/search (POST)
     */
    async searchGlobalProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202312/global_products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_le", "seller_skus", "status", "update_time_ge", "update_time_le"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchManufacturers
     * /product/202501/compliance/manufacturers/search (POST)
     */
    async searchManufacturers(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202501/compliance/manufacturers/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": [], "body": ["keyword", "locales", "manufacturer_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchOpportunities
     * /product/202409/opportunities/search (POST)
     */
    async searchOpportunities(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/opportunities/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["opportunity_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchProducts
     * /product/202502/products/search (POST)
     */
    async searchProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202502/products/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["audit_status", "category_version", "create_time_ge", "create_time_le", "listing_platforms", "listing_quality_tiers", "return_draft_version", "seller_skus", "sku_ids", "sns_filter", "status", "update_time_ge", "update_time_le"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchResponsiblePersons
     * /product/202501/compliance/responsible_persons/search (POST)
     */
    async searchResponsiblePersons(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202501/compliance/responsible_persons/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token"], "headers": [], "pathParams": [], "body": ["keyword", "locales", "responsible_person_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchSizeCharts
     * /product/202407/sizecharts/search (POST)
     */
    async searchSizeCharts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202407/sizecharts/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "locales"], "headers": [], "pathParams": [], "body": ["ids", "keyword"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateGlobalInventory
     * /product/202309/global_products/{global_product_id}/inventory/update (POST)
     */
    async updateGlobalInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/global_products/{global_product_id}/inventory/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": ["global_product_id"], "body": ["global_skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateInventory
     * /product/202309/products/{product_id}/inventory/update (POST)
     */
    async updateInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/{product_id}/inventory/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdatePrice
     * /product/202309/products/{product_id}/prices/update (POST)
     */
    async updatePrice(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/products/{product_id}/prices/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadCandidateProducts
     * /product/202409/candidate_products/batch (POST)
     */
    async uploadCandidateProducts(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202409/candidate_products/batch", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["candidate_products"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadExternalProduct
     * /product/202506/external_products (POST)
     */
    async uploadExternalProduct(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202506/external_products", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["external_product"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadProductFile
     * /product/202309/files/upload (POST)
     */
    async uploadProductFile(params, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/files/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * UploadProductImage
     * /product/202309/images/upload (POST)
     */
    async uploadProductImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/product/202309/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokProductApi = TikTokProductApi;
//# sourceMappingURL=index.js.map