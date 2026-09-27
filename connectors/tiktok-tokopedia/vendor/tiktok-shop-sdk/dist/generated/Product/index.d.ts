import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface ActivateProductRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ActivateProductBody {
    "listing_platforms"?: Array<string>;
    "product_ids"?: Array<string>;
}
export interface ActivateProductResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: Array<{
                "extra_errors"?: Array<Record<string, unknown>>;
                "product_id"?: string;
            }>;
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ApplyOpportunitiesRequest {
    /** The product ID in TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ApplyOpportunitiesBody {
    "opportunity_ids"?: Array<string>;
}
export interface ApplyOpportunitiesResponse {
    "code"?: number;
    "data"?: {
        "opportunity_applications"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface BindLocalProductsRequest {
    /** The global product ID. (path) */
    "global_product_id": string;
}
export interface BindLocalProductsBody {
    "local_products"?: Array<Record<string, unknown>>;
}
export interface BindLocalProductsResponse {
    "code"?: number;
    "data"?: {
        "bind_results"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CheckGlobalProductListingRequest {
}
export interface CheckGlobalProductListingBody {
    "brand_id"?: string;
    "category_id"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "description"?: string;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer"?: {
        "address"?: string;
        "email"?: string;
        "name"?: string;
        "phone_number"?: string;
    };
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface CheckGlobalProductListingResponse {
    "code"?: number;
    "data"?: {
        "check_result"?: string;
        "fail_reasons"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CheckListingPrerequisitesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CheckListingPrerequisitesResponse {
    "code"?: number;
    "data"?: {
        "check_results"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CheckProductListingRequest {
    /** (**Deprecated**: This field is deprecated and will be removed in a future API version. Use [Diagnose and Optimize Product](677c9523f7765c0308b3d68d) API instead to get listing quality related information.) A flag to indicate whether to return the listing quality information (US only) and optimizatio */
    "is_diagnosis_required"?: boolean;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CheckProductListingBody {
    "brand_id"?: string;
    "category_id"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "delivery_option_ids"?: Array<string>;
    "description"?: string;
    "external_product_id"?: string;
    "is_cod_allowed"?: boolean;
    "is_pre_owned"?: boolean;
    "listing_platforms"?: Array<string>;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer_ids"?: Array<string>;
    "minimum_order_quantity"?: number;
    "option"?: {
        "gne_async_check_session_id"?: string;
        "need_trigger_gne_async_check"?: boolean;
    };
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "primary_combined_product_id"?: string;
    "product_attributes"?: Array<Record<string, unknown>>;
    "responsible_person_ids"?: Array<string>;
    "shipping_insurance_requirement"?: string;
    "shipping_template_id"?: string;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "list_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "pre_sale"?: {
            "fulfillment_type"?: {
                "handling_duration_days"?: number;
                "release_date"?: number;
            };
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
            "sale_price"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface CheckProductListingResponse {
    "code"?: number;
    "data"?: {
        "check_result"?: string;
        "diagnoses"?: Array<{
            "suggestions"?: Array<{
                "images"?: Array<Record<string, unknown>>;
                "seo_words"?: Array<Record<string, unknown>>;
                "smart_texts"?: Array<Record<string, unknown>>;
            }>;
        }>;
        "fail_reasons"?: Array<Record<string, unknown>>;
        "listing_quality"?: {
            "current_tier"?: string;
            "remaining_recommendations"?: number;
        };
        "pre_check_results"?: Array<Record<string, unknown>>;
        "warnings"?: {
            "message"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateAttributeRecommendationRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateAttributeRecommendationRequestBody {
    "external_product"?: {
        "description"?: string;
        "external_product_id"?: string;
        "images"?: Array<Record<string, unknown>>;
        "is_existing_product"?: boolean;
        "other_product_data"?: string;
        "skus"?: Array<Record<string, unknown>>;
        "title"?: string;
        "tts_category_id"?: string;
        "vendor_name"?: string;
        "version"?: string;
    };
}
export interface CreateAttributeRecommendationRequestResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface CreateCategoryUpgradeTaskRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateCategoryUpgradeTaskResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface CreateCustomBrandsRequest {
}
export interface CreateCustomBrandsBody {
    "name"?: string;
}
export interface CreateCustomBrandsResponse {
    "code"?: number;
    "data"?: {
        "id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateGlobalProductRequest {
}
export interface CreateGlobalProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "category_version"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "description"?: string;
    "external_global_product_id"?: string;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer"?: {
        "address"?: string;
        "email"?: string;
        "name"?: string;
        "phone_number"?: string;
    };
    "manufacturer_ids"?: Array<string>;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "responsible_person_ids"?: Array<string>;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "source_locale"?: string;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface CreateGlobalProductResponse {
    "code"?: number;
    "data"?: {
        "global_product_id"?: string;
        "global_skus"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateImageTranslationTasksRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateImageTranslationTasksBody {
    "images"?: Array<Record<string, unknown>>;
}
export interface CreateImageTranslationTasksResponse {
    "code"?: number;
    "data"?: {
        "translation_tasks"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateManufacturerRequest {
}
export interface CreateManufacturerBody {
    "address"?: string;
    "email"?: string;
    "locale"?: string;
    "name"?: string;
    "phone_number"?: {
        "availability"?: string;
        "country_code"?: string;
        "local_number"?: string;
    };
    "registered_trade_name"?: string;
}
export interface CreateManufacturerResponse {
    "code"?: number;
    "data"?: {
        "manufacturer_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateProductRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface CreateProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "category_version"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "delivery_option_ids"?: Array<string>;
    "description"?: string;
    "external_product_id"?: string;
    "idempotency_key"?: string;
    "is_cod_allowed"?: boolean;
    "is_not_for_sale"?: boolean;
    "is_pre_owned"?: boolean;
    "listing_platforms"?: Array<string>;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer_ids"?: Array<string>;
    "minimum_order_quantity"?: number;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "primary_combined_product_id"?: string;
    "product_attributes"?: Array<Record<string, unknown>>;
    "responsible_person_ids"?: Array<string>;
    "save_mode"?: string;
    "shipping_insurance_requirement"?: string;
    "shipping_template_id"?: string;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "list_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "pre_sale"?: {
            "fulfillment_type"?: {
                "handling_duration_days"?: number;
                "release_date"?: number;
            };
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
            "sale_price"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface CreateProductResponse {
    "code"?: number;
    "data"?: {
        "product_id"?: string;
        "skus"?: Array<Record<string, unknown>>;
        "warnings"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreateResponsiblePersonRequest {
}
export interface CreateResponsiblePersonBody {
    "address"?: {
        "city"?: string;
        "country"?: string;
        "district"?: string;
        "postal_code"?: string;
        "province"?: string;
        "street_address_line1"?: string;
        "street_address_line2"?: string;
    };
    "email"?: string;
    "locale"?: string;
    "name"?: string;
    "phone_number"?: {
        "country_code"?: string;
        "local_number"?: string;
    };
}
export interface CreateResponsiblePersonResponse {
    "code"?: number;
    "data"?: {
        "responsible_person_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface DeactivateProductsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface DeactivateProductsBody {
    "listing_platforms"?: Array<string>;
    "product_ids"?: Array<string>;
}
export interface DeactivateProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface DeleteGlobalProductsRequest {
}
export interface DeleteGlobalProductsBody {
    "global_product_ids"?: Array<string>;
}
export interface DeleteGlobalProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "global_product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface DeleteProductsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface DeleteProductsBody {
    "product_ids"?: Array<string>;
}
export interface DeleteProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface DiagnoseandOptimizeProductRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface DiagnoseandOptimizeProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "description"?: string;
    "main_images"?: Array<Record<string, unknown>>;
    "optimization_fields"?: Array<string>;
    "product_attributes"?: Array<Record<string, unknown>>;
    "product_id"?: string;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "title"?: string;
}
export interface DiagnoseandOptimizeProductResponse {
    "code"?: number;
    "data"?: {
        "diagnoses"?: Array<{
            "suggestion"?: Array<{
                "images"?: Array<Record<string, unknown>>;
                "seo_words"?: Array<Record<string, unknown>>;
                "smart_texts"?: Array<Record<string, unknown>>;
            }>;
        }>;
        "listing_quality"?: {
            "current_tier"?: string;
            "remaining_recommendations"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface EditGlobalProductRequest {
    /** The global product ID generated by TikTok Shop. (path) */
    "global_product_id": string;
}
export interface EditGlobalProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "category_version"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "description"?: string;
    "external_global_product_id"?: string;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer"?: {
        "address"?: string;
        "email"?: string;
        "name"?: string;
        "phone_number"?: string;
    };
    "manufacturer_ids"?: Array<string>;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "responsible_person_ids"?: Array<string>;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface EditGlobalProductResponse {
    "code"?: number;
    "data"?: {
        "global_skus"?: Array<Record<string, unknown>>;
        "publish_results"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface EditProductRequest {
    /** The product ID generated by TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface EditProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "category_version"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "delivery_option_ids"?: Array<string>;
    "description"?: string;
    "external_product_id"?: string;
    "is_cod_allowed"?: boolean;
    "is_pre_owned"?: boolean;
    "listing_platforms"?: Array<string>;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer_ids"?: Array<string>;
    "minimum_order_quantity"?: number;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "replicated_products"?: Array<{
        "skus"?: {
            "price"?: {
                "currency"?: string;
                "sale_price"?: string;
            };
        };
    }>;
    "responsible_person_ids"?: Array<string>;
    "save_mode"?: string;
    "shipping_insurance_requirement"?: string;
    "shipping_template_id"?: string;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "list_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "pre_sale"?: {
            "fulfillment_type"?: {
                "handling_duration_days"?: number;
                "release_date"?: number;
            };
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
            "sale_price"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "subscribe_info_edit"?: {
        "discount_details"?: Array<Record<string, unknown>>;
        "subscribe_status"?: string;
    };
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface EditProductResponse {
    "code"?: number;
    "data"?: {
        "audit"?: {
            "status"?: string;
        };
        "product_id"?: string;
        "skus"?: Array<Record<string, unknown>>;
        "warnings"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface EnableStrikethroughPricesRequest {
    /** The product ID in TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface EnableStrikethroughPricesBody {
    "external_product_id"?: string;
    "skus"?: Array<{
        "external_retail_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "external_transaction_price"?: {
            "amount"?: string;
            "currency"?: string;
            "image"?: {
                "uri"?: string;
            };
            "transaction_time"?: number;
        };
    }>;
}
export interface EnableStrikethroughPricesResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "sku_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetAttributesRequest {
    /** The ID of the category of this product. It must be a leaf category. (path) */
    "category_id": string;
    /** The BCP-47 locale codes for displaying the attribute information. Default: The default locale of your shop. Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - pt-BR - th-TH - vi-VN - zh-CN */
    "locale"?: string;
    /** The category tree version that corresponds to the specified category_id. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: For US shops, you must pass v2 when using this API. - Other regions: v1, represents the 3-level category tree. Default: v1 */
    "category_version"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetAttributesResponse {
    "code"?: number;
    "data"?: {
        "attributes"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetBrandsRequest {
    /** Specify a category ID to show the availability of **authorized brands** in the category. **Note**: Specify this value to obtain an accurate list of brands that you can use in a category. */
    "category_id"?: string;
    /** Filter results by the brand authorization status. Possible values: - 1: Returns only authorized brands - 0: Returns all brands */
    "is_authorized"?: boolean;
    /** Filter results to include brand names that begin with the specified value. */
    "brand_name"?: string;
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The category tree version that corresponds to the specified category_id. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: For US shops, you must pass v2 when using this API. - Other regions: v1, represents the 3-level category tree. Default: v1 */
    "category_version"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetBrandsResponse {
    "code"?: number;
    "data"?: {
        "brands"?: Array<Record<string, unknown>>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCategoriesRequest {
    /** The BCP-47 locale codes for displaying category information. Default: The default locale of your shop. Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - pt-BR - th-TH - vi-VN - zh-CN */
    "locale"?: string;
    /** Filter categories by this keyword in local_name. */
    "keyword"?: string;
    /** Filter categories by the category tree version. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: For US shops, you must pass v2 when using this API. - Other regions: v1, represents the 3-level category tree. Default: v1 */
    "category_version"?: string;
    /** Filter categories by the specified platform. Possible values: - TIKTOK_SHOP - TOKOPEDIA Default: TIKTOK_SHOP Applicable only for sellers that migrated from Tokopedia. */
    "listing_platform"?: string;
    /** A flag to indicate whether to include categories that are prohibited on TikTok Shop. Set this to true to identify which are the product categories that you can't list on TikTok Shop in any circumstances. Applicable only for BR, MX, EU and SEA markets. */
    "include_prohibited_categories"?: boolean;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetCategoriesResponse {
    "code"?: number;
    "data"?: {
        "categories"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCategoryRulesRequest {
    /** The ID of the category. It must be a leaf category. (path) */
    "category_id": string;
    /** The category tree version that corresponds to the specified category_id. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: For US shops, you must pass v2 when using this API. - Other regions: v1, represents the 3-level category tree. Default: v1 */
    "category_version"?: string;
    /** The BCP-47 locale codes for displaying category information. Default: en-US Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - pt-BR - th-TH - vi-VN - zh-CN */
    "locale"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetCategoryRulesResponse {
    "code"?: number;
    "data"?: {
        "allowed_special_product_types"?: Array<string>;
        "cod"?: {
            "is_supported"?: boolean;
        };
        "epr"?: {
            "is_required"?: boolean;
        };
        "fees"?: Array<Record<string, unknown>>;
        "manufacturer"?: {
            "is_required"?: boolean;
        };
        "package_dimension"?: {
            "is_required"?: boolean;
        };
        "product_certifications"?: Array<{
            "expiration_date"?: {
                "is_required"?: boolean;
            };
        }>;
        "responsible_person"?: {
            "is_required"?: boolean;
        };
        "size_chart"?: {
            "is_required"?: boolean;
            "is_supported"?: boolean;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalAttributesRequest {
    /** The ID of the category. It must be a leaf category. (path) */
    "category_id": string;
    /** The BCP-47 locale codes for displaying the attribute information. Default: en-US Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - th-TH - vi-VN - zh-CN */
    "locale"?: string;
    /** The category tree version that corresponds to the specified category_id. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: If the seller account contains an active US shop, you must pass v2 when using this API. - Other regions: v1, represents the */
    "category_version"?: string;
}
export interface GetGlobalAttributesResponse {
    "code"?: number;
    "data"?: {
        "attributes"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalCategoriesRequest {
    /** The BCP-47 locale codes for displaying category information. Default: en-US Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - th-TH - vi-VN - zh-CN */
    "locale"?: string;
    /** Filter categories by this keyword in local_name. */
    "keyword"?: string;
    /** Filter categories by the category tree version. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: If the seller account contains an active US shop, you must pass v2 when using this API. - Other regions: v1, represents the 3-level category tree. Def */
    "category_version"?: string;
}
export interface GetGlobalCategoriesResponse {
    "code"?: number;
    "data"?: {
        "categories"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalCategoryRulesRequest {
    /** The ID of the category. It must be a leaf category. (path) */
    "category_id": string;
    /** The category tree version that corresponds to the specified category_id. Possible values based on region: - US: v2, represents the 7-level category tree. **Important**: If the seller account contains an active US shop, you must pass v2 when using this API. - Other regions: v1, represents the */
    "category_version"?: string;
    /** The BCP-47 locale codes for displaying category information. Default: en-US Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - th-TH - vi-VN - zh-CN */
    "locale"?: string;
}
export interface GetGlobalCategoryRulesResponse {
    "code"?: number;
    "data"?: {
        "manufacturer"?: {
            "is_required"?: boolean;
            "optional_regions"?: Array<string>;
            "required_regions"?: Array<string>;
        };
        "product_certifications"?: Array<Record<string, unknown>>;
        "responsible_person"?: {
            "is_required"?: boolean;
            "optional_regions"?: Array<string>;
            "required_regions"?: Array<string>;
        };
        "size_chart"?: {
            "is_required"?: boolean;
            "is_supported"?: boolean;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalListingRulesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetGlobalListingRulesResponse {
    "code"?: number;
    "data"?: {
        "inventory_rules"?: Array<Record<string, unknown>>;
        "listing_methods"?: Array<string>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalProductRequest {
    /** Global product ID (path) */
    "global_product_id": string;
}
export interface GetGlobalProductResponse {
    "code"?: number;
    "data"?: {
        "brand"?: {
            "id"?: string;
        };
        "category"?: {
            "id"?: string;
        };
        "certifications"?: Array<Record<string, unknown>>;
        "create_time"?: number;
        "description"?: string;
        "external_global_product_id"?: string;
        "global_seller_id"?: string;
        "id"?: string;
        "main_images"?: Array<Record<string, unknown>>;
        "manufacturer"?: {
            "address"?: string;
            "email"?: string;
            "name"?: string;
            "phone_number"?: string;
        };
        "manufacturer_ids"?: Array<string>;
        "package_dimensions"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "package_weight"?: {
            "unit"?: string;
            "value"?: string;
        };
        "product_attributes"?: Array<Record<string, unknown>>;
        "products"?: Array<Record<string, unknown>>;
        "responsible_person_ids"?: Array<string>;
        "size_chart"?: {
            "image"?: {
                "height"?: number;
                "uri"?: string;
                "width"?: number;
            };
            "template"?: {
                "id"?: string;
            };
        };
        "skus"?: Array<{
            "identifier_code"?: {
                "code"?: string;
                "type"?: string;
            };
            "price"?: {
                "amount"?: string;
                "currency"?: string;
                "unit_price"?: string;
            };
            "sales_attributes"?: {
                "sku_img"?: {
                    "height"?: number;
                    "thumb_urls"?: Array<string>;
                    "uri"?: string;
                    "urls"?: Array<string>;
                    "width"?: number;
                };
            };
        }>;
        "source_locale"?: string;
        "title"?: string;
        "update_time"?: number;
        "video"?: {
            "id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetGlobalReplicatedProductsRequest {
    /** The ID of the product. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetGlobalReplicatedProductsResponse {
    "code"?: number;
    "data"?: {
        "replicated_products"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetImageTranslationTasksRequest {
    /** The image translation task IDs for retrieving translation results. Max count: 20 */
    "translation_task_ids"?: Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetImageTranslationTasksResponse {
    "code"?: number;
    "data"?: {
        "translation_tasks"?: Array<{
            "original_image"?: {
                "uri"?: string;
                "url"?: string;
            };
            "translated_image"?: {
                "uri"?: string;
                "url"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetProductRequest {
    /** The product ID in TikTok Shop. (path) */
    "product_id": string;
    /** A flag to indicate what product information to retrieve if a live product (ACTIVATE status) is edited and resent for TikTok Shop review. - True: Retrieves the latest version of the product information that is currently under review. - False: Retrieves a snapshot of the product information that is */
    "return_under_review_version"?: boolean;
    /** A flag to indicate what product information to retrieve if a product has a draft in TikTok Shop. - True: Retrieves the draft version of the product information. - False: Retrieves the latest product information. Default: False **Note**: - Applicable only if the product is in the DRAFT, ACTIVATE, */
    "return_draft_version"?: boolean;
    /** The locale or language. */
    "locale"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetProductResponse {
    "code"?: number;
    "data"?: {
        "audit"?: {
            "pre_approved_reasons"?: Array<string>;
            "status"?: string;
        };
        "audit_failed_reasons"?: Array<Record<string, unknown>>;
        "brand"?: {
            "id"?: string;
            "name"?: string;
        };
        "category_chains"?: Array<Record<string, unknown>>;
        "certifications"?: Array<Record<string, unknown>>;
        "create_time"?: number;
        "delivery_options"?: Array<Record<string, unknown>>;
        "description"?: string;
        "external_product_id"?: string;
        "global_product_association"?: {
            "global_product_id"?: string;
            "sku_mappings"?: Array<Record<string, unknown>>;
        };
        "has_draft"?: boolean;
        "id"?: string;
        "integrated_platform_statuses"?: Array<Record<string, unknown>>;
        "is_cod_allowed"?: boolean;
        "is_not_for_sale"?: boolean;
        "is_pre_owned"?: boolean;
        "is_replicated"?: boolean;
        "listing_quality_tier"?: string;
        "main_images"?: Array<Record<string, unknown>>;
        "manufacturer_ids"?: Array<string>;
        "minimum_order_quantity"?: number;
        "package_dimensions"?: {
            "height"?: string;
            "length"?: string;
            "unit"?: string;
            "width"?: string;
        };
        "package_weight"?: {
            "unit"?: string;
            "value"?: string;
        };
        "prescription_requirement"?: {
            "needs_prescription"?: boolean;
        };
        "primary_combined_product_id"?: string;
        "product_attributes"?: Array<Record<string, unknown>>;
        "product_families"?: Array<Record<string, unknown>>;
        "product_status"?: string;
        "product_types"?: Array<string>;
        "recommended_categories"?: Array<Record<string, unknown>>;
        "responsible_person_ids"?: Array<string>;
        "shipping_insurance_requirement"?: string;
        "shipping_template_id"?: string;
        "size_chart"?: {
            "image"?: {
                "height"?: number;
                "thumb_urls"?: Array<string>;
                "uri"?: string;
                "urls"?: Array<string>;
                "width"?: number;
            };
            "template"?: {
                "id"?: string;
            };
        };
        "skus"?: Array<{
            "combined_skus"?: {
                "brand"?: {
                    "id"?: string;
                    "name"?: string;
                };
                "price"?: {
                    "currency"?: string;
                    "sale_price"?: string;
                    "tax_exclusive_price"?: string;
                };
                "product_main_image"?: {
                    "height"?: number;
                    "thumb_urls"?: Array<string>;
                    "uri"?: string;
                    "urls"?: Array<string>;
                    "width"?: number;
                };
                "sales_attributes"?: {
                    "sku_img"?: {
                        "height"?: number;
                        "thumb_urls"?: Array<string>;
                        "uri"?: string;
                        "urls"?: Array<string>;
                        "width"?: number;
                    };
                };
            };
            "global_listing_policy"?: {
                "inventory_type"?: string;
                "price_sync"?: boolean;
                "replicate_source"?: {
                    "product_id"?: string;
                    "shop_id"?: string;
                    "sku_id"?: string;
                };
            };
            "identifier_code"?: {
                "code"?: string;
                "type"?: string;
            };
            "list_price"?: {
                "amount"?: string;
                "currency"?: string;
            };
            "pre_sale"?: {
                "fulfillment_type"?: {
                    "handling_duration_days"?: number;
                    "release_date"?: number;
                };
                "type"?: string;
            };
            "price"?: {
                "currency"?: string;
                "sale_price"?: string;
                "tax_exclusive_price"?: string;
                "unit_price"?: string;
            };
            "sales_attributes"?: {
                "sku_img"?: {
                    "height"?: number;
                    "thumb_urls"?: Array<string>;
                    "uri"?: string;
                    "urls"?: Array<string>;
                    "width"?: number;
                };
            };
            "status_info"?: {
                "deactivation_source"?: string;
                "status"?: string;
            };
        }>;
        "status"?: string;
        "subscribe_info"?: {
            "subscribe_discount_details"?: Array<Record<string, unknown>>;
            "subscribe_promotion_config"?: Array<Record<string, unknown>>;
            "subscribe_status"?: string;
            "support_subscribe"?: boolean;
        };
        "title"?: string;
        "update_time"?: number;
        "video"?: {
            "cover_url"?: string;
            "format"?: string;
            "height"?: number;
            "id"?: string;
            "size"?: number;
            "url"?: string;
            "width"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetProductsSEOWordsRequest {
    /** The product IDs for which you want to obtain SEO suggestions. - Max IDs: 20 - The product must be live (ACTIVATE status) */
    "product_ids": Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetProductsSEOWordsResponse {
    "code"?: number;
    "data"?: {
        "products"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetRecommendedProductTitleAndDescriptionRequest {
    /** The product IDs for which you want to optimize the information. - Max IDs: 20 - The product must be live (status: ACTIVATE) */
    "product_ids": Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface GetRecommendedProductTitleAndDescriptionResponse {
    "code"?: number;
    "data"?: {
        "products"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ImportExternalProductInfoRequest {
}
export interface ImportExternalProductInfoResponse {
    "code"?: number;
    "data"?: {
        "import_result"?: {
            "code"?: string;
            "message"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface InventorySearchRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface InventorySearchBody {
    "product_ids"?: Array<string>;
    "sku_ids"?: Array<string>;
}
export interface InventorySearchResponse {
    "code"?: number;
    "data"?: {
        "inventory"?: Array<{
            "skus"?: Array<{
                "total_available_inventory_distribution"?: Array<{
                    "campaign_inventory"?: Array<Record<string, unknown>>;
                    "creator_inventory"?: Array<Record<string, unknown>>;
                    "in_shop_inventory"?: {
                        "quantity"?: number;
                    };
                }>;
            }>;
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ListingSchemasRequest {
    /** The interface returns the field requirements for creating a product. By providing the leaf category ID, you can obtain the field information and input methods for the product creation requirements. */
    "category_ids": Array<number>;
    /** Category information will be returned in the corresponding language based on the specified locale. If no locale is provided, the default locale of the store will be used. The currently supported locales include: en-GB, en-US, id-ID, ms-MY, th-TH, vi-VN, zh-CN. Use BCP-47 language codes, such as 'en- */
    "locale"?: string;
    /** The version id of the category tree.The new version id is "v2" and will return data from our new 7-level category tree.The old version id is "v1" and will return data from the current 3-level category tree.The old version of category data will be given by default. */
    "category_version"?: string;
}
export interface ListingSchemasResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "category_id"?: number;
            };
        }>;
        "listing_schemas"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface OptimizedImagesRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface OptimizedImagesBody {
    "images"?: Array<Record<string, unknown>>;
}
export interface OptimizedImagesResponse {
    "code"?: number;
    "data"?: {
        "images"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PartialEditCandidateProductsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface PartialEditCandidateProductsBody {
    "candidate_products"?: Array<{
        "skus"?: {
            "price"?: {
                "amount"?: string;
                "currency"?: string;
            };
        };
    }>;
}
export interface PartialEditCandidateProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "external_product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PartialEditGlobalProductRequest {
    /** The global product ID generated by TikTok Shop. (path) */
    "global_product_id": string;
}
export interface PartialEditGlobalProductBody {
    "brand_id"?: string;
    "category_id"?: string;
    "category_version"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "description"?: string;
    "external_global_product_id"?: string;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer"?: {
        "address"?: string;
        "email"?: string;
        "name"?: string;
        "phone_number"?: string;
    };
    "manufacturer_ids"?: Array<string>;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "responsible_person_ids"?: Array<string>;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface PartialEditGlobalProductResponse {
    "code"?: number;
    "data"?: {
        "global_skus"?: Array<Record<string, unknown>>;
        "publish_results"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PartialEditManufacturerRequest {
    /** The manufacturer ID in TikTok Shop. (path) */
    "manufacturer_id": string;
}
export interface PartialEditManufacturerBody {
    "address"?: string;
    "email"?: string;
    "locale"?: string;
    "name"?: string;
    "phone_number"?: {
        "availability"?: string;
        "country_code"?: string;
        "local_number"?: string;
    };
    "registered_trade_name"?: string;
}
export interface PartialEditManufacturerResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface PartialEditProductRequest {
    /** The product ID in TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface PartialEditProductBody {
    "brand_id"?: string;
    "certifications"?: Array<Record<string, unknown>>;
    "description"?: string;
    "external_product_id"?: string;
    "is_cod_allowed"?: boolean;
    "listing_platforms"?: Array<string>;
    "main_images"?: Array<Record<string, unknown>>;
    "manufacturer_ids"?: Array<string>;
    "package_dimensions"?: {
        "height"?: string;
        "length"?: string;
        "unit"?: string;
        "width"?: string;
    };
    "package_weight"?: {
        "unit"?: string;
        "value"?: string;
    };
    "product_attributes"?: Array<Record<string, unknown>>;
    "replicated_products"?: Array<{
        "skus"?: {
            "price"?: {
                "currency"?: string;
                "sale_price"?: string;
            };
        };
    }>;
    "responsible_person_ids"?: Array<string>;
    "save_mode"?: string;
    "size_chart"?: {
        "image"?: {
            "uri"?: string;
        };
        "template"?: {
            "id"?: string;
        };
    };
    "skus"?: Array<{
        "identifier_code"?: {
            "code"?: string;
            "type"?: string;
        };
        "list_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "pre_sale"?: {
            "fulfillment_type"?: {
                "handling_duration_days"?: number;
                "release_date"?: number;
            };
            "type"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
            "sale_price"?: string;
        };
        "sales_attributes"?: {
            "sku_img"?: {
                "uri"?: string;
            };
        };
    }>;
    "subscribe_info_edit"?: {
        "discount_details"?: Array<Record<string, unknown>>;
        "subscribe_status"?: string;
    };
    "title"?: string;
    "video"?: {
        "id"?: string;
    };
}
export interface PartialEditProductResponse {
    "code"?: number;
    "data"?: {
        "audit"?: {
            "status"?: string;
        };
        "product_id"?: string;
        "skus"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PartialEditResponsiblePersonRequest {
    /** The responsible person ID in TikTok Shop. (path) */
    "responsible_person_id": string;
}
export interface PartialEditResponsiblePersonBody {
    "address"?: {
        "city"?: string;
        "country"?: string;
        "district"?: string;
        "postal_code"?: string;
        "province"?: string;
        "street_address_line1"?: string;
        "street_address_line2"?: string;
    };
    "email"?: string;
    "locale"?: string;
    "name"?: string;
    "phone_number"?: {
        "country_code"?: string;
        "local_number"?: string;
    };
}
export interface PartialEditResponsiblePersonResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface ProductAuditingResearchRequest {
    /** returned by the current page, and for the first page, it is an empty string. */
    "page_token"?: string;
    /** max is 20 */
    "page_size": number;
}
export interface ProductAuditingResearchBody {
    "brand_ids"?: Array<string>;
    "category_ids"?: Array<string>;
    "product_ids"?: Array<string>;
    "product_title"?: string;
    "seller_id"?: string;
    "seller_name"?: string;
}
export interface ProductAuditingResearchResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<Record<string, unknown>>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ProductInformationIssueDiagnosisRequest {
    /** The list of product IDs that you want to diagnose. **Note**: - Max number of IDs: 200 - The product must be live (status: ACTIVATE) */
    "product_ids": Array<string>;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ProductInformationIssueDiagnosisResponse {
    "code"?: number;
    "data"?: {
        "products"?: Array<{
            "diagnoses"?: Array<{
                "suggestion"?: Array<{
                    "images"?: Array<Record<string, unknown>>;
                    "seo_words"?: Array<Record<string, unknown>>;
                    "smart_texts"?: Array<Record<string, unknown>>;
                }>;
            }>;
            "listing_quality"?: {
                "current_tier"?: string;
                "remaining_recommendations"?: number;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PublishGlobalProductRequest {
    /** The global product id. (path) */
    "global_product_id": string;
}
export interface PublishGlobalProductBody {
    "publish_target"?: Array<{
        "skus"?: {
            "inventory"?: {
                "quantity"?: number;
                "warehouse_id"?: string;
            };
            "price"?: {
                "amount"?: string;
                "currency"?: string;
                "sale_price"?: string;
            };
        };
    }>;
}
export interface PublishGlobalProductResponse {
    "code"?: number;
    "data"?: {
        "products"?: Array<Record<string, unknown>>;
        "publish_result"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RecommendBrandRequest {
}
export interface RecommendBrandBody {
    "language"?: string;
    "product_title"?: string;
}
export interface RecommendBrandResponse {
    "code"?: number;
    "data"?: {
        "brand"?: {
            "id"?: string;
            "name"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RecommendCategoryRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. Get by API [Get Authorization Shop](https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9?external_id=650 */
    "shop_cipher"?: string;
}
export interface RecommendCategoryBody {
    "category_version"?: string;
    "description"?: string;
    "images"?: Array<Record<string, unknown>>;
    "include_prohibited_categories"?: boolean;
    "listing_platform"?: string;
    "product_title"?: string;
}
export interface RecommendCategoryResponse {
    "code"?: number;
    "data"?: {
        "categories"?: Array<Record<string, unknown>>;
        "leaf_category_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RecommendGlobalCategoriesRequest {
}
export interface RecommendGlobalCategoriesBody {
    "category_version"?: string;
    "description"?: string;
    "images"?: Array<Record<string, unknown>>;
    "product_title"?: string;
}
export interface RecommendGlobalCategoriesResponse {
    "code"?: number;
    "data"?: {
        "categories"?: Array<Record<string, unknown>>;
        "leaf_category_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RecommendSizechartRequest {
}
export interface RecommendSizechartBody {
    "images"?: Array<Record<string, unknown>>;
}
export interface RecommendSizechartResponse {
    "code"?: number;
    "data"?: {
        "images"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RecoverProductsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface RecoverProductsBody {
    "product_ids"?: Array<string>;
}
export interface RecoverProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface ReplicateProductRequest {
    /** The product ID in TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface ReplicateProductBody {
    "replicate_target"?: Array<{
        "skus"?: {
            "price"?: {
                "currency"?: string;
                "sale_price"?: string;
            };
        };
    }>;
}
export interface ReplicateProductResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "region"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCandidateProductsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchCandidateProductsBody {
    "external_product_ids"?: Array<string>;
    "opportunity_matching_statuses"?: Array<string>;
}
export interface SearchCandidateProductsResponse {
    "code"?: number;
    "data"?: {
        "candidate_products"?: Array<{
            "skus"?: {
                "price"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
            };
        }>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCombinedListingRecommendationsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size"?: number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
}
export interface SearchCombinedListingRecommendationsBody {
    "product_ids"?: Array<string>;
}
export interface SearchCombinedListingRecommendationsResponse {
    "code"?: number;
    "data"?: {
        "combined_listing_recommendations"?: Array<Record<string, unknown>>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchGlobalProductsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
}
export interface SearchGlobalProductsBody {
    "create_time_ge"?: number;
    "create_time_le"?: number;
    "seller_skus"?: Array<string>;
    "status"?: string;
    "update_time_ge"?: number;
    "update_time_le"?: number;
}
export interface SearchGlobalProductsResponse {
    "code"?: number;
    "data"?: {
        "global_products"?: Array<Record<string, unknown>>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchManufacturersRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
}
export interface SearchManufacturersBody {
    "keyword"?: string;
    "locales"?: Array<string>;
    "manufacturer_ids"?: Array<string>;
}
export interface SearchManufacturersResponse {
    "code"?: number;
    "data"?: {
        "manufacturers"?: Array<{
            "regional_profiles"?: {
                "phone_number"?: {
                    "availability"?: string;
                    "country_code"?: string;
                    "local_number"?: string;
                };
            };
        }>;
        "next_page_token"?: string;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchOpportunitiesRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchOpportunitiesBody {
    "opportunity_ids"?: Array<string>;
}
export interface SearchOpportunitiesResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "opportunities"?: Array<Record<string, unknown>>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchProductsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface SearchProductsBody {
    "audit_status"?: Array<string>;
    "category_version"?: string;
    "create_time_ge"?: number;
    "create_time_le"?: number;
    "listing_platforms"?: Array<string>;
    "listing_quality_tiers"?: Array<string>;
    "return_draft_version"?: boolean;
    "seller_skus"?: Array<string>;
    "sku_ids"?: Array<string>;
    "sns_filter"?: string;
    "status"?: string;
    "update_time_ge"?: number;
    "update_time_le"?: number;
}
export interface SearchProductsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "audit"?: {
                "pre_approved_reasons"?: Array<string>;
                "status"?: string;
            };
            "skus"?: {
                "list_price"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "pre_sale"?: {
                    "fulfillment_type"?: {
                        "handling_duration_days"?: number;
                        "release_date"?: number;
                    };
                    "type"?: string;
                };
                "price"?: {
                    "currency"?: string;
                    "sale_price"?: string;
                    "tax_exclusive_price"?: string;
                };
                "status_info"?: {
                    "deactivation_source"?: string;
                    "status"?: string;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchResponsiblePersonsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
}
export interface SearchResponsiblePersonsBody {
    "keyword"?: string;
    "locales"?: Array<string>;
    "responsible_person_ids"?: Array<string>;
}
export interface SearchResponsiblePersonsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "responsible_persons"?: Array<{
            "regional_profiles"?: {
                "address"?: {
                    "city"?: string;
                    "country"?: string;
                    "district"?: string;
                    "postal_code"?: string;
                    "province"?: string;
                    "street_address_line1"?: string;
                    "street_address_line2"?: string;
                };
                "phone_number"?: {
                    "country_code"?: string;
                    "local_number"?: string;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchSizeChartsRequest {
    /** The number of results to be returned per page. Valid range: [1-100] */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The BCP-47 locale codes for displaying the size charts. Default: The default locale of your shop. Possible values: - de-DE - en-GB - en-IE - en-US - es-ES - es-MX - fr-FR - id-ID - it-IT - ja-JP - ms-MY - pt-BR - th-TH - vi-VN - zh-CN */
    "locales"?: Array<string>;
}
export interface SearchSizeChartsBody {
    "ids"?: Array<string>;
    "keyword"?: string;
}
export interface SearchSizeChartsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "size_chart"?: Array<Record<string, unknown>>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateGlobalInventoryRequest {
    /** The global product ID to be updated. (path) */
    "global_product_id": string;
}
export interface UpdateGlobalInventoryBody {
    "global_skus"?: Array<Record<string, unknown>>;
}
export interface UpdateGlobalInventoryResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateInventoryRequest {
    /** The product ID generated by TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdateInventoryBody {
    "skus"?: Array<Record<string, unknown>>;
}
export interface UpdateInventoryResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: Array<{
                "extra_errors"?: Array<Record<string, unknown>>;
                "sku_id"?: string;
            }>;
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UpdatePriceRequest {
    /** The product ID generated by TikTok Shop. (path) */
    "product_id": string;
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UpdatePriceBody {
    "skus"?: Array<{
        "list_price"?: {
            "amount"?: string;
            "currency"?: string;
        };
        "price"?: {
            "amount"?: string;
            "currency"?: string;
            "sale_price"?: string;
        };
    }>;
}
export interface UpdatePriceResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UploadCandidateProductsRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UploadCandidateProductsBody {
    "candidate_products"?: Array<{
        "skus"?: {
            "price"?: {
                "amount"?: string;
                "currency"?: string;
            };
        };
    }>;
}
export interface UploadCandidateProductsResponse {
    "code"?: number;
    "data"?: {
        "errors"?: Array<{
            "detail"?: {
                "external_product_id"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UploadExternalProductRequest {
    /** Use this property to pass shop information in requesting the API. Failure in passing the correct value when requesting the API for cross-border shops will return incorrect response. */
    "shop_cipher"?: string;
}
export interface UploadExternalProductBody {
    "external_product"?: {
        "create_time"?: number;
        "description"?: string;
        "external_category_name"?: string;
        "external_product_id"?: string;
        "external_shop_id"?: string;
        "first_image"?: {
            "url"?: string;
        };
        "images"?: Array<Record<string, unknown>>;
        "publish_time"?: number;
        "region"?: string;
        "skus"?: Array<{
            "image"?: {
                "url"?: string;
            };
            "weight"?: {
                "unit"?: string;
                "value"?: string;
            };
        }>;
        "status"?: string;
        "title"?: string;
        "update_time"?: number;
        "vendor_name"?: string;
    };
}
export interface UploadExternalProductResponse {
    "code"?: number;
    "data"?: Record<string, unknown>;
    "message"?: string;
    "request_id"?: string;
}
export interface UploadProductFileRequest {
}
export interface UploadProductFileResponse {
    "code"?: number;
    "data"?: {
        "format"?: string;
        "id"?: string;
        "name"?: string;
        "url"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UploadProductImageRequest {
}
export interface UploadProductImageResponse {
    "code"?: number;
    "data"?: {
        "height"?: number;
        "uri"?: string;
        "url"?: string;
        "use_case"?: string;
        "width"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokProductApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * ActivateProduct
     * /product/202309/products/activate (POST)
     */
    activateProduct(params: ActivateProductRequest, body?: ActivateProductBody, opts?: TikTokRequestOptions): Promise<ActivateProductResponse>;
    /**
     * ApplyOpportunities
     * /product/202409/products/{product_id}/opportunities (PUT)
     */
    applyOpportunities(params: ApplyOpportunitiesRequest, body?: ApplyOpportunitiesBody, opts?: TikTokRequestOptions): Promise<ApplyOpportunitiesResponse>;
    /**
     * BindLocalProducts
     * /product/202503/global_products/{global_product_id}/bind_local_products (POST)
     */
    bindLocalProducts(params: BindLocalProductsRequest, body?: BindLocalProductsBody, opts?: TikTokRequestOptions): Promise<BindLocalProductsResponse>;
    /**
     * CheckGlobalProductListing
     * /product/202404/global_products/listing_check (POST)
     */
    checkGlobalProductListing(params: CheckGlobalProductListingRequest, body?: CheckGlobalProductListingBody, opts?: TikTokRequestOptions): Promise<CheckGlobalProductListingResponse>;
    /**
     * CheckListingPrerequisites
     * /product/202312/prerequisites (GET)
     */
    checkListingPrerequisites(params: CheckListingPrerequisitesRequest, opts?: TikTokRequestOptions): Promise<CheckListingPrerequisitesResponse>;
    /**
     * CheckProductListing
     * /product/202309/products/listing_check (POST)
     */
    checkProductListing(params: CheckProductListingRequest, body?: CheckProductListingBody, opts?: TikTokRequestOptions): Promise<CheckProductListingResponse>;
    /**
     * CreateAttributeRecommendationRequest
     * /product/202501/attribute_recommendation_request (POST)
     */
    createAttributeRecommendationRequest(params: CreateAttributeRecommendationRequest, body?: CreateAttributeRecommendationRequestBody, opts?: TikTokRequestOptions): Promise<CreateAttributeRecommendationRequestResponse>;
    /**
     * CreateCategoryUpgradeTask
     * /product/202407/products/category_upgrade_task (POST)
     */
    createCategoryUpgradeTask(params: CreateCategoryUpgradeTaskRequest, opts?: TikTokRequestOptions): Promise<CreateCategoryUpgradeTaskResponse>;
    /**
     * CreateCustomBrands
     * /product/202309/brands (POST)
     */
    createCustomBrands(params: CreateCustomBrandsRequest, body?: CreateCustomBrandsBody, opts?: TikTokRequestOptions): Promise<CreateCustomBrandsResponse>;
    /**
     * CreateGlobalProduct
     * /product/202309/global_products (POST)
     */
    createGlobalProduct(params: CreateGlobalProductRequest, body?: CreateGlobalProductBody, opts?: TikTokRequestOptions): Promise<CreateGlobalProductResponse>;
    /**
     * CreateImageTranslationTasks
     * /product/202505/images/translation_tasks (POST)
     */
    createImageTranslationTasks(params: CreateImageTranslationTasksRequest, body?: CreateImageTranslationTasksBody, opts?: TikTokRequestOptions): Promise<CreateImageTranslationTasksResponse>;
    /**
     * CreateManufacturer
     * /product/202409/compliance/manufacturers (POST)
     */
    createManufacturer(params: CreateManufacturerRequest, body?: CreateManufacturerBody, opts?: TikTokRequestOptions): Promise<CreateManufacturerResponse>;
    /**
     * CreateProduct
     * /product/202309/products (POST)
     */
    createProduct(params: CreateProductRequest, body?: CreateProductBody, opts?: TikTokRequestOptions): Promise<CreateProductResponse>;
    /**
     * CreateResponsiblePerson
     * /product/202409/compliance/responsible_persons (POST)
     */
    createResponsiblePerson(params: CreateResponsiblePersonRequest, body?: CreateResponsiblePersonBody, opts?: TikTokRequestOptions): Promise<CreateResponsiblePersonResponse>;
    /**
     * DeactivateProducts
     * /product/202309/products/deactivate (POST)
     */
    deactivateProducts(params: DeactivateProductsRequest, body?: DeactivateProductsBody, opts?: TikTokRequestOptions): Promise<DeactivateProductsResponse>;
    /**
     * DeleteGlobalProducts
     * /product/202309/global_products (DELETE)
     */
    deleteGlobalProducts(params: DeleteGlobalProductsRequest, body?: DeleteGlobalProductsBody, opts?: TikTokRequestOptions): Promise<DeleteGlobalProductsResponse>;
    /**
     * DeleteProducts
     * /product/202309/products (DELETE)
     */
    deleteProducts(params: DeleteProductsRequest, body?: DeleteProductsBody, opts?: TikTokRequestOptions): Promise<DeleteProductsResponse>;
    /**
     * DiagnoseandOptimizeProduct
     * /product/202411/products/diagnose_optimize (POST)
     */
    diagnoseandOptimizeProduct(params: DiagnoseandOptimizeProductRequest, body?: DiagnoseandOptimizeProductBody, opts?: TikTokRequestOptions): Promise<DiagnoseandOptimizeProductResponse>;
    /**
     * EditGlobalProduct
     * /product/202309/global_products/{global_product_id} (PUT)
     */
    editGlobalProduct(params: EditGlobalProductRequest, body?: EditGlobalProductBody, opts?: TikTokRequestOptions): Promise<EditGlobalProductResponse>;
    /**
     * EditProduct
     * /product/202509/products/{product_id} (PUT)
     */
    editProduct(params: EditProductRequest, body?: EditProductBody, opts?: TikTokRequestOptions): Promise<EditProductResponse>;
    /**
     * EnableStrikethroughPrices
     * /product/202502/products/{product_id}/strikethrough_prices/enable (POST)
     */
    enableStrikethroughPrices(params: EnableStrikethroughPricesRequest, body?: EnableStrikethroughPricesBody, opts?: TikTokRequestOptions): Promise<EnableStrikethroughPricesResponse>;
    /**
     * GetAttributes
     * /product/202309/categories/{category_id}/attributes (GET)
     */
    getAttributes(params: GetAttributesRequest, opts?: TikTokRequestOptions): Promise<GetAttributesResponse>;
    /**
     * GetBrands
     * /product/202309/brands (GET)
     */
    getBrands(params: GetBrandsRequest, opts?: TikTokRequestOptions): Promise<GetBrandsResponse>;
    /**
     * GetCategories
     * /product/202309/categories (GET)
     */
    getCategories(params: GetCategoriesRequest, opts?: TikTokRequestOptions): Promise<GetCategoriesResponse>;
    /**
     * GetCategoryRules
     * /product/202309/categories/{category_id}/rules (GET)
     */
    getCategoryRules(params: GetCategoryRulesRequest, opts?: TikTokRequestOptions): Promise<GetCategoryRulesResponse>;
    /**
     * GetGlobalAttributes
     * /product/202309/categories/{category_id}/global_attributes (GET)
     */
    getGlobalAttributes(params: GetGlobalAttributesRequest, opts?: TikTokRequestOptions): Promise<GetGlobalAttributesResponse>;
    /**
     * GetGlobalCategories
     * /product/202309/global_categories (GET)
     */
    getGlobalCategories(params: GetGlobalCategoriesRequest, opts?: TikTokRequestOptions): Promise<GetGlobalCategoriesResponse>;
    /**
     * GetGlobalCategoryRules
     * /product/202309/categories/{category_id}/global_rules (GET)
     */
    getGlobalCategoryRules(params: GetGlobalCategoryRulesRequest, opts?: TikTokRequestOptions): Promise<GetGlobalCategoryRulesResponse>;
    /**
     * GetGlobalListingRules
     * /product/202507/global_listing_rules (GET)
     */
    getGlobalListingRules(params: GetGlobalListingRulesRequest, opts?: TikTokRequestOptions): Promise<GetGlobalListingRulesResponse>;
    /**
     * GetGlobalProduct
     * /product/202309/global_products/{global_product_id} (GET)
     */
    getGlobalProduct(params: GetGlobalProductRequest, opts?: TikTokRequestOptions): Promise<GetGlobalProductResponse>;
    /**
     * GetGlobalReplicatedProducts
     * /product/202507/products/{product_id}/replicated_products (GET)
     */
    getGlobalReplicatedProducts(params: GetGlobalReplicatedProductsRequest, opts?: TikTokRequestOptions): Promise<GetGlobalReplicatedProductsResponse>;
    /**
     * GetImageTranslationTasks
     * /product/202506/images/translation_tasks (GET)
     */
    getImageTranslationTasks(params: GetImageTranslationTasksRequest, opts?: TikTokRequestOptions): Promise<GetImageTranslationTasksResponse>;
    /**
     * GetProduct
     * /product/202309/products/{product_id} (GET)
     */
    getProduct(params: GetProductRequest, opts?: TikTokRequestOptions): Promise<GetProductResponse>;
    /**
     * GetProductsSEOWords
     * /product/202405/products/seo_words (GET)
     */
    getProductsSEOWords(params: GetProductsSEOWordsRequest, opts?: TikTokRequestOptions): Promise<GetProductsSEOWordsResponse>;
    /**
     * GetRecommendedProductTitleAndDescription
     * /product/202405/products/suggestions (GET)
     */
    getRecommendedProductTitleAndDescription(params: GetRecommendedProductTitleAndDescriptionRequest, opts?: TikTokRequestOptions): Promise<GetRecommendedProductTitleAndDescriptionResponse>;
    /**
     * ImportExternalProductInfo
     * /product/202508/import_external (POST)
     */
    importExternalProductInfo(params: ImportExternalProductInfoRequest, opts?: TikTokRequestOptions): Promise<ImportExternalProductInfoResponse>;
    /**
     * InventorySearch
     * /product/202309/inventory/search (POST)
     */
    inventorySearch(params: InventorySearchRequest, body?: InventorySearchBody, opts?: TikTokRequestOptions): Promise<InventorySearchResponse>;
    /**
     * ListingSchemas
     * /product/202407/listing_schemas (GET)
     */
    listingSchemas(params: ListingSchemasRequest, opts?: TikTokRequestOptions): Promise<ListingSchemasResponse>;
    /**
     * OptimizedImages
     * /product/202404/images/optimize (POST)
     */
    optimizedImages(params: OptimizedImagesRequest, body?: OptimizedImagesBody, opts?: TikTokRequestOptions): Promise<OptimizedImagesResponse>;
    /**
     * PartialEditCandidateProducts
     * /product/202409/candidate_products/partial_edit/batch (POST)
     */
    partialEditCandidateProducts(params: PartialEditCandidateProductsRequest, body?: PartialEditCandidateProductsBody, opts?: TikTokRequestOptions): Promise<PartialEditCandidateProductsResponse>;
    /**
     * PartialEditGlobalProduct
     * /product/202509/global_products/{global_product_id}/partial_edit (PUT)
     */
    partialEditGlobalProduct(params: PartialEditGlobalProductRequest, body?: PartialEditGlobalProductBody, opts?: TikTokRequestOptions): Promise<PartialEditGlobalProductResponse>;
    /**
     * PartialEditManufacturer
     * /product/202409/compliance/manufacturers/{manufacturer_id}/partial_edit (POST)
     */
    partialEditManufacturer(params: PartialEditManufacturerRequest, body?: PartialEditManufacturerBody, opts?: TikTokRequestOptions): Promise<PartialEditManufacturerResponse>;
    /**
     * PartialEditProduct
     * /product/202509/products/{product_id}/partial_edit (POST)
     */
    partialEditProduct(params: PartialEditProductRequest, body?: PartialEditProductBody, opts?: TikTokRequestOptions): Promise<PartialEditProductResponse>;
    /**
     * PartialEditResponsiblePerson
     * /product/202409/compliance/responsible_persons/{responsible_person_id}/partial_edit (POST)
     */
    partialEditResponsiblePerson(params: PartialEditResponsiblePersonRequest, body?: PartialEditResponsiblePersonBody, opts?: TikTokRequestOptions): Promise<PartialEditResponsiblePersonResponse>;
    /**
     * ProductAuditingResearch
     * /product/202601/compliance/auditing/research (POST)
     */
    productAuditingResearch(params: ProductAuditingResearchRequest, body?: ProductAuditingResearchBody, opts?: TikTokRequestOptions): Promise<ProductAuditingResearchResponse>;
    /**
     * ProductInformationIssueDiagnosis
     * /product/202405/products/diagnoses (GET)
     */
    productInformationIssueDiagnosis(params: ProductInformationIssueDiagnosisRequest, opts?: TikTokRequestOptions): Promise<ProductInformationIssueDiagnosisResponse>;
    /**
     * PublishGlobalProduct
     * /product/202309/global_products/{global_product_id}/publish (POST)
     */
    publishGlobalProduct(params: PublishGlobalProductRequest, body?: PublishGlobalProductBody, opts?: TikTokRequestOptions): Promise<PublishGlobalProductResponse>;
    /**
     * RecommendBrand
     * /product/202309/brands/recommend (POST)
     */
    recommendBrand(params: RecommendBrandRequest, body?: RecommendBrandBody, opts?: TikTokRequestOptions): Promise<RecommendBrandResponse>;
    /**
     * RecommendCategory
     * /product/202309/categories/recommend (POST)
     */
    recommendCategory(params: RecommendCategoryRequest, body?: RecommendCategoryBody, opts?: TikTokRequestOptions): Promise<RecommendCategoryResponse>;
    /**
     * RecommendGlobalCategories
     * /product/202309/global_categories/recommend (POST)
     */
    recommendGlobalCategories(params: RecommendGlobalCategoriesRequest, body?: RecommendGlobalCategoriesBody, opts?: TikTokRequestOptions): Promise<RecommendGlobalCategoriesResponse>;
    /**
     * RecommendSizechart
     * /product/202309/images/size_charts/identify (POST)
     */
    recommendSizechart(params: RecommendSizechartRequest, body?: RecommendSizechartBody, opts?: TikTokRequestOptions): Promise<RecommendSizechartResponse>;
    /**
     * RecoverProducts
     * /product/202309/products/recover (POST)
     */
    recoverProducts(params: RecoverProductsRequest, body?: RecoverProductsBody, opts?: TikTokRequestOptions): Promise<RecoverProductsResponse>;
    /**
     * ReplicateProduct
     * /product/202507/products/{product_id}/global_replicate (POST)
     */
    replicateProduct(params: ReplicateProductRequest, body?: ReplicateProductBody, opts?: TikTokRequestOptions): Promise<ReplicateProductResponse>;
    /**
     * SearchCandidateProducts
     * /product/202409/candidate_products/search (POST)
     */
    searchCandidateProducts(params: SearchCandidateProductsRequest, body?: SearchCandidateProductsBody, opts?: TikTokRequestOptions): Promise<SearchCandidateProductsResponse>;
    /**
     * SearchCombinedListingRecommendations
     * /product/202506/combined_listing_recommendations/search (POST)
     */
    searchCombinedListingRecommendations(params: SearchCombinedListingRecommendationsRequest, body?: SearchCombinedListingRecommendationsBody, opts?: TikTokRequestOptions): Promise<SearchCombinedListingRecommendationsResponse>;
    /**
     * SearchGlobalProducts
     * /product/202312/global_products/search (POST)
     */
    searchGlobalProducts(params: SearchGlobalProductsRequest, body?: SearchGlobalProductsBody, opts?: TikTokRequestOptions): Promise<SearchGlobalProductsResponse>;
    /**
     * SearchManufacturers
     * /product/202501/compliance/manufacturers/search (POST)
     */
    searchManufacturers(params: SearchManufacturersRequest, body?: SearchManufacturersBody, opts?: TikTokRequestOptions): Promise<SearchManufacturersResponse>;
    /**
     * SearchOpportunities
     * /product/202409/opportunities/search (POST)
     */
    searchOpportunities(params: SearchOpportunitiesRequest, body?: SearchOpportunitiesBody, opts?: TikTokRequestOptions): Promise<SearchOpportunitiesResponse>;
    /**
     * SearchProducts
     * /product/202502/products/search (POST)
     */
    searchProducts(params: SearchProductsRequest, body?: SearchProductsBody, opts?: TikTokRequestOptions): Promise<SearchProductsResponse>;
    /**
     * SearchResponsiblePersons
     * /product/202501/compliance/responsible_persons/search (POST)
     */
    searchResponsiblePersons(params: SearchResponsiblePersonsRequest, body?: SearchResponsiblePersonsBody, opts?: TikTokRequestOptions): Promise<SearchResponsiblePersonsResponse>;
    /**
     * SearchSizeCharts
     * /product/202407/sizecharts/search (POST)
     */
    searchSizeCharts(params: SearchSizeChartsRequest, body?: SearchSizeChartsBody, opts?: TikTokRequestOptions): Promise<SearchSizeChartsResponse>;
    /**
     * UpdateGlobalInventory
     * /product/202309/global_products/{global_product_id}/inventory/update (POST)
     */
    updateGlobalInventory(params: UpdateGlobalInventoryRequest, body?: UpdateGlobalInventoryBody, opts?: TikTokRequestOptions): Promise<UpdateGlobalInventoryResponse>;
    /**
     * UpdateInventory
     * /product/202309/products/{product_id}/inventory/update (POST)
     */
    updateInventory(params: UpdateInventoryRequest, body?: UpdateInventoryBody, opts?: TikTokRequestOptions): Promise<UpdateInventoryResponse>;
    /**
     * UpdatePrice
     * /product/202309/products/{product_id}/prices/update (POST)
     */
    updatePrice(params: UpdatePriceRequest, body?: UpdatePriceBody, opts?: TikTokRequestOptions): Promise<UpdatePriceResponse>;
    /**
     * UploadCandidateProducts
     * /product/202409/candidate_products/batch (POST)
     */
    uploadCandidateProducts(params: UploadCandidateProductsRequest, body?: UploadCandidateProductsBody, opts?: TikTokRequestOptions): Promise<UploadCandidateProductsResponse>;
    /**
     * UploadExternalProduct
     * /product/202506/external_products (POST)
     */
    uploadExternalProduct(params: UploadExternalProductRequest, body?: UploadExternalProductBody, opts?: TikTokRequestOptions): Promise<UploadExternalProductResponse>;
    /**
     * UploadProductFile
     * /product/202309/files/upload (POST)
     */
    uploadProductFile(params: UploadProductFileRequest, opts?: TikTokRequestOptions): Promise<UploadProductFileResponse>;
    /**
     * UploadProductImage
     * /product/202309/images/upload (POST)
     */
    uploadProductImage(params: UploadProductImageRequest, opts?: TikTokRequestOptions): Promise<UploadProductImageResponse>;
}
