"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Livestream).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeLivestreamApi = void 0;
class ShopeeLivestreamApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * add item list
     * /api/v2/livestream/add_item_list (POST)
     */
    async addItemList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/add_item_list", "query": [], "body": ["session_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * apply item set
     * /api/v2/livestream/apply_item_set (POST)
     */
    async applyItemSet(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/apply_item_set", "query": [], "body": ["session_id", "item_set_ids"], "scope": "shop" }, params, opts);
    }
    /**
     * ban user comment
     * /api/v2/livestream/ban_user_comment (POST)
     */
    async banUserComment(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/ban_user_comment", "query": [], "body": ["session_id", "ban_user_id"], "scope": "shop" }, params, opts);
    }
    /**
     * create session
     * /api/v2/livestream/create_session (POST)
     */
    async createSession(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/create_session", "query": [], "body": ["title", "description", "cover_image_url", "is_test"], "scope": "shop" }, params, opts);
    }
    /**
     * delete item list
     * /api/v2/livestream/delete_item_list (POST)
     */
    async deleteItemList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/delete_item_list", "query": [], "body": ["session_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * delete show item
     * /api/v2/livestream/delete_show_item (POST)
     */
    async deleteShowItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/delete_show_item", "query": [], "body": ["session_id"], "scope": "shop" }, params, opts);
    }
    /**
     * end session
     * /api/v2/livestream/end_session (POST)
     */
    async endSession(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/end_session", "query": [], "body": ["session_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get item count
     * /api/v2/livestream/get_item_count (GET)
     */
    async getItemCount(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_item_count", "query": ["session_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item list
     * /api/v2/livestream/get_item_list (GET)
     */
    async getItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_item_list", "query": ["session_id", "offset", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item set item list
     * /api/v2/livestream/get_item_set_item_list (GET)
     */
    async getItemSetItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_item_set_item_list", "query": ["item_set_id", "offset", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item set list
     * /api/v2/livestream/get_item_set_list (GET)
     */
    async getItemSetList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_item_set_list", "query": ["offset", "page_size", "keyword"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get latest comment list
     * /api/v2/livestream/get_latest_comment_list (GET)
     */
    async getLatestCommentList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_latest_comment_list", "query": ["session_id", "offset"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get like item list
     * /api/v2/livestream/get_like_item_list (GET)
     */
    async getLikeItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_like_item_list", "query": ["offset", "page_size", "keyword"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get recent item list
     * /api/v2/livestream/get_recent_item_list (GET)
     */
    async getRecentItemList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_recent_item_list", "query": ["offset", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get session detail
     * /api/v2/livestream/get_session_detail (GET)
     */
    async getSessionDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_session_detail", "query": ["session_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get session item metric
     * /api/v2/livestream/get_session_item_metric (GET)
     */
    async getSessionItemMetric(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_session_item_metric", "query": ["session_id", "offset", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get session metric
     * /api/v2/livestream/get_session_metric (GET)
     */
    async getSessionMetric(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_session_metric", "query": ["session_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get show item
     * /api/v2/livestream/get_show_item (GET)
     */
    async getShowItem(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/livestream/get_show_item", "query": ["session_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * post comment
     * /api/v2/livestream/post_comment (POST)
     */
    async postComment(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/post_comment", "query": [], "body": ["session_id", "content"], "scope": "shop" }, params, opts);
    }
    /**
     * start session
     * /api/v2/livestream/start_session (POST)
     */
    async startSession(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/start_session", "query": [], "body": ["session_id", "domain_id"], "scope": "shop" }, params, opts);
    }
    /**
     * unban user comment
     * /api/v2/livestream/unban_user_comment (POST)
     */
    async unbanUserComment(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/unban_user_comment", "query": [], "body": ["session_id", "unban_user_id"], "scope": "shop" }, params, opts);
    }
    /**
     * update item list
     * /api/v2/livestream/update_item_list (POST)
     */
    async updateItemList(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/update_item_list", "query": [], "body": ["session_id", "item_list"], "scope": "shop" }, params, opts);
    }
    /**
     * update session
     * /api/v2/livestream/update_session (POST)
     */
    async updateSession(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/update_session", "query": [], "body": ["session_id", "title", "description", "cover_image_url", "is_test"], "scope": "shop" }, params, opts);
    }
    /**
     * update show item
     * /api/v2/livestream/update_show_item (POST)
     */
    async updateShowItem(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/update_show_item", "query": [], "body": ["session_id", "item_id", "shop_id"], "scope": "shop" }, params, opts);
    }
    /**
     * upload image
     * /api/v2/livestream/upload_image (POST)
     */
    async uploadImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/livestream/upload_image", "query": [], "body": ["image"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeLivestreamApi = ShopeeLivestreamApi;
//# sourceMappingURL=index.js.map