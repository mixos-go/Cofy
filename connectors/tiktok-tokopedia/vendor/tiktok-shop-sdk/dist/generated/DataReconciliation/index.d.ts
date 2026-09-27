import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface OrderStatusDataExchangeRequest {
    /** Tiktok shop seller shop id. */
    "shop_id"?: number;
}
export interface OrderStatusDataExchangeBody {
    "orders"?: Array<Record<string, unknown>>;
}
export interface OrderStatusDataExchangeResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "channel_order_id"?: string;
                "channel_type"?: string;
                "extra_errors"?: Array<Record<string, unknown>>;
                "order_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface QualityFactoryOrderDataImportAPIRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface QualityFactoryOrderDataImportAPIBody {
    "orders"?: Array<Record<string, unknown>>;
}
export interface QualityFactoryOrderDataImportAPIResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "channel_order_id"?: string;
                "channel_type"?: string;
                "extra_errors"?: Array<Record<string, unknown>>;
                "order_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokDataReconciliationApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * OrderStatusDataExchange
     * /data_reconciliation/202309/orders/sync (POST)
     */
    orderStatusDataExchange(params: OrderStatusDataExchangeRequest, body?: OrderStatusDataExchangeBody, opts?: TikTokRequestOptions): Promise<OrderStatusDataExchangeResponse>;
    /**
     * QualityFactoryOrderDataImportAPI
     * /data_reconciliation/202401/orders/import (POST)
     */
    qualityFactoryOrderDataImportAPI(params: QualityFactoryOrderDataImportAPIRequest, body?: QualityFactoryOrderDataImportAPIBody, opts?: TikTokRequestOptions): Promise<QualityFactoryOrderDataImportAPIResponse>;
}
