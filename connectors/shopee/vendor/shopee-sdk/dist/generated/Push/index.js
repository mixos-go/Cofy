"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Push).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeePushApi = void 0;
class ShopeePushApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * confirm consumed lost push message
     * /api/v2/push/confirm_consumed_lost_push_message (POST)
     */
    async confirmConsumedLostPushMessage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/push/confirm_consumed_lost_push_message", "query": [], "body": ["last_message_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get app push config
     * /api/v2/push/get_app_push_config (GET)
     */
    async getAppPushConfig(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/push/get_app_push_config", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get lost push message
     * /api/v2/push/get_lost_push_message (GET)
     */
    async getLostPushMessage(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/push/get_lost_push_message", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * set app push config
     * /api/v2/push/set_app_push_config (POST)
     */
    async setAppPushConfig(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/push/set_app_push_config", "query": [], "body": ["callback_url", "set_push_config_on", "set_push_config_off", "blocked_shop_id_list"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeePushApi = ShopeePushApi;
//# sourceMappingURL=index.js.map