"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/FirstMile).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeFirstMileApi = void 0;
class ShopeeFirstMileApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * bind courier delivery first mile tracking number
     * /api/v2/first_mile/bind_courier_delivery_first_mile_tracking_number (POST)
     */
    async bindCourierDeliveryFirstMileTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/bind_courier_delivery_first_mile_tracking_number", "query": [], "body": ["shipment_method", "binding_id", "order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * bind first mile tracking number
     * /api/v2/first_mile/bind_first_mile_tracking_number (POST)
     */
    async bindFirstMileTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/bind_first_mile_tracking_number", "query": [], "body": ["first_mile_tracking_number", "order_list", "shipment_method", "logistics_channel_id", "region", "weight", "volume", "length", "width", "height"], "scope": "shop" }, params, opts);
    }
    /**
     * generate and bind first mile tracking number
     * /api/v2/first_mile/generate_and_bind_first_mile_tracking_number (POST)
     */
    async generateAndBindFirstMileTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/generate_and_bind_first_mile_tracking_number", "query": [], "body": ["shipment_method", "region", "order_list", "courier_delivery_info"], "scope": "shop" }, params, opts);
    }
    /**
     * generate first mile tracking number
     * /api/v2/first_mile/generate_first_mile_tracking_number (POST)
     */
    async generateFirstMileTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/generate_first_mile_tracking_number", "query": [], "body": ["declare_date", "quantity"], "scope": "shop" }, params, opts);
    }
    /**
     * get channel list
     * /api/v2/first_mile/get_channel_list (GET)
     */
    async getChannelList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_channel_list", "query": ["region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get courier delivery channel list
     * /api/v2/first_mile/get_courier_delivery_channel_list (GET)
     */
    async getCourierDeliveryChannelList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_courier_delivery_channel_list", "query": ["region"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get courier delivery detail
     * /api/v2/first_mile/get_courier_delivery_detail (GET)
     */
    async getCourierDeliveryDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_courier_delivery_detail", "query": ["binding_id", "cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get courier delivery tracking number list
     * /api/v2/first_mile/get_courier_delivery_tracking_number_list (POST)
     */
    async getCourierDeliveryTrackingNumberList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/get_courier_delivery_tracking_number_list", "query": [], "body": ["from_date", "to_date", "page_size", "cursor"], "scope": "shop" }, params, opts);
    }
    /**
     * get courier delivery waybill
     * /api/v2/first_mile/get_courier_delivery_waybill (POST)
     */
    async getCourierDeliveryWaybill(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/get_courier_delivery_waybill", "query": [], "body": ["binding_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get detail
     * /api/v2/first_mile/get_detail (GET)
     */
    async getDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_detail", "query": ["first_mile_tracking_number", "cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get tracking number list
     * /api/v2/first_mile/get_tracking_number_list (GET)
     */
    async getTrackingNumberList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_tracking_number_list", "query": ["from_date", "to_date", "page_size", "cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get transit warehouse list
     * /api/v2/first_mile/get_transit_warehouse_list (GET)
     */
    async getTransitWarehouseList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_transit_warehouse_list", "query": ["region", "shipment_method"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get unbind order list
     * /api/v2/first_mile/get_unbind_order_list (GET)
     */
    async getUnbindOrderList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/first_mile/get_unbind_order_list", "query": ["cursor", "page_size", "response_optional_fields"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get waybill
     * /api/v2/first_mile/get_waybill (POST)
     */
    async getWaybill(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/get_waybill", "query": [], "body": ["first_mile_tracking_number_list"], "scope": "shop" }, params, opts);
    }
    /**
     * unbind first mile tracking number
     * /api/v2/first_mile/unbind_first_mile_tracking_number (POST)
     */
    async unbindFirstMileTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/unbind_first_mile_tracking_number", "query": [], "body": ["first_mile_tracking_number", "order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * unbind first mile tracking number all
     * /api/v2/first_mile/unbind_first_mile_tracking_number_all (POST)
     */
    async unbindFirstMileTrackingNumberAll(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/first_mile/unbind_first_mile_tracking_number_all", "query": [], "body": ["order_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeFirstMileApi = ShopeeFirstMileApi;
//# sourceMappingURL=index.js.map