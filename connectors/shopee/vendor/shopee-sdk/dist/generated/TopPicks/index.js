"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/TopPicks).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeTopPicksApi = void 0;
class ShopeeTopPicksApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add top picks
     * /api/v2/top_picks/add_top_picks (POST)
     */
    async addTopPicks(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/top_picks/add_top_picks", "query": [], "body": ["is_activated", "item_id_list", "name"], "scope": "shop" }, params, opts);
    }
    /**
     * delete top picks
     * /api/v2/top_picks/delete_top_picks (POST)
     */
    async deleteTopPicks(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/top_picks/delete_top_picks", "query": [], "body": ["top_picks_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get top picks list
     * /api/v2/top_picks/get_top_picks_list (GET)
     */
    async getTopPicksList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/top_picks/get_top_picks_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update top picks
     * /api/v2/top_picks/update_top_picks (POST)
     */
    async updateTopPicks(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/top_picks/update_top_picks", "query": [], "body": ["name", "top_picks_id", "item_id_list", "is_activated"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeTopPicksApi = ShopeeTopPicksApi;
//# sourceMappingURL=index.js.map