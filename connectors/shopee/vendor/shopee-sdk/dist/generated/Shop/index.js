"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Shop).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeShopApi = void 0;
class ShopeeShopApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get authorised reseller brand
     * /api/v2/shop/get_authorised_reseller_brand (GET)
     */
    async getAuthorisedResellerBrand(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_authorised_reseller_brand", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get br shop onboarding info
     * /api/v2/shop/get_br_shop_onboarding_info (GET)
     */
    async getBrShopOnboardingInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_br_shop_onboarding_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get profile
     * /api/v2/shop/get_profile (GET)
     */
    async getProfile(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_profile", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop holiday mode
     * /api/v2/shop/get_shop_holiday_mode (GET)
     */
    async getShopHolidayMode(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_shop_holiday_mode", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop info
     * /api/v2/shop/get_shop_info (GET)
     */
    async getShopInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_shop_info", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop notification
     * /api/v2/shop/get_shop_notification (GET)
     */
    async getShopNotification(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_shop_notification", "query": ["cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get warehouse detail
     * /api/v2/shop/get_warehouse_detail (GET)
     */
    async getWarehouseDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop/get_warehouse_detail", "query": ["warehouse_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * set shop holiday mode
     * /api/v2/shop/set_shop_holiday_mode (POST)
     */
    async setShopHolidayMode(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop/set_shop_holiday_mode", "query": [], "body": ["holiday_mode_on", "holiday_mode_type", "holiday_mode_start_time", "holiday_mode_end_time", "holiday_mode_description"], "scope": "shop" }, params, opts);
    }
    /**
     * update profile
     * /api/v2/shop/update_profile (POST)
     */
    async updateProfile(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop/update_profile", "query": [], "body": ["shop_logo", "description", "shop_name"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeShopApi = ShopeeShopApi;
//# sourceMappingURL=index.js.map