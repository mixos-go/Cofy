import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface ConfirmPackageShipmentRequest {
}
export interface ConfirmPackageShipmentBody {
    "packages"?: Array<{
        "dimension"?: {
            "height"?: number;
            "length"?: number;
            "unit"?: string;
            "width"?: number;
        };
        "weight"?: {
            "unit"?: string;
            "value"?: number;
        };
    }>;
    "warehouse_provider_id"?: string;
}
export interface ConfirmPackageShipmentResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "package_id"?: string;
            };
        }>;
        "success_packages"?: Array<string>;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokSupplyChainApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * ConfirmPackageShipment
     * /supply_chain/202309/packages/sync (POST)
     */
    confirmPackageShipment(params: ConfirmPackageShipmentRequest, body?: ConfirmPackageShipmentBody, opts?: TikTokRequestOptions): Promise<ConfirmPackageShipmentResponse>;
}
