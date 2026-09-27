"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/GlobalProduct).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeGlobalProductApi = void 0;
class ShopeeGlobalProductApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add global item
     * /api/v2/global_product/add_global_item (POST)
     */
    async addGlobalItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/add_global_item", "query": [], "body": ["attribute_list", "brand", "category_id", "condition", "description", "description_info", "description_type", "dimension", "global_item_name", "global_item_sku", "image", "normal_stock", "original_price", "pre_order", "video_upload_id", "weight", "seller_stock"], "scope": "shop" }, params, opts);
    }
    /**
     * add global model
     * /api/v2/global_product/add_global_model (POST)
     */
    async addGlobalModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/add_global_model", "query": [], "body": ["global_item_id", "global_model"], "scope": "shop" }, params, opts);
    }
    /**
     * category recommend
     * /api/v2/global_product/category_recommend (GET)
     */
    async categoryRecommend(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/category_recommend", "query": ["global_item_name", "global_product_cover_image"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * create publish task
     * /api/v2/global_product/create_publish_task (POST)
     */
    async createPublishTask(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/create_publish_task", "query": [], "body": ["global_item_id", "shop_id", "shop_region", "item"], "scope": "shop" }, params, opts);
    }
    /**
     * delete global item
     * /api/v2/global_product/delete_global_item (POST)
     */
    async deleteGlobalItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/delete_global_item", "query": [], "body": ["global_item_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete global model
     * /api/v2/global_product/delete_global_model (POST)
     */
    async deleteGlobalModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/delete_global_model", "query": [], "body": ["global_item_id", "global_model_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get attribute tree
     * /api/v2/global_product/get_attribute_tree (GET)
     */
    async getAttributeTree(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_attribute_tree", "query": ["category_id_list", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get brand list
     * /api/v2/global_product/get_brand_list (GET)
     */
    async getBrandList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_brand_list", "query": ["offset", "page_size", "category_id", "status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get category
     * /api/v2/global_product/get_category (GET)
     */
    async getCategory(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_category", "query": ["language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get global item id
     * /api/v2/global_product/get_global_item_id (GET)
     */
    async getGlobalItemId(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_global_item_id", "query": ["shop_id", "item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get global item info
     * /api/v2/global_product/get_global_item_info (GET)
     */
    async getGlobalItemInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_global_item_info", "query": ["global_item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get global item limit
     * /api/v2/global_product/get_global_item_limit (GET)
     */
    async getGlobalItemLimit(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_global_item_limit", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get global item list
     * /api/v2/global_product/get_global_item_list (GET)
     */
    async getGlobalItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_global_item_list", "query": ["offset", "page_size", "update_time_from", "update_time_to"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get global model list
     * /api/v2/global_product/get_global_model_list (GET)
     */
    async getGlobalModelList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_global_model_list", "query": ["global_item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get local adjustment rate
     * /api/v2/global_product/get_local_adjustment_rate (GET)
     */
    async getLocalAdjustmentRate(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_local_adjustment_rate", "query": ["shop_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get publish task result
     * /api/v2/global_product/get_publish_task_result (GET)
     */
    async getPublishTaskResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_publish_task_result", "query": ["publish_task_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get publishable shop
     * /api/v2/global_product/get_publishable_shop (GET)
     */
    async getPublishableShop(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_publishable_shop", "query": ["global_item_id", "shop_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get published list
     * /api/v2/global_product/get_published_list (GET)
     */
    async getPublishedList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_published_list", "query": ["global_item_id", "shop_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get recommend attribute
     * /api/v2/global_product/get_recommend_attribute (GET)
     */
    async getRecommendAttribute(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_recommend_attribute", "query": ["global_item_name", "category_id", "cover_image_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop publishable status
     * /api/v2/global_product/get_shop_publishable_status (GET)
     */
    async getShopPublishableStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_shop_publishable_status", "query": ["global_item_id", "offset", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get size chart detail
     * /api/v2/global_product/get_size_chart_detail (GET)
     */
    async getSizeChartDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_size_chart_detail", "query": ["size_chart_id", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get size chart list
     * /api/v2/global_product/get_size_chart_list (GET)
     */
    async getSizeChartList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_size_chart_list", "query": ["category_id", "page_size", "cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get variations
     * /api/v2/global_product/get_variations (GET)
     */
    async getVariations(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/get_variations", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * init tier variation
     * /api/v2/global_product/init_tier_variation (POST)
     */
    async initTierVariation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/init_tier_variation", "query": [], "body": ["global_model", "global_item_id", "standardise_tier_variation"], "scope": "shop" }, params, opts);
    }
    /**
     * search global attribute value list
     * /api/v2/global_product/search_global_attribute_value_list (POST)
     */
    async searchGlobalAttributeValueList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/search_global_attribute_value_list", "query": [], "body": ["attribute_id", "value_name", "cursor", "limit"], "scope": "shop" }, params, opts);
    }
    /**
     * set sync field
     * /api/v2/global_product/set_sync_field (POST)
     */
    async setSyncField(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/set_sync_field", "query": [], "body": ["shop_sync_list"], "scope": "shop" }, params, opts);
    }
    /**
     * support size chart
     * /api/v2/global_product/support_size_chart (GET)
     */
    async supportSizeChart(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/global_product/support_size_chart", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update global item
     * /api/v2/global_product/update_global_item (POST)
     */
    async updateGlobalItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_global_item", "query": [], "body": ["global_item_id", "category_id", "global_item_name", "description", "global_item_sku", "weight", "dimension", "pre_order", "condition", "image", "video_upload_id", "attribute_list", "brand", "description_type", "description_info"], "scope": "shop" }, params, opts);
    }
    /**
     * update global model
     * /api/v2/global_product/update_global_model (POST)
     */
    async updateGlobalModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_global_model", "query": [], "body": ["global_item_id", "global_model"], "scope": "shop" }, params, opts);
    }
    /**
     * update local adjustment rate
     * /api/v2/global_product/update_local_adjustment_rate (POST)
     */
    async updateLocalAdjustmentRate(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_local_adjustment_rate", "query": [], "body": ["adjustment_rate", "shop_id"], "scope": "shop" }, params, opts);
    }
    /**
     * update price
     * /api/v2/global_product/update_price (POST)
     */
    async updatePrice(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_price", "query": [], "body": ["global_item_id", "price_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update size chart
     * /api/v2/global_product/update_size_chart (POST)
     */
    async updateSizeChart(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_size_chart", "query": [], "body": ["global_item_id", "size_chart"], "scope": "shop" }, params, opts);
    }
    /**
     * update stock
     * /api/v2/global_product/update_stock (POST)
     */
    async updateStock(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_stock", "query": [], "body": ["global_item_id", "stock_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update tier variation
     * /api/v2/global_product/update_tier_variation (POST)
     */
    async updateTierVariation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/global_product/update_tier_variation", "query": [], "body": ["standardise_tier_variation", "model", "global_item_id"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeGlobalProductApi = ShopeeGlobalProductApi;
//# sourceMappingURL=index.js.map