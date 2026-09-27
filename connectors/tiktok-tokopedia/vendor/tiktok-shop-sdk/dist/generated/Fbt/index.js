"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/fbt).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokFbtApi = void 0;
class TikTokFbtApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CancelFBTMCFOrder
     * /fbt/202601/mcf_outbound_orders/cancel (POST)
     */
    async cancelFBTMCFOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202601/mcf_outbound_orders/cancel", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["consign_orders", "mcf_order_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateFBTMCFOrder
     * /fbt/202601/mcf_outbound_orders (POST)
     */
    async createFBTMCFOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202601/mcf_outbound_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["consignee", "external_order_id", "goods"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetFBFMCFOrderStatus
     * /fbt/202601/mcf_outbound_orders (GET)
     */
    async getFBFMCFOrderStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fbt/202601/mcf_outbound_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["mcf_order_id", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetFBTMerchantOnboardedRegions
     * /fbt/202409/merchants/onboarded_regions (GET)
     */
    async getFBTMerchantOnboardedRegions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fbt/202409/merchants/onboarded_regions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetFBTWarehouseList
     * /fbt/202408/warehouses (GET)
     */
    async getFBTWarehouseList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fbt/202408/warehouses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetInboundOrder
     * /fbt/202409/inbound_orders (GET)
     */
    async getInboundOrder(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fbt/202409/inbound_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * QueryGoodsInventoryForMCF
     * /fbt/202601/mcf/goods/inventory/search (POST)
     */
    async queryGoodsInventoryForMCF(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202601/mcf/goods/inventory/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["goods"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchFBTInventory
     * /fbt/202408/inventory/search (POST)
     */
    async searchFBTInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202408/inventory/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["fbt_warehouse_ids", "goods_ids", "sku_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchFBTInventoryRecord
     * /fbt/202410/inventory_records/search (POST)
     */
    async searchFBTInventoryRecord(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202410/inventory_records/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_le", "fbt_warehouse_ids", "goods_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchGoodsInfo
     * /fbt/202409/goods/search (POST)
     */
    async searchGoodsInfo(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fbt/202409/goods/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["goods_ids", "product_ids", "reference_codes", "sku_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * getfbtmerchantmcfstatus
     * /fbt/202601/merchants/mcf_status (GET)
     */
    async getfbtmerchantmcfstatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fbt/202601/merchants/mcf_status", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokFbtApi = TikTokFbtApi;
//# sourceMappingURL=index.js.map