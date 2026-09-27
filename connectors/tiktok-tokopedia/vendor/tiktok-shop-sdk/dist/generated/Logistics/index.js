"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/logistics).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokLogisticsApi = void 0;
class TikTokLogisticsApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * CreateWarehouse
     * /logistics/202502/warehouses (POST)
     */
    async createWarehouse(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/logistics/202502/warehouses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["warehouse"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetAvailableShippingTemplate
     * /logistics/202510/seller_templates (GET)
     */
    async getAvailableShippingTemplate(params, body, opts) {
        return this.client.request({ "method": "GET", "path": "/logistics/202510/seller_templates", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_attribute"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetGlobalSellerWarehouse
     * /logistics/202309/global_warehouses (GET)
     */
    async getGlobalSellerWarehouse(params, opts) {
        return this.client.request({ "method": "GET", "path": "/logistics/202309/global_warehouses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetShippingProviders
     * /logistics/202309/delivery_options/{delivery_option_id}/shipping_providers (GET)
     */
    async getShippingProviders(params, opts) {
        return this.client.request({ "method": "GET", "path": "/logistics/202309/delivery_options/{delivery_option_id}/shipping_providers", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["delivery_option_id"], "body": [] }, params, opts);
    }
    /**
     * GetWarehouseDeliveryOptions
     * /logistics/202309/warehouses/{warehouse_id}/delivery_options (GET)
     */
    async getWarehouseDeliveryOptions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/logistics/202309/warehouses/{warehouse_id}/delivery_options", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["scope", "shop_cipher"], "headers": [], "pathParams": ["warehouse_id"], "body": [] }, params, opts);
    }
    /**
     * GetWarehouseList
     * /logistics/202309/warehouses (GET)
     */
    async getWarehouseList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/logistics/202309/warehouses", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * StandardizeWarehouseAddress
     * /logistics/202412/addresses/standardize (POST)
     */
    async standardizeWarehouseAddress(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/logistics/202412/addresses/standardize", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["address"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateWarehouse
     * /logistics/202502/warehouses/{warehouse_id} (POST)
     */
    async updateWarehouse(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/logistics/202502/warehouses/{warehouse_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["warehouse_id"], "body": ["warehouse"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokLogisticsApi = TikTokLogisticsApi;
//# sourceMappingURL=index.js.map