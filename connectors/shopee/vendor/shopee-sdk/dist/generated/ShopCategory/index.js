"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/ShopCategory).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeShopCategoryApi = void 0;
class ShopeeShopCategoryApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add item list
     * /api/v2/shop_category/add_item_list (POST)
     */
    async addItemList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_category/add_item_list", "query": [], "body": ["shop_category_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * add shop category
     * /api/v2/shop_category/add_shop_category (POST)
     */
    async addShopCategory(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_category/add_shop_category", "query": [], "body": ["name", "sort_weight"], "scope": "shop" }, params, opts);
    }
    /**
     * delete item list
     * /api/v2/shop_category/delete_item_list (POST)
     */
    async deleteItemList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_category/delete_item_list", "query": [], "body": ["shop_category_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * delete shop category
     * /api/v2/shop_category/delete_shop_category (POST)
     */
    async deleteShopCategory(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_category/delete_shop_category", "query": [], "body": ["shop_category_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get item list
     * /api/v2/shop_category/get_item_list (GET)
     */
    async getItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_category/get_item_list", "query": ["shop_category_id", "page_size", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop category list
     * /api/v2/shop_category/get_shop_category_list (GET)
     */
    async getShopCategoryList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/shop_category/get_shop_category_list", "query": ["page_size", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update shop category
     * /api/v2/shop_category/update_shop_category (POST)
     */
    async updateShopCategory(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/shop_category/update_shop_category", "query": [], "body": ["shop_category_id", "name", "sort_weight", "status"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeShopCategoryApi = ShopeeShopCategoryApi;
//# sourceMappingURL=index.js.map