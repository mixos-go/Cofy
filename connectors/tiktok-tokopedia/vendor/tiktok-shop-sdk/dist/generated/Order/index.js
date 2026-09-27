"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/order).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokOrderApi = void 0;
class TikTokOrderApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * AddExternalOrderReferences
     * /order/202406/orders/external_orders (POST)
     */
    async addExternalOrderReferences(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/order/202406/orders/external_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["orders"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetExternalOrderReferences
     * /order/202406/orders/{order_id}/external_orders (GET)
     */
    async getExternalOrderReferences(params, opts) {
        return this.client.request({ "method": "GET", "path": "/order/202406/orders/{order_id}/external_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["platform", "shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * GetOrderDetail
     * /order/202507/orders (GET)
     */
    async getOrderDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/order/202507/orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetOrderList
     * /order/202309/orders/search (POST)
     */
    async getOrderList(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/order/202309/orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "sort_order", "page_token", "sort_field", "shop_cipher"], "headers": [], "pathParams": [], "body": ["buyer_user_id", "create_time_ge", "create_time_lt", "is_buyer_request_cancel", "order_status", "shipping_type", "update_time_ge", "update_time_lt", "warehouse_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetPriceDetail
     * /order/202407/orders/{order_id}/price_detail (GET)
     */
    async getPriceDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/order/202407/orders/{order_id}/price_detail", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * GetPrivilegedOrderDetail
     * /order/202309/privileged_orders (GET)
     */
    async getPrivilegedOrderDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/order/202309/privileged_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * SearchOrderByExternalOrderReference
     * /order/202406/orders/external_order_search (POST)
     */
    async searchOrderByExternalOrderReference(params, opts) {
        return this.client.request({ "method": "POST", "path": "/order/202406/orders/external_order_search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["platform", "external_order_id", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * UpdateTheBlindBoxOpeningResults
     * /order/202511/orders/blind_box_result/callback (POST)
     */
    async updateTheBlindBoxOpeningResults(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/order/202511/orders/blind_box_result/callback", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["blind_box_results", "main_order_id"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokOrderApi = TikTokOrderApi;
//# sourceMappingURL=index.js.map