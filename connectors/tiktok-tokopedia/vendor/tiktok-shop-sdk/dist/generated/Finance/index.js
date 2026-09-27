"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/finance).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokFinanceApi = void 0;
class TikTokFinanceApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * GetPayments
     * /finance/202309/payments (GET)
     */
    async getPayments(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202309/payments", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["create_time_lt", "page_size", "page_token", "sort_field", "sort_order", "create_time_ge", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetStatements
     * /finance/202309/statements (GET)
     */
    async getStatements(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202309/statements", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["statement_time_lt", "payment_status", "page_size", "page_token", "sort_field", "sort_order", "statement_time_ge", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetTaxInformation
     * /finance/202504/tax_information (GET)
     */
    async getTaxInformation(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202504/tax_information", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetTransactionsbyOrder
     * /finance/202501/orders/{order_id}/statement_transactions (GET)
     */
    async getTransactionsbyOrder(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202501/orders/{order_id}/statement_transactions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": ["order_id"], "body": [] }, params, opts);
    }
    /**
     * GetTransactionsbyStatement
     * /finance/202501/statements/{statement_id}/statement_transactions (GET)
     */
    async getTransactionsbyStatement(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202501/statements/{statement_id}/statement_transactions", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "sort_field", "sort_order", "page_size", "shop_cipher"], "headers": [], "pathParams": ["statement_id"], "body": [] }, params, opts);
    }
    /**
     * GetUnsettledTransactions
     * /finance/202507/orders/unsettled (GET)
     */
    async getUnsettledTransactions(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202507/orders/unsettled", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["page_token", "page_size", "sort_field", "sort_order", "search_time_ge", "search_time_lt", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
    /**
     * GetWithdrawals
     * /finance/202309/withdrawals (GET)
     */
    async getWithdrawals(params, opts) {
        return this.client.request({ "method": "GET", "path": "/finance/202309/withdrawals", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["create_time_lt", "types", "page_size", "page_token", "create_time_ge", "shop_cipher"], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokFinanceApi = TikTokFinanceApi;
//# sourceMappingURL=index.js.map