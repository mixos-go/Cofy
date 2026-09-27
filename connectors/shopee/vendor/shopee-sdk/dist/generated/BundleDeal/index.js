"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Bundle Deal).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeBundleDealApi = void 0;
class ShopeeBundleDealApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add bundle deal
     * /api/v2/bundle_deal/add_bundle_deal (POST)
     */
    async addBundleDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/add_bundle_deal", "query": [], "body": ["rule_type", "discount_value", "fix_price", "discount_percentage", "min_amount", "start_time", "end_time", "name", "purchase_limit", "additional_tiers"], "scope": "shop" }, params, opts);
    }
    /**
     * add bundle deal item
     * /api/v2/bundle_deal/add_bundle_deal_item (POST)
     */
    async addBundleDealItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/add_bundle_deal_item", "query": [], "body": ["bundle_deal_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * delete bundle deal
     * /api/v2/bundle_deal/delete_bundle_deal (POST)
     */
    async deleteBundleDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/delete_bundle_deal", "query": [], "body": ["bundle_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete bundle deal item
     * /api/v2/bundle_deal/delete_bundle_deal_item (POST)
     */
    async deleteBundleDealItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/delete_bundle_deal_item", "query": [], "body": ["bundle_deal_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * end bundle deal
     * /api/v2/bundle_deal/end_bundle_deal (POST)
     */
    async endBundleDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/end_bundle_deal", "query": [], "body": ["bundle_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get bundle deal
     * /api/v2/bundle_deal/get_bundle_deal (GET)
     */
    async getBundleDeal(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/bundle_deal/get_bundle_deal", "query": ["bundle_deal_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get bundle deal item
     * /api/v2/bundle_deal/get_bundle_deal_item (GET)
     */
    async getBundleDealItem(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/bundle_deal/get_bundle_deal_item", "query": ["bundle_deal_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get bundle deal list
     * /api/v2/bundle_deal/get_bundle_deal_list (GET)
     */
    async getBundleDealList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/bundle_deal/get_bundle_deal_list", "query": ["page_size", "time_status", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update bundle deal
     * /api/v2/bundle_deal/update_bundle_deal (POST)
     */
    async updateBundleDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/update_bundle_deal", "query": [], "body": ["bundle_deal_id", "rule_type", "discount_value", "fix_price", "discount_percentage", "min_amount", "start_time", "end_time", "name", "purchase_limit"], "scope": "shop" }, params, opts);
    }
    /**
     * update bundle deal item
     * /api/v2/bundle_deal/update_bundle_deal_item (POST)
     */
    async updateBundleDealItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/bundle_deal/update_bundle_deal_item", "query": [], "body": ["bundle_deal_id", "item_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeBundleDealApi = ShopeeBundleDealApi;
//# sourceMappingURL=index.js.map