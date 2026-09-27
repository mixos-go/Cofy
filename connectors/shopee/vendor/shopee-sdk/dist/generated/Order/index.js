"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Order).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeOrderApi = void 0;
class ShopeeOrderApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * cancel order
     * /api/v2/order/cancel_order (POST)
     */
    async cancelOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/cancel_order", "query": [], "body": ["order_sn", "cancel_reason", "partial_cancel_item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * download fbs invoices
     * /api/v2/order/download_fbs_invoices (POST)
     */
    async downloadFbsInvoices(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/download_fbs_invoices", "query": [], "body": ["request_id_list", "request_id"], "scope": "shop" }, params, opts);
    }
    /**
     * download invoice doc
     * /api/v2/order/download_invoice_doc (GET)
     */
    async downloadInvoiceDoc(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/download_invoice_doc", "query": ["order_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * generate fbs invoices
     * /api/v2/order/generate_fbs_invoices (POST)
     */
    async generateFbsInvoices(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/generate_fbs_invoices", "query": [], "body": ["batch_download", "start", "end", "document_type", "file_type", "document_status"], "scope": "shop" }, params, opts);
    }
    /**
     * get booking detail
     * /api/v2/order/get_booking_detail (GET)
     */
    async getBookingDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_booking_detail", "query": ["booking_sn_list", "response_optional_fields"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get booking list
     * /api/v2/order/get_booking_list (GET)
     */
    async getBookingList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_booking_list", "query": ["time_range_field", "time_from", "time_to", "page_size", "cursor", "booking_status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get buyer invoice info
     * /api/v2/order/get_buyer_invoice_info (POST)
     */
    async getBuyerInvoiceInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/get_buyer_invoice_info", "query": [], "body": ["queries"], "scope": "shop" }, params, opts);
    }
    /**
     * get estimate cancel value
     * /api/v2/order/get_estimate_cancel_value (POST)
     */
    async getEstimateCancelValue(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/get_estimate_cancel_value", "query": [], "body": ["order_sn", "partial_cancel_item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get fbs invoices result
     * /api/v2/order/get_fbs_invoices_result (POST)
     */
    async getFbsInvoicesResult(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/get_fbs_invoices_result", "query": [], "body": ["request_id_list", "request_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get order detail
     * /api/v2/order/get_order_detail (GET)
     */
    async getOrderDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_order_detail", "query": ["order_sn_list", "request_order_status_pending", "response_optional_fields"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get order list
     * /api/v2/order/get_order_list (GET)
     */
    async getOrderList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_order_list", "query": ["time_range_field", "time_from", "time_to", "page_size", "cursor", "order_status", "response_optional_fields", "request_order_status_pending", "logistics_channel_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get package detail
     * /api/v2/order/get_package_detail (GET)
     */
    async getPackageDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_package_detail", "query": ["package_number_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get pending buyer invoice order list
     * /api/v2/order/get_pending_buyer_invoice_order_list (GET)
     */
    async getPendingBuyerInvoiceOrderList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_pending_buyer_invoice_order_list", "query": ["cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shipment list
     * /api/v2/order/get_shipment_list (GET)
     */
    async getShipmentList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_shipment_list", "query": ["cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get warehouse filter config
     * /api/v2/order/get_warehouse_filter_config (GET)
     */
    async getWarehouseFilterConfig(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/order/get_warehouse_filter_config", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * handle buyer cancellation
     * /api/v2/order/handle_buyer_cancellation (POST)
     */
    async handleBuyerCancellation(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/handle_buyer_cancellation", "query": [], "body": ["order_sn", "operation"], "scope": "shop" }, params, opts);
    }
    /**
     * handle prescription check
     * /api/v2/order/handle_prescription_check (POST)
     */
    async handlePrescriptionCheck(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/handle_prescription_check", "query": [], "body": ["order_sn", "is_approved", "items", "pharmacist_name", "free_text"], "scope": "shop" }, params, opts);
    }
    /**
     * search package list
     * /api/v2/order/search_package_list (POST)
     */
    async searchPackageList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/search_package_list", "query": [], "body": ["filter", "pagination", "sort"], "scope": "shop" }, params, opts);
    }
    /**
     * set note
     * /api/v2/order/set_note (POST)
     */
    async setNote(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/set_note", "query": [], "body": ["order_sn", "note"], "scope": "shop" }, params, opts);
    }
    /**
     * split order
     * /api/v2/order/split_order (POST)
     */
    async splitOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/split_order", "query": [], "body": ["order_sn", "package_list"], "scope": "shop" }, params, opts);
    }
    /**
     * unsplit order
     * /api/v2/order/unsplit_order (POST)
     */
    async unsplitOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/unsplit_order", "query": [], "body": ["order_sn"], "scope": "shop" }, params, opts);
    }
    /**
     * upload invoice doc
     * /api/v2/order/upload_invoice_doc (POST)
     */
    async uploadInvoiceDoc(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/order/upload_invoice_doc", "query": [], "body": ["order_sn", "file_type", "file"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeOrderApi = ShopeeOrderApi;
//# sourceMappingURL=index.js.map