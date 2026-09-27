"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Add-On Deal).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeAddOnDealApi = void 0;
class ShopeeAddOnDealApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add add on deal
     * /api/v2/add_on_deal/add_add_on_deal (POST)
     */
    async addAddOnDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/add_add_on_deal", "query": [], "body": ["add_on_deal_name", "start_time", "end_time", "promotion_type", "purchase_min_spend", "per_gift_num", "promotion_purchase_limit"], "scope": "shop" }, params, opts);
    }
    /**
     * add add on deal main item
     * /api/v2/add_on_deal/add_add_on_deal_main_item (POST)
     */
    async addAddOnDealMainItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/add_add_on_deal_main_item", "query": [], "body": ["add_on_deal_id", "main_item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * add add on deal sub item
     * /api/v2/add_on_deal/add_add_on_deal_sub_item (POST)
     */
    async addAddOnDealSubItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/add_add_on_deal_sub_item", "query": [], "body": ["sub_item_list", "add_on_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete add on deal
     * /api/v2/add_on_deal/delete_add_on_deal (POST)
     */
    async deleteAddOnDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/delete_add_on_deal", "query": [], "body": ["add_on_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete add on deal main item
     * /api/v2/add_on_deal/delete_add_on_deal_main_item (POST)
     */
    async deleteAddOnDealMainItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/delete_add_on_deal_main_item", "query": [], "body": ["main_item_list", "add_on_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete add on deal sub item
     * /api/v2/add_on_deal/delete_add_on_deal_sub_item (POST)
     */
    async deleteAddOnDealSubItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/delete_add_on_deal_sub_item", "query": [], "body": ["sub_item_list", "add_on_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * end add on deal
     * /api/v2/add_on_deal/end_add_on_deal (POST)
     */
    async endAddOnDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/end_add_on_deal", "query": [], "body": ["add_on_deal_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get add on deal
     * /api/v2/add_on_deal/get_add_on_deal (GET)
     */
    async getAddOnDeal(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/add_on_deal/get_add_on_deal", "query": ["add_on_deal_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get add on deal list
     * /api/v2/add_on_deal/get_add_on_deal_list (GET)
     */
    async getAddOnDealList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/add_on_deal/get_add_on_deal_list", "query": ["promotion_status", "page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get add on deal main item
     * /api/v2/add_on_deal/get_add_on_deal_main_item (GET)
     */
    async getAddOnDealMainItem(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/add_on_deal/get_add_on_deal_main_item", "query": ["add_on_deal_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get add on deal sub item
     * /api/v2/add_on_deal/get_add_on_deal_sub_item (GET)
     */
    async getAddOnDealSubItem(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/add_on_deal/get_add_on_deal_sub_item", "query": ["add_on_deal_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update add on deal
     * /api/v2/add_on_deal/update_add_on_deal (POST)
     */
    async updateAddOnDeal(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/update_add_on_deal", "query": [], "body": ["add_on_deal_id", "add_on_deal_name", "sub_item_priority", "sub_item_limit"], "scope": "shop" }, params, opts);
    }
    /**
     * update add on deal main item
     * /api/v2/add_on_deal/update_add_on_deal_main_item (POST)
     */
    async updateAddOnDealMainItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/update_add_on_deal_main_item", "query": [], "body": ["add_on_deal_id", "main_item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update add on deal sub item
     * /api/v2/add_on_deal/update_add_on_deal_sub_item (POST)
     */
    async updateAddOnDealSubItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/add_on_deal/update_add_on_deal_sub_item", "query": [], "body": ["add_on_deal_id", "sub_item_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeAddOnDealApi = ShopeeAddOnDealApi;
//# sourceMappingURL=index.js.map