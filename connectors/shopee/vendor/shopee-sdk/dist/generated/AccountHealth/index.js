"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/AccountHealth).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeAccountHealthApi = void 0;
class ShopeeAccountHealthApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * get late orders
     * /api/v2/account_health/get_late_orders (GET)
     */
    async getLateOrders(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_late_orders", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get listings with issues
     * /api/v2/account_health/get_listings_with_issues (GET)
     */
    async getListingsWithIssues(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_listings_with_issues", "query": ["page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get metric source detail
     * /api/v2/account_health/get_metric_source_detail (GET)
     */
    async getMetricSourceDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_metric_source_detail", "query": ["metric_id", "page_no", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get penalty point history
     * /api/v2/account_health/get_penalty_point_history (GET)
     */
    async getPenaltyPointHistory(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_penalty_point_history", "query": ["page_no", "page_size", "violation_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get punishment history
     * /api/v2/account_health/get_punishment_history (GET)
     */
    async getPunishmentHistory(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_punishment_history", "query": ["page_no", "page_size", "punishment_status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop performance
     * /api/v2/account_health/get_shop_performance (GET)
     */
    async getShopPerformance(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/account_health/get_shop_performance", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeAccountHealthApi = ShopeeAccountHealthApi;
//# sourceMappingURL=index.js.map