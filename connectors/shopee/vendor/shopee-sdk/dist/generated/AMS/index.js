"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/AMS).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeAMSApi = void 0;
class ShopeeAMSApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add all products to open campaign
     * /api/v2/ams/add_all_products_to_open_campaign (POST)
     */
    async addAllProductsToOpenCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/add_all_products_to_open_campaign", "query": [], "body": ["commission_rate", "period_start_time", "period_end_time"], "scope": "shop" }, params, opts);
    }
    /**
     * batch add products to open campaign
     * /api/v2/ams/batch_add_products_to_open_campaign (POST)
     */
    async batchAddProductsToOpenCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/batch_add_products_to_open_campaign", "query": [], "body": ["item_id_list", "commission_rate", "period_start_time", "period_end_time"], "scope": "shop" }, params, opts);
    }
    /**
     * batch edit products open campaign setting
     * /api/v2/ams/batch_edit_products_open_campaign_setting (POST)
     */
    async batchEditProductsOpenCampaignSetting(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/batch_edit_products_open_campaign_setting", "query": [], "body": ["campaign_ids", "commission_rate", "period_start_time", "period_end_time"], "scope": "shop" }, params, opts);
    }
    /**
     * batch get products suggested rate
     * /api/v2/ams/batch_get_products_suggested_rate (GET)
     */
    async batchGetProductsSuggestedRate(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/batch_get_products_suggested_rate", "query": ["item_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * batch remove products open campaign setting
     * /api/v2/ams/batch_remove_products_open_campaign_setting (POST)
     */
    async batchRemoveProductsOpenCampaignSetting(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/batch_remove_products_open_campaign_setting", "query": [], "body": ["campaign_ids"], "scope": "shop" }, params, opts);
    }
    /**
     * create new targeted campaign
     * /api/v2/ams/create_new_targeted_campaign (POST)
     */
    async createNewTargetedCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/create_new_targeted_campaign", "query": [], "body": ["campaign_name", "period_start_time", "period_end_time", "is_set_budget", "budget", "seller_message", "item_list", "affiliate_list"], "scope": "shop" }, params, opts);
    }
    /**
     * edit affiliate list of targeted campaign
     * /api/v2/ams/edit_affiliate_list_of_targeted_campaign (POST)
     */
    async editAffiliateListOfTargetedCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/edit_affiliate_list_of_targeted_campaign", "query": [], "body": ["campaign_id", "edit_type", "affiliate_list"], "scope": "shop" }, params, opts);
    }
    /**
     * edit all products open campaign setting
     * /api/v2/ams/edit_all_products_open_campaign_setting (POST)
     */
    async editAllProductsOpenCampaignSetting(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/edit_all_products_open_campaign_setting", "query": [], "body": ["commission_rate", "period_start_time", "period_end_time"], "scope": "shop" }, params, opts);
    }
    /**
     * edit product list of targeted campaign
     * /api/v2/ams/edit_product_list_of_targeted_campaign (POST)
     */
    async editProductListOfTargetedCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/edit_product_list_of_targeted_campaign", "query": [], "body": ["campaign_id", "edit_type", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get affiliate performance
     * /api/v2/ams/get_affiliate_performance (GET)
     */
    async getAffiliatePerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_affiliate_performance", "query": ["period_type", "start_date", "end_date", "page_no", "page_size", "order_type", "channel", "affiliate_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get auto add new product toggle status
     * /api/v2/ams/get_auto_add_new_product_toggle_status (GET)
     */
    async getAutoAddNewProductToggleStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_auto_add_new_product_toggle_status", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get campaign key metrics performance
     * /api/v2/ams/get_campaign_key_metrics_performance (GET)
     */
    async getCampaignKeyMetricsPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_campaign_key_metrics_performance", "query": ["period_type", "start_date", "end_date"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get content performance
     * /api/v2/ams/get_content_performance (GET)
     */
    async getContentPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_content_performance", "query": ["period_type", "start_date", "end_date", "page_no", "page_size", "order_type", "channel", "affiliate_id", "item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get conversion report
     * /api/v2/ams/get_conversion_report (GET)
     */
    async getConversionReport(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_conversion_report", "query": ["page_no", "page_size", "order_sn", "affiliate_id", "item_id", "item_name", "l1_category_id", "l2_category_id", "l3_category_id", "order_status", "verified_status", "buyer_status", "attr_campaign_id", "campaign_partner", "seller_campaign_type", "deduction_status", "deduction_method", "place_order_time_start", "place_order_time_end", "order_completed_time_start", "order_completed_time_end", "conversion_completed_time_start", "conversion_completed_time_end", "ams_deduction_time_start", "ams_deduction_time_end"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get managed affiliate list
     * /api/v2/ams/get_managed_affiliate_list (GET)
     */
    async getManagedAffiliateList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_managed_affiliate_list", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get open campaign added product
     * /api/v2/ams/get_open_campaign_added_product (GET)
     */
    async getOpenCampaignAddedProduct(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_open_campaign_added_product", "query": ["page_size", "cursor", "sort_by", "search_type", "search_content"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get open campaign batch task result
     * /api/v2/ams/get_open_campaign_batch_task_result (GET)
     */
    async getOpenCampaignBatchTaskResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_open_campaign_batch_task_result", "query": ["task_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get open campaign not added product
     * /api/v2/ams/get_open_campaign_not_added_product (GET)
     */
    async getOpenCampaignNotAddedProduct(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_open_campaign_not_added_product", "query": ["page_size", "cursor", "sort_by", "search_type", "search_content"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get open campaign performance
     * /api/v2/ams/get_open_campaign_performance (GET)
     */
    async getOpenCampaignPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_open_campaign_performance", "query": ["period_type", "start_date", "end_date", "page_no", "page_size", "item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get optimization suggestion product
     * /api/v2/ams/get_optimization_suggestion_product (GET)
     */
    async getOptimizationSuggestionProduct(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_optimization_suggestion_product", "query": ["page_no", "page_size", "rcmd_reason_filter"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get performance data update time
     * /api/v2/ams/get_performance_data_update_time (GET)
     */
    async getPerformanceDataUpdateTime(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_performance_data_update_time", "query": ["marker_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product performance
     * /api/v2/ams/get_product_performance (GET)
     */
    async getProductPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_product_performance", "query": ["period_type", "start_date", "end_date", "page_no", "page_size", "order_type", "channel", "item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get recommended affiliate list
     * /api/v2/ams/get_recommended_affiliate_list (GET)
     */
    async getRecommendedAffiliateList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_recommended_affiliate_list", "query": ["page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop performance
     * /api/v2/ams/get_shop_performance (GET)
     */
    async getShopPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_shop_performance", "query": ["period_type", "start_date", "end_date", "order_type", "channel"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop suggested rate
     * /api/v2/ams/get_shop_suggested_rate (GET)
     */
    async getShopSuggestedRate(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_shop_suggested_rate", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get targeted campaign addable product list
     * /api/v2/ams/get_targeted_campaign_addable_product_list (GET)
     */
    async getTargetedCampaignAddableProductList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_targeted_campaign_addable_product_list", "query": ["page_size", "cursor", "sort_by", "search_type", "search_content"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get targeted campaign list
     * /api/v2/ams/get_targeted_campaign_list (GET)
     */
    async getTargetedCampaignList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_targeted_campaign_list", "query": ["page_size", "page_no", "campaign_id_list", "campaign_name", "campaign_status", "period_start_time", "period_end_time", "item_id", "item_name"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get targeted campaign performance
     * /api/v2/ams/get_targeted_campaign_performance (GET)
     */
    async getTargetedCampaignPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_targeted_campaign_performance", "query": ["period_type", "start_date", "end_date", "page_no", "page_size", "campaign_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get targeted campaign settings
     * /api/v2/ams/get_targeted_campaign_settings (GET)
     */
    async getTargetedCampaignSettings(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_targeted_campaign_settings", "query": ["campaign_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get validation list
     * /api/v2/ams/get_validation_list (GET)
     */
    async getValidationList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_validation_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get validation report
     * /api/v2/ams/get_validation_report (GET)
     */
    async getValidationReport(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/get_validation_report", "query": ["page_no", "page_size", "validation_id", "validation_month", "campaign_source", "order_sn", "l1_category_id", "l2_category_id", "l3_category_id", "item_id", "item_name", "verified_status", "attr_campaign_id", "place_order_time_start", "place_order_time_end"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * query affiliate list
     * /api/v2/ams/query_affiliate_list (GET)
     */
    async queryAffiliateList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ams/query_affiliate_list", "query": ["query_type", "affiliate_id_list", "name"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * remove all products open campaign setting
     * /api/v2/ams/remove_all_products_open_campaign_setting (POST)
     */
    async removeAllProductsOpenCampaignSetting(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/remove_all_products_open_campaign_setting", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * terminate targeted campaign
     * /api/v2/ams/terminate_targeted_campaign (POST)
     */
    async terminateTargetedCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/terminate_targeted_campaign", "query": [], "body": ["campaign_id"], "scope": "shop" }, params, opts);
    }
    /**
     * update auto add new product setting
     * /api/v2/ams/update_auto_add_new_product_setting (POST)
     */
    async updateAutoAddNewProductSetting(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/update_auto_add_new_product_setting", "query": [], "body": ["open", "commission_rate"], "scope": "shop" }, params, opts);
    }
    /**
     * update basic info of targeted campaign
     * /api/v2/ams/update_basic_info_of_targeted_campaign (POST)
     */
    async updateBasicInfoOfTargetedCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ams/update_basic_info_of_targeted_campaign", "query": [], "body": ["campaign_id", "campaign_name", "period_start_time", "period_end_time", "is_set_budget", "budget"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeAMSApi = ShopeeAMSApi;
//# sourceMappingURL=index.js.map