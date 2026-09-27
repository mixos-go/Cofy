import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddGlobalItemRequest {
    "attribute_list"?: {
        "attribute_id"?: number;
        "attribute_value_list": {
            "original_value_name"?: string;
            "value_id"?: number;
            "value_unit"?: string;
        };
    };
    "brand"?: {
        "brand_id"?: number;
        "original_brand_name"?: string;
    };
    "category_id": number;
    "condition": string;
    "description": string;
    "description_info"?: {
        "extended_description": {
            "field_list": {
                "field_type"?: string;
                "image_info": {
                    "image_id"?: string;
                };
                "text"?: string;
            };
        };
    };
    "description_type"?: string;
    "dimension"?: {
        "package_height"?: number;
        "package_length"?: number;
        "package_width"?: number;
    };
    "global_item_name": string;
    "global_item_sku"?: string;
    "image"?: {
        "image_id_list"?: string;
    };
    "normal_stock"?: number;
    "original_price": number;
    "pre_order"?: {
        "days_to_ship"?: number;
    };
    "video_upload_id"?: string;
    "weight": number;
    "seller_stock"?: Array<{
        "location_id"?: string;
        "stock"?: number;
    }>;
}
export interface AddGlobalItemResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Warning message. Example: Warning message. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** Id of added global item. Example: Id of added global item. */
    "global_item_id"?: number;
}
export interface AddGlobalModelRequest {
    "global_item_id": number;
    "global_model": Array<{
        "global_model_sku"?: string;
        "tier_index"?: Array<number>;
        "seller_stock"?: Array<{
            "location_id"?: string;
            "stock"?: number;
        }>;
        "original_price"?: number;
    }>;
}
export interface AddGlobalModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface CategoryRecommendRequest {
    /** name of item Example: Head */
    "global_item_name": string;
    /** Please use the image id returned by v2.media_space.upload_image api, we will ignore if this field is empty string Example: 16bdad2c365f1fccea7664e69b696571 */
    "global_product_cover_image"?: string;
}
export interface CategoryRecommendResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "category_id"?: Array<number>;
    };
}
export interface CreatePublishTaskRequest {
    "global_item_id": number;
    "shop_id": number;
    "shop_region": string;
    "item"?: {
        "item_name"?: string;
        "description"?: string;
        "item_status"?: string;
        "original_price"?: number;
        "image": {
            "image_id_list"?: Array<string>;
        };
        "category_id"?: number;
        "standardise_tier_variation"?: Array<{
            "variation_id"?: number;
            "variation_name"?: string;
            "variation_option_list"?: Array<{
                "image_id"?: string;
                "image_url"?: string;
                "variation_option_id"?: number;
                "variation_option_name"?: string;
            }>;
        }>;
        "model"?: Array<{
            "tier_index"?: Array<number>;
            "original_price"?: number;
        }>;
        "size_chart"?: string;
        "logistic"?: Array<{
            "logistic_id"?: number;
            "enabled"?: boolean;
            "shipping_fee"?: number;
            "size_id"?: number;
            "is_free"?: boolean;
        }>;
        "pre_order": {
            "is_pre_order"?: boolean;
            "days_to_ship"?: number;
        };
        "description_info": {
            "extended_description": {
                "field_list"?: Array<{
                    "field_type"?: string;
                    "text"?: string;
                }>;
            };
        };
    };
}
export interface CreatePublishTaskResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "publish_task_id"?: number;
    };
}
export interface DeleteGlobalItemRequest {
    "global_item_id": number;
}
export interface DeleteGlobalItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "failure_delete_item"?: Array<{
            "shop_id"?: number;
            "item_id"?: number;
        }>;
    };
}
export interface DeleteGlobalModelRequest {
    "global_item_id": number;
    "global_model_id": number;
}
export interface DeleteGlobalModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "global_model_id"?: number;
        "failures"?: unknown[];
    };
}
export interface GetAttributeTreeRequest {
    /** Max count is 20 */
    "category_id_list": Array<number>;
    /** Language Support Lanuage: "SG": [ "en", "zh-Hans", "ms" ], "MY": [ "en", "zh-Hans", "ms" ], "PH": [ "en", "zh-Hans" ], "VN": [ "vn", "en" ], "ID": [ "id", "en" ], "TH": [ "th", "en" ], "BR": [ "pt-BR", "en" ], "MX": [ "es-MX", "en" ], "CO": [ "es-CO", "en" ], "CL": [ "es-CL", "en" ], "TW": [ "zh-Hant", "zh-Hans", "en" ], "IN": [ "en", "hi" ] Example: "en" */
    "language"?: string;
}
export interface GetAttributeTreeResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "attribute_tree"?: Array<{
                "attribute_id"?: number;
                "mandatory"?: boolean;
                "name"?: string;
                "attribute_value_list"?: Array<{
                    "value_id"?: number;
                    "name"?: string;
                    "value_unit"?: string;
                    "child_attribute_list"?: Array<Record<string, unknown>>;
                    "multi_lang": {
                        "language"?: string;
                        "value"?: string;
                    };
                }>;
                "attribute_info": {
                    "input_type"?: number;
                    "input_validation_type"?: number;
                    "format_type"?: number;
                    "date_format_type"?: number;
                    "attribute_unit_list"?: Array<string>;
                    "mandatory_region"?: Array<string>;
                    "max_value_count"?: number;
                };
                "multi_lang"?: Array<{
                    "language"?: string;
                    "value"?: string;
                }>;
            }>;
            "category_id"?: number;
        }>;
    };
}
export interface GetBrandListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0. if data is more than one page, the offset can be some entry to start next call. Example: 1 */
    "offset": number;
    /** the size of one page. Example: 10 */
    "page_size": number;
    /** ID of category. Example: 12345 */
    "category_id": number;
    /** Brand status , 1: normal brand, 2: pending brand. Example: 1 */
    "status": number;
}
export interface GetBrandListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "brand_list"?: Array<{
            "brand_id"?: number;
            "original_brand_name"?: string;
            "display_brand_name"?: string;
        }>;
        "has_next_page"?: boolean;
        "next_offset"?: number;
        "is_mandatory"?: boolean;
        "input_type"?: string;
    };
}
export interface GetCategoryRequest {
    /** Display language. Language should be one of "zh-hans", "en" Example: zh-hans */
    "language"?: string;
}
export interface GetCategoryResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "category_list"?: Array<{
            "category_id"?: number;
            "parent_category_id"?: number;
            "original_category_name"?: string;
            "display_category_name"?: string;
            "has_children"?: boolean;
        }>;
    };
}
export interface GetGlobalItemIdRequest {
    /** Id of shop. Example: 1889756 */
    "shop_id": number;
    /** Item id list. Length limit is [1,20]. Example: [1003698] */
    "item_id_list": Array<number>;
}
export interface GetGlobalItemIdResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_id_map"?: Array<{
            "item_id"?: number;
            "global_item_id"?: number;
        }>;
    };
}
export interface GetGlobalItemInfoRequest {
    /** Global item id list. Length limit is [1,20]. */
    "global_item_id_list": number;
}
export interface GetGlobalItemInfoResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "global_item_list"?: Array<{
            "global_item_id"?: number;
            "global_item_name"?: string;
            "description"?: string;
            "global_item_sku"?: string;
            "global_item_status"?: number;
            "create_time"?: number;
            "update_time"?: number;
            "image": {
                "image_id_list"?: Array<string>;
                "image_url_list"?: Array<string>;
            };
            "weight"?: number;
            "dimension": {
                "package_length"?: number;
                "package_width"?: number;
                "package_height"?: number;
            };
            "pre_order": {
                "days_to_ship"?: number;
            };
            "size_chart"?: string;
            "condition"?: string;
            "has_model"?: boolean;
        }>;
    };
}
export interface GetGlobalItemLimitRequest {
    "category_id"?: number;
}
export interface GetGlobalItemLimitResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Warning massage. Example: Warning massage. */
    "warning"?: string;
    /** The identifier of the API request for error tracking. Example: The identifier of the API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    "price_limit"?: Record<string, unknown>;
    /** Global item price min limit. Example: Global item price min limit. */
    "min_limit"?: number;
    /** Global item price max limit. Example: Global item price max limit. */
    "max_limit"?: number;
    "stock_limit"?: Record<string, unknown>;
    "global_item_name_length_limit"?: Record<string, unknown>;
    "global_item_image_count_limit"?: Record<string, unknown>;
    "global_item_description_length_limit"?: Record<string, unknown>;
    "tier_variation_name_length_limit"?: Record<string, unknown>;
    "tier_variation_option_length_limit"?: Record<string, unknown>;
    /** Length ratio of Chinese characters to English characters in parameter verification. len(text)=len(Chinese characters)*text_length_multiplier+len(English characters ) Example: Length ratio of Chinese characters to English characters in parameter verification. len(text)=len(Chinese characters)*text_length_multiplier+len(English characters ) */
    "text_length_multiplier"?: number;
    "extended_description_limit"?: Record<string, unknown>;
    /** length min limit for item extended description text part Example: length min limit for item extended description text part */
    "description_text_length_min"?: number;
    /** length max limit for item extended description text part Example: length max limit for item extended description text part */
    "description_text_length_max"?: number;
    /** length min limit for item extended description image num Example: length min limit for item extended description image num */
    "description_image_num_min"?: number;
    /** length max limit for item extended description image num Example: length max limit for item extended description image num */
    "description_image_num_max"?: number;
    /** length min limit for item extended description image width Example: length min limit for item extended description image width */
    "description_image_width_min"?: number;
    /** length min limit for item extended description image hight Example: length min limit for item extended description image hight */
    "description_image_height_min"?: number;
    /** length min limit for item extended description image aspect (image width / image hight ) Example: length min limit for item extended description image aspect (image width / image hight ) */
    "description_image_aspect_ratio_min"?: number;
    /** length max limit for item extended description image aspect (image width / image hight ) Example: length max limit for item extended description image aspect (image width / image hight ) */
    "description_image_aspect_ratio_max"?: number;
    "dts_limit"?: Record<string, unknown>;
    /** Allowed limit scope for Pre order Example: Allowed limit scope for Pre order */
    "days_to_ship_range_list"?: Array<Record<string, unknown>>;
    "weight_limit"?: Record<string, unknown>;
    /** weight is mandatory or not Example: weight is mandatory or not */
    "weight_mandatory"?: boolean;
    "dimension_limit"?: Record<string, unknown>;
    /** dimension is mandatory or not for the category Example: dimension is mandatory or not for the category */
    "dimension_mandatory"?: boolean;
    "size_chart_limit"?: Record<string, unknown>;
    "size_chart_mandatory"?: boolean;
    "support_image_size_chart"?: boolean;
    "support_template_size_chart"?: boolean;
}
export interface GetGlobalItemListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is null. if data is more than one page, the offset can be some entry to start next call. Example: AAAAFA== */
    "offset"?: string;
    /** The size of one page. Limit is [1,50]. Example: 10 */
    "page_size": number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the item update time). The update_time_from field is the starting date range. Example: 1611311600 */
    "update_time_from"?: number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the item update time). The update_time_to field is the ending date range Example: 1611311631 */
    "update_time_to"?: number;
}
export interface GetGlobalItemListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "global_item_list"?: Array<{
            "global_item_id"?: number;
            "update_time"?: number;
        }>;
        "total_count"?: number;
        "has_next_page"?: boolean;
        "offset"?: string;
    };
}
export interface GetGlobalModelListRequest {
    /** The id of global item. Example: 28001461 */
    "global_item_id": number;
}
export interface GetGlobalModelListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "tier_variation"?: Array<{
            "name"?: string;
            "option_list"?: Array<{
                "option"?: string;
                "image": {
                    "image_url"?: string;
                    "image_id"?: string;
                };
            }>;
        }>;
        "global_model"?: Array<{
            "global_model_id"?: number;
            "global_model_sku"?: string;
            "price_info": {
                "original_price"?: number;
            };
            "stock_info"?: Array<{
                "stock_type"?: number;
                "stock_location_id"?: number;
                "current_stock"?: number;
                "normal_stock"?: number;
                "reserved_stock"?: number;
            }>;
            "tier_index"?: Array<number>;
        }>;
    };
}
export interface GetLocalAdjustmentRateRequest {
    /** The unique identifier of the shop whose adjustment rate is being queried */
    "shop_id": number;
}
export interface GetLocalAdjustmentRateResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate waring details if hit waring. Empty if no waring happened. Example: Indicate waring details if hit waring. Empty if no waring happened. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** The multiplier used to adjust the cross-border original price to local price Example: The multiplier used to adjust the cross-border original price to local price */
    "local_adjustment_rate"?: number;
}
export interface GetPublishTaskResultRequest {
    /** Id of publish task. Example: 202011300000012008 */
    "publish_task_id": number;
}
export interface GetPublishTaskResultResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Warning message. Example: Warning message. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** Status of publish task. Example: Status of publish task. */
    "publish_status"?: string;
    /** If publish task is successful, this field shows the published results. Example: If publish task is successful, this field shows the published results. */
    "success"?: Record<string, unknown>;
    /** The region of published item. Example: The region of published item. */
    "region"?: string;
    /** The shop id of published item. Example: The shop id of published item. */
    "shop_id"?: string;
    /** The id of published item. Example: The id of published item. */
    "item_id"?: string;
    /** If publish task is failed, this field shows the failed reason. Example: If publish task is failed, this field shows the failed reason. */
    "failed"?: Record<string, unknown>;
    /** Failed reason. Example: Failed reason. */
    "failed_reason"?: string;
}
export interface GetPublishableShopRequest {
    /** Id of global item. Example: 3000141126 */
    "global_item_id": number;
    /** Shop id list for checking if the shop is publishable.If not input the list, will return the first 300 publishable shop list in response Example: [3000141126, 3000141127] */
    "shop_id_list"?: Array<number>;
}
export interface GetPublishableShopResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "publishable_shop"?: Array<{
            "shop_id"?: number;
            "shop_region"?: string;
        }>;
    };
}
export interface GetPublishedListRequest {
    /** Id of global item. Example: 3000141126 */
    "global_item_id": number;
    /** Shop id list for checking if the shop is publishable.If not input the list, will return the first 300 publishable shop list in response after the migration period. Example: [220750716,220056389] */
    "shop_id_list"?: Array<number>;
}
export interface GetPublishedListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "published_item"?: Array<{
            "shop_id"?: number;
            "shop_region"?: string;
            "item_id"?: number;
            "item_status"?: number;
        }>;
    };
}
export interface GetRecommendAttributeRequest {
    /** Name of item. Example: iphone6s */
    "global_item_name": string;
    /** ID of category. Example: 1065001 */
    "category_id": number;
    /** ID of image. Example: 30aa47695d1afb99e296956699f67be6 */
    "cover_image_id"?: string;
}
export interface GetRecommendAttributeResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "attribute_list"?: Array<{
            "attribute_id"?: number;
            "attribute_value_list"?: Array<{
                "value_id"?: number;
            }>;
        }>;
    };
}
export interface GetShopPublishableStatusRequest {
    /** Id of global item. Example: 3000141126 */
    "global_item_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0. if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** the size of one page.Max=100 Example: 10 */
    "page_size": number;
}
export interface GetShopPublishableStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "has_next_page"?: boolean;
        "next_offset"?: number;
        "shop_publishable_status_list"?: Array<{
            "region"?: string;
            "shop_id"?: number;
            "shop_publishable_status"?: boolean;
            "unpublishable_reason"?: string;
        }>;
    };
    "warning"?: string;
}
export interface GetSizeChartDetailRequest {
    /** Example: 700024639 */
    "size_chart_id": number;
    /** language should be in the list: ["en", "zh-Hans"] Example: "en" */
    "language"?: string;
}
export interface GetSizeChartDetailResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "size_chart_id"?: number;
        "size_chart_name"?: string;
        "size_chart_table": {
            "column_list"?: Array<{
                "measurement": {
                    "display_name"?: string;
                    "input_type"?: string;
                    "unit"?: string;
                };
                "measurement_value_list"?: Array<{
                    "max_value"?: null;
                    "min_value"?: null;
                    "option"?: null;
                    "value"?: number;
                }>;
            }>;
        };
    };
    "warning"?: string;
}
export interface GetSizeChartListRequest {
    /** Example: 100087 */
    "category_id": number;
    /** Example: 10 */
    "page_size": number;
    /** Example: "" */
    "cursor": string;
}
export interface GetSizeChartListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "next_offset"?: string;
        "size_chart_list"?: Array<{
            "size_chart_id"?: number;
        }>;
        "total_count"?: number;
    };
    "warning"?: string;
}
export interface GetVariationsRequest {
    /** Leaf category id */
    "category_id": number;
}
export interface GetVariationsResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "data"?: {
        "standardise_variation_list"?: Array<{
            "variation_id"?: number;
            "variation_name"?: string;
            "variation_group_list"?: Array<{
                "variation_group_id"?: number;
                "variation_group_name"?: string;
                "variation_option_list"?: Array<{
                    "variation_option_id"?: number;
                    "variation_option_name"?: string;
                }>;
            }>;
        }>;
    };
}
export interface InitTierVariationRequest {
    "global_model": Array<{
        "original_price"?: number;
        "seller_stock"?: Array<{
            "location_id"?: string;
            "stock"?: number;
        }>;
        "global_model_sku"?: string;
        "tier_index"?: Array<number>;
        "weight"?: number;
        "dimension": {
            "package_height"?: number;
            "package_length"?: number;
            "package_width"?: number;
        };
        "pre_order": {
            "days_to_ship"?: number;
        };
    }>;
    "global_item_id": number;
    "standardise_tier_variation"?: Array<{
        "variation_id"?: number;
        "variation_name"?: string;
        "variation_group_id"?: number;
        "variation_option_list"?: Array<{
            "variation_option_id"?: number;
            "variation_option_name"?: string;
            "image_id"?: string;
        }>;
    }>;
}
export interface InitTierVariationResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface SearchGlobalAttributeValueListRequest {
    "attribute_id": number;
    "value_name"?: string;
    "cursor": number;
    /** The range is 1 to 100 Example: 100 */
    "limit": number;
}
export interface SearchGlobalAttributeValueListResponse {
    "error"?: string;
    "msg"?: string;
    "warning"?: string;
    "request_id"?: string;
    "debug_message"?: string;
    "response"?: Record<string, unknown>;
    "value_list"?: Array<Record<string, unknown>>;
    "value_id"?: number;
    "value_name"?: string;
    "page_info"?: Record<string, unknown>;
    "cursor"?: number;
    "has_next"?: boolean;
}
export interface SetSyncFieldRequest {
    "shop_sync_list": Array<{
        "shop_id"?: number;
        "shop_region"?: string;
        "name_and_description"?: boolean;
        "media_information"?: boolean;
        "tier_variation_name_and_option"?: boolean;
        "price"?: boolean;
        "days_to_ship"?: boolean;
    }>;
}
export interface SetSyncFieldResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface SupportSizeChartRequest {
    /** Id of category. Example: 11364 */
    "category_id": number;
}
export interface SupportSizeChartResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "support_size_chart"?: boolean;
    };
}
export interface UpdateGlobalItemRequest {
    "global_item_id": number;
    "category_id"?: number;
    "global_item_name"?: string;
    "description"?: string;
    "global_item_sku"?: string;
    "weight"?: number;
    "dimension"?: {
        "package_width"?: number;
        "package_height"?: number;
        "package_length"?: number;
    };
    "pre_order"?: {
        "days_to_ship"?: number;
    };
    "condition"?: string;
    "image"?: {
        "image_id_list"?: Array<string>;
    };
    "video_upload_id"?: Array<string>;
    "attribute_list"?: Array<{
        "attribute_id"?: number;
        "attribute_value_list"?: Array<{
            "value_id"?: number;
            "original_value_name"?: string;
            "value_unit"?: string;
        }>;
    }>;
    "brand"?: {
        "brand_id"?: number;
    };
    "description_type"?: string;
    "description_info"?: {
        "extended_description": {
            "field_list"?: Array<{
                "field_type"?: string;
                "text"?: string;
            }>;
        };
    };
}
export interface UpdateGlobalItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "global_item_id"?: number;
    };
}
export interface UpdateGlobalModelRequest {
    "global_item_id": number;
    "global_model": Array<{
        "global_model_sku"?: string;
        "global_model_id"?: number;
    }>;
}
export interface UpdateGlobalModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdateLocalAdjustmentRateRequest {
    /** The multiplier used to adjust the cross-border original price to local price */
    "adjustment_rate": number;
    /** The unique identifier of the shop to which the adjustment rate applies */
    "shop_id": number;
}
export interface UpdateLocalAdjustmentRateResponse {
    /** The multiplier used to adjust the cross-border original price to local price Example: The multiplier used to adjust the cross-border original price to local price */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate waring details if hit waring. Empty if no waring happened. Example: Indicate waring details if hit waring. Empty if no waring happened. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
}
export interface UpdatePriceRequest {
    "global_item_id": number;
    "price_list": Array<{
        "global_model_id"?: number;
        "original_price"?: number;
    }>;
}
export interface UpdatePriceResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdateSizeChartRequest {
    "global_item_id": number;
    "size_chart": string;
}
export interface UpdateSizeChartResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdateStockRequest {
    "global_item_id": number;
    "stock_list": Array<{
        "global_model_id"?: number;
        "seller_stock"?: Array<{
            "location_id"?: string;
            "stock"?: number;
        }>;
    }>;
}
export interface UpdateStockResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdateTierVariationRequest {
    "standardise_tier_variation"?: Array<{
        "variation_id"?: number;
        "variation_group_id"?: number;
        "variation_name"?: string;
        "variation_option_list"?: Array<{
            "variation_option_id"?: number;
            "variation_option_name"?: string;
            "image_id"?: string;
        }>;
    }>;
    "model"?: Array<{
        "tier_index"?: Array<number>;
        "model_sku"?: string;
        "original_price"?: number;
        "seller_stock"?: Array<{
            "stock"?: number;
        }>;
    }>;
    "global_item_id": number;
}
export interface UpdateTierVariationResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export declare class ShopeeGlobalProductApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add global item
     * /api/v2/global_product/add_global_item (POST)
     */
    addGlobalItem(params: AddGlobalItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddGlobalItemResponse>>;
    /**
     * add global model
     * /api/v2/global_product/add_global_model (POST)
     */
    addGlobalModel(params: AddGlobalModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddGlobalModelResponse>>;
    /**
     * category recommend
     * /api/v2/global_product/category_recommend (GET)
     */
    categoryRecommend(params: CategoryRecommendRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CategoryRecommendResponse>>;
    /**
     * create publish task
     * /api/v2/global_product/create_publish_task (POST)
     */
    createPublishTask(params: CreatePublishTaskRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreatePublishTaskResponse>>;
    /**
     * delete global item
     * /api/v2/global_product/delete_global_item (POST)
     */
    deleteGlobalItem(params: DeleteGlobalItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteGlobalItemResponse>>;
    /**
     * delete global model
     * /api/v2/global_product/delete_global_model (POST)
     */
    deleteGlobalModel(params: DeleteGlobalModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteGlobalModelResponse>>;
    /**
     * get attribute tree
     * /api/v2/global_product/get_attribute_tree (GET)
     */
    getAttributeTree(params: GetAttributeTreeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAttributeTreeResponse>>;
    /**
     * get brand list
     * /api/v2/global_product/get_brand_list (GET)
     */
    getBrandList(params: GetBrandListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBrandListResponse>>;
    /**
     * get category
     * /api/v2/global_product/get_category (GET)
     */
    getCategory(params: GetCategoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCategoryResponse>>;
    /**
     * get global item id
     * /api/v2/global_product/get_global_item_id (GET)
     */
    getGlobalItemId(params: GetGlobalItemIdRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetGlobalItemIdResponse>>;
    /**
     * get global item info
     * /api/v2/global_product/get_global_item_info (GET)
     */
    getGlobalItemInfo(params: GetGlobalItemInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetGlobalItemInfoResponse>>;
    /**
     * get global item limit
     * /api/v2/global_product/get_global_item_limit (GET)
     */
    getGlobalItemLimit(params: GetGlobalItemLimitRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetGlobalItemLimitResponse>>;
    /**
     * get global item list
     * /api/v2/global_product/get_global_item_list (GET)
     */
    getGlobalItemList(params: GetGlobalItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetGlobalItemListResponse>>;
    /**
     * get global model list
     * /api/v2/global_product/get_global_model_list (GET)
     */
    getGlobalModelList(params: GetGlobalModelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetGlobalModelListResponse>>;
    /**
     * get local adjustment rate
     * /api/v2/global_product/get_local_adjustment_rate (GET)
     */
    getLocalAdjustmentRate(params: GetLocalAdjustmentRateRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetLocalAdjustmentRateResponse>>;
    /**
     * get publish task result
     * /api/v2/global_product/get_publish_task_result (GET)
     */
    getPublishTaskResult(params: GetPublishTaskResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPublishTaskResultResponse>>;
    /**
     * get publishable shop
     * /api/v2/global_product/get_publishable_shop (GET)
     */
    getPublishableShop(params: GetPublishableShopRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPublishableShopResponse>>;
    /**
     * get published list
     * /api/v2/global_product/get_published_list (GET)
     */
    getPublishedList(params: GetPublishedListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPublishedListResponse>>;
    /**
     * get recommend attribute
     * /api/v2/global_product/get_recommend_attribute (GET)
     */
    getRecommendAttribute(params: GetRecommendAttributeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetRecommendAttributeResponse>>;
    /**
     * get shop publishable status
     * /api/v2/global_product/get_shop_publishable_status (GET)
     */
    getShopPublishableStatus(params: GetShopPublishableStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopPublishableStatusResponse>>;
    /**
     * get size chart detail
     * /api/v2/global_product/get_size_chart_detail (GET)
     */
    getSizeChartDetail(params: GetSizeChartDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSizeChartDetailResponse>>;
    /**
     * get size chart list
     * /api/v2/global_product/get_size_chart_list (GET)
     */
    getSizeChartList(params: GetSizeChartListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSizeChartListResponse>>;
    /**
     * get variations
     * /api/v2/global_product/get_variations (GET)
     */
    getVariations(params: GetVariationsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVariationsResponse>>;
    /**
     * init tier variation
     * /api/v2/global_product/init_tier_variation (POST)
     */
    initTierVariation(params: InitTierVariationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<InitTierVariationResponse>>;
    /**
     * search global attribute value list
     * /api/v2/global_product/search_global_attribute_value_list (POST)
     */
    searchGlobalAttributeValueList(params: SearchGlobalAttributeValueListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SearchGlobalAttributeValueListResponse>>;
    /**
     * set sync field
     * /api/v2/global_product/set_sync_field (POST)
     */
    setSyncField(params: SetSyncFieldRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetSyncFieldResponse>>;
    /**
     * support size chart
     * /api/v2/global_product/support_size_chart (GET)
     */
    supportSizeChart(params: SupportSizeChartRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SupportSizeChartResponse>>;
    /**
     * update global item
     * /api/v2/global_product/update_global_item (POST)
     */
    updateGlobalItem(params: UpdateGlobalItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateGlobalItemResponse>>;
    /**
     * update global model
     * /api/v2/global_product/update_global_model (POST)
     */
    updateGlobalModel(params: UpdateGlobalModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateGlobalModelResponse>>;
    /**
     * update local adjustment rate
     * /api/v2/global_product/update_local_adjustment_rate (POST)
     */
    updateLocalAdjustmentRate(params: UpdateLocalAdjustmentRateRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateLocalAdjustmentRateResponse>>;
    /**
     * update price
     * /api/v2/global_product/update_price (POST)
     */
    updatePrice(params: UpdatePriceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdatePriceResponse>>;
    /**
     * update size chart
     * /api/v2/global_product/update_size_chart (POST)
     */
    updateSizeChart(params: UpdateSizeChartRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateSizeChartResponse>>;
    /**
     * update stock
     * /api/v2/global_product/update_stock (POST)
     */
    updateStock(params: UpdateStockRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateStockResponse>>;
    /**
     * update tier variation
     * /api/v2/global_product/update_tier_variation (POST)
     */
    updateTierVariation(params: UpdateTierVariationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateTierVariationResponse>>;
}
