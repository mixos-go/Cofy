"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/supply_chain).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokSupplyChainApi = void 0;
class TikTokSupplyChainApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * ConfirmPackageShipment
     * /supply_chain/202309/packages/sync (POST)
     */
    async confirmPackageShipment(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/supply_chain/202309/packages/sync", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["packages", "warehouse_provider_id"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokSupplyChainApi = TikTokSupplyChainApi;
//# sourceMappingURL=index.js.map