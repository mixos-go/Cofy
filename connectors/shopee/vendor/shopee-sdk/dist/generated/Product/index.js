"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Product).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeProductApi = void 0;
class ShopeeProductApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add item
     * /api/v2/product/add_item (POST)
     */
    async addItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/add_item", "query": [], "body": ["original_price", "description", "weight", "item_name", "item_status", "dimension", "logistic_info", "attribute_list", "category_id", "image", "pre_order", "item_sku", "condition", "wholesale", "video_upload_id", "brand", "item_dangerous", "tax_info", "complaint_policy", "description_info", "description_type", "seller_stock"], "scope": "shop" }, params, opts);
    }
    /**
     * add kit item
     * /api/v2/product/add_kit_item (POST)
     */
    async addKitItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/add_kit_item", "query": [], "body": ["sync_setting", "item_setting"], "scope": "shop" }, params, opts);
    }
    /**
     * add model
     * /api/v2/product/add_model (POST)
     */
    async addModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/add_model", "query": [], "body": ["model_list"], "scope": "shop" }, params, opts);
    }
    /**
     * batch add item
     * /api/v2/product/batch_add_item (POST)
     */
    async batchAddItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/batch_add_item", "query": [], "body": ["item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * batch publish item to outlet shop
     * /api/v2/product/batch_publish_item_to_outlet_shop (POST)
     */
    async batchPublishItemToOutletShop(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/batch_publish_item_to_outlet_shop", "query": [], "body": ["item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * batch update outlet price
     * /api/v2/product/batch_update_outlet_price (POST)
     */
    async batchUpdateOutletPrice(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/batch_update_outlet_price", "query": [], "body": ["item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * batch update outlet stock
     * /api/v2/product/batch_update_outlet_stock (POST)
     */
    async batchUpdateOutletStock(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/batch_update_outlet_stock", "query": [], "body": ["item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * boost item
     * /api/v2/product/boost_item (POST)
     */
    async boostItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/boost_item", "query": [], "body": ["item_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * category recommend
     * /api/v2/product/category_recommend (GET)
     */
    async categoryRecommend(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/category_recommend", "query": ["item_name", "product_cover_image"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * delete item
     * /api/v2/product/delete_item (POST)
     */
    async deleteItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/delete_item", "query": [], "body": ["item_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete model
     * /api/v2/product/delete_model (POST)
     */
    async deleteModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/delete_model", "query": [], "body": ["item_id", "model_id"], "scope": "shop" }, params, opts);
    }
    /**
     * generate kit image
     * /api/v2/product/generate_kit_image (POST)
     */
    async generateKitImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/generate_kit_image", "query": [], "body": ["component_list", "component_item_id", "component_model_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get aitem by pitem id
     * /api/v2/product/get_aitem_by_pitem_id (GET)
     */
    async getAitemByPitemId(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_aitem_by_pitem_id", "query": ["pitem_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get all vehicle list
     * /api/v2/product/get_all_vehicle_list (GET)
     */
    async getAllVehicleList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_all_vehicle_list", "query": ["page_size", "offset", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get attribute tree
     * /api/v2/product/get_attribute_tree (GET)
     */
    async getAttributeTree(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_attribute_tree", "query": ["category_id_list", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get batch task result
     * /api/v2/product/get_batch_task_result (GET)
     */
    async getBatchTaskResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_batch_task_result", "query": ["task_type", "task_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get boosted list
     * /api/v2/product/get_boosted_list (GET)
     */
    async getBoostedList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_boosted_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get brand list
     * /api/v2/product/get_brand_list (GET)
     */
    async getBrandList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_brand_list", "query": ["offset", "page_size", "category_id", "status", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get category
     * /api/v2/product/get_category (GET)
     */
    async getCategory(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_category", "query": ["language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get comment
     * /api/v2/product/get_comment (GET)
     */
    async getComment(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_comment", "query": ["item_id", "comment_id", "cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get direct item list
     * /api/v2/product/get_direct_item_list (GET)
     */
    async getDirectItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_direct_item_list", "query": ["main_item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get direct shop recommended price
     * /api/v2/product/get_direct_shop_recommended_price (GET)
     */
    async getDirectShopRecommendedPrice(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_direct_shop_recommended_price", "query": ["main_item_id", "direct_shop_regions", "category_id", "model_list", "model_id", "tier_index", "input_price", "weight", "enabled_channel_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item base info
     * /api/v2/product/get_item_base_info (GET)
     */
    async getItemBaseInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_base_info", "query": ["item_id_list", "need_tax_info", "need_complaint_policy"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item content diagnosis result
     * /api/v2/product/get_item_content_diagnosis_result (POST)
     */
    async getItemContentDiagnosisResult(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_item_content_diagnosis_result", "query": [], "body": ["item_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get item extra info
     * /api/v2/product/get_item_extra_info (GET)
     */
    async getItemExtraInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_extra_info", "query": ["item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item limit
     * /api/v2/product/get_item_limit (GET)
     */
    async getItemLimit(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_limit", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item list
     * /api/v2/product/get_item_list (GET)
     */
    async getItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_list", "query": ["offset", "page_size", "update_time_from", "update_time_to", "item_status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item list by content diagnosis
     * /api/v2/product/get_item_list_by_content_diagnosis (POST)
     */
    async getItemListByContentDiagnosis(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_item_list_by_content_diagnosis", "query": [], "body": ["page_size", "quality_level", "issue_type"], "scope": "shop" }, params, opts);
    }
    /**
     * get item promotion
     * /api/v2/product/get_item_promotion (GET)
     */
    async getItemPromotion(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_promotion", "query": ["item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item violation info
     * /api/v2/product/get_item_violation_info (GET)
     */
    async getItemViolationInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_item_violation_info", "query": ["item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get kit item info
     * /api/v2/product/get_kit_item_info (GET)
     */
    async getKitItemInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_kit_item_info", "query": ["item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get kit item limit
     * /api/v2/product/get_kit_item_limit (GET)
     */
    async getKitItemLimit(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_kit_item_limit", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get main item list
     * /api/v2/product/get_main_item_list (GET)
     */
    async getMainItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_main_item_list", "query": ["direct_item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get mart item by outlet item id
     * /api/v2/product/get_mart_item_by_outlet_item_id (POST)
     */
    async getMartItemByOutletItemId(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_mart_item_by_outlet_item_id", "query": [], "body": ["outlet_item_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get mart item mapping by id
     * /api/v2/product/get_mart_item_mapping_by_id (POST)
     */
    async getMartItemMappingById(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_mart_item_mapping_by_id", "query": [], "body": ["mart_item_id", "outlet_shop_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get model list
     * /api/v2/product/get_model_list (GET)
     */
    async getModelList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_model_list", "query": ["item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product certification rule
     * /api/v2/product/get_product_certification_rule (POST)
     */
    async getProductCertificationRule(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_product_certification_rule", "query": [], "body": ["attribute_list", "attribute_id", "attribute_value_list", "value_id", "original_value_name", "value_unit", "category_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get recommend attribute
     * /api/v2/product/get_recommend_attribute (GET)
     */
    async getRecommendAttribute(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_recommend_attribute", "query": ["item_name", "cover_image_id", "category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get size chart detail
     * /api/v2/product/get_size_chart_detail (GET)
     */
    async getSizeChartDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_size_chart_detail", "query": ["size_chart_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get size chart list
     * /api/v2/product/get_size_chart_list (GET)
     */
    async getSizeChartList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_size_chart_list", "query": ["category_id", "page_size", "cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get variations
     * /api/v2/product/get_variation_tree (GET)
     */
    async getVariations(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_variation_tree", "query": ["category_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get vehicle list by compatibility detail
     * /api/v2/product/get_vehicle_list_by_compatibility_detail (GET)
     */
    async getVehicleListByCompatibilityDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/get_vehicle_list_by_compatibility_detail", "query": ["compatibility_details", "brand_id", "model_id", "year_id", "language"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get weight recommendation
     * /api/v2/product/get_weight_recommendation (POST)
     */
    async getWeightRecommendation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/get_weight_recommendation", "query": [], "body": ["item_name", "cover_image_id", "category_id", "attribute_list", "brand_id", "description_type", "description_info"], "scope": "shop" }, params, opts);
    }
    /**
     * init tier variation
     * /api/v2/product/init_tier_variation (POST)
     */
    async initTierVariation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/init_tier_variation", "query": [], "body": ["item_id", "standardise_tier_variation", "model"], "scope": "shop" }, params, opts);
    }
    /**
     * publish item to outlet shop
     * /api/v2/product/publish_item_to_outlet_shop (POST)
     */
    async publishItemToOutletShop(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/publish_item_to_outlet_shop", "query": [], "body": ["mart_shop_id", "mart_item_id", "outlet_shop_id", "publish_item"], "scope": "shop" }, params, opts);
    }
    /**
     * register brand
     * /api/v2/product/register_brand (POST)
     */
    async registerBrand(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/register_brand", "query": [], "body": ["original_brand_name", "category_list", "product_image", "app_logo_image_id", "brand_website", "brand_description", "additional_information", "pc_logo_image_id", "brand_region"], "scope": "shop" }, params, opts);
    }
    /**
     * reply comment
     * /api/v2/product/reply_comment (POST)
     */
    async replyComment(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/reply_comment", "query": [], "body": ["comment_list"], "scope": "shop" }, params, opts);
    }
    /**
     * search attribute value list
     * /api/v2/product/search_attribute_value_list (POST)
     */
    async searchAttributeValueList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/search_attribute_value_list", "query": [], "body": ["attribute_id", "value_name", "cursor", "limit"], "scope": "shop" }, params, opts);
    }
    /**
     * search item
     * /api/v2/product/search_item (GET)
     */
    async searchItem(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/product/search_item", "query": ["offset", "page_size", "item_name", "attribute_status", "item_sku", "item_status", "deboost_only"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * search unpackaged model list
     * /api/v2/product/search_unpackaged_model_list (POST)
     */
    async searchUnpackagedModelList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/search_unpackaged_model_list", "query": [], "body": ["page_size", "item_name"], "scope": "shop" }, params, opts);
    }
    /**
     * unlist item
     * /api/v2/product/unlist_item (POST)
     */
    async unlistItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/unlist_item", "query": [], "body": ["item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update item
     * /api/v2/product/update_item (POST)
     */
    async updateItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_item", "query": [], "body": ["description", "weight", "pre_order", "item_name", "attribute_list", "image", "item_sku", "item_status", "logistic_info", "wholesale", "item_id", "category_id", "dimension", "condition", "video_upload_id", "brand", "item_dangerous", "tax_info", "complaint_policy", "description_info", "description_type"], "scope": "shop" }, params, opts);
    }
    /**
     * update kit item
     * /api/v2/product/update_kit_item (POST)
     */
    async updateKitItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_kit_item", "query": [], "body": ["item_id", "sync_setting", "item_setting"], "scope": "shop" }, params, opts);
    }
    /**
     * update model
     * /api/v2/product/update_model (POST)
     */
    async updateModel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_model", "query": [], "body": ["model"], "scope": "shop" }, params, opts);
    }
    /**
     * update price
     * /api/v2/product/update_price (POST)
     */
    async updatePrice(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_price", "query": [], "body": ["item_id", "price_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update sip item price
     * /api/v2/product/update_sip_item_price (POST)
     */
    async updateSipItemPrice(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_sip_item_price", "query": [], "body": ["item_id", "sip_item_price"], "scope": "shop" }, params, opts);
    }
    /**
     * update stock
     * /api/v2/product/update_stock (POST)
     */
    async updateStock(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_stock", "query": [], "body": ["item_id", "stock_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update tier variation
     * /api/v2/product/update_tier_variation (POST)
     */
    async updateTierVariation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/product/update_tier_variation", "query": [], "body": ["item_id", "model_list", "standardise_tier_variation"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeProductApi = ShopeeProductApi;
//# sourceMappingURL=index.js.map