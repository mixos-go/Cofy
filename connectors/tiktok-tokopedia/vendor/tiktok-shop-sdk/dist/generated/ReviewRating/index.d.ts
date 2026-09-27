import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface ImportProductReviewsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ImportProductReviewsBody {
    "product_review"?: {
        "product"?: {
            "description"?: string;
            "identifiers"?: {
                "external_product_id"?: string;
                "product_identifier_code"?: string;
                "seller_sku"?: string;
                "tiktok_product_id"?: string;
            };
            "image_uris"?: Array<string>;
            "name"?: string;
        };
        "review_records"?: Array<Record<string, unknown>>;
    };
}
export interface ImportProductReviewsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "external_review_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UploadReviewMediaRequest {
}
export interface UploadReviewMediaResponse {
    "code"?: number;
    "data"?: {
        "uri"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokReviewRatingApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * ImportProductReviews
     * /review_rating/202508/product_reviews (POST)
     */
    importProductReviews(params: ImportProductReviewsRequest, body?: ImportProductReviewsBody, opts?: TikTokRequestOptions): Promise<ImportProductReviewsResponse>;
    /**
     * UploadReviewMedia
     * /review_rating/202410/media/upload (POST)
     */
    uploadReviewMedia(params: UploadReviewMediaRequest, opts?: TikTokRequestOptions): Promise<UploadReviewMediaResponse>;
}
