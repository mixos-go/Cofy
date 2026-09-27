"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Ads).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeAdsApi = void 0;
class ShopeeAdsApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * check create gms product campaign eligibility
     * /api/v2/ads/check_create_gms_product_campaign_eligibility (GET)
     */
    async checkCreateGmsProductCampaignEligibility(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/check_create_gms_product_campaign_eligibility", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * create auto product ads
     * /api/v2/ads/create_auto_product_ads (POST)
     */
    async createAutoProductAds(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/create_auto_product_ads", "query": [], "body": ["reference_id", "budget", "start_date", "end_date"], "scope": "shop" }, params, opts);
    }
    /**
     * create gms product campaign
     * /api/v2/ads/create_gms_product_campaign (POST)
     */
    async createGmsProductCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/create_gms_product_campaign", "query": [], "body": ["start_date", "end_date", "daily_budget"], "scope": "shop" }, params, opts);
    }
    /**
     * create manual product ads
     * /api/v2/ads/create_manual_product_ads (POST)
     */
    async createManualProductAds(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/create_manual_product_ads", "query": [], "body": ["reference_id", "budget", "start_date", "end_date", "bidding_method", "item_id", "roas_target", "selected_keywords", "discovery_ads_locations", "enhanced_cpc", "smart_creative_setting"], "scope": "shop" }, params, opts);
    }
    /**
     * edit auto product ads
     * /api/v2/ads/edit_auto_product_ads (POST)
     */
    async editAutoProductAds(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/edit_auto_product_ads", "query": [], "body": ["reference_id", "campaign_id", "edit_action", "budget", "start_date", "end_date"], "scope": "shop" }, params, opts);
    }
    /**
     * edit gms item product campaign
     * /api/v2/ads/edit_gms_item_product_campaign (POST)
     */
    async editGmsItemProductCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/edit_gms_item_product_campaign", "query": [], "body": ["campaign_id", "edit_action", "item_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * edit gms product campaign
     * /api/v2/ads/edit_gms_product_campaign (POST)
     */
    async editGmsProductCampaign(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/edit_gms_product_campaign", "query": [], "body": ["campaign_id", "edit_action", "daily_budget", "start_date", "end_date"], "scope": "shop" }, params, opts);
    }
    /**
     * edit manual product ad keywords
     * /api/v2/ads/edit_manual_product_ad_keywords (POST)
     */
    async editManualProductAdKeywords(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/edit_manual_product_ad_keywords", "query": [], "body": ["reference_id", "campaign_id", "selected_keywords"], "scope": "shop" }, params, opts);
    }
    /**
     * edit manual product ads
     * /api/v2/ads/edit_manual_product_ads (POST)
     */
    async editManualProductAds(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/edit_manual_product_ads", "query": [], "body": ["reference_id", "campaign_id", "edit_action", "budget", "start_date", "end_date", "roas_target", "discovery_ads_locations", "enhanced_cpc", "smart_creative_setting"], "scope": "shop" }, params, opts);
    }
    /**
     * get ads fácil shop rate
     * /api/v2/ads/get_ads_facil_shop_rate (GET)
     */
    async getAdsFCilShopRate(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_ads_facil_shop_rate", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get all cpc ads daily performance
     * /api/v2/ads/get_all_cpc_ads_daily_performance (GET)
     */
    async getAllCpcAdsDailyPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_all_cpc_ads_daily_performance", "query": ["start_date", "end_date"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get all cpc ads hourly performance
     * /api/v2/ads/get_all_cpc_ads_hourly_performance (GET)
     */
    async getAllCpcAdsHourlyPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_all_cpc_ads_hourly_performance", "query": ["performance_date"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get create product ad budget suggestion
     * /api/v2/ads/get_create_product_ad_budget_suggestion (GET)
     */
    async getCreateProductAdBudgetSuggestion(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_create_product_ad_budget_suggestion", "query": ["reference_id", "product_selection", "campaign_placement", "bidding_method", "enhanced_cpc", "discovery_ads_location_names", "roas_target", "item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get gms campaign performance
     * /api/v2/ads/get_gms_campaign_performance (POST)
     */
    async getGmsCampaignPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/get_gms_campaign_performance", "query": [], "body": ["campaign_id", "start_date", "end_date"], "scope": "shop" }, params, opts);
    }
    /**
     * get gms item performance
     * /api/v2/ads/get_gms_item_performance (POST)
     */
    async getGmsItemPerformance(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/get_gms_item_performance", "query": [], "body": ["campaign_id", "start_date", "end_date", "offset", "limit"], "scope": "shop" }, params, opts);
    }
    /**
     * get product campaign daily performance
     * /api/v2/ads/get_product_campaign_daily_performance (GET)
     */
    async getProductCampaignDailyPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_product_campaign_daily_performance", "query": ["start_date", "end_date", "campaign_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product campaign hourly performance
     * /api/v2/ads/get_product_campaign_hourly_performance (GET)
     */
    async getProductCampaignHourlyPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_product_campaign_hourly_performance", "query": ["performance_date", "campaign_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product level campaign id list
     * /api/v2/ads/get_product_level_campaign_id_list (GET)
     */
    async getProductLevelCampaignIdList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_product_level_campaign_id_list", "query": ["ad_type", "offset", "limit"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product level campaign setting info
     * /api/v2/ads/get_product_level_campaign_setting_info (GET)
     */
    async getProductLevelCampaignSettingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_product_level_campaign_setting_info", "query": ["info_type_list", "campaign_id_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get product recommended roi target
     * /api/v2/ads/get_product_recommended_roi_target (GET)
     */
    async getProductRecommendedRoiTarget(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_product_recommended_roi_target", "query": ["reference_id", "item_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get recommended item list
     * /api/v2/ads/get_recommended_item_list (GET)
     */
    async getRecommendedItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_recommended_item_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get recommended keyword list
     * /api/v2/ads/get_recommended_keyword_list (GET)
     */
    async getRecommendedKeywordList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_recommended_keyword_list", "query": ["item_id", "input_keyword"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop toggle info
     * /api/v2/ads/get_shop_toggle_info (GET)
     */
    async getShopToggleInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_shop_toggle_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get total balance
     * /api/v2/ads/get_total_balance (GET)
     */
    async getTotalBalance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/ads/get_total_balance", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * list gms user deleted item
     * /api/v2/ads/list_gms_user_deleted_item (POST)
     */
    async listGmsUserDeletedItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/ads/list_gms_user_deleted_item", "query": [], "body": ["offset", "limit"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeAdsApi = ShopeeAdsApi;
//# sourceMappingURL=index.js.map