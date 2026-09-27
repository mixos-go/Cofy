"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Voucher).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeVoucherApi = void 0;
class ShopeeVoucherApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add voucher
     * /api/v2/voucher/add_voucher (POST)
     */
    async addVoucher(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/voucher/add_voucher", "query": [], "body": ["voucher_name", "voucher_code", "start_time", "end_time", "voucher_type", "reward_type", "usage_quantity", "min_basket_price", "discount_amount", "max_price", "display_channel_list", "display_start_time"], "scope": "shop" }, params, opts);
    }
    /**
     * delete voucher
     * /api/v2/voucher/delete_voucher (POST)
     */
    async deleteVoucher(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/voucher/delete_voucher", "query": [], "body": ["voucher_id"], "scope": "shop" }, params, opts);
    }
    /**
     * end voucher
     * /api/v2/voucher/end_voucher (POST)
     */
    async endVoucher(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/voucher/end_voucher", "query": [], "body": ["voucher_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get voucher
     * /api/v2/voucher/get_voucher (GET)
     */
    async getVoucher(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/voucher/get_voucher", "query": ["voucher_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get voucher list
     * /api/v2/voucher/get_voucher_list (GET)
     */
    async getVoucherList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/voucher/get_voucher_list", "query": ["page_no", "page_size", "status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update voucher
     * /api/v2/voucher/update_voucher (POST)
     */
    async updateVoucher(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/voucher/update_voucher", "query": [], "body": ["voucher_id", "voucher_name", "start_time", "end_time", "usage_quantity", "min_basket_price", "percentage", "max_price", "display_channel_list", "display_start_time"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeVoucherApi = ShopeeVoucherApi;
//# sourceMappingURL=index.js.map