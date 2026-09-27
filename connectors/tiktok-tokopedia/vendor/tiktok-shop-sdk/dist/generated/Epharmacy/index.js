"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/epharmacy).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokEpharmacyApi = void 0;
class TikTokEpharmacyApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GetConsultationProvider
     * /epharmacy/202507/consultations/{consultation_id}/providers (GET)
     */
    async getConsultationProvider(params, opts) {
        return this.client.request({ "method": "GET", "path": "/epharmacy/202507/consultations/{consultation_id}/providers", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["consultation_id"], "body": [] }, params, opts);
    }
    /**
     * GetPharmacies
     * /epharmacy/202504/pharmacies (GET)
     */
    async getPharmacies(params, opts) {
        return this.client.request({ "method": "GET", "path": "/epharmacy/202504/pharmacies", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * UpdatePharmacies
     * /epharmacy/202504/pharmacies/update (POST)
     */
    async updatePharmacies(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/epharmacy/202504/pharmacies/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["pharmacies"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdatePrescriptionRequirement
     * /epharmacy/202504/products/{product_id}/prescription_requirements/update (POST)
     */
    async updatePrescriptionRequirement(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/epharmacy/202504/products/{product_id}/prescription_requirements/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["product_id"], "body": ["prescription_requirement"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdatePrescriptionStatus
     * /epharmacy/202504/orders/{order_id}/update_prescription_status (POST)
     */
    async updatePrescriptionStatus(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/epharmacy/202504/orders/{order_id}/update_prescription_status", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": ["prescription_status", "rejection_reason"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokEpharmacyApi = TikTokEpharmacyApi;
//# sourceMappingURL=index.js.map