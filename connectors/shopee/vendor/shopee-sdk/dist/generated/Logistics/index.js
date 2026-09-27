"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Logistics).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeLogisticsApi = void 0;
class ShopeeLogisticsApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * batch ship order
     * /api/v2/logistics/batch_ship_order (POST)
     */
    async batchShipOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/batch_ship_order", "query": [], "body": ["order_list", "dropoff"], "scope": "shop" }, params, opts);
    }
    /**
     * batch update tpf warehouse tracking status
     * /api/v2/logistics/batch_update_tpf_warehouse_tracking_status (POST)
     */
    async batchUpdateTpfWarehouseTrackingStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/batch_update_tpf_warehouse_tracking_status", "query": [], "body": ["tpf_name", "tpf_tracking_status", "package_list"], "scope": "shop" }, params, opts);
    }
    /**
     * check polygon update status
     * /api/v2/logistics/check_polygon_update_status (POST)
     */
    async checkPolygonUpdateStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/check_polygon_update_status", "query": [], "body": ["task_id"], "scope": "shop" }, params, opts);
    }
    /**
     * create booking shipping document
     * /api/v2/logistics/create_booking_shipping_document (POST)
     */
    async createBookingShippingDocument(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/create_booking_shipping_document", "query": [], "body": ["booking_list"], "scope": "shop" }, params, opts);
    }
    /**
     * create shipping document
     * /api/v2/logistics/create_shipping_document (POST)
     */
    async createShippingDocument(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/create_shipping_document", "query": [], "body": ["order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * create shipping document job
     * /api/v2/logistics/create_shipping_document_job (POST)
     */
    async createShippingDocumentJob(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/create_shipping_document_job", "query": [], "body": ["shipping_document_type", "unpackaged_sku_requests"], "scope": "shop" }, params, opts);
    }
    /**
     * delete address
     * /api/v2/logistics/delete_address (POST)
     */
    async deleteAddress(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/delete_address", "query": [], "body": ["address_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete special operating hour
     * /api/v2/logistics/delete_special_operating_hour (POST)
     */
    async deleteSpecialOperatingHour(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/delete_special_operating_hour", "query": [], "body": ["name"], "scope": "shop" }, params, opts);
    }
    /**
     * download booking shipping document
     * /api/v2/logistics/download_booking_shipping_document (POST)
     */
    async downloadBookingShippingDocument(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/download_booking_shipping_document", "query": [], "body": ["shipping_document_type", "booking_list"], "scope": "shop" }, params, opts);
    }
    /**
     * download shipping document
     * /api/v2/logistics/download_shipping_document (POST)
     */
    async downloadShippingDocument(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/download_shipping_document", "query": [], "body": ["shipping_document_type", "order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * download shipping document job
     * /api/v2/logistics/download_shipping_document_job (POST)
     */
    async downloadShippingDocumentJob(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/download_shipping_document_job", "query": [], "body": ["job_id"], "scope": "shop" }, params, opts);
    }
    /**
     * download to label
     * /api/v2/logistics/download_to_label (POST)
     */
    async downloadToLabel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/download_to_label", "query": [], "body": ["sorting_group", "quantity"], "scope": "shop" }, params, opts);
    }
    /**
     * get address list
     * /api/v2/logistics/get_address_list (GET)
     */
    async getAddressList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_address_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get booking shipping document data info
     * /api/v2/logistics/get_booking_shipping_document_data_info (POST)
     */
    async getBookingShippingDocumentDataInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_booking_shipping_document_data_info", "query": [], "body": ["booking_sn", "recipient_address_info"], "scope": "shop" }, params, opts);
    }
    /**
     * get booking shipping document parameter
     * /api/v2/logistics/get_booking_shipping_document_parameter (POST)
     */
    async getBookingShippingDocumentParameter(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_booking_shipping_document_parameter", "query": [], "body": ["booking_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get booking shipping document result
     * /api/v2/logistics/get_booking_shipping_document_result (POST)
     */
    async getBookingShippingDocumentResult(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_booking_shipping_document_result", "query": [], "body": ["booking_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get booking shipping parameter
     * /api/v2/logistics/get_booking_shipping_parameter (GET)
     */
    async getBookingShippingParameter(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_booking_shipping_parameter", "query": ["booking_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get booking tracking info
     * /api/v2/logistics/get_booking_tracking_info (GET)
     */
    async getBookingTrackingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_booking_tracking_info", "query": ["booking_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get booking tracking number
     * /api/v2/logistics/get_booking_tracking_number (GET)
     */
    async getBookingTrackingNumber(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_booking_tracking_number", "query": ["booking_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get channel list
     * /api/v2/logistics/get_channel_list (GET)
     */
    async getChannelList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_channel_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get mart packaging info
     * /api/v2/logistics/get_mart_packaging_info (GET)
     */
    async getMartPackagingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_mart_packaging_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get mass shipping parameter
     * /api/v2/logistics/get_mass_shipping_parameter (POST)
     */
    async getMassShippingParameter(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_mass_shipping_parameter", "query": [], "body": ["package_list", "logistics_channel_id", "product_location_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get mass tracking number
     * /api/v2/logistics/get_mass_tracking_number (POST)
     */
    async getMassTrackingNumber(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_mass_tracking_number", "query": [], "body": ["package_list", "response_optional_fields"], "scope": "shop" }, params, opts);
    }
    /**
     * get operating hour restrictions
     * /api/v2/logistics/get_operating_hour_restrictions (GET)
     */
    async getOperatingHourRestrictions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_operating_hour_restrictions", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get operating hours
     * /api/v2/logistics/get_operating_hours (GET)
     */
    async getOperatingHours(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_operating_hours", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get pause status
     * /api/v2/logistics/get_pause_status (GET)
     */
    async getPauseStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_pause_status", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping document data info
     * /api/v2/logistics/get_shipping_document_data_info (POST)
     */
    async getShippingDocumentDataInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_shipping_document_data_info", "query": [], "body": ["order_sn", "package_number", "recipient_address_info"], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping document job status
     * /api/v2/logistics/get_shipping_document_job_status (POST)
     */
    async getShippingDocumentJobStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_shipping_document_job_status", "query": [], "body": ["job_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping document parameter
     * /api/v2/logistics/get_shipping_document_parameter (POST)
     */
    async getShippingDocumentParameter(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_shipping_document_parameter", "query": [], "body": ["order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping document result
     * /api/v2/logistics/get_shipping_document_result (POST)
     */
    async getShippingDocumentResult(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/get_shipping_document_result", "query": [], "body": ["order_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get shipping parameter
     * /api/v2/logistics/get_shipping_parameter (GET)
     */
    async getShippingParameter(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_shipping_parameter", "query": ["order_sn", "package_number"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get tracking info
     * /api/v2/logistics/get_tracking_info (GET)
     */
    async getTrackingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_tracking_info", "query": ["order_sn", "package_number"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get tracking number
     * /api/v2/logistics/get_tracking_number (GET)
     */
    async getTrackingNumber(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/logistics/get_tracking_number", "query": ["order_sn", "package_number", "response_optional_fields"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * mass ship order
     * /api/v2/logistics/mass_ship_order (POST)
     */
    async massShipOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/mass_ship_order", "query": [], "body": ["package_list", "pickup"], "scope": "shop" }, params, opts);
    }
    /**
     * set address config
     * /api/v2/logistics/set_address_config (POST)
     */
    async setAddressConfig(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/set_address_config", "query": [], "body": ["show_pick_up_address", "address_type_config"], "scope": "shop" }, params, opts);
    }
    /**
     * set mart packaging info
     * /api/v2/logistics/set_mart_packaging_info (POST)
     */
    async setMartPackagingInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/set_mart_packaging_info", "query": [], "body": ["enable", "dimension", "packaging_fee"], "scope": "shop" }, params, opts);
    }
    /**
     * set pause status
     * /api/v2/logistics/set_pause_status (POST)
     */
    async setPauseStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/set_pause_status", "query": [], "body": ["is_paused"], "scope": "shop" }, params, opts);
    }
    /**
     * ship booking
     * /api/v2/logistics/ship_booking (POST)
     */
    async shipBooking(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/ship_booking", "query": [], "body": ["booking_sn", "pickup", "dropoff"], "scope": "shop" }, params, opts);
    }
    /**
     * ship order
     * /api/v2/logistics/ship_order (POST)
     */
    async shipOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/ship_order", "query": [], "body": ["order_sn", "package_number", "pickup"], "scope": "shop" }, params, opts);
    }
    /**
     * update address
     * /api/v2/logistics/update_address (POST)
     */
    async updateAddress(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_address", "query": [], "body": ["address_id", "region", "state", "city", "district", "town", "address", "zipcode", "name", "phone", "geo_info"], "scope": "shop" }, params, opts);
    }
    /**
     * update channel
     * /api/v2/logistics/update_channel (POST)
     */
    async updateChannel(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_channel", "query": [], "body": ["logistics_channel_id", "enabled", "cod_enabled"], "scope": "shop" }, params, opts);
    }
    /**
     * update operating hours
     * /api/v2/logistics/update_operating_hours (POST)
     */
    async updateOperatingHours(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_operating_hours", "query": [], "body": ["regular_operating_hour", "special_operating_hour", "instant_operating_hour", "shop_collection_operating_hour"], "scope": "shop" }, params, opts);
    }
    /**
     * update self collection order logistics
     * /api/v2/logistics/update_self_collection_order_logistics (POST)
     */
    async updateSelfCollectionOrderLogistics(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_self_collection_order_logistics", "query": [], "body": ["package_number", "self_collection_logistics_action", "epoc_image_list", "pin"], "scope": "shop" }, params, opts);
    }
    /**
     * update shipping order
     * /api/v2/logistics/update_shipping_order (POST)
     */
    async updateShippingOrder(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_shipping_order", "query": [], "body": ["order_sn", "package_number", "pickup"], "scope": "shop" }, params, opts);
    }
    /**
     * update tracking status
     * /api/v2/logistics/update_tracking_status (POST)
     */
    async updateTrackingStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/update_tracking_status", "query": [], "body": ["order_sn", "tracking_number", "tracking_url", "logistics_status"], "scope": "shop" }, params, opts);
    }
    /**
     * upload serviceable polygon
     * /api/v2/logistics/upload_serviceable_polygon (POST)
     */
    async uploadServiceablePolygon(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/logistics/upload_serviceable_polygon", "query": [], "body": ["file"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeLogisticsApi = ShopeeLogisticsApi;
//# sourceMappingURL=index.js.map