"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/gs_full_service_shipment).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokGsFullServiceShipmentApi = void 0;
class TikTokGsFullServiceShipmentApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * ConfirmDelivery
     * /gs_full_service_shipment/202405/preview/delivery_orders/confirm (POST)
     */
    async confirmDelivery(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/delivery_orders/confirm", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["delivery_order_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateDeliveryOrder
     * /gs_full_service_shipment/202405/preview/delivery_orders (POST)
     */
    async createDeliveryOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/delivery_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["delivery_order"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSConfirmDelivery
     * /gs_full_service_shipment/202405/beta/delivery_orders/confirm (POST)
     */
    async gSConfirmDelivery(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/confirm", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_order_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSCreateDeliveryOrder
     * /gs_full_service_shipment/202405/beta/delivery_orders (POST)
     */
    async gSCreateDeliveryOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/delivery_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_order"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSGetDelivery-OrderPrintDocument
     * /gs_full_service_shipment/202405/beta/delivery_orders/documents (GET)
     */
    async gSGetDeliveryOrderPrintDocument(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/documents", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["delivery_order_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSGetLogisticsWaybillsPrintDocument
     * /gs_full_service_shipment/202405/beta/waybills (GET)
     */
    async gSGetLogisticsWaybillsPrintDocument(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/beta/waybills", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["logistics_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSGetSKUPrintDocument
     * /gs_full_service_shipment/202405/beta/delivery_orders/sku_documents/generate (POST)
     */
    async gSGetSKUPrintDocument(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/sku_documents/generate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["dimension", "platform_sku_items", "print_sku_code", "stockup_order_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSQueryDeliveryBatchs
     * /gs_full_service_shipment/202405/beta/delivery_orders/delivery_batchs (GET)
     */
    async gSQueryDeliveryBatchs(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/delivery_batchs", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["delivery_batch_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GSReserveShipping
     * /gs_full_service_shipment/202405/beta/delivery_orders/reserve_ship (POST)
     */
    async gSReserveShipping(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/reserve_ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_order_codes", "logistics", "reserve", "sender_contact", "shipping_box_quantity", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSSearchAvailableShippingProviders
     * /gs_full_service_shipment/202405/beta/shipping_providers/search (POST)
     */
    async gSSearchAvailableShippingProviders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/shipping_providers/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_option", "delivery_order_codes", "sender_contact", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSSearchDeliveryOrders
     * /gs_full_service_shipment/202405/beta/delivery_orders/search (POST)
     */
    async gSSearchDeliveryOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/delivery_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["arrived_time_ge", "arrived_time_lt", "delivery_batch_codes", "delivery_order_codes", "delivery_types", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_sample_included", "latest_status_update_ge", "latest_status_update_lt", "order_types", "page_size", "page_token", "platform_spu_codes", "relative_codes", "require_arrived_time_ge", "require_arrived_time_lt", "ship_time_ge", "ship_time_lt", "warehouse_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GSSearchStockupOrders
     * /gs_full_service_shipment/202405/beta/stockup_orders/search (POST)
     */
    async gSSearchStockupOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/beta/stockup_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["can_deliver", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_delivery_completed", "is_first_order", "is_normal", "latest_status_update_ge", "latest_status_update_lt", "order_create_time_ge", "order_create_time_lt", "order_sources", "order_status", "order_types", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "require_arrived_time_ge", "require_arrived_time_lt", "require_ship_time_ge", "require_ship_time_lt", "stockup_order_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetDelivery-OrderPrintDocument
     * /gs_full_service_shipment/202405/preview/delivery_orders/documents (GET)
     */
    async getDeliveryOrderPrintDocument(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/preview/delivery_orders/documents", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id", "delivery_order_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetLogisticsWaybillsPrintDocurement
     * /gs_full_service_shipment/202405/preview/waybills (GET)
     */
    async getLogisticsWaybillsPrintDocurement(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/preview/waybills", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id", "logistics_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GlobalSellingCancelShipment
     * /gs_full_service_shipment/202407/logistics_orders/cancel_ship (POST)
     */
    async globalSellingCancelShipment(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202407/logistics_orders/cancel_ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["logistics_order"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingConfirmStockupOrder
     * /gs_full_service_shipment/202409/stockup_orders/confirm (POST)
     */
    async globalSellingConfirmStockupOrder(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202409/stockup_orders/confirm", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["is_order_confirmed", "reject_note", "reject_reason", "skus", "stockup_order_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingGetQualityDocuments
     * /gs_full_service_shipment/202407/quality_documents (GET)
     */
    async globalSellingGetQualityDocuments(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202407/quality_documents", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["order_code", "order_type"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GlobalSellingGetSKUPrintDocument
     * /gs_full_service_shipment/202503/delivery_orders/sku_documents/generate (POST)
     */
    async globalSellingGetSKUPrintDocument(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202503/delivery_orders/sku_documents/generate", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["need_separator", "platform_sku_items", "size", "stockup_order_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingQueryLogisticsOrders
     * /gs_full_service_shipment/202407/logistics_orders (GET)
     */
    async globalSellingQueryLogisticsOrders(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202407/logistics_orders", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["logistics_orders"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GlobalSellingReserveShipment
     * /gs_full_service_shipment/202410/delivery_orders/reserve_ship (POST)
     */
    async globalSellingReserveShipment(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202410/delivery_orders/reserve_ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_order_codes", "logistics", "reserve", "sender_contact_id", "shipping_box_quantity", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingSearchAbnormalOrders
     * /gs_full_service_shipment/202407/abnormal_orders/search (POST)
     */
    async globalSellingSearchAbnormalOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202407/abnormal_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["abnormal_order_codes", "abnormal_types", "delivery_order_codes", "external_skc_codes", "external_sku_codes", "latest_update_time_ge", "latest_update_time_lt", "order_create_time_ge", "order_create_time_lt", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "relative_return_status", "stockup_order_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingSearchAvailableShippingProviders
     * /gs_full_service_shipment/202410/shipping_providers/search (POST)
     */
    async globalSellingSearchAvailableShippingProviders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202410/shipping_providers/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_option", "delivery_order_codes", "sender_contact_id", "shipping_box_quantity", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingSearchDeliveryOrders
     * /gs_full_service_shipment/202407/delivery_orders/search (POST)
     */
    async globalSellingSearchDeliveryOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202407/delivery_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["arrived_time_ge", "arrived_time_lt", "delivery_order_codes", "delivery_types", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_sample_included", "latest_status_update_ge", "latest_status_update_lt", "logistics_orders", "order_types", "page_size", "page_token", "platform_spu_codes", "relative_codes", "require_arrived_time_ge", "require_arrived_time_lt", "ship_time_ge", "ship_time_lt", "warehouse_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingSearchReturnOrders
     * /gs_full_service_shipment/202407/return_orders/search (POST)
     */
    async globalSellingSearchReturnOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202407/return_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["external_skc_codes", "external_sku_codes", "order_create_time_ge", "order_create_time_lt", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "return_methods", "return_order_codes", "return_source", "return_status", "return_types"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GlobalSellingSearchStockupOrders
     * /gs_full_service_shipment/202407/stockup_orders/search (POST)
     */
    async globalSellingSearchStockupOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202407/stockup_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["can_deliver", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_delivery_completed", "is_first_order", "is_normal", "latest_status_update_ge", "latest_status_update_lt", "order_create_time_ge", "order_create_time_lt", "order_sources", "order_status", "order_types", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "require_arrived_time_ge", "require_arrived_time_lt", "require_ship_time_ge", "require_ship_time_lt", "stockup_order_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * QueryDeliveryBatchs
     * /gs_full_service_shipment/202405/preview/delivery_orders/delivery_batchs (GET)
     */
    async queryDeliveryBatchs(params, opts) {
        return this.client.request({ "method": "GET", "path": "/gs_full_service_shipment/202405/preview/delivery_orders/delivery_batchs", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id", "delivery_batch_codes"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * ReserveShipping
     * /gs_full_service_shipment/202405/preview/delivery_orders/reserve_ship (POST)
     */
    async reserveShipping(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/delivery_orders/reserve_ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_order_codes", "logistics", "reserve", "sender_contact", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchAvailableShippingProviders
     * /gs_full_service_shipment/202405/preview/shipping_providers/search (POST)
     */
    async searchAvailableShippingProviders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/shipping_providers/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["delivery_mode", "delivery_option", "delivery_order_codes", "sender_contact", "total_weight", "warehouse_code"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchDeliveryOrders
     * /gs_full_service_shipment/202405/preview/delivery_orders/search (POST)
     */
    async searchDeliveryOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/delivery_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["arrived_time_ge", "arrived_time_lt", "delivery_batch_codes", "delivery_order_codes", "delivery_types", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_sample_included", "order_types", "page_size", "page_token", "platform_spu_codes", "relative_codes", "require_arrived_time_ge", "require_arrived_time_lt", "ship_time_ge", "ship_time_lt", "warehouse_codes"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchStockupOrders
     * /gs_full_service_shipment/202405/preview/stockup_orders/search (POST)
     */
    async searchStockupOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/gs_full_service_shipment/202405/preview/stockup_orders/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["supplier_id"], "headers": [], "pathParams": [], "body": ["can_deliver", "emergency_levels", "external_skc_codes", "external_sku_codes", "is_delivery_completed", "is_first_order", "is_normal", "order_create_time_ge", "order_create_time_lt", "order_sources", "order_status", "order_types", "page_size", "page_token", "platform_sku_codes", "platform_spu_codes", "require_arrived_time_ge", "require_arrived_time_lt", "require_ship_time_ge", "require_ship_time_lt", "stockup_order_codes"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokGsFullServiceShipmentApi = TikTokGsFullServiceShipmentApi;
//# sourceMappingURL=index.js.map