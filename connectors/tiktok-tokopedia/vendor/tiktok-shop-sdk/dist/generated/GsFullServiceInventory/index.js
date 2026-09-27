"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/gs_full_service_inventory).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokGsFullServiceInventoryApi = void 0;
class TikTokGsFullServiceInventoryApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GSFullServiceQueryVirtualInventory
     * /gs_full_service_inventory/202405/beta/virtual_inventory/query (POST)
     */
    async gSFullServiceQueryVirtualInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_inventory/202405/beta/virtual_inventory/query", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSFullServiceUpdateVirtualInventory
     * /gs_full_service_inventory/202405/beta/virtual_inventory/update (POST)
     */
    async gSFullServiceUpdateVirtualInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_inventory/202405/beta/virtual_inventory/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * QueryGlobalSellingVirtualInventory
     * /gs_full_service_inventory/202404/preview/virtual_inventory/query (POST)
     */
    async queryGlobalSellingVirtualInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_inventory/202404/preview/virtual_inventory/query", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["skus", "supplier_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SetGlobalSellingVirtualInventory
     * /gs_full_service_inventory/202404/preview/virtual_inventory/update (POST)
     */
    async setGlobalSellingVirtualInventory(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_inventory/202404/preview/virtual_inventory/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["skus", "supplier_id"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokGsFullServiceInventoryApi = TikTokGsFullServiceInventoryApi;
//# sourceMappingURL=index.js.map