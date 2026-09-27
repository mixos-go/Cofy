"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Returns).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeReturnsApi = void 0;
class ShopeeReturnsApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * accept offer
     * /api/v2/returns/accept_offer (POST)
     */
    async acceptOffer(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/accept_offer", "query": [], "body": ["return_sn"], "scope": "shop" }, params, opts);
    }
    /**
     * cancel dispute
     * /api/v2/returns/cancel_dispute (POST)
     */
    async cancelDispute(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/cancel_dispute", "query": [], "body": ["return_sn", "email"], "scope": "shop" }, params, opts);
    }
    /**
     * confirm
     * /api/v2/returns/confirm (POST)
     */
    async confirm(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/confirm", "query": [], "body": ["return_sn"], "scope": "shop" }, params, opts);
    }
    /**
     * convert image
     * /api/v2/returns/convert_image (POST)
     */
    async convertImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/convert_image", "query": [], "body": ["return_sn", "upload_image"], "scope": "shop" }, params, opts);
    }
    /**
     * dispute
     * /api/v2/returns/dispute (POST)
     */
    async dispute(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/dispute", "query": [], "body": ["return_sn", "email", "dispute_reason_id", "image_list", "dispute_text_reason"], "scope": "shop" }, params, opts);
    }
    /**
     * get available solutions
     * /api/v2/returns/get_available_solutions (GET)
     */
    async getAvailableSolutions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_available_solutions", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get return detail
     * /api/v2/returns/get_return_detail (GET)
     */
    async getReturnDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_return_detail", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get return dispute reason
     * /api/v2/returns/get_return_dispute_reason (GET)
     */
    async getReturnDisputeReason(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_return_dispute_reason", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get return list
     * /api/v2/returns/get_return_list (GET)
     */
    async getReturnList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_return_list", "query": ["page_no", "page_size", "create_time_from", "create_time_to", "update_time_from", "update_time_to", "status", "negotiation_status", "seller_proof_status", "seller_compensation_status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get reverse tracking info
     * /api/v2/returns/get_reverse_tracking_info (GET)
     */
    async getReverseTrackingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_reverse_tracking_info", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping carrier
     * /api/v2/returns/get_shipping_carrier (GET)
     */
    async getShippingCarrier(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/get_shipping_carrier", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * offer
     * /api/v2/returns/offer (POST)
     */
    async offer(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/offer", "query": [], "body": ["return_sn", "proposed_solution", "proposed_adjusted_refund_amount"], "scope": "shop" }, params, opts);
    }
    /**
     * query proof
     * /api/v2/returns/query_proof (GET)
     */
    async queryProof(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/returns/query_proof", "query": ["return_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * upload proof
     * /api/v2/returns/upload_proof (POST)
     */
    async uploadProof(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/upload_proof", "query": [], "body": ["return_sn", "photo", "description"], "scope": "shop" }, params, opts);
    }
    /**
     * upload shipping proof
     * /api/v2/returns/upload_shipping_proof (POST)
     */
    async uploadShippingProof(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/returns/upload_shipping_proof", "query": [], "body": ["return_sn", "reverse_logistics_carrier_id", "reverse_logistics_carrier_name", "tracking_number", "image_id_list", "remarks"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeReturnsApi = ShopeeReturnsApi;
//# sourceMappingURL=index.js.map