"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/FBS).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeFBSApi = void 0;
class ShopeeFBSApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * query br shop block status
     * /api/v2/fbs/query_br_shop_block_status (GET)
     */
    async queryBrShopBlockStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/fbs/query_br_shop_block_status", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * query br shop enrollment status
     * /api/v2/fbs/query_br_shop_enrollment_status (GET)
     */
    async queryBrShopEnrollmentStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/fbs/query_br_shop_enrollment_status", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * query br shop invoice error
     * /api/v2/fbs/query_br_shop_invoice_error (GET)
     */
    async queryBrShopInvoiceError(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/fbs/query_br_shop_invoice_error", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * query br sku block status
     * /api/v2/fbs/query_br_sku_block_status (GET)
     */
    async queryBrSkuBlockStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/fbs/query_br_sku_block_status", "query": ["shop_sku_id"], "body": [], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeFBSApi = ShopeeFBSApi;
//# sourceMappingURL=index.js.map