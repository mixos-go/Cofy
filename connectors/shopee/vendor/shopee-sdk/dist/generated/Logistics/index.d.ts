import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface BatchShipOrderRequest {
    "order_list": Array<{
        "order_sn"?: string;
    }>;
    "dropoff"?: {
        "tracking_no"?: string;
        "branch_id"?: number;
        "sender_real_name"?: string;
    };
}
export interface BatchShipOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "result_list"?: Array<{
            "order_sn"?: string;
        }>;
    };
}
export interface BatchUpdateTpfWarehouseTrackingStatusRequest {
    "tpf_name": string;
    "tpf_tracking_status": string;
    "package_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
        "update_time"?: number;
    }>;
}
export interface BatchUpdateTpfWarehouseTrackingStatusResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: Array<{
        "success_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
        }>;
        "fail_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    }>;
}
export interface CheckPolygonUpdateStatusRequest {
    "task_id": string;
}
export interface CheckPolygonUpdateStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "status"?: number;
        "message"?: string;
    };
}
export interface CreateBookingShippingDocumentRequest {
    "booking_list": Array<{
        "booking_sn"?: string;
        "tracking_number"?: string;
        "shipping_document_type"?: string;
    }>;
}
export interface CreateBookingShippingDocumentResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "warning"?: Array<{
        "booking_sn"?: string;
    }>;
    "response"?: {
        "result_list"?: Array<{
            "booking_sn"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export interface CreateShippingDocumentRequest {
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
        "tracking_number"?: string;
        "shipping_document_type"?: string;
    }>;
}
export interface CreateShippingDocumentResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "result_list"?: Array<{
            "order_sn"?: string;
        }>;
    };
    "warning"?: null;
    "request_id"?: string;
}
export interface CreateShippingDocumentJobRequest {
    "shipping_document_type": string;
    "unpackaged_sku_requests"?: Array<{
        "unpackaged_sku_id"?: string;
        "quantity"?: number;
    }>;
}
export interface CreateShippingDocumentJobResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "job_id"?: string;
        "success_id_list"?: Array<string>;
        "fail_list"?: unknown[];
    };
}
export interface DeleteAddressRequest {
    "address_id": number;
}
export interface DeleteAddressResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface DeleteSpecialOperatingHourRequest {
    "name": string;
}
export interface DeleteSpecialOperatingHourResponse {
    "message"?: string;
    "error"?: string;
}
export interface DownloadBookingShippingDocumentRequest {
    "shipping_document_type"?: string;
    "booking_list": Array<{
        "booking_sn"?: string;
    }>;
}
export interface DownloadBookingShippingDocumentResponse {
    "waybill"?: string;
}
export interface DownloadShippingDocumentRequest {
    "shipping_document_type"?: string;
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
}
export interface DownloadShippingDocumentResponse {
    /** The waybill file. Example: The waybill file. */
    "waybill"?: unknown;
}
export interface DownloadShippingDocumentJobRequest {
    "job_id": string;
}
export interface DownloadShippingDocumentJobResponse {
    "file"?: unknown;
}
export interface DownloadToLabelRequest {
    "sorting_group": number;
    "quantity"?: number;
}
export interface DownloadToLabelResponse {
    "waybill"?: string;
}
export interface GetAddressListRequest {
}
export interface GetAddressListResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "show_pickup_address"?: boolean;
        "address_list"?: Array<{
            "address_id"?: number;
            "region"?: string;
            "state"?: string;
            "city"?: string;
            "address"?: string;
            "zipcode"?: string;
            "district"?: string;
            "town"?: string;
            "address_type"?: unknown[];
        }>;
    };
    "request_id"?: string;
}
export interface GetBookingShippingDocumentDataInfoRequest {
    "booking_sn": string;
    "recipient_address_info"?: Array<{
        "key"?: string;
        "style": {
            "text_style"?: Array<string>;
            "text_color"?: string;
            "image_width"?: number;
            "h_align"?: string;
        };
    }>;
}
export interface GetBookingShippingDocumentDataInfoResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "recipient_address_info": {
            "key"?: string;
            "image"?: string;
        };
        "shipping_document_info": {
            "booking_weight"?: number;
            "logistics_channel_id"?: number;
            "shipping_carrier"?: string;
            "recipient_sort_code": {
                "first_recipient_sort_code"?: string;
                "second_recipient_sort_code"?: string;
                "third_recipient_sort_code"?: string;
            };
            "sender_sort_code": {
                "first_sender_sort_code"?: string;
                "second_sender_sort_code"?: string;
                "third_sender_sort_code"?: string;
            };
            "return_sort_code": {
                "return_first_sort_code"?: string;
            };
            "tracking_number"?: string;
            "pickup_hub"?: string;
            "delivery_hub"?: string;
            "deliver_area"?: string;
            "ec_booking_no"?: string;
            "create_date_ymd_sl"?: string;
            "manufacturers_name"?: string;
            "manufacturers_website"?: string;
            "is_lm_dg_bool"?: number;
            "spx_sub_district"?: string;
            "spx_receive_station": {
                "spx_first_receive_station"?: string;
            };
            "zone"?: string;
            "zone_code"?: string;
            "destination_base_code"?: string;
            "dg_specific_type"?: number;
        };
    };
}
export interface GetBookingShippingDocumentParameterRequest {
    "booking_list": Array<{
        "booking_sn"?: string;
    }>;
}
export interface GetBookingShippingDocumentParameterResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "warning"?: Array<{
        "booking_sn"?: string;
    }>;
    "response"?: {
        "result_list"?: Array<{
            "booking_sn"?: string;
            "suggest_shipping_document_type"?: string;
            "selectable_shipping_document_type"?: Array<string>;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export interface GetBookingShippingDocumentResultRequest {
    "booking_list": Array<{
        "booking_sn"?: string;
        "shipping_document_type"?: string;
    }>;
}
export interface GetBookingShippingDocumentResultResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "warning"?: Array<{
        "booking_sn"?: string;
    }>;
    "response"?: {
        "result_list"?: Array<{
            "booking_sn"?: string;
            "status"?: string;
            "fail_error"?: string;
            "fail_message"?: string;
        }>;
    };
}
export interface GetBookingShippingParameterRequest {
    /** Shopee's unique identifier for a booking. Example: 201214JASXYXY6 */
    "booking_sn": string;
}
export interface GetBookingShippingParameterResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "info_needed": {
            "dropoff"?: unknown[];
            "pickup"?: Array<string>;
        };
        "pickup": {
            "address_list"?: Array<{
                "region"?: string;
                "state"?: string;
                "city"?: string;
                "district"?: string;
                "town"?: string;
                "address"?: string;
                "zipcode"?: string;
                "address_flag"?: Array<string>;
                "time_slot_list"?: Array<{
                    "date"?: number;
                    "time_text"?: string;
                    "pickup_time_id"?: string;
                    "error"?: string;
                    "msg"?: string;
                }>;
            }>;
        };
    };
}
export interface GetBookingTrackingInfoRequest {
    /** Shopee's unique identifier for a booking. Example: 201201E81SYYKE */
    "booking_sn": string;
}
export interface GetBookingTrackingInfoResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "booking_sn"?: string;
        "logistics_status"?: string;
        "tracking_info"?: Array<{
            "update_time"?: number;
            "description"?: string;
            "logistics_status"?: string;
        }>;
    };
}
export interface GetBookingTrackingNumberRequest {
    /** Shopee's unique identifier for a booking. Example: 201201E81SYYKE */
    "booking_sn": string;
}
export interface GetBookingTrackingNumberResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "tracking_number"?: string;
}
export interface GetChannelListRequest {
}
export interface GetChannelListResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "logistics_channel_list"?: Array<{
            "block_seller_cover_shipping_fee"?: boolean;
            "cod_enabled"?: boolean;
            "enabled"?: boolean;
            "fee_type"?: string;
            "force_enable"?: boolean;
            "item_max_dimension": {
                "dimension_sum"?: number;
                "height"?: number;
                "length"?: number;
                "unit"?: string;
                "width"?: number;
            };
            "logistics_capability": {
                "seller_logistics"?: boolean;
            };
            "logistics_channel_id"?: number;
            "logistics_channel_name"?: string;
            "logistics_description"?: string;
            "mask_channel_id"?: number;
            "seller_logistic_has_configuration"?: null;
            "size_list"?: unknown[];
            "support_cross_border"?: boolean;
            "volume_limit": {
                "item_max_volume"?: number;
                "item_min_volume"?: number;
            };
            "weight_limit": {
                "item_max_weight"?: number;
                "item_min_weight"?: number;
            };
            "support_pause"?: boolean;
        }>;
    };
}
export interface GetMartPackagingInfoRequest {
}
export interface GetMartPackagingInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "enable"?: boolean;
        "dimension": {
            "length"?: number;
            "width"?: number;
            "height"?: number;
        };
        "packaging_fee": {
            "value"?: number;
        };
    };
}
export interface GetMassShippingParameterRequest {
    "package_list": Array<{
        "package_number"?: string;
    }>;
    "logistics_channel_id"?: number;
    "product_location_id"?: string;
}
export interface GetMassShippingParameterResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "info_needed": {
            "dropoff"?: unknown[];
            "pickup"?: Array<string>;
        };
        "dropoff": {
            "branch_list"?: null;
        };
        "pickup": {
            "address_list"?: Array<{
                "address"?: string;
                "address_flag"?: unknown[];
                "address_id"?: number;
                "city"?: string;
                "district"?: string;
                "region"?: string;
                "state"?: string;
                "time_slot_list"?: Array<{
                    "date"?: number;
                    "pickup_time_id"?: string;
                }>;
                "town"?: string;
                "zipcode"?: string;
            }>;
        };
        "success_list"?: Array<{
            "package_number"?: string;
        }>;
        "fail_list"?: Array<{
            "fail_reason"?: string;
            "package_number"?: string;
        }>;
    };
}
export interface GetMassTrackingNumberRequest {
    "package_list": Array<{
        "package_number"?: string;
    }>;
    "response_optional_fields"?: string;
}
export interface GetMassTrackingNumberResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "fail_list"?: unknown[];
        "success_list"?: Array<{
            "first_mile_tracking_number"?: string;
            "hint"?: string;
            "package_number"?: string;
            "pickup_code"?: string;
            "tracking_number"?: string;
        }>;
    };
}
export interface GetOperatingHourRestrictionsRequest {
}
export interface GetOperatingHourRestrictionsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "regular_operating_hour_restrictions": {
            "minimum_working_days_in_week"?: number;
            "working_day_config": {
                "monday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "tuesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "wednesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "thursday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "friday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "saturday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "sunday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "public_holiday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
            };
        };
        "instant_operating_hour_restrictions": {
            "minimum_working_days_in_week"?: number;
            "working_day_config": {
                "monday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "tuesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "wednesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "thursday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "friday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "saturday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "sunday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "public_holiday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
            };
        };
        "special_operating_hour_restrictions": {
            "special_day": {
                "mandatory"?: boolean;
                "minimum_operating_hour"?: number;
                "minimum_start_time"?: string;
                "maximum_start_time"?: string;
                "minimum_end_time"?: string;
                "maximum_end_time"?: string;
                "operating_24_hour_toggle"?: boolean;
            };
        };
        "shop_collection_operating_hour_restrictions": {
            "minimum_working_days_in_week"?: number;
            "working_day_config": {
                "monday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "tuesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: string;
                };
                "wednesday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "thursday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "friday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "saturday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "sunday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
                "public_holiday": {
                    "mandatory"?: boolean;
                    "minimum_operating_hour"?: number;
                    "minimum_start_time"?: string;
                    "maximum_start_time"?: string;
                    "minimum_end_time"?: string;
                    "maximum_end_time"?: string;
                    "operating_24_hour_toggle"?: boolean;
                };
            };
        };
    };
}
export interface GetOperatingHoursRequest {
}
export interface GetOperatingHoursResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "repsonse"?: {
        "regular_operating_hour": {
            "monday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "tuesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "wednesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "thursday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "friday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "saturday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "sunday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "public_holiday": {
                "start_time"?: string;
                "end_time"?: string;
            };
        };
        "instant_operating_hour": {
            "monday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "tuesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "wednesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "thursday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "friday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "saturday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "sunday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "public_holiday": {
                "start_time"?: string;
                "end_time"?: string;
            };
        };
        "special_operating_hour": {
            "name"?: string;
            "start_date"?: string;
            "end_date"?: string;
            "operating_hours"?: Array<{
                "date"?: string;
                "start_time"?: string;
                "end_time"?: string;
                "enable"?: boolean;
            }>;
        };
        "shop_collection_operating_hour": {
            "monday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "tuesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "wednesday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "thursday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "friday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "saturday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "sunday": {
                "start_time"?: string;
                "end_time"?: string;
            };
            "public_holiday": {
                "start_time"?: string;
                "end_time"?: string;
            };
        };
    };
}
export interface GetPauseStatusRequest {
}
export interface GetPauseStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "is_paused"?: boolean;
        "pause_end_time"?: number;
        "remaining_pause_quota"?: number;
    };
}
export interface GetShippingDocumentDataInfoRequest {
    "order_sn": string;
    "package_number"?: string;
    "recipient_address_info"?: Array<{
        "key"?: string;
        "style": {
            "h_align"?: string;
            "text_style"?: Array<string>;
            "font_size"?: number;
            "text_color"?: string;
            "image_width"?: number;
        };
    }>;
}
export interface GetShippingDocumentDataInfoResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "recipient_address_info": {
            "key"?: string;
            "image"?: string;
        };
        "shipping_document_info": {
            "cod"?: boolean;
            "cod_amount"?: string;
            "order_weight"?: number;
            "logistics_channel_id"?: number;
            "shipping_carrier"?: string;
            "service_code"?: string;
            "first_mile_name"?: string;
            "last_mile_name"?: string;
            "goods_to_declare"?: boolean;
            "lane_code"?: string;
            "warehouse_address"?: string;
            "warehouse_id"?: string;
            "recipient_sort_code": {
                "first_recipient_sort_code"?: string;
                "second_recipient_sort_code"?: string;
                "third_recipient_sort_code"?: string;
            };
            "sender_sort_code": {
                "first_sender_sort_code"?: string;
                "second_sender_sort_code"?: string;
                "third_sender_sort_code"?: string;
            };
            "return_sort_code": {
                "return_first_sort_code"?: string;
            };
            "third_party_logistic_info": {
                "service_description"?: string;
                "barcode"?: string;
                "purchase_time"?: string;
                "return_time"?: string;
                "manufacturers_name"?: string;
                "manufacturers_website"?: string;
                "recipient_area"?: string;
                "route_step"?: string;
                "suda5_code"?: string;
                "large_logistics_id"?: string;
                "parent_id"?: string;
                "return_cycle"?: string;
                "return_mode"?: string;
                "prompt"?: string;
                "order_sn"?: string;
                "qrcode"?: string;
                "ec_supplier_name"?: string;
                "ec_bar_code16"?: string;
                "equipment_id"?: string;
                "eshop_id"?: string;
                "ec_bar_code9"?: string;
                "pelican_tracking_no"?: string;
                "print_date"?: string;
                "pzip"?: string;
                "pzip_c"?: string;
                "deliver_area_txt"?: string;
                "deliver_date_ymd"?: string;
                "sd_driver_code"?: string;
                "md_driver_code"?: string;
                "putorder_stackzone_code"?: string;
                "customer_code"?: string;
                "deliver_router"?: string;
                "store_type"?: string;
                "pick_router"?: string;
                "barcode_dc"?: string;
                "ec_order_number"?: string;
                "barcode_pr"?: string;
                "first_pick_barcode"?: string;
                "second_pick_barcode"?: string;
                "is_cod_bool"?: string;
                "receiver_name"?: string;
                "rcv_store_name"?: string;
                "branch_code"?: string;
                "branch_name"?: string;
                "last_third_digits_recipient_phone"?: string;
                "last_third_digits_sender_phone"?: string;
                "barcode_no1"?: string;
                "barcode_no2"?: string;
                "print_datetime"?: string;
                "ok_mid_type"?: string;
                "ok_aisle_no"?: string;
                "ok_grid_no"?: string;
                "ok_tracking_number"?: string;
                "barcode_no3"?: string;
                "ship_type"?: string;
                "area"?: string;
                "barcode_no4"?: string;
                "barcode_no5"?: string;
                "tw_last_three_digits_buyer_phone"?: string;
                "tw_store_name"?: string;
                "tw_store_number"?: string;
                "buyer_prefer_delivery_time": {
                    "slot_id"?: string;
                    "start_time"?: string;
                    "end_time"?: string;
                    "description"?: string;
                };
            };
            "tracking_number"?: string;
            "shopee_tracking_number"?: string;
            "last_mile_tracking_number"?: string;
            "pickup_hub"?: string;
            "delivery_hub"?: string;
            "deliver_area"?: string;
            "ec_order_no"?: string;
            "create_date_ymd_sl"?: string;
            "manufacturers_name"?: string;
            "manufacturers_website"?: string;
            "is_lm_dg_bool"?: number;
            "preferred_delivery_option"?: number;
            "spx_sub_district"?: string;
            "spx_receive_station": {
                "spx_first_receive_station"?: string;
            };
            "zone"?: string;
            "zone_code"?: string;
            "destination_base_code"?: string;
            "last_third_digits_buyer_phone"?: string;
            "parcel_size"?: string;
            "sod"?: boolean;
            "buyer_cpf_id"?: string;
            "mutual_check"?: number;
            "dely_fri_label"?: string;
            "dely_sat_label"?: string;
            "dely_sun_label"?: string;
            "pickup_code"?: string;
            "sorting_group"?: string;
            "unpackaged_sku_id"?: string;
            "unpackaged_sku_id_qrcode"?: string;
            "high_value"?: boolean;
            "dg_specific_type"?: number;
            "hotspot_id"?: string;
            "weekend1_delivery_success_label"?: string;
            "weekend2_delivery_success_label"?: string;
        };
    };
}
export interface GetShippingDocumentJobStatusRequest {
    "job_id": string;
}
export interface GetShippingDocumentJobStatusResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "job_id"?: string;
        "job_name"?: string;
        "job_status"?: string;
    };
}
export interface GetShippingDocumentParameterRequest {
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
}
export interface GetShippingDocumentParameterResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "result_list"?: Array<{
            "order_sn"?: string;
            "package_number"?: string;
            "suggest_shipping_document_type"?: string;
            "selectable_shipping_document_type"?: Array<string>;
        }>;
    };
    "warning"?: Array<{
        "order_sn"?: string;
    }>;
    "request_id"?: string;
}
export interface GetShippingDocumentResultRequest {
    "order_list": Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
}
export interface GetShippingDocumentResultResponse {
    "message"?: string;
    "warning"?: Array<{
        "order_sn"?: string;
        "package_number"?: string;
    }>;
    "request_id"?: string;
    "response"?: {
        "result_list"?: Array<{
            "status"?: string;
            "order_sn"?: string;
            "package_number"?: string;
        }>;
    };
    "error"?: string;
}
export interface GetShippingParameterRequest {
    /** Shopee's unique identifier for an order. Example: 201214JASXYXY6 */
    "order_sn": string;
    /** Shopee's unique identifier for the package under an order. You should't fill the field with empty string when there is't a package number. Example: OFG134731496217591 */
    "package_number"?: string;
}
export interface GetShippingParameterResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "info_needed": {
            "dropoff"?: unknown[];
            "pickup"?: Array<string>;
        };
        "dropoff"?: null;
        "pickup": {
            "address_list"?: Array<{
                "address_id"?: number;
                "region"?: string;
                "state"?: string;
                "city"?: string;
                "district"?: string;
                "town"?: string;
                "address"?: string;
                "zipcode"?: string;
                "address_flag"?: Array<string>;
                "time_slot_list"?: null;
            }>;
        };
    };
    "request_id"?: string;
}
export interface GetTrackingInfoRequest {
    /** Shopee's unique identifier for an order. Example: 2409177JCSRTEU */
    "order_sn": string;
    /** Shopee's unique identifier for the package under an order. You shouldn't fill the field with empty string when there is a package number. */
    "package_number"?: string;
}
export interface GetTrackingInfoResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "order_sn"?: string;
        "package_number"?: string;
        "logistics_status"?: string;
        "tracking_info"?: Array<{
            "update_time"?: number;
            "description"?: string;
            "logistics_status"?: string;
            "return_code"?: string;
        }>;
        "collection_pin_code"?: string;
        "reversed_tracking_number"?: string;
        "reversed_courier_name"?: string;
        "reversed_tracking_info"?: Array<{
            "update_time"?: number;
            "description"?: string;
        }>;
    };
}
export interface GetTrackingNumberRequest {
    /** Shopee's unique identifier for an order. Example: 201214JASXYXY6 */
    "order_sn": string;
    /** Shopee's unique identifier for the package under an order. You should't fill the field with empty string when there isn't a package number. */
    "package_number"?: string;
    /** Indicate response fields you want to get. Please select from the below response parameters. If you input an object field, all the params under it will be included automatically in the response. If there are multiple response fields you want to get, you need to use English comma to connect them. Available values: plp_number, first_mile_tracking_number,last_mile_tracking_number Example: first_mile_tracking_number */
    "response_optional_fields"?: string;
}
export interface GetTrackingNumberResponse {
    "error"?: string;
    "message"?: string;
    "response"?: {
        "tracking_number"?: string;
        "first_mile_tracking_number"?: string;
    };
    "request_id"?: string;
}
export interface MassShipOrderRequest {
    "package_list": Array<{
        "package_number"?: string;
    }>;
    "pickup"?: {
        "address_id"?: number;
        "pickup_time_id"?: string;
    };
}
export interface MassShipOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "fail_list"?: Array<{
            "fail_reason"?: string;
            "package_number"?: string;
        }>;
        "success_list"?: Array<{
            "package_number"?: string;
        }>;
    };
}
export interface SetAddressConfigRequest {
    "show_pick_up_address"?: boolean;
    "address_type_config"?: {
        "address_id"?: number;
        "address_type"?: Array<string>;
    };
}
export interface SetAddressConfigResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface SetMartPackagingInfoRequest {
    "enable": boolean;
    "dimension"?: {
        "length"?: number;
        "width"?: number;
        "height"?: number;
    };
    "packaging_fee"?: {
        "value"?: number;
    };
}
export interface SetMartPackagingInfoResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "enable"?: boolean;
        "dimension": {
            "length"?: number;
            "width"?: number;
            "height"?: number;
        };
        "packaging_fee": {
            "value"?: number;
        };
    };
}
export interface SetPauseStatusRequest {
    "is_paused": boolean;
}
export interface SetPauseStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "is_paused"?: boolean;
        "pause_end_time"?: number;
        "remaining_pause_quota"?: number;
    };
}
export interface ShipBookingRequest {
    "booking_sn": string;
    "pickup"?: {
        "pickup_time_id"?: string;
    };
    "dropoff"?: Record<string, unknown>;
}
export interface ShipBookingResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
}
export interface ShipOrderRequest {
    "order_sn": string;
    "package_number"?: string;
    "pickup"?: {
        "address_id"?: number;
        "pickup_time_id"?: string;
        "tracking_number"?: string;
    };
}
export interface ShipOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateAddressRequest {
    "address_id": number;
    "region"?: string;
    "state"?: string;
    "city"?: string;
    "district"?: string;
    "town"?: string;
    "address"?: string;
    "zipcode"?: string;
    "name"?: string;
    "phone"?: string;
    "geo_info"?: string;
}
export interface UpdateAddressResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateChannelRequest {
    "logistics_channel_id": number;
    "enabled"?: boolean;
    "cod_enabled"?: boolean;
}
export interface UpdateChannelResponse {
    "request_id"?: string;
    "error"?: string;
    "message"?: string;
    "response"?: {
        "shop_id"?: number;
        "enabled"?: boolean;
        "cod_enabled"?: boolean;
        "logistics_channel_id"?: number;
        "is_multi_warehouse"?: boolean;
        "update_channels"?: Array<{
            "channel_id"?: number;
            "channel_display_name"?: string;
            "unsupport_warehouse"?: Array<{
                "warehouse_id"?: number;
                "warehouse_name"?: string;
            }>;
        }>;
    };
}
export interface UpdateOperatingHoursRequest {
    "regular_operating_hour"?: {
        "monday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "tuesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "wednesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "thursday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "friday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "saturday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "sunday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "public_holiday": {
            "start_time"?: string;
            "end_time"?: string;
        };
    };
    "special_operating_hour"?: {
        "name"?: string;
        "start_date"?: string;
        "end_date"?: string;
        "operating_hours"?: Array<{
            "date"?: string;
            "start_time"?: string;
            "end_time"?: string;
            "enable"?: boolean;
        }>;
    };
    "instant_operating_hour"?: {
        "monday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "tuesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "wednesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "thrusday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "friday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "saturday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "sunday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "public_holiday": {
            "start_time"?: string;
            "end_time"?: string;
        };
    };
    "shop_collection_operating_hour"?: {
        "monday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "tuesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "wednesday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "thursday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "friday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "saturday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "sunday": {
            "start_time"?: string;
            "end_time"?: string;
        };
        "public_holiday": {
            "start_time"?: string;
            "end_time"?: string;
        };
    };
}
export interface UpdateOperatingHoursResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "result_list": {
            "regular_operating_hour": {
                "status"?: string;
                "fail_message"?: string;
            };
            "special_operating_hour": {
                "status"?: string;
                "fail_message"?: string;
            };
            "instant_operating_hour": {
                "status"?: string;
                "fail_message"?: string;
            };
            "shop_collection_operating_hour": {
                "status"?: string;
                "fail_message"?: string;
            };
        };
    };
}
export interface UpdateSelfCollectionOrderLogisticsRequest {
    "package_number": string;
    "self_collection_logistics_action": string;
    "epoc_image_list"?: Array<string>;
    "pin"?: string;
}
export interface UpdateSelfCollectionOrderLogisticsResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateShippingOrderRequest {
    "order_sn": string;
    "package_number"?: string;
    "pickup"?: {
        "address_id"?: number;
        "pickup_time_id"?: string;
    };
}
export interface UpdateShippingOrderResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
}
export interface UpdateTrackingStatusRequest {
    "order_sn": string;
    "tracking_number"?: string;
    "tracking_url"?: string;
    "logistics_status": string;
}
export interface UpdateTrackingStatusResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "update_result"?: string;
    };
}
export interface UploadServiceablePolygonRequest {
    "file": string;
}
export interface UploadServiceablePolygonResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "task_id"?: string;
    };
}
export declare class ShopeeLogisticsApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * batch ship order
     * /api/v2/logistics/batch_ship_order (POST)
     */
    batchShipOrder(params: BatchShipOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchShipOrderResponse>>;
    /**
     * batch update tpf warehouse tracking status
     * /api/v2/logistics/batch_update_tpf_warehouse_tracking_status (POST)
     */
    batchUpdateTpfWarehouseTrackingStatus(params: BatchUpdateTpfWarehouseTrackingStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<BatchUpdateTpfWarehouseTrackingStatusResponse>>;
    /**
     * check polygon update status
     * /api/v2/logistics/check_polygon_update_status (POST)
     */
    checkPolygonUpdateStatus(params: CheckPolygonUpdateStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CheckPolygonUpdateStatusResponse>>;
    /**
     * create booking shipping document
     * /api/v2/logistics/create_booking_shipping_document (POST)
     */
    createBookingShippingDocument(params: CreateBookingShippingDocumentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateBookingShippingDocumentResponse>>;
    /**
     * create shipping document
     * /api/v2/logistics/create_shipping_document (POST)
     */
    createShippingDocument(params: CreateShippingDocumentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateShippingDocumentResponse>>;
    /**
     * create shipping document job
     * /api/v2/logistics/create_shipping_document_job (POST)
     */
    createShippingDocumentJob(params: CreateShippingDocumentJobRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CreateShippingDocumentJobResponse>>;
    /**
     * delete address
     * /api/v2/logistics/delete_address (POST)
     */
    deleteAddress(params: DeleteAddressRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteAddressResponse>>;
    /**
     * delete special operating hour
     * /api/v2/logistics/delete_special_operating_hour (POST)
     */
    deleteSpecialOperatingHour(params: DeleteSpecialOperatingHourRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteSpecialOperatingHourResponse>>;
    /**
     * download booking shipping document
     * /api/v2/logistics/download_booking_shipping_document (POST)
     */
    downloadBookingShippingDocument(params: DownloadBookingShippingDocumentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadBookingShippingDocumentResponse>>;
    /**
     * download shipping document
     * /api/v2/logistics/download_shipping_document (POST)
     */
    downloadShippingDocument(params: DownloadShippingDocumentRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadShippingDocumentResponse>>;
    /**
     * download shipping document job
     * /api/v2/logistics/download_shipping_document_job (POST)
     */
    downloadShippingDocumentJob(params: DownloadShippingDocumentJobRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadShippingDocumentJobResponse>>;
    /**
     * download to label
     * /api/v2/logistics/download_to_label (POST)
     */
    downloadToLabel(params: DownloadToLabelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DownloadToLabelResponse>>;
    /**
     * get address list
     * /api/v2/logistics/get_address_list (GET)
     */
    getAddressList(params: GetAddressListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetAddressListResponse>>;
    /**
     * get booking shipping document data info
     * /api/v2/logistics/get_booking_shipping_document_data_info (POST)
     */
    getBookingShippingDocumentDataInfo(params: GetBookingShippingDocumentDataInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingShippingDocumentDataInfoResponse>>;
    /**
     * get booking shipping document parameter
     * /api/v2/logistics/get_booking_shipping_document_parameter (POST)
     */
    getBookingShippingDocumentParameter(params: GetBookingShippingDocumentParameterRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingShippingDocumentParameterResponse>>;
    /**
     * get booking shipping document result
     * /api/v2/logistics/get_booking_shipping_document_result (POST)
     */
    getBookingShippingDocumentResult(params: GetBookingShippingDocumentResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingShippingDocumentResultResponse>>;
    /**
     * get booking shipping parameter
     * /api/v2/logistics/get_booking_shipping_parameter (GET)
     */
    getBookingShippingParameter(params: GetBookingShippingParameterRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingShippingParameterResponse>>;
    /**
     * get booking tracking info
     * /api/v2/logistics/get_booking_tracking_info (GET)
     */
    getBookingTrackingInfo(params: GetBookingTrackingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingTrackingInfoResponse>>;
    /**
     * get booking tracking number
     * /api/v2/logistics/get_booking_tracking_number (GET)
     */
    getBookingTrackingNumber(params: GetBookingTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetBookingTrackingNumberResponse>>;
    /**
     * get channel list
     * /api/v2/logistics/get_channel_list (GET)
     */
    getChannelList(params: GetChannelListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetChannelListResponse>>;
    /**
     * get mart packaging info
     * /api/v2/logistics/get_mart_packaging_info (GET)
     */
    getMartPackagingInfo(params: GetMartPackagingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMartPackagingInfoResponse>>;
    /**
     * get mass shipping parameter
     * /api/v2/logistics/get_mass_shipping_parameter (POST)
     */
    getMassShippingParameter(params: GetMassShippingParameterRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMassShippingParameterResponse>>;
    /**
     * get mass tracking number
     * /api/v2/logistics/get_mass_tracking_number (POST)
     */
    getMassTrackingNumber(params: GetMassTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetMassTrackingNumberResponse>>;
    /**
     * get operating hour restrictions
     * /api/v2/logistics/get_operating_hour_restrictions (GET)
     */
    getOperatingHourRestrictions(params: GetOperatingHourRestrictionsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOperatingHourRestrictionsResponse>>;
    /**
     * get operating hours
     * /api/v2/logistics/get_operating_hours (GET)
     */
    getOperatingHours(params: GetOperatingHoursRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetOperatingHoursResponse>>;
    /**
     * get pause status
     * /api/v2/logistics/get_pause_status (GET)
     */
    getPauseStatus(params: GetPauseStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetPauseStatusResponse>>;
    /**
     * get shipping document data info
     * /api/v2/logistics/get_shipping_document_data_info (POST)
     */
    getShippingDocumentDataInfo(params: GetShippingDocumentDataInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingDocumentDataInfoResponse>>;
    /**
     * get shipping document job status
     * /api/v2/logistics/get_shipping_document_job_status (POST)
     */
    getShippingDocumentJobStatus(params: GetShippingDocumentJobStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingDocumentJobStatusResponse>>;
    /**
     * get shipping document parameter
     * /api/v2/logistics/get_shipping_document_parameter (POST)
     */
    getShippingDocumentParameter(params: GetShippingDocumentParameterRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingDocumentParameterResponse>>;
    /**
     * get shipping document result
     * /api/v2/logistics/get_shipping_document_result (POST)
     */
    getShippingDocumentResult(params: GetShippingDocumentResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingDocumentResultResponse>>;
    /**
     * get shipping parameter
     * /api/v2/logistics/get_shipping_parameter (GET)
     */
    getShippingParameter(params: GetShippingParameterRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShippingParameterResponse>>;
    /**
     * get tracking info
     * /api/v2/logistics/get_tracking_info (GET)
     */
    getTrackingInfo(params: GetTrackingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTrackingInfoResponse>>;
    /**
     * get tracking number
     * /api/v2/logistics/get_tracking_number (GET)
     */
    getTrackingNumber(params: GetTrackingNumberRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetTrackingNumberResponse>>;
    /**
     * mass ship order
     * /api/v2/logistics/mass_ship_order (POST)
     */
    massShipOrder(params: MassShipOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<MassShipOrderResponse>>;
    /**
     * set address config
     * /api/v2/logistics/set_address_config (POST)
     */
    setAddressConfig(params: SetAddressConfigRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetAddressConfigResponse>>;
    /**
     * set mart packaging info
     * /api/v2/logistics/set_mart_packaging_info (POST)
     */
    setMartPackagingInfo(params: SetMartPackagingInfoRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetMartPackagingInfoResponse>>;
    /**
     * set pause status
     * /api/v2/logistics/set_pause_status (POST)
     */
    setPauseStatus(params: SetPauseStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<SetPauseStatusResponse>>;
    /**
     * ship booking
     * /api/v2/logistics/ship_booking (POST)
     */
    shipBooking(params: ShipBookingRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ShipBookingResponse>>;
    /**
     * ship order
     * /api/v2/logistics/ship_order (POST)
     */
    shipOrder(params: ShipOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<ShipOrderResponse>>;
    /**
     * update address
     * /api/v2/logistics/update_address (POST)
     */
    updateAddress(params: UpdateAddressRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateAddressResponse>>;
    /**
     * update channel
     * /api/v2/logistics/update_channel (POST)
     */
    updateChannel(params: UpdateChannelRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateChannelResponse>>;
    /**
     * update operating hours
     * /api/v2/logistics/update_operating_hours (POST)
     */
    updateOperatingHours(params: UpdateOperatingHoursRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateOperatingHoursResponse>>;
    /**
     * update self collection order logistics
     * /api/v2/logistics/update_self_collection_order_logistics (POST)
     */
    updateSelfCollectionOrderLogistics(params: UpdateSelfCollectionOrderLogisticsRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateSelfCollectionOrderLogisticsResponse>>;
    /**
     * update shipping order
     * /api/v2/logistics/update_shipping_order (POST)
     */
    updateShippingOrder(params: UpdateShippingOrderRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateShippingOrderResponse>>;
    /**
     * update tracking status
     * /api/v2/logistics/update_tracking_status (POST)
     */
    updateTrackingStatus(params: UpdateTrackingStatusRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateTrackingStatusResponse>>;
    /**
     * upload serviceable polygon
     * /api/v2/logistics/upload_serviceable_polygon (POST)
     */
    uploadServiceablePolygon(params: UploadServiceablePolygonRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadServiceablePolygonResponse>>;
}
