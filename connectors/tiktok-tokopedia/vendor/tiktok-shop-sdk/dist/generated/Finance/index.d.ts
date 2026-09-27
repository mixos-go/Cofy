import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface GetPaymentsRequest {
    /** Filter payments to show only those that occurred before the specified date and time. Unix timestamp. Refer to notes in create_time_ge for more usage information. */
    "create_time_lt"?: number;
    /** The number of results to be returned per page. Default: 20 Valid range: [1-100] */
    "page_size"?: number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The returned results will be sorted by the specified field. Only supports create_time. */
    "sort_field": string;
    /** The sort order for the sort_field parameter. Default: ASC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
    /** Filter payments to show only those that occurred on or after the specified date and time. Unix timestamp. **Note:** create_time_ge and create_time_lt together constitute the creation time filter condition. - If create_time_ge is filled but create_time_lt is empty, create_time_lt will defau */
    "create_time_ge"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetPaymentsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "payments"?: Array<{
            "amount"?: {
                "currency"?: string;
                "value"?: string;
            };
            "payment_amount_before_exchange"?: {
                "currency"?: string;
                "value"?: string;
            };
            "reserve_amount"?: {
                "currency"?: string;
                "value"?: string;
            };
            "settlement_amount"?: {
                "currency"?: string;
                "value"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetStatementsRequest {
    /** Filter statements to show only those that are generated before the specified date and time. Unix timestamp. Refer to notes in statement_time_ge for more usage information. */
    "statement_time_lt"?: number;
    /** Filter statements based on the payment status. Possible values: - PAID: Payment has been transferred to the seller. - FAILED: Payment transfer failed. - PROCESSING: Payment is currently being processed. Default: All statuses are returned. */
    "payment_status"?: string;
    /** The number of results to be returned per page. Default: 20 Valid range: [1-100] */
    "page_size"?: number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The returned results will be sorted by the specified field. Only supports statement_time. */
    "sort_field": string;
    /** The sort order for the sort_field parameter. Default: ASC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
    /** Filter statements to show only those that are generated on or after the specified date and time. Unix timestamp. **Note:** statement_time_ge and statement_time_le together constitute the creation time filter condition. - If statement_time_ge is filled but statement_time_lt is empty, stateme */
    "statement_time_ge"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetStatementsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "statements"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetTaxInformationRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetTaxInformationResponse {
    "code"?: number;
    "data"?: {
        "tax_information"?: {
            "business_entity"?: {
                "address"?: string;
                "branch_number"?: string;
                "business_name"?: string;
                "fiscal_regime"?: string;
                "organization_level"?: string;
                "postal_code"?: string;
            };
            "overall_status"?: {
                "is_tax_infomation_complete"?: boolean;
                "is_tax_number_submitted"?: boolean;
            };
            "tax_numbers"?: Array<{
                "recent_audit"?: {
                    "rejection_reasons"?: Array<string>;
                    "status"?: string;
                    "tax_number"?: string;
                };
            }>;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetTransactionsbyOrderRequest {
    /** The order ID in TikTok Shop. (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetTransactionsbyOrderResponse {
    "code"?: number;
    "data"?: {
        "currency"?: string;
        "fee_and_tax_amount"?: string;
        "order_create_time"?: number;
        "order_id"?: string;
        "revenue_amount"?: string;
        "settlement_amount"?: string;
        "shipping_cost_amount"?: string;
        "sku_transactions"?: Array<{
            "fee_tax_breakdown"?: {
                "fee"?: {
                    "affiliate_ads_commission_amount"?: string;
                    "affiliate_commission_amount"?: string;
                    "affiliate_commission_amount_before_pit"?: string;
                    "affiliate_commission_deposit"?: string;
                    "affiliate_commission_release"?: string;
                    "affiliate_partner_commission_amount"?: string;
                    "bonus_cashback_service_fee_amount"?: string;
                    "campaign_resource_fee"?: string;
                    "cofunded_creator_bonus_amount"?: string;
                    "cofunded_promotion_service_fee_amount"?: string;
                    "credit_card_handling_fee_amount"?: string;
                    "dt_handling_fee_amount"?: string;
                    "dynamic_commission_amount"?: string;
                    "epr_pob_service_fee_amount"?: string;
                    "external_affiliate_marketing_fee_amount"?: string;
                    "fee_per_item_sold_amount"?: string;
                    "flash_sales_service_fee_amount"?: string;
                    "installation_service_fee"?: string;
                    "live_specials_fee_amount"?: string;
                    "mall_service_fee_amount"?: string;
                    "platform_commission_amount"?: string;
                    "pre_order_service_fee_amount"?: string;
                    "referral_fee_amount"?: string;
                    "refund_administration_fee_amount"?: string;
                    "seller_paylater_handling_fee_amount"?: string;
                    "sfp_service_fee_amount"?: string;
                    "shipping_fee_guarantee_service_fee"?: string;
                    "tap_shop_ads_commission"?: string;
                    "transaction_fee_amount"?: string;
                    "tsp_commission_amount"?: string;
                    "vn_fix_infrastructure_fee"?: string;
                    "voucher_xtra_service_fee_amount"?: string;
                };
                "tax"?: {
                    "anti_dumping_duty_amount"?: string;
                    "customs_clearance_amount"?: string;
                    "customs_duty_amount"?: string;
                    "gst_amount"?: string;
                    "import_vat_amount"?: string;
                    "isr_amount"?: string;
                    "iva_amount"?: string;
                    "local_vat_amount"?: string;
                    "pit_amount"?: string;
                    "sst_amount"?: string;
                    "vat_amount"?: string;
                };
            };
            "revenue_breakdown"?: {
                "cod_service_fee_amount"?: string;
                "refund_cod_service_fee_amount"?: string;
                "refund_subtotal_before_discount_amount"?: string;
                "seller_discount_amount"?: string;
                "seller_discount_refund_amount"?: string;
                "subtotal_before_discount_amount"?: string;
            };
            "shipping_cost_breakdown"?: {
                "actual_shipping_fee_amount"?: string;
                "customer_paid_shipping_fee_amount"?: string;
                "exchange_shipping_fee_amount"?: string;
                "failed_delivery_subsidy_amount"?: string;
                "fbt_free_shipping_fee_amount"?: string;
                "fbt_fulfillment_fee_reimbursement_amount"?: string;
                "free_return_subsidy_amount"?: string;
                "replacement_shipping_fee_amount"?: string;
                "return_shipping_fee_amount"?: string;
                "return_shipping_fee_paid_buyer_amount"?: string;
                "return_shipping_label_fee_amount"?: string;
                "seller_self_shipping_service_fee_amount"?: string;
                "shipping_fee_discount_amount"?: string;
                "shipping_insurance_fee_amount"?: string;
                "signature_confirmation_fee_amount"?: string;
                "supplementary_component"?: {
                    "customer_shipping_fee_offset_amount"?: string;
                    "fbm_shipping_cost_amount"?: string;
                    "fbt_fulfillment_fee_amount"?: string;
                    "fbt_fulfillment_fee_reimbursement_amount"?: string;
                    "fbt_shipping_cost_amount"?: string;
                    "platform_shipping_fee_discount_amount"?: string;
                    "promo_shipping_incentive_amount"?: string;
                    "refunded_customer_shipping_fee_amount"?: string;
                    "return_refund_subsidy_amount"?: string;
                    "seller_shipping_fee_discount_amount"?: string;
                    "shipping_fee_guarantee_reimbursement"?: string;
                    "shipping_fee_subsidy_amount"?: string;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetTransactionsbyStatementRequest {
    /** The unique id of statement (path) */
    "statement_id": string;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The returned results will be sorted by the specified field. Only supports order_create_time. */
    "sort_field": string;
    /** The sort order for the sort_field parameter. Default: ASC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
    /** The number of results to be returned per page. Default: 20 Valid range: [1-100] */
    "page_size"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetTransactionsbyStatementResponse {
    "code"?: number;
    "data"?: {
        "create_time"?: number;
        "currency"?: string;
        "id"?: string;
        "next_page_token"?: string;
        "payable_amount"?: string;
        "status"?: string;
        "total_count"?: number;
        "total_reserve_amount"?: string;
        "total_settlement_amount"?: string;
        "total_settlement_breakdown"?: {
            "total_adjustment_amount"?: string;
            "total_fee_tax_amount"?: string;
            "total_revenue_amount"?: string;
            "total_shipping_cost_amount"?: string;
        };
        "transactions"?: Array<{
            "fee_tax_breakdown"?: {
                "fee"?: {
                    "affiliate_ads_commission_amount"?: string;
                    "affiliate_commission_amount"?: string;
                    "affiliate_commission_amount_before_pit"?: string;
                    "affiliate_commission_deposit"?: string;
                    "affiliate_commission_release"?: string;
                    "affiliate_partner_commission_amount"?: string;
                    "bonus_cashback_service_fee_amount"?: string;
                    "campaign_resource_fee"?: string;
                    "cofunded_creator_bonus_amount"?: string;
                    "cofunded_promotion_service_fee_amount"?: string;
                    "credit_card_handling_fee_amount"?: string;
                    "dt_handling_fee_amount"?: string;
                    "dynamic_commission_amount"?: string;
                    "epr_pob_service_fee_amount"?: string;
                    "external_affiliate_marketing_fee_amount"?: string;
                    "fee_per_item_sold_amount"?: string;
                    "flash_sales_service_fee_amount"?: string;
                    "installation_service_fee"?: string;
                    "live_specials_fee_amount"?: string;
                    "mall_service_fee_amount"?: string;
                    "platform_commission_amount"?: string;
                    "pre_order_service_fee_amount"?: string;
                    "referral_fee_amount"?: string;
                    "refund_administration_fee_amount"?: string;
                    "seller_paylater_handling_fee_amount"?: string;
                    "sfp_service_fee_amount"?: string;
                    "shipping_fee_guarantee_service_fee"?: string;
                    "tap_shop_ads_commission"?: string;
                    "transaction_fee_amount"?: string;
                    "tsp_commission_amount"?: string;
                    "vn_fix_infrastructure_fee"?: string;
                    "voucher_xtra_service_fee_amount"?: string;
                };
                "tax"?: {
                    "anti_dumping_duty_amount"?: string;
                    "customs_clearance_amount"?: string;
                    "customs_duty_amount"?: string;
                    "gst_amount"?: string;
                    "import_vat_amount"?: string;
                    "isr_amount"?: string;
                    "iva_amount"?: string;
                    "local_vat_amount"?: string;
                    "pit_amount"?: string;
                    "sst_amount"?: string;
                    "vat_amount"?: string;
                };
            };
            "revenue_breakdown"?: {
                "cod_service_fee_amount"?: string;
                "refund_cod_service_fee_amount"?: string;
                "refund_subtotal_before_discount_amount"?: string;
                "seller_discount_amount"?: string;
                "seller_discount_refund_amount"?: string;
                "subtotal_before_discount_amount"?: string;
            };
            "shipping_cost_breakdown"?: {
                "actual_shipping_fee_amount"?: string;
                "customer_paid_shipping_fee_amount"?: string;
                "exchange_shipping_fee_amount"?: string;
                "failed_delivery_subsidy_amount"?: string;
                "fbt_free_shipping_fee_amount"?: string;
                "fbt_fulfillment_fee_reimbursement_amount"?: string;
                "free_return_subsidy_amount"?: string;
                "replacement_shipping_fee_amount"?: string;
                "return_shipping_fee_amount"?: string;
                "return_shipping_fee_paid_buyer_amount"?: string;
                "return_shipping_label_fee_amount"?: string;
                "seller_self_shipping_service_fee_amount"?: string;
                "shipping_fee_discount_amount"?: string;
                "shipping_fee_guarantee_reimbursement"?: string;
                "shipping_insurance_fee_amount"?: string;
                "signature_confirmation_fee_amount"?: string;
                "supplementary_component"?: {
                    "customer_shipping_fee"?: string;
                    "customer_shipping_fee_offset_amount"?: string;
                    "fbm_shipping_cost_amount"?: string;
                    "fbt_fulfillment_fee_amount"?: string;
                    "fbt_fulfillment_fee_reimbursement_amount"?: string;
                    "fbt_shipping_cost_amount"?: string;
                    "platform_shipping_fee_discount_amount"?: string;
                    "promo_shipping_incentive_amount"?: string;
                    "refund_customer_shipping_fee"?: string;
                    "refunded_customer_shipping_fee_amount"?: string;
                    "return_refund_subsidy_amount"?: string;
                    "seller_shipping_fee_discount_amount"?: string;
                    "shipping_fee_subsidy_amount"?: string;
                };
            };
            "supplementary_component"?: {
                "customer_payment_amount"?: string;
                "customer_refund_amount"?: string;
                "platform_cofunded_discount_amount"?: string;
                "platform_cofunded_discount_refund_amount"?: string;
                "platform_discount_amount"?: string;
                "platform_discount_refund_amount"?: string;
                "retail_delivery_fee_amount"?: string;
                "retail_delivery_fee_payment_amount"?: string;
                "retail_delivery_fee_refund_amount"?: string;
                "sales_tax_amount"?: string;
                "sales_tax_payment_amount"?: string;
                "sales_tax_refund_amount"?: string;
                "seller_cofunded_discount_amount"?: string;
                "seller_cofunded_discount_refund_amount"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetUnsettledTransactionsRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Default: 20 Valid range: [1-100] */
    "page_size"?: number;
    /** The returned results will be sorted by the specified field. Only supports order_create_time. */
    "sort_field": string;
    /** The sort order for the sort_field parameter. Default: ASC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
    /** Filter statements to show only those that are generated on or after the specified date and time. Unix timestamp. Note:statement_time_ge and statement_time_lt together constitute the creation time filter condition. - If statement_time_ge is filled but statement_time_lt is empty, statement_time_lt wil */
    "search_time_ge"?: number;
    /** the search range's end time */
    "search_time_lt"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetUnsettledTransactionsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "sum_est_adjustment_amount"?: string;
        "sum_est_fee_amount"?: string;
        "sum_est_revenue_amount"?: string;
        "sum_est_settlement_amount"?: string;
        "total_count"?: number;
        "transactions"?: Array<{
            "fee_tax_breakdown"?: {
                "fee"?: {
                    "affiliate_ads_commission_amount"?: string;
                    "affiliate_commission_amount"?: string;
                    "affiliate_commission_before_pit_amount"?: string;
                    "affiliate_partner_commission_amount"?: string;
                    "bonus_cashback_service_fee_amount"?: string;
                    "credit_card_handling_fee_amount"?: string;
                    "live_specials_fee_amount"?: string;
                    "mall_service_fee_amount"?: string;
                    "pit_withheld_from_ads_commission_amount"?: string;
                    "platform_commission_amount"?: string;
                    "referral_fee_amount"?: string;
                    "refund_administration_fee_amount"?: string;
                    "retail_delivery_fee_amount"?: string;
                    "retail_delivery_fee_payment_amount"?: string;
                    "retail_delivery_fee_refund_amount"?: string;
                    "sfp_service_fee_amount"?: string;
                    "transaction_fee_amount"?: string;
                };
                "tax"?: {
                    "customs_clearance_amount"?: string;
                    "customs_duty_amount"?: string;
                    "gst_amount"?: string;
                    "import_vat_amount"?: string;
                    "sales_tax_amount"?: string;
                    "sales_tax_payment_amount"?: string;
                    "sales_tax_refund_amount"?: string;
                    "sst_amount"?: string;
                    "vat_amount"?: string;
                };
            };
            "revenue_breakdown"?: {
                "cod_service_fee_amount"?: string;
                "refund_cod_service_fee_amount"?: string;
                "refund_subtotal_before_discount_amount"?: string;
                "seller_discount_amount"?: string;
                "seller_discount_refund_amount"?: string;
                "subtotal_before_discount_amount"?: string;
            };
            "shipping_cost_breakdown"?: {
                "actual_shipping_fee_amount"?: string;
                "customer_paid_shipping_fee_amount"?: string;
                "exchange_shipping_fee_amount"?: string;
                "replacement_shipping_fee_amount"?: string;
                "return_shipping_fee_amount"?: string;
                "shipping_fee_discount_amount"?: string;
                "shipping_insurance_fee_amount"?: string;
                "signature_confirmation_fee_amount"?: string;
                "supplementary_component"?: {
                    "customer_shipping_fee_offset_amount"?: string;
                    "fbm_shipping_cost_amount"?: string;
                    "fbt_fulfillment_fee_amount"?: string;
                    "fbt_shipping_cost_amount"?: string;
                    "platform_shipping_fee_discount_amount"?: string;
                    "promo_shipping_incentive_amount"?: string;
                    "seller_shipping_fee_discount_amount"?: string;
                    "shipping_fee_subsidy_amount"?: string;
                };
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetWithdrawalsRequest {
    /** Unix timestamp representing the end of transactions time range one wants to request */
    "create_time_lt"?: number;
    /** The type of transaction. Possible values: - WITHDRAW：The action of the seller to receive the settlement amount to the bank card through the action of withdrawal - SETTLE：The platform settles the amount to the seller - TRANSFER：Platform subsidies or deductions due to platform policies - REVERSE：Withd */
    "types": Array<string>;
    /** The default is 20, it must be positive integer,the range is 1-100 */
    "page_size"?: number;
    /** The next page token */
    "page_token"?: string;
    /** Unix timestamp representing the start of transactions time range one wants to request */
    "create_time_ge"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetWithdrawalsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "total_count"?: number;
        "withdrawals"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokFinanceApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * GetPayments
     * /finance/202309/payments (GET)
     */
    getPayments(params: GetPaymentsRequest, opts?: TikTokRequestOptions): Promise<GetPaymentsResponse>;
    /**
     * GetStatements
     * /finance/202309/statements (GET)
     */
    getStatements(params: GetStatementsRequest, opts?: TikTokRequestOptions): Promise<GetStatementsResponse>;
    /**
     * GetTaxInformation
     * /finance/202504/tax_information (GET)
     */
    getTaxInformation(params: GetTaxInformationRequest, opts?: TikTokRequestOptions): Promise<GetTaxInformationResponse>;
    /**
     * GetTransactionsbyOrder
     * /finance/202501/orders/{order_id}/statement_transactions (GET)
     */
    getTransactionsbyOrder(params: GetTransactionsbyOrderRequest, opts?: TikTokRequestOptions): Promise<GetTransactionsbyOrderResponse>;
    /**
     * GetTransactionsbyStatement
     * /finance/202501/statements/{statement_id}/statement_transactions (GET)
     */
    getTransactionsbyStatement(params: GetTransactionsbyStatementRequest, opts?: TikTokRequestOptions): Promise<GetTransactionsbyStatementResponse>;
    /**
     * GetUnsettledTransactions
     * /finance/202507/orders/unsettled (GET)
     */
    getUnsettledTransactions(params: GetUnsettledTransactionsRequest, opts?: TikTokRequestOptions): Promise<GetUnsettledTransactionsResponse>;
    /**
     * GetWithdrawals
     * /finance/202309/withdrawals (GET)
     */
    getWithdrawals(params: GetWithdrawalsRequest, opts?: TikTokRequestOptions): Promise<GetWithdrawalsResponse>;
}
