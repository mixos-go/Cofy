"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/ShopFlashSale).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeShopFlashSaleApi = void 0;
class ShopeeShopFlashSaleApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add shop flash sale items
     * /api/v2/shop_flash_sale/add_shop_flash_sale_items (POST)
     */
    async addShopFlashSaleItems(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/add_shop_flash_sale_items", "query": [], "body": ["flash_sale_id", "items", "item_id", "purchase_limit", "models", "model_id", "input_promo_price", "stock", "item_input_promo_price", "item_stock"], "scope": "shop" }, params, opts);
    }
    /**
     * create shop flash sale
     * /api/v2/shop_flash_sale/create_shop_flash_sale (POST)
     */
    async createShopFlashSale(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/create_shop_flash_sale", "query": [], "body": ["timeslot_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete shop flash sale
     * /api/v2/shop_flash_sale/delete_shop_flash_sale (POST)
     */
    async deleteShopFlashSale(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/delete_shop_flash_sale", "query": [], "body": ["flash_sale_id"], "scope": "shop" }, params, opts);
    }
    /**
     * delete shop flash sale items
     * /api/v2/shop_flash_sale/delete_shop_flash_sale_items (POST)
     */
    async deleteShopFlashSaleItems(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/delete_shop_flash_sale_items", "query": [], "body": ["flash_sale_id", "item_ids"], "scope": "shop" }, params, opts);
    }
    /**
     * get item criteria
     * /api/v2/shop_flash_sale/get_item_criteria (GET)
     */
    async getItemCriteria(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_flash_sale/get_item_criteria", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop flash sale
     * /api/v2/shop_flash_sale/get_shop_flash_sale (GET)
     */
    async getShopFlashSale(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_flash_sale/get_shop_flash_sale", "query": ["flash_sale_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop flash sale items
     * /api/v2/shop_flash_sale/get_shop_flash_sale_items (GET)
     */
    async getShopFlashSaleItems(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_flash_sale/get_shop_flash_sale_items", "query": ["flash_sale_id", "offset", "limit"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop flash sale list
     * /api/v2/shop_flash_sale/get_shop_flash_sale_list (GET)
     */
    async getShopFlashSaleList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_flash_sale/get_shop_flash_sale_list", "query": ["type", "start_time", "end_time", "offset", "limit"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get time slot id
     * /api/v2/shop_flash_sale/get_time_slot_id (GET)
     */
    async getTimeSlotId(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_flash_sale/get_time_slot_id", "query": ["start_time", "end_time"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update shop flash sale
     * /api/v2/shop_flash_sale/update_shop_flash_sale (POST)
     */
    async updateShopFlashSale(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/update_shop_flash_sale", "query": [], "body": ["flash_sale_id", "status"], "scope": "shop" }, params, opts);
    }
    /**
     * update shop flash sale items
     * /api/v2/shop_flash_sale/update_shop_flash_sale_items (POST)
     */
    async updateShopFlashSaleItems(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_flash_sale/update_shop_flash_sale_items", "query": [], "body": ["flash_sale_id", "items", "item_id", "purchase_limit", "models", "model_id", "status", "input_promo_price", "stock", "item_status", "item_input_promo_price", "item_stock"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeShopFlashSaleApi = ShopeeShopFlashSaleApi;
//# sourceMappingURL=index.js.map