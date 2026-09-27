"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/data_reconciliation).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokDataReconciliationApi = void 0;
class TikTokDataReconciliationApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * OrderStatusDataExchange
     * /data_reconciliation/202309/orders/sync (POST)
     */
    async orderStatusDataExchange(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/data_reconciliation/202309/orders/sync", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_id"], "headers": [], "pathParams": [], "body": ["orders"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * QualityFactoryOrderDataImportAPI
     * /data_reconciliation/202401/orders/import (POST)
     */
    async qualityFactoryOrderDataImportAPI(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/data_reconciliation/202401/orders/import", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["orders"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokDataReconciliationApi = TikTokDataReconciliationApi;
//# sourceMappingURL=index.js.map