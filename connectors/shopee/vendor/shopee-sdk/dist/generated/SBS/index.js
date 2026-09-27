"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/SBS).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeSBSApi = void 0;
class ShopeeSBSApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get bound whs info
     * /api/v2/sbs/get_bound_whs_info (GET)
     */
    async getBoundWhsInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_bound_whs_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get current inventory
     * /api/v2/sbs/get_current_inventory (GET)
     */
    async getCurrentInventory(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_current_inventory", "query": ["page_no", "page_size", "search_type", "keyword", "whs_ids", "not_moving_tag", "inbound_pending_approval", "products_with_inventory", "category_id", "stock_levels", "whs_region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get expiry report
     * /api/v2/sbs/get_expiry_report (GET)
     */
    async getExpiryReport(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_expiry_report", "query": ["page_no", "page_size", "whs_ids", "expiry_status", "category_id_l1", "sku_id", "item_id", "variation", "item_name", "whs_region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get fulfillment mapping inventory list
     * /api/v2/sbs/get_fulfillment_mapping_inventory_list (GET)
     */
    async getFulfillmentMappingInventoryList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_fulfillment_mapping_inventory_list", "query": ["mtsku_ids", "page_size", "next_cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get stock aging
     * /api/v2/sbs/get_stock_aging (GET)
     */
    async getStockAging(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_stock_aging", "query": ["page_no", "page_size", "search_type", "keyword", "whs_ids", "aging_storage_tag", "excess_storage_tag", "category_id", "whs_region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get stock movement
     * /api/v2/sbs/get_stock_movement (GET)
     */
    async getStockMovement(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/sbs/get_stock_movement", "query": ["page_no", "page_size", "start_time", "end_time", "whs_ids", "category_id_l1", "sku_id", "item_id", "item_name", "variation", "whs_region"], "body": [], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeSBSApi = ShopeeSBSApi;
//# sourceMappingURL=index.js.map