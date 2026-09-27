"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Follow Prize).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeFollowPrizeApi = void 0;
class ShopeeFollowPrizeApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add follow prize
     * /api/v2/follow_prize/add_follow_prize (POST)
     */
    async addFollowPrize(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/follow_prize/add_follow_prize", "query": [], "body": ["follow_prize_name", "start_time", "end_time", "usage_quantity", "min_spend", "reward_type", "discount_amount"], "scope": "shop" }, params, opts);
    }
    /**
     * delete follow prize
     * /api/v2/follow_prize/delete_follow_prize (POST)
     */
    async deleteFollowPrize(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/follow_prize/delete_follow_prize", "query": [], "body": ["campagin_id"], "scope": "shop" }, params, opts);
    }
    /**
     * end follow prize
     * /api/v2/follow_prize/end_follow_prize (POST)
     */
    async endFollowPrize(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/follow_prize/end_follow_prize", "query": [], "body": ["campaign_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get follow prize detail
     * /api/v2/follow_prize/get_follow_prize_detail (GET)
     */
    async getFollowPrizeDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/follow_prize/get_follow_prize_detail", "query": ["campaign_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get follow prize list
     * /api/v2/follow_prize/get_follow_prize_list (GET)
     */
    async getFollowPrizeList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/follow_prize/get_follow_prize_list", "query": ["page_no", "page_size", "status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * update follow prize
     * /api/v2/follow_prize/update_follow_prize (POST)
     */
    async updateFollowPrize(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/follow_prize/update_follow_prize", "query": [], "body": ["follow_prize_name", "campaign_id", "start_time", "end_time", "usage_quantity", "min_spend"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeFollowPrizeApi = ShopeeFollowPrizeApi;
//# sourceMappingURL=index.js.map