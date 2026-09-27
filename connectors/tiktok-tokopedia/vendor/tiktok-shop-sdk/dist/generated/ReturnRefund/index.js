"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/return_refund).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokReturnRefundApi = void 0;
class TikTokReturnRefundApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * ApproveCancellation
     * /return_refund/202309/cancellations/{cancel_id}/approve (POST)
     */
    async approveCancellation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/cancellations/{cancel_id}/approve", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": ["cancel_id"], "body": [] }, params, opts);
    }
    /**
     * ApproveReturn
     * /return_refund/202309/returns/{return_id}/approve (POST)
     */
    async approveReturn(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/returns/{return_id}/approve", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": ["return_id"], "body": ["buyer_keep_item", "decision", "partial_refund"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CalculateRefund
     * /return_refund/202309/refunds/calculate (POST)
     */
    async calculateRefund(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/refunds/calculate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["handover_method", "order_id", "order_line_item_ids", "reason_name", "request_type", "shipment_type", "skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CancelOrder
     * /return_refund/202309/cancellations (POST)
     */
    async cancelOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/cancellations", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["cancel_reason", "order_id", "order_line_item_ids", "skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateReturn
     * /return_refund/202309/returns (POST)
     */
    async createReturn(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/returns", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": [], "body": ["currency", "handover_method", "order_id", "order_line_item_ids", "refund_total", "return_reason", "return_type", "shipment_type", "skus"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetAftersaleEligibility
     * /return_refund/202512/orders/{order_id}/aftersale_eligibility (GET)
     */
    async getAftersaleEligibility(params, opts) {
        return this.client.request({ "method": "GET", "path": "/return_refund/202512/orders/{order_id}/aftersale_eligibility", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["initiate_aftersale_user", "request_types", "shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * GetRejectReasons
     * /return_refund/202309/reject_reasons (GET)
     */
    async getRejectReasons(params, opts) {
        return this.client.request({ "method": "GET", "path": "/return_refund/202309/reject_reasons", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "return_or_cancel_id", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetReturnRecords
     * /return_refund/202309/returns/{return_id}/records (GET)
     */
    async getReturnRecords(params, opts) {
        return this.client.request({ "method": "GET", "path": "/return_refund/202309/returns/{return_id}/records", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["locale", "shop_cipher"], "headers": [], "pathParams": ["return_id"], "body": [] }, params, opts);
    }
    /**
     * RejectCancellation
     * /return_refund/202309/cancellations/{cancel_id}/reject (POST)
     */
    async rejectCancellation(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/cancellations/{cancel_id}/reject", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": ["cancel_id"], "body": ["comment", "images", "reject_reason"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RejectReturn
     * /return_refund/202309/returns/{return_id}/reject (POST)
     */
    async rejectReturn(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/returns/{return_id}/reject", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["idempotency_key", "shop_cipher"], "headers": [], "pathParams": ["return_id"], "body": ["comment", "decision", "images", "reject_reason"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCancellations
     * /return_refund/202309/cancellations/search (POST)
     */
    async searchCancellations(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/cancellations/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["sort_field", "sort_order", "page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["buyer_user_ids", "cancel_ids", "cancel_status", "cancel_types", "create_time_ge", "create_time_lt", "locale", "order_ids", "update_time_ge", "update_time_lt"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchReturns
     * /return_refund/202309/returns/search (POST)
     */
    async searchReturns(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202309/returns/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["sort_field", "sort_order", "page_size", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["arbitration_status", "buyer_user_ids", "create_time_ge", "create_time_lt", "locale", "order_ids", "return_ids", "return_status", "return_types", "seller_proposed_return_type", "update_time_ge", "update_time_lt"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadShippingDocumentAndTrackingInfo
     * /return_refund/202405/returns/shipping_documents (POST)
     */
    async uploadShippingDocumentAndTrackingInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/return_refund/202405/returns/shipping_documents", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["return_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokReturnRefundApi = TikTokReturnRefundApi;
//# sourceMappingURL=index.js.map