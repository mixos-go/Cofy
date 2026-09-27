import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface GenerateIncomeReportRequest {
    /** Start time in epoch Example: 1234567890 */
    "release_time_from": number;
    /** End time in epoch Example: 1234567890 */
    "release_time_to": number;
}
export interface GenerateIncomeReportResponse {
    "response"?: Record<string, unknown>;
    /** Identifier of income report file. Example: Identifier of income report file. */
    "id"?: number;
    /** error code Example: error code */
    "error"?: string;
    /** error message Example: error message */
    "msg"?: string;
    /** request id Example: request id */
    "request_id"?: string;
}
export interface GenerateIncomeStatementRequest {
    /** The release_time_from must be - Monday (local time) for a weekly report - The 1st day (local time) of a Month for a monthly report Example: 1751302800 */
    "release_time_from": number;
    /** The release_time_to must be - Sunday (local time) for a weekly report - The last day (local time) of a Month for a monthly report Example: 1753981199 */
    "release_time_to": number;
    /** STATEMENT_TYPE_WEEKLY = 1; STATEMENT_TYPE_MONTHLY = 2; Local seller Income statement requires this value to be set. CB seller income statement does not require this. Example: 1 */
    "statement_type": number;
}
export interface GenerateIncomeStatementResponse {
    "response"?: {
        "id"?: number;
    };
    "error"?: string;
    "message"?: string;
}
export interface GetBillingTransactionInfoRequest {
    "billing_transaction_info_type": number;
    "encrypted_payout_ids"?: Array<string>;
    "cursor": string;
    "page_size": number;
}
export interface GetBillingTransactionInfoResponse {
    "response"?: {
        "transactions"?: Array<{
            "amount"?: number;
            "currency"?: string;
            "order_sn"?: string;
            "cost_header"?: string;
            "scenario"?: string;
            "remark"?: string;
            "level"?: string;
            "billing_transaction_type"?: string;
            "billing_transaction_status"?: string;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface GetEscrowDetailRequest {
    /** Shopee's unique identifier for an order. Example: 220914R9U7D3C6 */
    "order_sn": string;
}
export interface GetEscrowDetailResponse {
    "response"?: {
        "order_sn"?: string;
        "buyer_user_name"?: string;
        "return_order_sn_list"?: unknown[];
        "order_income": {
            "escrow_amount"?: number;
            "buyer_total_amount"?: number;
            "order_original_price"?: number;
            "original_price"?: number;
            "order_discounted_price"?: number;
            "order_selling_price"?: number;
            "order_seller_discount"?: number;
            "bcrs_deposit"?: number;
            "seller_discount"?: number;
            "shopee_discount"?: number;
            "voucher_from_seller"?: number;
            "voucher_from_shopee"?: number;
            "voucher_from_external_party"?: number;
            "coins"?: number;
            "buyer_paid_shipping_fee"?: number;
            "buyer_transaction_fee"?: number;
            "cross_border_tax"?: number;
            "payment_promotion"?: number;
            "commission_fee"?: number;
            "service_fee"?: number;
            "seller_transaction_fee"?: number;
            "seller_lost_compensation"?: number;
            "seller_coin_cash_back"?: number;
            "escrow_tax"?: number;
            "estimated_shipping_fee"?: number;
            "final_shipping_fee"?: number;
            "actual_shipping_fee"?: number;
            "shipping_fee_sst"?: number;
            "order_chargeable_weight"?: number;
            "shopee_shipping_rebate"?: number;
            "shipping_fee_discount_from_3pl"?: number;
            "seller_shipping_discount"?: number;
            "seller_voucher_code"?: unknown[];
            "drc_adjustable_refund"?: number;
            "cost_of_goods_sold"?: number;
            "original_cost_of_goods_sold"?: number;
            "original_shopee_discount"?: number;
            "seller_return_refund"?: number;
            "items"?: Array<{
                "item_id"?: number;
                "item_name"?: string;
                "item_sku"?: string;
                "model_id"?: number;
                "model_name"?: string;
                "model_sku"?: string;
                "line_item_id"?: number;
                "original_price"?: number;
                "original_price_pri"?: number;
                "selling_price"?: number;
                "discounted_price"?: number;
                "bcrs_deposit"?: number;
                "seller_discount"?: number;
                "shopee_discount"?: number;
                "discount_from_coin"?: number;
                "discount_from_voucher_shopee"?: number;
                "discount_from_voucher_seller"?: number;
                "activity_type"?: string;
                "activity_id"?: number;
                "is_main_item"?: boolean;
                "quantity_purchased"?: number;
                "is_b2c_shop_item"?: boolean;
                "ams_commission_fee"?: number;
                "is_kit"?: boolean;
                "kit_items": {
                    "original_product_id"?: number;
                    "original_model_id"?: number;
                    "total_qty"?: number;
                    "original_price"?: number;
                    "proportional_price"?: number;
                };
                "promotion_list"?: Array<{
                    "promotion_type"?: string;
                    "promotion_id"?: number;
                }>;
            }>;
            "escrow_amount_pri"?: number;
            "buyer_total_amount_pri"?: number;
            "original_price_pri"?: number;
            "seller_return_refund_pri"?: number;
            "commission_fee_pri"?: number;
            "service_fee_pri"?: number;
            "drc_adjustable_refund_pri"?: number;
            "pri_currency"?: string;
            "aff_currency"?: string;
            "exchange_rate"?: number;
            "reverse_shipping_fee"?: number;
            "reverse_shipping_fee_sst"?: number;
            "final_product_protection"?: number;
            "credit_card_promotion"?: number;
            "credit_card_transaction_fee"?: number;
            "final_product_vat_tax"?: number;
            "final_shipping_vat_tax"?: number;
            "campaign_fee"?: number;
            "sip_subsidy"?: number;
            "sip_subsidy_pri"?: number;
            "rsf_seller_protection_fee_claim_amount"?: number;
            "shipping_seller_protection_fee_amount"?: number;
            "final_escrow_product_gst"?: number;
            "final_escrow_shipping_gst"?: number;
            "delivery_seller_protection_fee_premium_amount"?: number;
            "order_adjustment"?: Array<{
                "amount"?: number;
                "date"?: number;
                "currency"?: string;
                "adjustment_reason"?: string;
            }>;
            "total_adjustment_amount"?: number;
            "escrow_amount_after_adjustment"?: number;
            "order_ams_commission_fee"?: number;
            "buyer_payment_method"?: string;
            "instalment_plan"?: string;
            "sales_tax_on_lvg"?: number;
            "final_return_to_seller_shipping_fee"?: number;
            "withholding_tax"?: number;
            "overseas_return_service_fee"?: number;
            "prorated_coins_value_offset_return_items"?: number;
            "prorated_shopee_voucher_offset_return_items"?: number;
            "prorated_seller_voucher_offset_return_items"?: number;
            "prorated_payment_channel_promo_bank_offset_return_items"?: number;
            "prorated_payment_channel_promo_shopee_offset_return_items"?: number;
            "fsf_seller_protection_fee_claim_amount"?: number;
            "vat_on_imported_goods"?: number;
            "tenure_info_list": {
                "payment_channel_name"?: string;
                "instalment_plan"?: string;
            };
            "withholding_vat_tax"?: number;
            "withholding_pit_tax"?: number;
            "withholding_cit_tax"?: number;
            "tax_registration_code"?: string;
            "seller_order_processing_fee"?: number;
            "buyer_paid_packaging_fee"?: number;
            "trade_in_bonus_by_seller"?: number;
            "fbs_fee"?: number;
            "net_commission_fee"?: number;
            "net_service_fee"?: number;
            "net_commission_fee_info_list": {
                "rule_id"?: number;
                "fee_amount"?: number;
                "rule_display_name"?: string;
            };
            "net_service_fee_info_list": {
                "rule_id"?: number;
                "fee_amount"?: number;
                "rule_display_name"?: string;
                "category"?: string;
            };
            "seller_product_rebate": {
                "amount"?: number;
                "commission_fee_offset"?: number;
                "service_fee_offset"?: number;
            };
            "pix_discount"?: number;
            "prorated_pix_discount_offset_return_items"?: number;
            "ads_escrow_top_up_fee_or_technical_support_fee"?: number;
            "th_import_duty"?: number;
            "remaining_voucher"?: number;
        };
        "buyer_payment_info": {
            "buyer_payment_method"?: string;
            "buyer_service_fee"?: number;
            "buyer_tax_amount"?: number;
            "buyer_total_amount"?: number;
            "shopeevip_subtotal"?: number;
            "credit_card_promotion"?: number;
            "icms_tax_amount"?: number;
            "import_tax_amount"?: number;
            "initial_buyer_txn_fee"?: number;
            "insurance_premium"?: number;
            "iof_tax_amount"?: number;
            "is_paid_by_credit_card"?: boolean;
            "merchant_subtotal"?: number;
            "seller_voucher"?: number;
            "shipping_fee"?: number;
            "shipping_fee_sst_amount"?: number;
            "shopee_voucher"?: number;
            "shopee_coins_redeemed"?: number;
            "buyer_paid_packaging_fee"?: number;
            "trade_in_bonus"?: number;
            "bulky_handling_fee"?: number;
            "discount_pix"?: number;
            "bcrs_deposit"?: number;
            "ads_voucher_discount"?: number;
            "buyer_instant_fee"?: number;
        };
    };
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface GetEscrowDetailBatchRequest {
    /** Shopee's unique identifier for an order. limit [1,50] The number of recommended requests ranges from 1 to 20 orders. */
    "order_sn_list": Array<string>;
}
export interface GetEscrowDetailBatchResponse {
    "response"?: Array<{
        "escrow_detail": {
            "order_sn"?: string;
            "buyer_user_name"?: string;
            "return_order_sn_list"?: Array<string>;
            "order_income": {
                "escrow_amount"?: number;
                "order_original_price"?: number;
                "original_price"?: number;
                "order_selling_price"?: number;
                "bcrs_deposit"?: number;
                "order_seller_discount"?: number;
                "seller_discount"?: number;
                "order_discounted_price"?: number;
                "shopee_discount"?: number;
                "voucher_from_seller"?: number;
                "voucher_from_shopee"?: number;
                "voucher_from_external_party"?: number;
                "coins"?: number;
                "cross_border_tax"?: number;
                "payment_promotion"?: number;
                "commission_fee"?: number;
                "service_fee"?: number;
                "seller_transaction_fee"?: number;
                "seller_lost_compensation"?: number;
                "seller_coin_cash_back"?: number;
                "escrow_tax"?: number;
                "final_shipping_fee"?: number;
                "actual_shipping_fee"?: number;
                "shopee_shipping_rebate"?: number;
                "shipping_fee_sst"?: number;
                "shipping_fee_discount_from_pl"?: number;
                "seller_shipping_discount"?: number;
                "estimated_shipping_fee"?: number;
                "seller_voucher_code"?: number;
                "drc_adjustable_refund"?: number;
                "refund_amount_to_buyer"?: number;
                "cost_of_goods_sold"?: number;
                "original_cost_of_goods_sold"?: number;
                "original_shopee_discount"?: number;
                "items"?: Array<{
                    "item_id"?: number;
                    "item_name"?: string;
                    "item_sku"?: string;
                    "model_id"?: number;
                    "model_name"?: string;
                    "model_sku"?: string;
                    "line_item_id"?: number;
                    "original_price"?: number;
                    "original_price_pri"?: number;
                    "selling_price"?: number;
                    "discounted_price"?: number;
                    "bcrs_deposit"?: number;
                    "seller_discount"?: number;
                    "shopee_discount"?: number;
                    "discount_from_coin"?: number;
                    "discount_from_voucher_shopee"?: number;
                    "discount_from_voucher_seller"?: number;
                    "activity_type"?: string;
                    "activity_id"?: number;
                    "is_main_item"?: boolean;
                    "quantity_purchased"?: number;
                    "is_b2c_shop_item"?: boolean;
                    "ams_commission_fee"?: number;
                    "is_kit"?: boolean;
                    "kit_items": {
                        "original_product_id"?: number;
                        "original_model_id"?: number;
                        "total_qty"?: number;
                        "original_price"?: number;
                        "proportional_price"?: number;
                    };
                    "promotion_list"?: Array<{
                        "promotion_type"?: string;
                        "promotion_id"?: number;
                    }>;
                }>;
                "escrow_amount_pri"?: number;
                "buyer_total_amount_pri"?: number;
                "original_price_pri"?: number;
                "seller_return_refund_pri"?: number;
                "commission_fee_pri"?: number;
                "service_fee_pri"?: number;
                "drc_adjustable_refund_pri"?: number;
                "pri_currency"?: string;
                "aff_currency"?: string;
                "exchange_rate"?: number;
                "reverse_shipping_fee"?: number;
                "reverse_shipping_fee_sst"?: number;
                "final_product_protection"?: number;
                "credit_card_promotion"?: number;
                "credit_card_transaction_fee"?: number;
                "final_product_vat_tax"?: number;
                "final_shipping_vat_tax"?: number;
                "campaign_fee"?: number;
                "sip_subsidy"?: number;
                "sip_subsidy_pri"?: number;
                "rsf_seller_protection_fee_claim_amount"?: number;
                "rsf_seller_protection_fee_premium_amount"?: number;
                "final_escrow_product_gst"?: number;
                "final_escrow_shipping_gst"?: number;
                "delivery_seller_protection_fee_premium_amount"?: number;
                "order_ams_commission_fee"?: number;
                "buyer_payment_method"?: number;
                "instalment_plan"?: number;
                "sales_tax_on_lvg"?: number;
                "withholding_tax"?: number;
                "overseas_return_service_fee"?: number;
                "prorated_coins_value_offset_return_items"?: number;
                "prorated_shopee_voucher_offset_return_items"?: number;
                "prorated_seller_voucher_offset_return_items"?: number;
                "prorated_payment_channel_promo_bank_offset_return_items"?: number;
                "prorated_payment_channel_promo_shopee_offset_return_items"?: number;
                "fsf_seller_protection_fee_claim_amount"?: number;
                "shipping_seller_protection_fee_amount"?: number;
                "final_return_to_seller_shipping_fee"?: number;
                "vat_on_imported_goods"?: number;
                "withholding_vat_tax"?: number;
                "withholding_pit_tax"?: number;
                "withholding_cit_tax"?: number;
                "tax_registration_code"?: string;
                "seller_order_processing_fee"?: number;
                "buyer_paid_packaging_fee"?: number;
                "trade_in_bonus_seller"?: number;
                "fbs_fee"?: number;
                "net_commission_fee"?: number;
                "net_service_fee"?: number;
                "net_commission_fee_info_list": {
                    "rule_id"?: number;
                    "fee_amount"?: number;
                    "rule_display_name"?: string;
                };
                "net_service_fee_info_list": {
                    "rule_id"?: number;
                    "fee_amount"?: number;
                    "rule_display_name"?: string;
                    "category"?: string;
                };
                "seller_product_rebate": {
                    "amount"?: number;
                    "commission_fee_offset"?: number;
                    "service_fee_offset"?: number;
                };
                "pix_discount"?: number;
                "prorated_pix_discount_offset_return_items"?: number;
                "ads_escrow_top_up_fee_or_technical_support_fee"?: number;
                "th_import_duty"?: number;
                "remaining_voucher"?: number;
            };
            "buyer_payment_info": {
                "buyer_payment_method"?: string;
                "buyer_service_fee"?: string;
                "buyer_tax_amount"?: number;
                "buyer_total_amount"?: number;
                "shopeevip_subtotal"?: number;
                "bcrs_discount"?: number;
                "credit_card_promotion"?: number;
                "icms_tax_amount"?: number;
                "import_tax_amount"?: number;
                "initial_buyer_txn_fee"?: number;
                "insurance_premium"?: number;
                "iof_tax_amount"?: number;
                "is_paid_by_credit_card"?: boolean;
                "merchant_subtotal"?: number;
                "seller_voucher"?: number;
                "shipping_fee"?: number;
                "shipping_fee_sst_amount"?: number;
                "shopee_voucher"?: number;
                "shopee_coins_redeemed"?: number;
                "buyer_paid_packaging_fee"?: number;
                "trade_in_bonus"?: number;
                "bulky_handling_fee"?: number;
                "discount_pix"?: number;
                "bcrs_deposit"?: number;
                "ads_voucher_discount"?: number;
                "buyer_instant_fee"?: number;
            };
        };
    }>;
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface GetEscrowListRequest {
    /** Query start time Example: 1651680000 */
    "release_time_from": number;
    /** Query end time Example: 1651939200 */
    "release_time_to": number;
    /** Number of pages returned max:100 default:40 Example: 40 */
    "page_size"?: number;
    /** The page number min:1 default:1 Example: 1 */
    "page_no"?: number;
}
export interface GetEscrowListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "escrow_list"?: Array<{
            "order_sn"?: string;
            "payout_amount"?: number;
            "escrow_release_time"?: number;
        }>;
    };
}
export interface GetIncomeDetailRequest {
    /** Start date (YYYY-MM-DD) of the income reference period. This field is only used for Income Status = Released, the other statuses will display all records currently in that status. For income Status = Released, For Released → Payout released date: 1. date_to must be later than date_from 2. date range cannot exceed 14 days 3. Input must follow valid date format. Example: 2025-09-25 */
    "date_from": string;
    /** End date (YYYY-MM-DD) of the income reference period. Must be later than date_from. This field is only used for Income Status = Released, the other statuses will display all records currently in that status. For income Status = Released, For Released → Payout released date: 1. date_to must be later than date_from 2. date range cannot exceed 14 days 3. Input must follow valid date format. Example: 2025-09-30 */
    "date_to": string;
    /** Status of Seller Income payout (Enum - Desc) Local 1 -Released 2 - Pending CB 0 - To Release 1 - Released 2 - Pending Example: 1 */
    "income_status": number;
    /** Pagination token for the next set of results. Use an empty string "" for the first request. Example: 176714986216530 */
    "cursor"?: string;
    /** Number of income detail records to retrieve per page Example: 30 */
    "page_size": number;
}
export interface GetIncomeDetailResponse {
    "error"?: string;
    "income_detail_list"?: {
        "list"?: Array<{
            "actual_payout_time"?: number;
            "currency"?: string;
            "order_sn"?: string;
            "payment_method"?: string;
            "released_amount"?: number;
            "status"?: string;
        }>;
        "next_page": {
            "cursor"?: string;
            "page_size"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetIncomeOverviewRequest {
    /** Status of Seller Income payout (Enum - Desc) Local Shop 1 -Released 2 - Pending CB Shop 0 - To Release 1 - Released 2 - Pending Note: By default, if Income Status was not provided in the request params (non mandatory), API response will return all values for all Income status based on either Local/CB Example: 1 */
    "income_status"?: number;
}
export interface GetIncomeOverviewResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "total_income"?: {
        "pending_amount"?: number;
        "released_amount"?: number;
    };
}
export interface GetIncomeReportRequest {
    /** The identifier for income report file request. Example: 123456 */
    "income_report_id": number;
}
export interface GetIncomeReportResponse {
    "response"?: Record<string, unknown>;
    /** The identifier for income statement file request. Example: The identifier for income statement file request. */
    "id"?: number;
    /** Income report file name. Example: Income report file name. */
    "file_name"?: string;
    /** STATUS_INVALID = 0; STATUS_PROCESSING = 1; STATUS_DOWNLOADABLE = 2; STATUS_DOWNLOADED = 3; STATUS_FAILED = 4; Example: STATUS_INVALID = 0; STATUS_PROCESSING = 1; STATUS_DOWNLOADABLE = 2; STATUS_DOWNLOADED = 3; STATUS_FAILED = 4; */
    "status"?: number;
    /** File generation time. Example: File generation time. */
    "generated_time"?: number;
    /** Link to download income report file. Example: Link to download income report file. */
    "file_link"?: string;
    /** Error Code Example: Error Code */
    "error"?: string;
    /** Error Message Example: Error Message */
    "msg"?: string;
    /** Request ID Example: Request ID */
    "request_id"?: string;
}
export interface GetIncomeStatementRequest {
    /** The identifier for income statement file request. return from the API v2.payment.generate_income_statement Example: 123456 */
    "income_statement_id": number;
}
export interface GetIncomeStatementResponse {
    "response"?: {
        "id"?: number;
        "file_name"?: string;
        "status"?: number;
        "generated_time"?: number;
        "file_link"?: string;
    };
    "error"?: string;
    "message"?: string;
}
export interface GetItemInstallmentStatusRequest {
    "item_id_list": Array<number>;
}
export interface GetItemInstallmentStatusResponse {
    /** Error Code Example: Error Code */
    "error"?: string;
    /** Error message Example: Error message */
    "message"?: string;
    /** Request id Example: Request id */
    "request_id"?: string;
    /** The business content of the response Example: The business content of the response */
    "response"?: Record<string, unknown>;
    "item_installment_list"?: Array<Record<string, unknown>>;
    /** Item unique id Example: Item unique id */
    "item_id"?: number;
    /** The tenures of item support installment. [] represents with no installment Example: The tenures of item support installment. [] represents with no installment */
    "tenure_list"?: Array<number>;
    /** Only applicable for local AR sellers. Example: Only applicable for local AR sellers. */
    "item_plan_ahora_list"?: Array<Record<string, unknown>>;
    /** Only applicable for local AR sellers. Example: Only applicable for local AR sellers. */
    "participate_plan_ahora"?: boolean;
}
export interface GetPaymentMethodListRequest {
}
export interface GetPaymentMethodListResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: Array<{
        "payment_method"?: Array<string>;
        "region"?: string;
    }>;
}
export interface GetPayoutDetailRequest {
    /** Number of pages returned max:100 Example: 10 */
    "page_size": number;
    /** The page number min:1 default:1 Example: 1 */
    "page_no": number;
    /** Strat time. Maximum time range is 15 days Example: 1643365068 */
    "payout_time_from": number;
    /** End time Example: 1659003469 */
    "payout_time_to": number;
}
export interface GetPayoutDetailResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "more"?: boolean;
        "payout_list"?: Array<{
            "payout_info": {
                "from_currency"?: string;
                "payout_currency"?: string;
                "from_amount"?: number;
                "payout_amount"?: number;
                "exchange_rate"?: string;
                "payout_time"?: number;
                "pay_service"?: string;
                "payee_id"?: string;
            };
            "escrow_list"?: Array<{
                "escrow_amount"?: number;
                "currency"?: string;
                "order_sn"?: string;
            }>;
            "offline_adjustment_list"?: Array<{
                "adjustment_amount"?: number;
                "module"?: string;
                "remark"?: string;
                "scenario"?: string;
                "adjustment_level"?: string;
                "order_sn"?: string;
            }>;
        }>;
    };
}
export interface GetPayoutInfoRequest {
    /** Start time. Maximum time range is 15 days Example: 1643365068 */
    "payout_time_from": number;
    /** Payout End time Example: 1659003469 */
    "payout_time_to": number;
    /** Number of pages returned max:100 Example: 10 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. Example: "" */
    "cursor": string;
}
export interface GetPayoutInfoResponse {
    "response"?: {
        "payout_list"?: Array<{
            "from_currency"?: string;
            "payout_currency"?: string;
            "from_amount"?: number;
            "payout_amount"?: number;
            "exchange_rate"?: string;
            "payout_time"?: number;
            "pay_service"?: string;
            "payee_id"?: string;
            "encrypted_payout_id"?: string;
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface GetShopInstallmentStatusRequest {
}
export interface GetShopInstallmentStatusResponse {
    "response"?: {
        "installment_status"?: number;
    };
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface GetWalletTransactionListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0. if data is more than one page, the offset can be some entry to start next call. */
    "page_no": number;
    /** If many transactions are available to retrieve, you may need to call GetTransactionList multiple times to retrieve all the data. Each result set is returned as a page of entries. Default is 40. Use the Pagination filters to control the maximum number of entries (<= 100) to retrieve per page (i.e., per call), the offset number to start next call. This integer value is usUed to specify the maximum number of entries to return in a single ""page"" of data. */
    "page_size": number;
    /** The create_time_from field is the starting date range. The maximum date range that may be specified with the create_time_from and create_time_to fields is 15 days. */
    "create_time_from"?: number;
    /** The create_time_to field is the ending date range. The maximum date range that may be specified with the create_time_from and create_time_to fields is 15 days. */
    "create_time_to"?: number;
    /** This field indicates the wallet type. */
    "wallet_type"?: string;
    /** Transaction type APIs: ESCROW_VERIFIED_ADD = 101; // Escrow has been verified and paid to seller ESCROW_VERIFIED_MINUS = 102; // Escrow has been verified and charged from seller as escrow amount is negative WITHDRAWAL_CREATED = 201; // The seller has created a withdrawal, so it’s deducted from balance WITHDRAWAL_COMPLETED = 202; // The withdrawal has been completed, so the ongoing amount decreases. WITHDRAWAL_CANCELLED = 203; // The withdrawal has been canceled, so the amount is added back to the seller balance. Ongoing amount decreases as well. ADJUSTMENT_ADD = 401; // One adjustment item has been paid to seller ADJUSTMENT_MINUS = 402; // One adjustment item has been charged from seller FBS_ADJUSTMENT_ADD = 404; //One adjustment item related to Shopee fulfillment order is added to seller FBS_ADJUSTMENT_MINUS = 405; // One adjustment item related to Shopee fulfillment order is deducted from seller ADJUSTMENT_CENTER_ADD = 406; // One adjustment item has been added to seller wallet ADJUSTMENT_CENTER_DEDUCT = 407; // One adjustment item has been deducted from seller wallet FSF_COST_PASSING_DEDUCT = 408; FSF cost passing for canceled/invalid orders PERCEPTION_VAT_TAX_DEDUCT = 409; Extra charge for perception regime VAT tax (Argentina) PERCEPTION_TURNOVER_TAX_DEDUCT = 410; Extra charge for perception regime turnover tax (Argentina) PAID_ADS_CHARGE = 450; // Paid ads are charged from seller PAID_ADS_REFUND = 451; // Paid ads are refunded to seller FAST_ESCROW_DISBURSE = 452; // ADD. // The first disbursement of fast escrow has been paid to seller AFFILIATE_ADS_SELLER_FEE = 455; // DEDUCT // Affiliate ads seller fee is charged from seller AFFILIATE_ADS_SELLER_FEE_REFUND = 456; // ADD // Affiliate ads seller fee is refunded to seller FAST_ESCROW_DEDUCT = 458; // Fast escrow is deducted from seller balance in the event of return and refund FAST_ESCROW_DISBURSE_REMAIN = 459; // The second disbursement of fast escrow has been paid to seller AFFILIATE_FEE_DEDUCT = 460; // Affiliate MKT fee is charged from seller for using affiliate MKT services */
    "transaction_type"?: string;
    /** It's to indicate whether user wants to only return : MONEY_IN = addition MONEY_OUT = Deduction if not specified, we will return all Note special case for TW JKO Pay, we will ignore Money_flow */
    "money_flow"?: string;
    /** NOTE: Only 1 'transaction tab type' value should be passed in. Passing in more than 1 value (eg: comma separated values) will return default response. This is because the request param treats the value passed in as a single string. This to indicates the updated filtering type that client can use to specify which transaction type we want to return. it will have : Default wallet_order_income wallet_adjustment_filter wallet_wallet_payment wallet_refund_from_order wallet_withdrawals fast_escrow_repayment fast_pay seller_loan corporate_loan pix_transactions_filter open_finance_transactions_filter Note for BR, wallet txn type that linked to pix_transactions_filter and open_finance_transactions_filter are classified as default type tab instead. therefore for Open API client who wants to query these 2 trx can put default as the filter in this type */
    "transaction_tab_type"?: string;
}
export interface GetWalletTransactionListResponse {
    "response"?: Record<string, unknown>;
    "transaction_list"?: Array<Record<string, unknown>>;
    /** The status of the transaction，available values: FAILED,COMPLETED,PENDING,INITIAL. Example: The status of the transaction，available values: FAILED,COMPLETED,PENDING,INITIAL. */
    "status"?: string;
    /** The type of transaction. Example: The type of transaction. */
    "transaction_type"?: string;
    /** The transaction title sent by client (Adjustment Center) for adjustments, Only for ID local sellers for now. Example: The transaction title sent by client (Adjustment Center) for adjustments, Only for ID local sellers for now. */
    "txn_title"?: string;
    /** The amount of transaction. Example: The amount of transaction. */
    "amount"?: number;
    /** The current balance of this account. Example: The current balance of this account. */
    "current_balance"?: number;
    /** The create time of the transaction. Example: The create time of the transaction. */
    "create_time"?: number;
    /** Shopee's unique identifier for an order. Example: Shopee's unique identifier for an order. */
    "order_sn"?: string;
    /** The serial number of return. Example: The serial number of return. */
    "refund_sn"?: string;
    /** The type of withdrawal. Example: The type of withdrawal. */
    "withdrawal_type"?: string;
    /** This field indicates the transaction fee. Example: This field indicates the transaction fee. */
    "transaction_fee"?: number;
    /** The detailed description of TOPUP SUCCESS and TOPUP FAILED. Example: The detailed description of TOPUP SUCCESS and TOPUP FAILED. */
    "description"?: string;
    /** The name of buyer. Example: The name of buyer. */
    "buyer_name"?: string;
    "pay_order_list"?: Array<Record<string, unknown>>;
    /** Name of the shop. Example: Name of the shop. */
    "shop_name"?: string;
    /** Withdrawal ID when transaction type is withdraw_created, withdrawal_completed, withdrawal_cancelled. Example: Withdrawal ID when transaction type is withdraw_created, withdrawal_completed, withdrawal_cancelled. */
    "withdrawal_id"?: number;
    /** The reason for ADJUSTMENT_ADD and ADJUSTMENT_MINUS. Example: The reason for ADJUSTMENT_ADD and ADJUSTMENT_MINUS. */
    "reason"?: string;
    /** Use this field to indicate the event where a withdrawal is split into several withdrawals due to the withdrawal limit. Example: Use this field to indicate the event where a withdrawal is split into several withdrawals due to the withdrawal limit. */
    "root_withdrawal_id"?: number;
    /** Description: A new response parameter added after: https://confluence.shopee.io/display/SPCT/%5BPRD%5D+%5BOpen+API%5D+Update+on+New+Open+API+to+fetch+Seller+wallet+Transaction This returns the updated transaction tab types that client can use to specify which transaction types they want to return. It will have the following tab types Default wallet_order_income wallet_adjustment_filter wallet_wallet_payment wallet_refund_from_order wallet_withdrawals fast_escrow_repayment fast_pay seller_loan corporate_loan pix_transactions_filter open_finance_transactions_filter Note for BR, currently in SOP live configuration, wallet txn type that linked to pix_transactions_filter and open_finance_transactions_filter are classified as default type tab instead. therefore for Open API client who wants to query these 2 txn can put default as the filter in this type Example: Description: A new response parameter added after: https://confluence.shopee.io/display/SPCT/%5BPRD%5D+%5BOpen+API%5D+Update+on+New+Open+API+to+fetch+Seller+wallet+Transaction This returns the updated transaction tab types that client can use to specify which transaction types they want to return. It will have the following tab types Default wallet_order_income wallet_adjustment_filter wallet_wallet_payment wallet_refund_from_order wallet_withdrawals fast_escrow_repayment fast_pay seller_loan corporate_loan pix_transactions_filter open_finance_transactions_filter Note for BR, currently in SOP live configuration, wallet txn type that linked to pix_transactions_filter and open_finance_transactions_filter are classified as default type tab instead. therefore for Open API client who wants to query these 2 txn can put default as the filter in this type */
    "transaction_tab_type"?: string;
    /** New response parameter provided after: https://confluence.shopee.io/display/SPCT/%5BPRD%5D+%5BOpen+API%5D+Update+on+New+Open+API+to+fetch+Seller+wallet+Transaction It's to indicate the money flow MONEY_IN = addition MONEY_OUT = deduction if not specified in request, will return both Note special case for TW JKO Pay, we will ignore Money_flow Example: New response parameter provided after: https://confluence.shopee.io/display/SPCT/%5BPRD%5D+%5BOpen+API%5D+Update+on+New+Open+API+to+fetch+Seller+wallet+Transaction It's to indicate the money flow MONEY_IN = addition MONEY_OUT = deduction if not specified in request, will return both Note special case for TW JKO Pay, we will ignore Money_flow */
    "money_flow"?: string;
    /** The outlet shop name where this outlet transaction came from. (In the Original Instant Mart concept, outlet transactions are redirected to Mart.) Example: The outlet shop name where this outlet transaction came from. (In the Original Instant Mart concept, outlet transactions are redirected to Mart.) */
    "outlet_shop_name"?: string;
    "more"?: boolean;
    "request_id"?: string;
    "message"?: string;
    "error"?: string;
}
export interface SetItemInstallmentStatusRequest {
    "item_id_list": Array<number>;
    "tenure_list": Array<number>;
}
export interface SetItemInstallmentStatusResponse {
    /** Error code Example: Error code */
    "error"?: string;
    /** Error message Example: Error message */
    "message"?: string;
    /** Request id Example: Request id */
    "request_id"?: string;
    /** The business content of the response Example: The business content of the response */
    "response"?: Record<string, unknown>;
    "item_installment_list"?: Array<Record<string, unknown>>;
    /** Item unique id Example: Item unique id */
    "item_id"?: number;
    /** The tenures of item support installment. [] represents with no installment Example: The tenures of item support installment. [] represents with no installment */
    "tenure_list"?: Array<number>;
    /** Only applicable for local AR sellers. Example: Only applicable for local AR sellers. */
    "item_plan_ahora_list"?: Array<Record<string, unknown>>;
    /** Only applicable for local AR sellers. Example: Only applicable for local AR sellers. */
    "participate_plan_ahor"?: boolean;
}
export interface SetShopInstallmentStatusRequest {
    "installment_status": number;
}
export interface SetShopInstallmentStatusResponse {
    "response"?: {
        "installment_status"?: number;
    };
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export declare class ShopeePaymentApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * generate income report
     * /api/v2/payment/generate_income_report (GET)
     */
    generateIncomeReport(params: GenerateIncomeReportRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateIncomeReportResponse>>;
    /**
     * generate income statement
     * /api/v2/payment/generate_income_statement (GET)
     */
    generateIncomeStatement(params: GenerateIncomeStatementRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateIncomeStatementResponse>>;
    /**
     * get billing transaction info
     * /api/v2/payment/get_billing_transaction_info (POST)
     */
    getBillingTransactionInfo(params: GetBillingTransactionInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBillingTransactionInfoResponse>>;
    /**
     * get escrow detail
     * /api/v2/payment/get_escrow_detail (GET)
     */
    getEscrowDetail(params: GetEscrowDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetEscrowDetailResponse>>;
    /**
     * get escrow detail batch
     * /api/v2/payment/get_escrow_detail_batch (GET)
     */
    getEscrowDetailBatch(params: GetEscrowDetailBatchRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetEscrowDetailBatchResponse>>;
    /**
     * get escrow list
     * /api/v2/payment/get_escrow_list (GET)
     */
    getEscrowList(params: GetEscrowListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetEscrowListResponse>>;
    /**
     * get income detail
     * /api/v2/payment/get_income_detail (GET)
     */
    getIncomeDetail(params: GetIncomeDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetIncomeDetailResponse>>;
    /**
     * get income overview
     * /api/v2/payment/get_income_overview (GET)
     */
    getIncomeOverview(params: GetIncomeOverviewRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetIncomeOverviewResponse>>;
    /**
     * get income report
     * /api/v2/payment/get_income_report (GET)
     */
    getIncomeReport(params: GetIncomeReportRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetIncomeReportResponse>>;
    /**
     * get income statement
     * /api/v2/payment/get_income_statement (GET)
     */
    getIncomeStatement(params: GetIncomeStatementRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetIncomeStatementResponse>>;
    /**
     * get item installment status
     * /api/v2/payment/get_item_installment_status (POST)
     */
    getItemInstallmentStatus(params: GetItemInstallmentStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemInstallmentStatusResponse>>;
    /**
     * get payment method list
     * /api/v2/payment/get_payment_method_list (GET)
     */
    getPaymentMethodList(params: GetPaymentMethodListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPaymentMethodListResponse>>;
    /**
     * get payout detail
     * /api/v2/payment/get_payout_detail (GET)
     */
    getPayoutDetail(params: GetPayoutDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPayoutDetailResponse>>;
    /**
     * get payout info
     * /api/v2/payment/get_payout_info (GET)
     */
    getPayoutInfo(params: GetPayoutInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPayoutInfoResponse>>;
    /**
     * get shop installment status
     * /api/v2/payment/get_shop_installment_status (GET)
     */
    getShopInstallmentStatus(params: GetShopInstallmentStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopInstallmentStatusResponse>>;
    /**
     * get wallet transaction list
     * /api/v2/payment/get_wallet_transaction_list (GET)
     */
    getWalletTransactionList(params: GetWalletTransactionListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetWalletTransactionListResponse>>;
    /**
     * set item installment status
     * /api/v2/payment/set_item_installment_status (POST)
     */
    setItemInstallmentStatus(params: SetItemInstallmentStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetItemInstallmentStatusResponse>>;
    /**
     * set shop installment status
     * /api/v2/payment/set_shop_installment_status (POST)
     */
    setShopInstallmentStatus(params: SetShopInstallmentStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetShopInstallmentStatusResponse>>;
}
