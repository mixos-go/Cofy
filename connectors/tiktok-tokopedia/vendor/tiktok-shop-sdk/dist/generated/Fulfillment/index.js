"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/fulfillment).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokFulfillmentApi = void 0;
class TikTokFulfillmentApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * BatchShipPackages
     * /fulfillment/202309/packages/ship (POST)
     */
    async batchShipPackages(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["packages"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CombinePackage
     * /fulfillment/202309/packages/combine (POST)
     */
    async combinePackage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/combine", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["combinable_packages"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateFirstMileBundle
     * /fulfillment/202407/bundles (POST)
     */
    async createFirstMileBundle(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202407/bundles", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["handover_method", "order_ids", "phone_tail_number", "shipping_provider_id", "tracking_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateFirstMileBundleV2
     * /fulfillment/202510/first_mile_bundle (POST)
     */
    async createFirstMileBundleV2(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202510/first_mile_bundle", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["handover_method", "order_ids", "phone_tail_number", "shipping_provider_id", "tracking_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreateLastMileBundle
     * /fulfillment/202408/last_mile_bundles (POST)
     */
    async createLastMileBundle(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202408/last_mile_bundles", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": ["fulfillment_unit_ids", "last_mile_bundle", "logistics_group_id"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * CreatePackages
     * /fulfillment/202512/packages (POST)
     */
    async createPackages(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202512/packages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["dimension", "order_id", "order_line_item", "order_list_ids", "ship_type", "shipping_service_id", "weight"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * FulfillmentUploadDeliveryFile
     * /fulfillment/202309/files/upload (POST)
     */
    async fulfillmentUploadDeliveryFile(params, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/files/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * FulfillmentUploadDeliveryImage
     * /fulfillment/202309/images/upload (POST)
     */
    async fulfillmentUploadDeliveryImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/images/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetEligibleShippingService
     * /fulfillment/202309/orders/{order_id}/shipping_services/query (POST)
     */
    async getEligibleShippingService(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/orders/{order_id}/shipping_services/query", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": ["dimension", "order_line_item_ids", "weight"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * GetHandoverTimeslots
     * /fulfillment/202309/orders/{order_id}/handover_time_slots (GET)
     */
    async getHandoverTimeslots(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/orders/{order_id}/handover_time_slots", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["order_line_item_ids", "shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * GetOrderSplitAttributes
     * /fulfillment/202309/orders/split_attributes (GET)
     */
    async getOrderSplitAttributes(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/orders/split_attributes", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["order_ids", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetPackageDetail
     * /fulfillment/202309/packages/{package_id} (GET)
     */
    async getPackageDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/packages/{package_id}", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": [] }, params, opts);
    }
    /**
     * GetPackageHandoverTimeSlots
     * /fulfillment/202309/packages/{package_id}/handover_time_slots (GET)
     */
    async getPackageHandoverTimeSlots(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/packages/{package_id}/handover_time_slots", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": [] }, params, opts);
    }
    /**
     * GetPackageShippingDocument
     * /fulfillment/202309/packages/{package_id}/shipping_documents (GET)
     */
    async getPackageShippingDocument(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/packages/{package_id}/shipping_documents", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["document_type", "document_size", "document_format", "shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": [] }, params, opts);
    }
    /**
     * GetTracking
     * /fulfillment/202309/orders/{order_id}/tracking (GET)
     */
    async getTracking(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/orders/{order_id}/tracking", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * MarkPackageAsShipped
     * /fulfillment/202309/orders/{order_id}/packages (POST)
     */
    async markPackageAsShipped(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/orders/{order_id}/packages", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": ["order_line_item_ids", "shipping_provider_id", "tracking_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * RedeemInfoCallback
     * /fulfillment/202601/redeem_info/callback (POST)
     */
    async redeemInfoCallback(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202601/redeem_info/callback", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["order_id", "order_info_list"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SchedulePackageHandover
     * /fulfillment/202309/packages/schedule (POST)
     */
    async schedulePackageHandover(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/schedule", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["handover_method", "order_id", "order_line_item_ids", "pickup_slot"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SearchCombinablePackages
     * /fulfillment/202309/combinable_packages/search (GET)
     */
    async searchCombinablePackages(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202309/combinable_packages/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * SearchPackage
     * /fulfillment/202309/packages/search (POST)
     */
    async searchPackage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/search", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_size", "sort_field", "sort_order", "page_token", "shop_cipher"], "headers": [], "pathParams": [], "body": ["create_time_ge", "create_time_lt", "package_status", "update_time_ge", "update_time_lt"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * ShipPackage
     * /fulfillment/202309/packages/{package_id}/ship (POST)
     */
    async shipPackage(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/{package_id}/ship", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": ["handover_method", "pickup_slot", "self_shipment"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * SplitOrders
     * /fulfillment/202309/orders/{order_id}/split (POST)
     */
    async splitOrders(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/orders/{order_id}/split", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": ["splittable_groups"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * TTSTrackingValidation
     * /fulfillment/202508/tts_tracking_validation (GET)
     */
    async tTSTrackingValidation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/fulfillment/202508/tts_tracking_validation", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["tracking_number", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * UncombinePackages
     * /fulfillment/202309/packages/{package_id}/uncombine (POST)
     */
    async uncombinePackages(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/{package_id}/uncombine", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": ["order_ids"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdatePackageDeliveryStatus
     * /fulfillment/202309/packages/deliver (POST)
     */
    async updatePackageDeliveryStatus(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/deliver", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["packages"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdatePackageShippingInfo
     * /fulfillment/202309/packages/{package_id}/shipping_info/update (POST)
     */
    async updatePackageShippingInfo(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/packages/{package_id}/shipping_info/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["package_id"], "body": ["shipping_provider_id", "tracking_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UpdateShippingInfo
     * /fulfillment/202309/orders/{order_id}/shipping_info/update (POST)
     */
    async updateShippingInfo(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202309/orders/{order_id}/shipping_info/update", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": ["shipping_provider_id", "tracking_number"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadInvoice
     * /fulfillment/202502/invoice/upload (POST)
     */
    async uploadInvoice(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/fulfillment/202502/invoice/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["invoices"] }, { ...params, ...(body || {}) }, opts);
    }
}
exports.TikTokFulfillmentApi = TikTokFulfillmentApi;
//# sourceMappingURL=index.js.map