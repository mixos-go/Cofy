import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddItemRequest {
    "original_price": number;
    "description": string;
    "weight": number;
    "item_name": string;
    "item_status"?: string;
    "dimension"?: {
        "package_height"?: number;
        "package_length"?: number;
        "package_width"?: number;
    };
    "logistic_info": Array<{
        "size_id"?: number;
        "shipping_fee"?: number;
        "enabled"?: boolean;
        "logistic_id"?: number;
        "is_free"?: boolean;
    }>;
    "attribute_list"?: Array<{
        "attribute_id"?: number;
        "attribute_value_list"?: Array<{
            "value_id"?: number;
            "original_value_name"?: string;
            "value_unit"?: string;
        }>;
    }>;
    "category_id": number;
    "image"?: {
        "image_id_list"?: Array<string>;
    };
    "pre_order"?: {
        "is_pre_order"?: boolean;
        "days_to_ship"?: number;
    };
    "item_sku"?: string;
    "condition"?: string;
    "wholesale"?: Array<{
        "min_count"?: number;
        "max_count"?: number;
        "unit_price"?: number;
    }>;
    "video_upload_id"?: Array<string>;
    "brand"?: {
        "brand_id"?: number;
        "original_brand_name"?: string;
    };
    "item_dangerous"?: number;
    "tax_info"?: {
        "ncm"?: string;
        "same_state_cfop"?: string;
        "diff_state_cfop"?: string;
        "csosn"?: string;
        "origin"?: string;
        "cest"?: string;
        "measure_unit"?: string;
        "invoice_option"?: string;
        "vat_rate"?: string;
    };
    "complaint_policy"?: {
        "warranty_time"?: string;
        "exclude_entrepreneur_warranty"?: boolean;
        "complaint_address_id"?: number;
        "additional_information"?: string;
    };
    "description_info"?: {
        "extended_description": {
            "field_list"?: Array<{
                "field_type"?: string;
                "text"?: string;
                "image_info": {
                    "image_id"?: string;
                };
            }>;
        };
    };
    "description_type"?: string;
    "seller_stock"?: Array<{
        "location_id"?: string;
        "stock"?: number;
    }>;
}
export interface AddItemResponse {
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "description"?: string;
        "weight"?: number;
        "pre_order": {
            "days_to_ship"?: number;
            "is_pre_order"?: boolean;
        };
        "item_name"?: string;
        "images": {
            "image_id_list"?: Array<string>;
            "image_url_list"?: Array<string>;
        };
        "item_status"?: string;
        "price_info": {
            "current_price"?: number;
            "original_price"?: number;
        };
        "logistic_info"?: Array<{
            "size_id"?: number;
            "shipping_fee"?: number;
            "enabled"?: boolean;
            "logistic_id"?: number;
            "is_free"?: boolean;
        }>;
        "item_id"?: number;
        "attributes"?: Array<{
            "attribute_id"?: number;
            "attribute_value_list"?: Array<{
                "original_value_name"?: string;
                "value_id"?: number;
                "value_unit"?: string;
            }>;
        }>;
        "category_id"?: number;
        "dimension": {
            "package_width"?: number;
            "package_length"?: number;
            "package_height"?: number;
        };
        "condition"?: string;
        "video_info"?: Array<{
            "video_url"?: string;
            "thumbnail_url"?: string;
            "duration"?: number;
        }>;
        "wholesale"?: Array<{
            "min_count"?: number;
            "max_count"?: number;
            "unit_price"?: number;
        }>;
        "brand": {
            "brand_id"?: number;
            "original_brand_name"?: string;
        };
        "item_dangerous"?: number;
        "description_info": {
            "extended_description": {
                "field_list"?: Array<{
                    "field_type"?: string;
                    "text"?: string;
                    "image_info": {
                        "image_id"?: string;
                    };
                }>;
            };
        };
        "description_type"?: string;
        "complaint_policy": {
            "warranty_time"?: string;
            "exclude_entrepreneur_warranty"?: boolean;
            "complaint_address_id"?: number;
            "additional_information"?: string;
        };
        "seller_stock"?: Array<{
            "location_id"?: string;
            "stock"?: number;
        }>;
    };
    "error"?: string;
}
export interface AddKitItemRequest {
    "sync_setting"?: {
        "auto_sync_dts"?: boolean;
    };
    "item_setting"?: {
        "pre_order": {
            "is_pre_order"?: boolean;
            "days_to_ship"?: number;
        };
        "item_name"?: string;
        "images": {
            "image_id_list"?: Array<string>;
        };
        "description_type"?: string;
        "description_info": {
            "extended_description": {
                "field_list"?: Array<{
                    "field_type"?: string;
                    "text"?: string;
                }>;
            };
        };
        "unlisted"?: boolean;
        "logistic_info"?: Array<{
            "logistic_id"?: number;
            "enabled"?: boolean;
        }>;
        "weight"?: number;
        "model_list"?: Array<{
            "tier_index"?: Array<number>;
            "original_price"?: number;
            "component_list"?: Array<{
                "component_item_id"?: number;
                "component_model_id"?: number;
                "main_component"?: boolean;
                "quantity"?: number;
            }>;
        }>;
        "dimension": {
            "package_length"?: number;
            "package_width"?: number;
            "package_height"?: number;
        };
        "tier_variation_list"?: Array<{
            "name"?: string;
            "option_list"?: Array<{
                "option"?: string;
            }>;
        }>;
    };
}
export interface AddKitItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "item_id"?: number;
    };
    "warning"?: string;
}
export interface AddModelRequest {
    "model_list": Array<{
        "original_price"?: number;
        "model_sku"?: string;
        "seller_stock"?: Array<{
            "location_id"?: string;
            "stock"?: number;
        }>;
        "gtin_code"?: string;
        "weight"?: number;
    }>;
}
export interface AddModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "model"?: Array<{
            "model_sku"?: string;
            "price_info"?: Array<{
                "original_price"?: number;
            }>;
            "seller_stock"?: Array<{
                "location_id"?: string;
                "stock"?: number;
            }>;
            "weight"?: number;
        }>;
    };
}
export interface BatchAddItemRequest {
    "item_list": Array<{
        "category_id"?: number;
        "item_name"?: string;
        "description"?: string;
        "item_sku"?: string;
        "image": {
            "image_id_list"?: Array<string>;
        };
        "tier_variation"?: Array<{
            "name"?: string;
            "option_list"?: Array<{
                "option"?: string;
            }>;
        }>;
        "model_list"?: Array<{
            "model_sku"?: string;
            "original_price"?: number;
            "seller_stock"?: Array<{
                "location_id"?: string;
                "stock"?: number;
            }>;
            "tier_index"?: Array<number>;
        }>;
        "weight"?: number;
        "dimension": {
            "package_length"?: number;
            "package_width"?: number;
            "package_height"?: number;
        };
        "logistic_info"?: Array<{
            "logistic_id"?: number;
            "enabled"?: boolean;
        }>;
        "brand": {
            "brand_id"?: number;
        };
    }>;
}
export interface BatchAddItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "task_id"?: number;
    };
}
export interface BatchPublishItemToOutletShopRequest {
    "item_list": Array<{
        "mart_item_id"?: number;
        "outlet_shop_id"?: number;
        "publish_item": {
            "outlet_item_id"?: number;
            "model"?: Array<{
                "relate_mart_model_id"?: number;
                "original_price"?: number;
                "seller_stock"?: Array<{
                    "location_id"?: string;
                    "stock"?: number;
                }>;
            }>;
            "logistic_info"?: Array<{
                "logistic_id"?: number;
                "enabled"?: boolean;
                "shipping_fee"?: number;
                "size_id"?: number;
                "is_free"?: boolean;
            }>;
            "purchase_limit_info": {
                "min_purchase_limit"?: number;
                "max_purchase_limit": {
                    "purchase_limit"?: number;
                };
            };
        };
    }>;
}
export interface BatchPublishItemToOutletShopResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "task_id"?: number;
    };
}
export interface BatchUpdateOutletPriceRequest {
    "item_list": Array<{
        "outlet_shop_id"?: number;
        "item_id"?: number;
        "price_list"?: Array<{
            "model_id"?: number;
            "original_price"?: number;
        }>;
    }>;
}
export interface BatchUpdateOutletPriceResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "task_id"?: number;
    };
}
export interface BatchUpdateOutletStockRequest {
    "item_list": Array<{
        "outlet_shop_id"?: number;
        "item_id"?: number;
        "stock_list"?: Array<{
            "model_id"?: number;
            "seller_stock"?: Array<{
                "location_id"?: string;
                "stock"?: number;
            }>;
        }>;
    }>;
}
export interface BatchUpdateOutletStockResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "task_id"?: number;
    };
}
export interface BoostItemRequest {
    "item_id_list": Array<number>;
}
export interface BoostItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "failure_list"?: Array<{
            "item_id"?: number;
            "failed_reason"?: string;
        }>;
        "success_list": {
            "item_id_list"?: Array<number>;
        };
    };
}
export interface CategoryRecommendRequest {
    /** name of item Example: 海飞丝洗发水 */
    "item_name": string;
    /** Please use the image id returned by v2.media_space.upload_image api, we will ignore if this field is empty string Example: 16bdad2c365f1fccea7664e69b696571 */
    "product_cover_image"?: string;
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
export interface DeleteItemRequest {
    "item_id": number;
}
export interface DeleteItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface DeleteModelRequest {
    "item_id": number;
    "model_id": number;
}
export interface DeleteModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface GenerateKitImageRequest {
    /** Please send up until 9 components. */
    "component_list": Array<Record<string, unknown>>;
    /** ID of the item that composes this kit model. */
    "component_item_id": number;
    /** ID of the model that composes this kit model. */
    "component_model_id"?: number;
}
export interface GenerateKitImageResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** The identifier for an API request for error tracking.<path></path><path></path> Example: The identifier for an API request for error tracking.<path></path><path></path> */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** generated kit image Example: generated kit image */
    "kit_image"?: string;
}
export interface GetAitemByPitemIdRequest {
    /** ID of item under SIP Primary Shop. Example: 843997615 */
    "pitem_id": number;
}
export interface GetAitemByPitemIdResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "aitem_list"?: Array<{
            "aitem_id"?: number;
            "ashop_id"?: number;
            "ashop_region"?: string;
            "model_mapping_list"?: Array<{
                "amodel_id"?: number;
                "pmodel_id"?: number;
            }>;
        }>;
    };
    "warning"?: string;
}
export interface GetAllVehicleListRequest {
    /** The size of one page. Max=100 Example: 10 */
    "page_size": number;
    /** Specifies the starting entry of data to return in the current call. Default is 0, if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset"?: number;
    /** If language is not uploaded, the default language=en, the following are the languages supported by different markets SG: en ; MY: en / ms-my / zh-hans ; TH: en / th ; VN: en / vi ; PH: en ; TW: en / zh-hant ; ID: en / id ; BR: en / pt-br ; MX: en / es-mx ; CO: en/es-CO ; CL: en/es-CL. Note: For markets that have already launched global tree, Crossboard shop only support returning en and zh-hans language data Example: pt-br */
    "language"?: string;
}
export interface GetAllVehicleListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "vehicle_list"?: Array<{
            "brand_id"?: number;
            "brand_name"?: string;
            "model_id"?: number;
            "model_name"?: string;
            "year_id"?: number;
            "year_name"?: string;
            "version_id"?: number;
            "version_name"?: string;
        }>;
        "has_next_page"?: boolean;
        "next_offset"?: number;
    };
}
export interface GetAttributeTreeRequest {
    /** max count is 20 */
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
                    "multi_lang"?: Array<{
                        "language"?: string;
                        "value"?: string;
                    }>;
                }>;
                "attribute_info": {
                    "input_type"?: number;
                    "input_validation_type"?: number;
                    "format_type"?: number;
                    "date_format_type"?: number;
                    "attribute_unit_list"?: Array<string>;
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
export interface GetBatchTaskResultRequest {
    /** The task type. 1: price; 2: stock; 3: publish outlet; 4: add item. */
    "task_type": number;
    /** The task ID to query. */
    "task_id": number;
}
export interface GetBatchTaskResultResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "publish_status"?: number;
        "success_list"?: Array<{
            "shop_id"?: number;
            "item_id"?: number;
            "model_id"?: number;
        }>;
        "failed_list"?: Array<{
            "shop_id"?: number;
            "item_id"?: number;
            "model_id"?: number;
            "failed_reason"?: string;
        }>;
    };
}
export interface GetBoostedListRequest {
}
export interface GetBoostedListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "cool_down_second"?: number;
        }>;
    };
}
export interface GetBrandListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0. If data is more than one page,this field needs to be replaced with "next_offset" to request,and the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** the size of one page.Max=100 Example: 10 */
    "page_size": number;
    /** ID of category. Example: 12345 */
    "category_id": number;
    /** Brand status , 1: normal brand, 2: pending brand Example: 1 */
    "status": number;
    /** If language is not uploaded, the default language=en, the following are the languages supported by different markets SG: en ; MY: en / ms-my / zh-hans ; TH: en / th ; VN: en / vi ; PH: en ; TW: en / zh-hant ; ID: en / id ; BR: en / pt-br ; MX: en / es-mx ; CO: en/es-CO ; CL: en/es-CL. Note: For markets that have already launched global tree, Crossboard shop only support returning en and zh-hans language data Example: zh-hans */
    "language"?: string;
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
    /** If language is not uploaded, the default language=en, the following are the languages supported by different markets SG: en ; MY: en / ms-my / zh-hans ; TH: en / th ; VN: en / vi ; PH: en ; TW: en / zh-hant ; ID: en / id ; BR: en / pt-br ; MX: en / es-mx ; CO: en/es-CO ; CL: en/es-CL .Note: For markets that have already launched global tree, Crossboard shop only support returning en and zh-hans language data Example: zh-hans */
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
export interface GetCommentRequest {
    /** The identity of product item. Example: 16509872 */
    "item_id"?: number;
    /** The identity of comment. Example: 120590834 */
    "comment_id"?: number;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the offset can be some entry to start next call. */
    "cursor": string;
    /** Each result set is returned as a page of entries. Use the "page_size" filters to control the maximum number of entries to retrieve per page (i.e., per call). This integer value is used to specify the maximum number of entries to return in a single "page" of data. The limit of page_size if between 1 and 100. Example: 10 */
    "page_size": number;
}
export interface GetCommentResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "item_comment_list"?: Array<{
            "comment_id"?: number;
            "comment"?: string;
            "buyer_username"?: string;
            "order_sn"?: string;
            "item_id"?: number;
            "model_id"?: number;
            "create_time"?: number;
            "rating_star"?: number;
            "editable"?: string;
            "hidden"?: boolean;
            "cmt_reply": {
                "reply"?: string;
                "hidden"?: boolean;
            };
        }>;
        "more"?: boolean;
        "next_cursor"?: string;
    };
    "request_id"?: string;
}
export interface GetDirectItemListRequest {
    /** Item id of main shop. Example: 801931707 */
    "main_item_id": Array<number>;
}
export interface GetDirectItemListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "main_item_id"?: number;
            "direct_item_list"?: Array<{
                "direct_shop_id"?: number;
                "direct_item_id"?: number;
            }>;
        }>;
    };
}
export interface GetDirectShopRecommendedPriceRequest {
    /** Example: 843997552 */
    "main_item_id": number;
    /** Direct shop regions. Example: ["SG"] */
    "direct_shop_regions": Array<string>;
    /** Main_item's category. Example: 1234 */
    "category_id"?: number;
    /** Main model model info. */
    "model_list"?: Array<Record<string, unknown>>;
    /** Id of main model. Example: 1234 */
    "model_id"?: number;
    /** Tier index of main model. Index starts from 0. Example: [0,1] */
    "tier_index"?: Array<number>;
    /** Example: 1000 */
    "input_price"?: number;
    /** Example: 1.1 */
    "weight"?: number;
    /** direct shop enabled channel Example: 28016 */
    "enabled_channel_id_list"?: Array<number>;
}
export interface GetDirectShopRecommendedPriceResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "direct_item_price"?: Array<{
            "shop_id"?: number;
            "region"?: string;
            "hidden_price"?: number;
            "item_model_price_list"?: Array<{
                "model_id"?: number;
                "tier_index"?: Array<number>;
                "price"?: number;
            }>;
        }>;
    };
}
export interface GetItemBaseInfoRequest {
    /** item_id list; limit [0,50] Example: [34001,34002] */
    "item_id_list": Array<number>;
    /** if true will response tax_info Example: true */
    "need_tax_info"?: boolean;
    /** if true will response complaint_policy Example: true */
    "need_complaint_policy"?: boolean;
}
export interface GetItemBaseInfoResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "category_id"?: number;
            "item_name"?: string;
            "description"?: string;
            "item_sku"?: string;
            "create_time"?: number;
            "update_time"?: number;
            "attribute_list"?: Array<{
                "attribute_id"?: number;
                "original_attribute_name"?: string;
                "is_mandatory"?: boolean;
                "attribute_value_list"?: Array<{
                    "value_id"?: number;
                    "original_value_name"?: string;
                    "value_unit"?: string;
                }>;
            }>;
            "price_info"?: Array<{
                "currency"?: string;
                "original_price"?: number;
                "current_price"?: number;
                "inflated_price_of_original_price"?: number;
                "inflated_price_of_current_price"?: number;
                "sip_item_price"?: number;
                "sip_item_price_source"?: string;
            }>;
            "image": {
                "image_url_list"?: Array<string>;
                "image_id_list"?: Array<string>;
            };
            "weight"?: string;
            "dimension": {
                "package_length"?: number;
                "package_width"?: number;
                "package_height"?: number;
            };
            "logistic_info"?: Array<{
                "logistic_id"?: number;
                "logistic_name"?: string;
                "enabled"?: boolean;
                "shipping_fee"?: number;
                "size_id"?: number;
                "is_free"?: boolean;
                "estimated_shipping_fee"?: number;
            }>;
            "pre_order": {
                "is_pre_order"?: boolean;
                "days_to_ship"?: number;
            };
            "wholesales"?: Array<{
                "min_count"?: number;
                "max_count"?: number;
                "unit_price"?: number;
                "inflated_price_of_unit_price"?: number;
            }>;
            "condition"?: string;
            "size_chart"?: string;
            "item_status"?: string;
            "deboost"?: string;
            "has_model"?: boolean;
            "promotion_id"?: number;
            "video_info"?: Array<{
                "video_url"?: string;
                "thumbnail_url"?: string;
                "duration"?: number;
            }>;
            "brand": {
                "brand_id"?: number;
                "original_brand_name"?: string;
            };
            "item_dangerous"?: number;
            "complaint_policy": {
                "warranty_time"?: string;
                "exclude_entrepreneur_warranty"?: boolean;
                "complaint_address_id"?: number;
                "additional_information"?: string;
            };
            "tax_info": {
                "ncm"?: string;
                "diff_state_cfop"?: string;
                "csosn"?: string;
                "origin"?: string;
                "cest"?: string;
                "measure_unit"?: string;
                "invoice_option"?: string;
                "vat_rate"?: string;
                "hs_code"?: string;
                "tax_code"?: string;
            };
            "description_info": {
                "extended_description": {
                    "field_list"?: Array<{
                        "field_type"?: string;
                        "text"?: string;
                        "image_info": {
                            "image_id"?: string;
                            "image_url"?: string;
                        };
                    }>;
                };
            };
            "description_type"?: string;
            "stock_info_v2": {
                "summary_info": {
                    "total_reserved_stock"?: number;
                    "total_available_stock"?: number;
                };
                "seller_stock"?: Array<{
                    "location_id"?: string;
                    "stock"?: number;
                }>;
                "shopee_stock"?: Array<{
                    "location_id"?: string;
                    "stock"?: number;
                }>;
            };
        }>;
    };
}
export interface GetItemContentDiagnosisResultRequest {
    "item_id_list": Array<number>;
}
export interface GetItemContentDiagnosisResultResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "failure_item_list"?: Array<{
            "failed_reason"?: string;
            "item_id"?: number;
        }>;
        "success_item_list"?: Array<{
            "item_id"?: number;
            "quality_level"?: number;
        }>;
    };
    "warning"?: string;
}
export interface GetItemExtraInfoRequest {
    /** item_id list, limit [0,50] Example: [34001,34002] */
    "item_id_list": Array<number>;
}
export interface GetItemExtraInfoResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "sale"?: number;
            "views"?: number;
            "likes"?: number;
            "rating_star"?: number;
            "comment_count"?: number;
        }>;
    };
}
export interface GetItemLimitRequest {
    /** Shopee's unique identifier for a category. Example: 400055 */
    "category_id"?: number;
}
export interface GetItemLimitResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Warning message. Example: Warning message. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    "price_limit"?: Record<string, unknown>;
    /** Item price max limit. Example: Item price max limit. */
    "min_limit"?: number;
    /** Item price min limit. Example: Item price min limit. */
    "max_limit"?: number;
    "wholesale_price_threshold_percentage"?: Record<string, unknown>;
    "stock_limit"?: Record<string, unknown>;
    "item_name_length_limit"?: Record<string, unknown>;
    "item_image_count_limit"?: Record<string, unknown>;
    "item_description_length_limit"?: Record<string, unknown>;
    "tier_variation_name_length_limit"?: Record<string, unknown>;
    "tier_variation_option_length_limit"?: Record<string, unknown>;
    "item_count_limit"?: Record<string, unknown>;
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
    /** Pre order limits for the category Example: Pre order limits for the category */
    "days_to_ship_limit"?: Record<string, unknown>;
    "non_pre_order_days_to_ship"?: number;
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
    "gtin_limit"?: Record<string, unknown>;
    /** Indicate gtin_code validation logic in v2.product.add_item v2.product.update_item v2.product.init_tier_variation v2.product.add_model v2.product.update_model - Mandatory : This field is required and must contain a correctly formatted GTiN number. - Flexible : This field is required and must contain either a correctly formatted GTlN number or "00" todeclare that the item/model has no valid GTlN. - Optional : This field is optional and can contain a correctly formatted GTiN number, "00" or be omittedentirely. Example: Indicate gtin_code validation logic in v2.product.add_item v2.product.update_item v2.product.init_tier_variation v2.product.add_model v2.product.update_model - Mandatory : This field is required and must contain a correctly formatted GTiN number. - Flexible : This field is required and must contain either a correctly formatted GTlN number or "00" todeclare that the item/model has no valid GTlN. - Optional : This field is optional and can contain a correctly formatted GTiN number, "00" or be omittedentirely. */
    "gtin_validation_rule"?: string;
}
export interface GetItemListRequest {
    /** Specifies the starting entry of data to return in the current call. Default is 0. if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset": number;
    /** the size of one page.Max=100 Example: 10 */
    "page_size": number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the item update time). The update_time_from field is the starting date range. Example: 1611311600 */
    "update_time_from"?: number;
    /** The update_time_from and update_time_to fields specify a date range for retrieving orders (based on the item update time). The update_time_to field is the ending date range Example: 1611311631 */
    "update_time_to"?: number;
    /** NORMAL/BANNED/UNLIST/ REVIEWING/SELLER_DELETE/SHOPEE_DELETE If you want to search multiple status, please upload the url like this: item_status=NORMAL&item_status=BANNED Example: ["NORMAL"] */
    "item_status": Array<string>;
}
export interface GetItemListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item"?: Array<{
            "item_id"?: number;
            "item_status"?: string;
            "tag": {
                "kit"?: boolean;
            };
            "update_time"?: number;
        }>;
        "total_count"?: number;
        "has_next_page"?: boolean;
        "next_offset"?: number;
    };
}
export interface GetItemListByContentDiagnosisRequest {
    "page_size": number;
    "quality_level"?: Array<number>;
    "issue_type"?: Array<number>;
}
export interface GetItemListByContentDiagnosisResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "quality_level"?: number;
            "unfinished_task"?: Array<{
                "issue_type"?: number;
                "suggestion"?: string;
            }>;
        }>;
        "total_count"?: number;
        "next_offset"?: string;
    };
}
export interface GetItemPromotionRequest {
    /** Item ID list, can send 1 to 50 items. Example: 13233406680,17924576533 */
    "item_id_list": Array<number>;
}
export interface GetItemPromotionResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "success_list"?: Array<{
            "item_id"?: number;
            "promotion"?: Array<{
                "promotion_type"?: string;
                "promotion_id"?: number;
                "model_id"?: number;
                "start_time"?: number;
                "end_time"?: number;
                "promotion_price_info"?: Array<{
                    "promotion_price"?: number;
                }>;
                "promotion_staging"?: string;
                "promotion_stock_info_v2": {
                    "summary_info": {
                        "total_reserved_stock"?: number;
                    };
                };
            }>;
        }>;
    };
}
export interface GetItemViolationInfoRequest {
    /** item_id list; limit [0,50] Example: [34001,34002] */
    "item_id_list": Array<number>;
}
export interface GetItemViolationInfoResponse {
    "message"?: null;
    "request_id"?: string;
    "response"?: {
        "item_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "item_status"?: string;
            "deboost"?: boolean;
            "item_status_details"?: Array<{
                "violation_type"?: string;
                "violation_reason"?: string;
                "suggestion"?: string;
                "update_time"?: number;
                "fix_deadline_time"?: number;
            }>;
            "deboost_details"?: Array<{
                "violation_type"?: string;
                "violation_reason"?: string;
                "suggestion"?: string;
                "suggested_category"?: Array<{
                    "category_id"?: number;
                    "category_name"?: string;
                }>;
                "update_time"?: number;
                "fix_deadline_time"?: number;
            }>;
        }>;
    };
}
export interface GetKitItemInfoRequest {
    /** ID of kit item. Example: 28001430 */
    "item_id": number;
}
export interface GetKitItemInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "product_info": {
            "attributes"?: unknown[];
            "brand_info": {
                "brand_id"?: number;
                "original_brand_name"?: string;
            };
            "category_id"?: number;
            "create_time"?: number;
            "description_info": {
                "extended_description": {
                    "field_list"?: Array<{
                        "field_type"?: string;
                        "text"?: string;
                    }>;
                };
            };
            "description_type"?: string;
            "dimension": {
                "package_height"?: number;
                "package_length"?: number;
                "package_width"?: number;
            };
            "image": {
                "image_id_list"?: Array<string>;
                "image_ratio"?: string;
                "image_url_list"?: Array<string>;
            };
            "item_id"?: number;
            "item_name"?: string;
            "item_sku"?: string;
            "item_status"?: string;
            "logistic_info"?: Array<{
                "enabled"?: boolean;
                "is_free"?: boolean;
                "logistic_id"?: number;
                "logistic_name"?: string;
                "size_id"?: number;
            }>;
            "model_list"?: Array<{
                "component_list"?: Array<{
                    "component_item_id"?: number;
                    "component_item_name"?: string;
                    "component_model_id"?: number;
                    "component_model_name"?: string;
                    "component_item_or_model_image"?: string;
                    "component_item_or_model_sku"?: string;
                    "main_component"?: boolean;
                    "quantity"?: number;
                }>;
                "model_id"?: number;
                "model_sku"?: string;
                "original_price"?: number;
                "tier_index"?: Array<number>;
            }>;
            "pre_order_info": {
                "days_to_ship"?: number;
                "is_pre_order"?: boolean;
            };
            "sync_setting": {
                "auto_sync_dts"?: boolean;
            };
            "tier_variation_list"?: Array<{
                "name"?: string;
                "option_list"?: Array<{
                    "option"?: string;
                }>;
            }>;
            "update_time"?: number;
            "video_list"?: unknown[];
            "weight"?: string;
        };
    };
}
export interface GetKitItemLimitRequest {
    /** Shopee's unique identifier for a category. Example: 400055 */
    "category_id"?: number;
}
export interface GetKitItemLimitResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "price_limit": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
        "item_name_length_limit": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
        "item_image_count_limit": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
        "description_limit": {
            "description_length_min"?: number;
            "description_length_max"?: number;
            "description_text_length_min"?: number;
            "description_text_length_max"?: number;
            "description_image_num_min"?: number;
            "description_image_num_max"?: number;
            "description_image_width_min"?: number;
            "description_image_height_min"?: number;
            "description_image_aspect_ratio_min"?: number;
            "description_image_aspect_ratio_max"?: number;
        };
        "tier_variation_name_length_limit": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
        "tier_variation_option_length_limit": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
        "weight_limit": {
            "weight_mandatory"?: boolean;
        };
        "dimension_limit": {
            "dimension_mandatory"?: boolean;
        };
        "dts_limit": {
            "non_pre_order_days_to_ship"?: number;
            "support_pre_order"?: boolean;
            "days_to_ship_limit": {
                "min_limit"?: number;
                "max_limit"?: number;
            };
        };
        "component_count_limit_of_single_model": {
            "min_limit"?: number;
            "max_limit"?: number;
        };
    };
}
export interface GetMainItemListRequest {
    /** Item id of direct shop. Example: 801931707 */
    "direct_item_id": Array<number>;
}
export interface GetMainItemListResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "list"?: Array<{
            "direct_item_id"?: number;
            "main_shop_id"?: number;
            "main_item_id"?: number;
        }>;
    };
}
export interface GetMartItemByOutletItemIdRequest {
    /** The item ID of the item in the outlet shop. */
    "outlet_item_id": number;
}
export interface GetMartItemByOutletItemIdResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate waring details if hit waring. Empty if no waring happened. Example: Indicate waring details if hit waring. Empty if no waring happened. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** A list of item mapping records between the Mart item and its corresponding outlet items. Example: A list of item mapping records between the Mart item and its corresponding outlet items. */
    "item_mapping_list"?: Array<Record<string, unknown>>;
    /** The item ID of the item in the Mart shop. Example: The item ID of the item in the Mart shop. */
    "mart_item_id"?: number;
    /** The item ID of the corresponding item in the outlet shop. Example: The item ID of the corresponding item in the outlet shop. */
    "outlet_item_id"?: number;
    /** The mapping relationship between Mart models and outlet models under the mapped items. Example: The mapping relationship between Mart models and outlet models under the mapped items. */
    "model_mapping"?: Array<Record<string, unknown>>;
    /** The model ID of the product in the Mart shop. Example: The model ID of the product in the Mart shop. */
    "mart_model_id"?: number;
    /** The model ID of the corresponding product in the outlet shop. Example: The model ID of the corresponding product in the outlet shop. */
    "outlet_model_id"?: number;
}
export interface GetMartItemMappingByIdRequest {
    /** The item ID of the item in the Mart shop. */
    "mart_item_id": number;
    /** A list of outlet shop IDs used to filter the mapping results. */
    "outlet_shop_id_list": Array<number>;
}
export interface GetMartItemMappingByIdResponse {
    /** Indicate error type if hit error. Empty if no error happened. Example: Indicate error type if hit error. Empty if no error happened. */
    "error"?: string;
    /** Indicate error details if hit error. Empty if no error happened. Example: Indicate error details if hit error. Empty if no error happened. */
    "message"?: string;
    /** Indicate waring details if hit waring. Empty if no waring happened. Example: Indicate waring details if hit waring. Empty if no waring happened. */
    "warning"?: string;
    /** The identifier for an API request for error tracking. Example: The identifier for an API request for error tracking. */
    "request_id"?: string;
    "response"?: Record<string, unknown>;
    /** A list of item mapping records between the Mart item and its corresponding outlet items. Example: A list of item mapping records between the Mart item and its corresponding outlet items. */
    "item_mapping_list"?: Array<Record<string, unknown>>;
    /** The item ID of the item in the Mart shop. Example: The item ID of the item in the Mart shop. */
    "mart_item_id"?: number;
    /** The item ID of the corresponding item in the outlet shop. Example: The item ID of the corresponding item in the outlet shop. */
    "outlet_item_id"?: number;
    /** The mapping relationship between Mart models and outlet models under the mapped items. Example: The mapping relationship between Mart models and outlet models under the mapped items. */
    "model_mapping"?: Array<Record<string, unknown>>;
    /** The model ID of the product in the Mart shop. Example: The model ID of the product in the Mart shop. */
    "mart_model_id"?: number;
    /** The model ID of the corresponding product in the outlet shop. Example: The model ID of the corresponding product in the outlet shop. */
    "outlet_model_id"?: number;
}
export interface GetModelListRequest {
    /** The ID of the item Example: 178312 */
    "item_id": number;
}
export interface GetModelListResponse {
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "tier_variation"?: Array<{
            "option_list"?: Array<{
                "option"?: string;
                "image": {
                    "image_id"?: string;
                    "image_url"?: string;
                };
            }>;
            "name"?: string;
        }>;
        "model"?: Array<{
            "price_info"?: Array<{
                "currency"?: string;
                "current_price"?: number;
                "original_price"?: number;
                "inflated_price_of_original_price"?: number;
                "inflated_price_of_current_price"?: number;
                "sip_item_price"?: number;
                "sip_item_price_source"?: string;
                "sip_item_price_currency"?: string;
            }>;
            "model_sku"?: string;
            "model_status"?: string;
            "pre_order": {
                "is_pre_order"?: boolean;
                "days_to_ship"?: number;
            };
            "stock_info_v2": {
                "summary_info": {
                    "total_reserved_stock"?: number;
                    "total_available_stock"?: number;
                };
                "seller_stock"?: Array<{
                    "location_id"?: string;
                    "stock"?: number;
                    "if_saleable"?: boolean;
                }>;
                "shopee_stock"?: Array<{
                    "location_id"?: string;
                    "stock"?: string;
                }>;
            };
            "gtin_code"?: string;
            "weight"?: string;
            "dimension": {
                "package_height"?: number;
                "package_length"?: number;
                "package_width"?: number;
            };
        }>;
        "standardise_tier_variation"?: Array<{
            "variation_name"?: string;
            "variation_option_list"?: Array<{
                "variation_option_name"?: string;
                "image_id"?: string;
                "image_url"?: string;
            }>;
        }>;
    };
    "error"?: string;
}
export interface GetProductCertificationRuleRequest {
    /** Item attributes. */
    "attribute_list"?: Array<Record<string, unknown>>;
    /** ID of attribute. Example: 5357 */
    "attribute_id": number;
    "attribute_value_list"?: Array<Record<string, unknown>>;
    /** ID of attribute value. In the following cases, the value id needs to be uploaded as 0, and original_value_name is mandatory, needs to be filled in customized value. (1) AttributeInputType is TEXT_FILED; (2) AttributeInputType is COMBO_BOX or MULTIPLE_SELECT_COMBO_BOX, and the seller want to fill in a customized value. Example: 38173 */
    "value_id": number;
    /** Value name. original_value_name from produc.get_attributes api. If value id=0, this field is required. If AttributeType is DATE_TYPE or TIMESTAMP_TYPE, you can upload timestamp(string type) as the original_value_name. Example: Red */
    "original_value_name"?: string;
    /** Unit of attribute value (quantitative attribute only). Example: kg */
    "value_unit"?: string;
    /** ID of category. */
    "category_id"?: number;
}
export interface GetProductCertificationRuleResponse {
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "certification_rule_list"?: Array<{
            "certification_type"?: number;
            "is_mandatory"?: boolean;
        }>;
    };
    "error"?: string;
}
export interface GetRecommendAttributeRequest {
    /** name of item Example: Ipone11 */
    "item_name": string;
    /** Cover image id of item */
    "cover_image_id"?: number;
    /** ID of category Example: 14695 */
    "category_id": number;
}
export interface GetRecommendAttributeResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "attribute_list"?: Array<{
            "attribute_id"?: number;
            "original_attribute_name"?: string;
            "display_attribute_name"?: string;
            "is_mandatory"?: boolean;
            "input_validation_type"?: string;
            "format_type"?: string;
            "date_format_type"?: string;
            "input_type"?: string;
            "attribute_unit"?: unknown[];
            "attribute_value_list"?: Array<{
                "value_id"?: number;
                "original_value_name"?: string;
                "display_value_name"?: string;
            }>;
        }>;
    };
}
export interface GetSizeChartDetailRequest {
    /** ID of new size chart Example: 700024639 */
    "size_chart_id": number;
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
    /** category id under this shop Example: 100087 */
    "category_id": string;
    /** the size of one page. Max=50. Example: 10 */
    "page_size": string;
    /** Specifies the starting entry of data to return in the current call. Default is "". If data is more than one page, the cursor can be some entry to start next call. Example: 1683255510 */
    "cursor"?: string;
}
export interface GetSizeChartListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "next_cursor"?: string;
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
export interface GetVehicleListByCompatibilityDetailRequest {
    /** To inform compatibility list, can be equal to Brand, Model, Year, or Version. Pass the compatibility_details="Brand" to get all brand list; Pass the compatibility_details="Model" and brand_id=1234 to get all model list under brand_id=1234; Pass the compatibility_details="Year" and brand_id=1234 and model_id=2345 to get all year list under brand_id=1234 and model_id=2345; Pass the compatibility_details="Version" and brand_id=1234 and model_id=2345 and year_id=3456 to get all version list under brand_id=1234 and model_id=2345 and year_id=3456. Example: Brand */
    "compatibility_details": string;
    /** ID of the brand. Example: 1234 */
    "brand_id"?: number;
    /** ID of the model. Example: 2345 */
    "model_id"?: number;
    /** ID of the year. Example: 3456 */
    "year_id"?: number;
    /** If language is not uploaded, the default language=en, the following are the languages supported by different markets SG: en ; MY: en / ms-my / zh-hans ; TH: en / th ; VN: en / vi ; PH: en ; TW: en / zh-hant ; ID: en / id ; BR: en / pt-br ; MX: en / es-mx ; CO: en/es-CO ; CL: en/es-CL. Note: For markets that have already launched global tree, Crossboard shop only support returning en and zh-hans language data. Example: pt-br */
    "language"?: string;
}
export interface GetVehicleListByCompatibilityDetailResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "vehicle_list"?: Array<{
            "brand_id"?: number;
            "brand_name"?: string;
        }>;
    };
}
export interface GetWeightRecommendationRequest {
    "item_name": string;
    "cover_image_id": string;
    "category_id": number;
    "attribute_list": Array<{
        "attribute_id"?: number;
        "attribute_value_list"?: Array<{
            "value_id"?: number;
            "original_value_name"?: string;
            "value_unit"?: string;
        }>;
    }>;
    "brand_id": number;
    "description_type": string;
    "description_info"?: {
        "extended_description": {
            "field_list"?: Array<{
                "field_type"?: string;
                "text"?: string;
            }>;
        };
    };
}
export interface GetWeightRecommendationResponse {
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "normal_weight_range"?: Array<number>;
    };
    "error"?: string;
}
export interface InitTierVariationRequest {
    "item_id": number;
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
    "model": Array<{
        "tier_index"?: Array<number>;
        "model_sku"?: string;
        "original_price"?: number;
        "seller_stock"?: Array<{
            "stock"?: number;
        }>;
    }>;
}
export interface InitTierVariationResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "tier_variation"?: Array<{
            "name"?: string;
            "option_list"?: Array<{
                "image": {
                    "image_url"?: string;
                };
                "option"?: string;
            }>;
        }>;
        "model"?: Array<{
            "tier_index"?: Array<number>;
            "model_id"?: number;
            "model_sku"?: string;
            "price_info"?: Array<{
                "original_price"?: number;
            }>;
            "seller_stock"?: Array<{
                "location_id"?: string;
                "stock"?: number;
            }>;
            "weight"?: number;
        }>;
    };
}
export interface PublishItemToOutletShopRequest {
    "mart_shop_id"?: number;
    "mart_item_id": number;
    "outlet_shop_id": number;
    "publish_item"?: {
        "model"?: Array<{
            "relate_mart_model_id"?: number;
            "original_price"?: number;
            "seller_stock"?: Array<{
                "location_id"?: string;
                "stock"?: number;
            }>;
            "dts": {
                "is_pre_order"?: boolean;
                "days_to_ship"?: number;
            };
        }>;
        "logistic_info"?: Array<{
            "channel_id"?: number;
            "enabled"?: boolean;
            "shipping_fee"?: number;
            "size_id"?: number;
            "is_free"?: boolean;
        }>;
        "purchase_limit_info": {
            "min_purchase_limit"?: number;
            "max_purchase_limit": {
                "purchase_limit"?: number;
            };
        };
    };
}
export interface PublishItemToOutletShopResponse {
    "item_id"?: number;
}
export interface RegisterBrandRequest {
    "original_brand_name": string;
    "category_list": Array<number>;
    "product_image"?: {
        "image_id_list"?: Array<string>;
    };
    "app_logo_image_id"?: string;
    "brand_website"?: string;
    "brand_description"?: string;
    "additional_information"?: string;
    "pc_logo_image_id"?: string;
    "brand_region": string;
}
export interface RegisterBrandResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "brand_id"?: number;
        "original_brand_name"?: string;
    };
}
export interface ReplyCommentRequest {
    "comment_list": Array<{
        "comment_id"?: number;
        "comment"?: string;
    }>;
}
export interface ReplyCommentResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "result_list"?: Array<{
            "comment_id"?: number;
        }>;
    };
    "request_id"?: string;
}
export interface SearchAttributeValueListRequest {
    "attribute_id": number;
    /** search the keywords of the attributes value */
    "value_name"?: string;
    "cursor": number;
    /** The range is 1 to 100 Example: 100 */
    "limit": number;
}
export interface SearchAttributeValueListResponse {
    "error"?: string;
    "msg"?: string;
    "warning"?: string;
    "request_id"?: string;
    "debug_message"?: string;
    "response"?: Record<string, unknown>;
    "value_list"?: Array<Record<string, unknown>>;
    /** The ID of the predefined attributes value. Example: The ID of the predefined attributes value. */
    "value_id"?: number;
    /** The name of the predefined attributes value. Example: The name of the predefined attributes value. */
    "value_name"?: string;
    "page_info"?: Record<string, unknown>;
    "cursor"?: number;
    "has_next"?: boolean;
}
export interface SearchItemRequest {
    /** Specifies the starting entry of data to return in the current call. Default is empty. if data is more than one page, the offset can be some entry to start next call. Example: 0 */
    "offset"?: string;
    /** the size of one page. Example: 10 */
    "page_size": number;
    /** name of item. Example: apple */
    "item_name"?: string;
    /** 1:get item lack of requires attribute. 2:get item lack of optional attribute. Example: 2 */
    "attribute_status"?: number;
    /** sku. If you search for item_sku and item_name at the same time, only the results that match item_sku will be returned. If you search for item_sku and attribute_status at the same time, the results that match both item_sku and attribute_status will be returned. Example: sku */
    "item_sku"?: string;
    /** NORMAL/BANNED/UNLIST/ REVIEWING/SELLER_DELETE/SHOPEE_DELETE If you want to search multiple status, please upload the url like this: item_status=NORMAL&item_status=BANNED Example: ["NORMAL"] */
    "item_status"?: Array<string>;
    /** If deboost_only is true, then API will return items whose deboost is true, if deboost_only is empty or false, then API will return items whose deboost is true and false simultaneously Example: true */
    "deboost_only"?: boolean;
}
export interface SearchItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "item_id_list"?: Array<number>;
        "next_offset"?: string;
        "total_count"?: number;
    };
}
export interface SearchUnpackagedModelListRequest {
    "page_size": number;
    "item_name"?: string;
}
export interface SearchUnpackagedModelListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "total_count"?: number;
        "next_cursor"?: string;
        "model_list"?: Array<{
            "item_id"?: number;
            "item_name"?: string;
            "model_id"?: number;
            "unpackaged_sku_id"?: string;
        }>;
    };
}
export interface UnlistItemRequest {
    "item_list": Array<{
        "item_id"?: number;
        "unlist"?: boolean;
    }>;
}
export interface UnlistItemResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "failure_list"?: Array<{
            "item_id"?: number;
            "failed_reason"?: string;
        }>;
        "success_list"?: Array<{
            "item_id"?: number;
            "unlist"?: boolean;
        }>;
    };
}
export interface UpdateItemRequest {
    "description"?: string;
    "weight"?: number;
    "pre_order"?: {
        "days_to_ship"?: number;
        "is_pre_order"?: boolean;
    };
    "item_name"?: string;
    "attribute_list"?: Array<{
        "attribute_id"?: number;
        "attribute_value_list"?: Array<{
            "value_id"?: number;
            "original_value_name"?: string;
            "value_unit"?: string;
        }>;
    }>;
    "image"?: {
        "image_id_list"?: Array<Record<string, unknown>>;
    };
    "item_sku"?: string;
    "item_status"?: string;
    "logistic_info"?: Array<{
        "size_id"?: number;
        "shipping_fee"?: number;
        "enabled"?: boolean;
        "logistic_id"?: number;
        "is_free"?: boolean;
    }>;
    "wholesale"?: Array<{
        "min_count"?: number;
        "unit_price"?: number;
        "max_count"?: number;
    }>;
    "item_id": number;
    "category_id"?: number;
    "dimension"?: {
        "package_height"?: number;
        "package_length"?: number;
        "package_width"?: number;
    };
    "condition"?: string;
    "video_upload_id"?: Array<Record<string, unknown>>;
    "brand"?: {
        "brand_id"?: number;
        "original_brand_name"?: string;
    };
    "item_dangerous"?: number;
    "tax_info"?: {
        "ncm"?: string;
        "same_state_cfop"?: string;
        "diff_state_cfop"?: string;
        "csosn"?: string;
        "origin"?: string;
        "cest"?: string;
        "measure_unit"?: string;
        "invoice_option"?: string;
        "vat_rate"?: string;
        "hs_code"?: string;
        "tax_code"?: string;
    };
    "complaint_policy"?: {
        "warranty_time"?: string;
        "exclude_entrepreneur_warranty"?: boolean;
        "complaint_address_id"?: number;
        "additional_information"?: string;
    };
    "description_info"?: {
        "extended_description": {
            "field_list"?: Array<{
                "field_type"?: string;
                "text"?: string;
                "image_info": {
                    "image_id"?: string;
                };
            }>;
        };
    };
    "description_type"?: string;
}
export interface UpdateItemResponse {
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "description"?: string;
        "weight"?: number;
        "pre_order": {
            "days_to_ship"?: number;
            "is_pre_order"?: boolean;
        };
        "item_name"?: string;
        "item_status"?: string;
        "images": {
            "image_id_list"?: Array<string>;
            "image_url_list"?: Array<string>;
        };
        "logistic_info"?: Array<{
            "estimated_shipping_fee"?: number;
            "logistic_name"?: string;
            "enabled"?: boolean;
            "logistic_id"?: number;
            "is_free"?: boolean;
        }>;
        "item_id"?: number;
        "category_id"?: number;
        "dimension": {
            "package_width"?: number;
            "package_length"?: number;
            "package_height"?: number;
        };
        "condition"?: string;
        "brand": {
            "brand_id"?: number;
            "original_brand_name"?: string;
        };
        "item_dangerous"?: number;
        "complaint_policy": {
            "warranty_time"?: string;
            "exclude_entrepreneur_warranty"?: boolean;
            "additional_information"?: string;
        };
        "description_info": {
            "extended_description": {
                "field_list"?: Array<{
                    "field_type"?: string;
                    "text"?: string;
                    "image_info": {
                        "image_id"?: string;
                    };
                }>;
            };
        };
        "description_type"?: string;
    };
    "error"?: string;
}
export interface UpdateKitItemRequest {
    "item_id": number;
    "sync_setting"?: {
        "auto_sync_dts"?: boolean;
    };
    "item_setting"?: {
        "item_name"?: string;
        "images": {
            "image_id_list"?: Array<string>;
        };
        "description_type"?: string;
        "description_info": {
            "extended_description": {
                "field_list"?: Array<{
                    "field_type"?: string;
                    "text"?: string;
                }>;
            };
        };
        "logistic_info"?: Array<{
            "logistic_id"?: number;
            "enabled"?: boolean;
        }>;
        "weight"?: number;
        "model_list"?: Array<{
            "model_id"?: number;
            "tier_index"?: Array<number>;
            "original_price"?: number;
            "component_list"?: Array<{
                "component_item_id"?: number;
                "component_model_id"?: number;
                "main_component"?: boolean;
                "quantity"?: number;
            }>;
        }>;
        "tier_variation_list"?: Array<{
            "name"?: string;
            "option_list"?: Array<{
                "option"?: string;
            }>;
        }>;
    };
}
export interface UpdateKitItemResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "warning"?: string;
}
export interface UpdateModelRequest {
    "model": Array<{
        "model_sku"?: string;
        "pre_order": {
            "is_pre_order"?: boolean;
        };
        "weight"?: number;
    }>;
}
export interface UpdateModelResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdatePriceRequest {
    "item_id": number;
    "price_list": Array<{
        "model_id"?: number;
        "original_price"?: number;
    }>;
}
export interface UpdatePriceResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "failure_list"?: Array<{
            "model_id"?: number;
            "failed_reason"?: string;
        }>;
        "success_list"?: Array<{
            "model_id"?: number;
            "original_price"?: number;
        }>;
    };
}
export interface UpdateSipItemPriceRequest {
    "item_id": number;
    "sip_item_price": Array<{
        "model_id"?: number;
        "sip_item_price"?: number;
    }>;
}
export interface UpdateSipItemPriceResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface UpdateStockRequest {
    "item_id": number;
    "stock_list": Array<{
        "model_id"?: number;
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
    "response"?: {
        "failure_list"?: Array<{
            "model_id"?: number;
            "failed_reason"?: string;
        }>;
        "success_list"?: Array<{
            "model_id"?: number;
            "location_id"?: string;
            "stock"?: number;
        }>;
    };
}
export interface UpdateTierVariationRequest {
    "item_id": number;
    "model_list"?: Array<{
        "model_id"?: number;
        "tier_index"?: Array<number>;
    }>;
    "standardise_tier_variation"?: Array<{
        "variation_id"?: number;
        "variation_name"?: string;
        "variation_option_list"?: Array<{
            "variation_option_id"?: number;
            "variation_option_name"?: string;
            "image_id"?: string;
        }>;
    }>;
}
export interface UpdateTierVariationResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export declare class ShopeeProductApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add item
     * /api/v2/product/add_item (POST)
     */
    addItem(params: AddItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddItemResponse>>;
    /**
     * add kit item
     * /api/v2/product/add_kit_item (POST)
     */
    addKitItem(params: AddKitItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddKitItemResponse>>;
    /**
     * add model
     * /api/v2/product/add_model (POST)
     */
    addModel(params: AddModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddModelResponse>>;
    /**
     * batch add item
     * /api/v2/product/batch_add_item (POST)
     */
    batchAddItem(params: BatchAddItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchAddItemResponse>>;
    /**
     * batch publish item to outlet shop
     * /api/v2/product/batch_publish_item_to_outlet_shop (POST)
     */
    batchPublishItemToOutletShop(params: BatchPublishItemToOutletShopRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchPublishItemToOutletShopResponse>>;
    /**
     * batch update outlet price
     * /api/v2/product/batch_update_outlet_price (POST)
     */
    batchUpdateOutletPrice(params: BatchUpdateOutletPriceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchUpdateOutletPriceResponse>>;
    /**
     * batch update outlet stock
     * /api/v2/product/batch_update_outlet_stock (POST)
     */
    batchUpdateOutletStock(params: BatchUpdateOutletStockRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchUpdateOutletStockResponse>>;
    /**
     * boost item
     * /api/v2/product/boost_item (POST)
     */
    boostItem(params: BoostItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BoostItemResponse>>;
    /**
     * category recommend
     * /api/v2/product/category_recommend (GET)
     */
    categoryRecommend(params: CategoryRecommendRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CategoryRecommendResponse>>;
    /**
     * delete item
     * /api/v2/product/delete_item (POST)
     */
    deleteItem(params: DeleteItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteItemResponse>>;
    /**
     * delete model
     * /api/v2/product/delete_model (POST)
     */
    deleteModel(params: DeleteModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteModelResponse>>;
    /**
     * generate kit image
     * /api/v2/product/generate_kit_image (POST)
     */
    generateKitImage(params: GenerateKitImageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GenerateKitImageResponse>>;
    /**
     * get aitem by pitem id
     * /api/v2/product/get_aitem_by_pitem_id (GET)
     */
    getAitemByPitemId(params: GetAitemByPitemIdRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAitemByPitemIdResponse>>;
    /**
     * get all vehicle list
     * /api/v2/product/get_all_vehicle_list (GET)
     */
    getAllVehicleList(params: GetAllVehicleListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAllVehicleListResponse>>;
    /**
     * get attribute tree
     * /api/v2/product/get_attribute_tree (GET)
     */
    getAttributeTree(params: GetAttributeTreeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAttributeTreeResponse>>;
    /**
     * get batch task result
     * /api/v2/product/get_batch_task_result (GET)
     */
    getBatchTaskResult(params: GetBatchTaskResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBatchTaskResultResponse>>;
    /**
     * get boosted list
     * /api/v2/product/get_boosted_list (GET)
     */
    getBoostedList(params: GetBoostedListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBoostedListResponse>>;
    /**
     * get brand list
     * /api/v2/product/get_brand_list (GET)
     */
    getBrandList(params: GetBrandListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBrandListResponse>>;
    /**
     * get category
     * /api/v2/product/get_category (GET)
     */
    getCategory(params: GetCategoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCategoryResponse>>;
    /**
     * get comment
     * /api/v2/product/get_comment (GET)
     */
    getComment(params: GetCommentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetCommentResponse>>;
    /**
     * get direct item list
     * /api/v2/product/get_direct_item_list (GET)
     */
    getDirectItemList(params: GetDirectItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetDirectItemListResponse>>;
    /**
     * get direct shop recommended price
     * /api/v2/product/get_direct_shop_recommended_price (GET)
     */
    getDirectShopRecommendedPrice(params: GetDirectShopRecommendedPriceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetDirectShopRecommendedPriceResponse>>;
    /**
     * get item base info
     * /api/v2/product/get_item_base_info (GET)
     */
    getItemBaseInfo(params: GetItemBaseInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemBaseInfoResponse>>;
    /**
     * get item content diagnosis result
     * /api/v2/product/get_item_content_diagnosis_result (POST)
     */
    getItemContentDiagnosisResult(params: GetItemContentDiagnosisResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemContentDiagnosisResultResponse>>;
    /**
     * get item extra info
     * /api/v2/product/get_item_extra_info (GET)
     */
    getItemExtraInfo(params: GetItemExtraInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemExtraInfoResponse>>;
    /**
     * get item limit
     * /api/v2/product/get_item_limit (GET)
     */
    getItemLimit(params: GetItemLimitRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemLimitResponse>>;
    /**
     * get item list
     * /api/v2/product/get_item_list (GET)
     */
    getItemList(params: GetItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemListResponse>>;
    /**
     * get item list by content diagnosis
     * /api/v2/product/get_item_list_by_content_diagnosis (POST)
     */
    getItemListByContentDiagnosis(params: GetItemListByContentDiagnosisRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemListByContentDiagnosisResponse>>;
    /**
     * get item promotion
     * /api/v2/product/get_item_promotion (GET)
     */
    getItemPromotion(params: GetItemPromotionRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemPromotionResponse>>;
    /**
     * get item violation info
     * /api/v2/product/get_item_violation_info (GET)
     */
    getItemViolationInfo(params: GetItemViolationInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemViolationInfoResponse>>;
    /**
     * get kit item info
     * /api/v2/product/get_kit_item_info (GET)
     */
    getKitItemInfo(params: GetKitItemInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetKitItemInfoResponse>>;
    /**
     * get kit item limit
     * /api/v2/product/get_kit_item_limit (GET)
     */
    getKitItemLimit(params: GetKitItemLimitRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetKitItemLimitResponse>>;
    /**
     * get main item list
     * /api/v2/product/get_main_item_list (GET)
     */
    getMainItemList(params: GetMainItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMainItemListResponse>>;
    /**
     * get mart item by outlet item id
     * /api/v2/product/get_mart_item_by_outlet_item_id (POST)
     */
    getMartItemByOutletItemId(params: GetMartItemByOutletItemIdRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMartItemByOutletItemIdResponse>>;
    /**
     * get mart item mapping by id
     * /api/v2/product/get_mart_item_mapping_by_id (POST)
     */
    getMartItemMappingById(params: GetMartItemMappingByIdRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMartItemMappingByIdResponse>>;
    /**
     * get model list
     * /api/v2/product/get_model_list (GET)
     */
    getModelList(params: GetModelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetModelListResponse>>;
    /**
     * get product certification rule
     * /api/v2/product/get_product_certification_rule (POST)
     */
    getProductCertificationRule(params: GetProductCertificationRuleRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetProductCertificationRuleResponse>>;
    /**
     * get recommend attribute
     * /api/v2/product/get_recommend_attribute (GET)
     */
    getRecommendAttribute(params: GetRecommendAttributeRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetRecommendAttributeResponse>>;
    /**
     * get size chart detail
     * /api/v2/product/get_size_chart_detail (GET)
     */
    getSizeChartDetail(params: GetSizeChartDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSizeChartDetailResponse>>;
    /**
     * get size chart list
     * /api/v2/product/get_size_chart_list (GET)
     */
    getSizeChartList(params: GetSizeChartListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetSizeChartListResponse>>;
    /**
     * get variations
     * /api/v2/product/get_variation_tree (GET)
     */
    getVariations(params: GetVariationsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVariationsResponse>>;
    /**
     * get vehicle list by compatibility detail
     * /api/v2/product/get_vehicle_list_by_compatibility_detail (GET)
     */
    getVehicleListByCompatibilityDetail(params: GetVehicleListByCompatibilityDetailRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVehicleListByCompatibilityDetailResponse>>;
    /**
     * get weight recommendation
     * /api/v2/product/get_weight_recommendation (POST)
     */
    getWeightRecommendation(params: GetWeightRecommendationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetWeightRecommendationResponse>>;
    /**
     * init tier variation
     * /api/v2/product/init_tier_variation (POST)
     */
    initTierVariation(params: InitTierVariationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<InitTierVariationResponse>>;
    /**
     * publish item to outlet shop
     * /api/v2/product/publish_item_to_outlet_shop (POST)
     */
    publishItemToOutletShop(params: PublishItemToOutletShopRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<PublishItemToOutletShopResponse>>;
    /**
     * register brand
     * /api/v2/product/register_brand (POST)
     */
    registerBrand(params: RegisterBrandRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<RegisterBrandResponse>>;
    /**
     * reply comment
     * /api/v2/product/reply_comment (POST)
     */
    replyComment(params: ReplyCommentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ReplyCommentResponse>>;
    /**
     * search attribute value list
     * /api/v2/product/search_attribute_value_list (POST)
     */
    searchAttributeValueList(params: SearchAttributeValueListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SearchAttributeValueListResponse>>;
    /**
     * search item
     * /api/v2/product/search_item (GET)
     */
    searchItem(params: SearchItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SearchItemResponse>>;
    /**
     * search unpackaged model list
     * /api/v2/product/search_unpackaged_model_list (POST)
     */
    searchUnpackagedModelList(params: SearchUnpackagedModelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SearchUnpackagedModelListResponse>>;
    /**
     * unlist item
     * /api/v2/product/unlist_item (POST)
     */
    unlistItem(params: UnlistItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UnlistItemResponse>>;
    /**
     * update item
     * /api/v2/product/update_item (POST)
     */
    updateItem(params: UpdateItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateItemResponse>>;
    /**
     * update kit item
     * /api/v2/product/update_kit_item (POST)
     */
    updateKitItem(params: UpdateKitItemRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateKitItemResponse>>;
    /**
     * update model
     * /api/v2/product/update_model (POST)
     */
    updateModel(params: UpdateModelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateModelResponse>>;
    /**
     * update price
     * /api/v2/product/update_price (POST)
     */
    updatePrice(params: UpdatePriceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdatePriceResponse>>;
    /**
     * update sip item price
     * /api/v2/product/update_sip_item_price (POST)
     */
    updateSipItemPrice(params: UpdateSipItemPriceRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateSipItemPriceResponse>>;
    /**
     * update stock
     * /api/v2/product/update_stock (POST)
     */
    updateStock(params: UpdateStockRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateStockResponse>>;
    /**
     * update tier variation
     * /api/v2/product/update_tier_variation (POST)
     */
    updateTierVariation(params: UpdateTierVariationRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateTierVariationResponse>>;
}
