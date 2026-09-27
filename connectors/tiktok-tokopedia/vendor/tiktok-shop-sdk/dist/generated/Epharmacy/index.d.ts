import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface GetConsultationProviderRequest {
    /** TTS consultation identifier (path) */
    "consultation_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetConsultationProviderResponse {
    "code"?: number;
    "data"?: {
        "consultation_provider"?: {
            "id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetPharmaciesRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Default: 50 Valid range: [1, 100] */
    "page_size"?: number;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetPharmaciesResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "pharmacies"?: Array<{
            "pharmacist"?: {
                "name"?: string;
                "practice_license_expire_time"?: number;
                "practice_license_number"?: string;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePharmaciesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePharmaciesBody {
    "pharmacies"?: Array<{
        "pharmacist"?: {
            "name"?: string;
            "practice_license_expire_time"?: number;
            "practice_license_number"?: string;
        };
    }>;
}
export interface UpdatePharmaciesResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "warehouse_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePrescriptionRequirementRequest {
    /** The product ID associated with the prescription requirement. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePrescriptionRequirementBody {
    "prescription_requirement"?: {
        "needs_prescription"?: boolean;
    };
}
export interface UpdatePrescriptionRequirementResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePrescriptionStatusRequest {
    /** Unique identifier of the order (path) */
    "order_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePrescriptionStatusBody {
    "prescription_status"?: string;
    "rejection_reason"?: string;
}
export interface UpdatePrescriptionStatusResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokEpharmacyApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * GetConsultationProvider
     * /epharmacy/202507/consultations/{consultation_id}/providers (GET)
     */
    getConsultationProvider(params: GetConsultationProviderRequest, opts?: TikTokRequestOptions): Promise<GetConsultationProviderResponse>;
    /**
     * GetPharmacies
     * /epharmacy/202504/pharmacies (GET)
     */
    getPharmacies(params: GetPharmaciesRequest, opts?: TikTokRequestOptions): Promise<GetPharmaciesResponse>;
    /**
     * UpdatePharmacies
     * /epharmacy/202504/pharmacies/update (POST)
     */
    updatePharmacies(params: UpdatePharmaciesRequest, body?: UpdatePharmaciesBody, opts?: TikTokRequestOptions): Promise<UpdatePharmaciesResponse>;
    /**
     * UpdatePrescriptionRequirement
     * /epharmacy/202504/products/{product_id}/prescription_requirements/update (POST)
     */
    updatePrescriptionRequirement(params: UpdatePrescriptionRequirementRequest, body?: UpdatePrescriptionRequirementBody, opts?: TikTokRequestOptions): Promise<UpdatePrescriptionRequirementResponse>;
    /**
     * UpdatePrescriptionStatus
     * /epharmacy/202504/orders/{order_id}/update_prescription_status (POST)
     */
    updatePrescriptionStatus(params: UpdatePrescriptionStatusRequest, body?: UpdatePrescriptionStatusBody, opts?: TikTokRequestOptions): Promise<UpdatePrescriptionStatusResponse>;
}
