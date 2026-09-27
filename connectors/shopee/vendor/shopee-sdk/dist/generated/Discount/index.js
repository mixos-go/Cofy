"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Discount).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeDiscountApi = void 0;
class ShopeeDiscountApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add discount
     * /api/v2/discount/add_discount (POST)
     */
    async addDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/add_discount", "query": [], "body": ["start_time", "end_time", "discount_name"], "scope": "shop" }, params, opts);
    }
    /**
     * add discount item
     * /api/v2/discount/add_discount_item (POST)
     */
    async addDiscountItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/add_discount_item", "query": [], "body": ["discount_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * delete discount
     * /api/v2/discount/delete_discount (POST)
     */
    async deleteDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/delete_discount", "query": [], "body": ["discount_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete discount item
     * /api/v2/discount/delete_discount_item (POST)
     */
    async deleteDiscountItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/delete_discount_item", "query": [], "body": ["discount_id", "item_id", "model_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete sip discount
     * /api/v2/discount/delete_sip_discount (POST)
     */
    async deleteSipDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/delete_sip_discount", "query": [], "body": ["region"], "scope": "shop" }, params, opts);
    }
    /**
     * end discount
     * /api/v2/discount/end_discount (POST)
     */
    async endDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/end_discount", "query": [], "body": ["discount_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get discount
     * /api/v2/discount/get_discount (GET)
     */
    async getDiscount(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/discount/get_discount", "query": ["discount_id", "page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get discount list
     * /api/v2/discount/get_discount_list (GET)
     */
    async getDiscountList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/discount/get_discount_list", "query": ["discount_status", "page_no", "page_size", "update_time_from", "update_time_to"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get sip discounts
     * /api/v2/discount/get_sip_discounts (GET)
     */
    async getSipDiscounts(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/discount/get_sip_discounts", "query": ["region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * set sip discount
     * /api/v2/discount/set_sip_discount (POST)
     */
    async setSipDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/set_sip_discount", "query": [], "body": ["region", "sip_discount_rate"], "scope": "shop" }, params, opts);
    }
    /**
     * update discount
     * /api/v2/discount/update_discount (POST)
     */
    async updateDiscount(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/update_discount", "query": [], "body": ["discount_id", "start_time", "end_time", "discount_name"], "scope": "shop" }, params, opts);
    }
    /**
     * update discount item
     * /api/v2/discount/update_discount_item (POST)
     */
    async updateDiscountItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/discount/update_discount_item", "query": [], "body": ["discount_id", "item_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeDiscountApi = ShopeeDiscountApi;
//# sourceMappingURL=index.js.map