"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Payment).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeePaymentApi = void 0;
class ShopeePaymentApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * generate income report
     * /api/v2/payment/generate_income_report (GET)
     */
    async generateIncomeReport(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/generate_income_report", "query": ["release_time_from", "release_time_to"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * generate income statement
     * /api/v2/payment/generate_income_statement (GET)
     */
    async generateIncomeStatement(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/generate_income_statement", "query": ["release_time_from", "release_time_to", "statement_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get billing transaction info
     * /api/v2/payment/get_billing_transaction_info (POST)
     */
    async getBillingTransactionInfo(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/payment/get_billing_transaction_info", "query": [], "body": ["billing_transaction_info_type", "encrypted_payout_ids", "cursor", "page_size"], "scope": "shop" }, params, opts);
    }
    /**
     * get escrow detail
     * /api/v2/payment/get_escrow_detail (GET)
     */
    async getEscrowDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_escrow_detail", "query": ["order_sn"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get escrow detail batch
     * /api/v2/payment/get_escrow_detail_batch (GET)
     */
    async getEscrowDetailBatch(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_escrow_detail_batch", "query": ["order_sn_list"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get escrow list
     * /api/v2/payment/get_escrow_list (GET)
     */
    async getEscrowList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_escrow_list", "query": ["release_time_from", "release_time_to", "page_size", "page_no"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get income detail
     * /api/v2/payment/get_income_detail (GET)
     */
    async getIncomeDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_income_detail", "query": ["date_from", "date_to", "income_status", "cursor", "page_size"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get income overview
     * /api/v2/payment/get_income_overview (GET)
     */
    async getIncomeOverview(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_income_overview", "query": ["income_status"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get income report
     * /api/v2/payment/get_income_report (GET)
     */
    async getIncomeReport(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_income_report", "query": ["income_report_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get income statement
     * /api/v2/payment/get_income_statement (GET)
     */
    async getIncomeStatement(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_income_statement", "query": ["income_statement_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get item installment status
     * /api/v2/payment/get_item_installment_status (POST)
     */
    async getItemInstallmentStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/payment/get_item_installment_status", "query": [], "body": ["item_id_list"], "scope": "shop" }, params, opts);
    }
    /**
     * get payment method list
     * /api/v2/payment/get_payment_method_list (GET)
     */
    async getPaymentMethodList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_payment_method_list", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get payout detail
     * /api/v2/payment/get_payout_detail (GET)
     */
    async getPayoutDetail(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_payout_detail", "query": ["page_size", "page_no", "payout_time_from", "payout_time_to"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get payout info
     * /api/v2/payment/get_payout_info (GET)
     */
    async getPayoutInfo(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_payout_info", "query": ["payout_time_from", "payout_time_to", "page_size", "cursor"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get shop installment status
     * /api/v2/payment/get_shop_installment_status (GET)
     */
    async getShopInstallmentStatus(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_shop_installment_status", "query": [], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * get wallet transaction list
     * /api/v2/payment/get_wallet_transaction_list (GET)
     */
    async getWalletTransactionList(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/payment/get_wallet_transaction_list", "query": ["page_no", "page_size", "create_time_from", "create_time_to", "wallet_type", "transaction_type", "money_flow", "transaction_tab_type"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * set item installment status
     * /api/v2/payment/set_item_installment_status (POST)
     */
    async setItemInstallmentStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/payment/set_item_installment_status", "query": [], "body": ["item_id_list", "tenure_list"], "scope": "shop" }, params, opts);
    }
    /**
     * set shop installment status
     * /api/v2/payment/set_shop_installment_status (POST)
     */
    async setShopInstallmentStatus(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/payment/set_shop_installment_status", "query": [], "body": ["installment_status"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeePaymentApi = ShopeePaymentApi;
//# sourceMappingURL=index.js.map