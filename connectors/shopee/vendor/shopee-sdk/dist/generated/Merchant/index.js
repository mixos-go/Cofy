"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Merchant).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeMerchantApi = void 0;
class ShopeeMerchantApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get merchant info
     * /api/v2/merchant/get_merchant_info (GET)
     */
    async getMerchantInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/merchant/get_merchant_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get merchant prepaid account list
     * /api/v2/merchant/get_merchant_prepaid_account_list (GET)
     */
    async getMerchantPrepaidAccountList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/merchant/get_merchant_prepaid_account_list", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get merchant warehouse list
     * /api/v2/merchant/get_merchant_warehouse_list (POST)
     */
    async getMerchantWarehouseList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/merchant/get_merchant_warehouse_list", "query": [], "body": ["warehouse_type", "cursor"], "scope": "shop" }, params, opts);
    }
    /**
     * get merchant warehouse location list
     * /api/v2/merchant/get_merchant_warehouse_location_list (GET)
     */
    async getMerchantWarehouseLocationList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/merchant/get_merchant_warehouse_location_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop list by merchant
     * /api/v2/merchant/get_shop_list_by_merchant (GET)
     */
    async getShopListByMerchant(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/merchant/get_shop_list_by_merchant", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get warehouse eligible shop list
     * /api/v2/merchant/get_warehouse_eligible_shop_list (POST)
     */
    async getWarehouseEligibleShopList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/merchant/get_warehouse_eligible_shop_list", "query": [], "body": ["warehouse_id", "warehouse_type", "cursor"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeMerchantApi = ShopeeMerchantApi;
//# sourceMappingURL=index.js.map