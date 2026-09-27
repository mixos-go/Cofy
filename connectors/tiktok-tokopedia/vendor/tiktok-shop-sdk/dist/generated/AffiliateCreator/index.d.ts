import { TikTokClient } from '../../client';
import { TikTokRequestOptions } from '../../types';
export interface AddShowcaseProductsRequest {
}
export interface AddShowcaseProductsBody {
    "add_type"?: string;
    "product_ids"?: Array<string>;
    "product_link"?: string;
}
export interface AddShowcaseProductsResponse {
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
export interface CreatorGenerateGeneralLinkRequest {
}
export interface CreatorGenerateGeneralLinkBody {
    "campaign_id"?: string;
    "link_type"?: string;
    "material"?: {
        "ids"?: Array<string>;
        "type"?: string;
    };
}
export interface CreatorGenerateGeneralLinkResponse {
    "code"?: number;
    "data"?: {
        "failed_materials"?: Array<Record<string, unknown>>;
        "sharing_links"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorGeneratePublisherLinkRequest {
    /** The publisher id in partner's system (path) */
    "publisher_id": string;
}
export interface CreatorGeneratePublisherLinkBody {
    "campaign_id"?: string;
    "link_type"?: string;
    "material"?: {
        "ids"?: Array<string>;
        "type"?: string;
    };
}
export interface CreatorGeneratePublisherLinkResponse {
    "code"?: number;
    "data"?: {
        "failed_materials"?: Array<Record<string, unknown>>;
        "sharing_links"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorGetSampleRequestDeeplinkRequest {
    /** Product id */
    "product_id": string;
    /** Sku id */
    "sku_id": string;
    /** An URL schema for App redirection after sample request */
    "redirect_schema"?: string;
    /** If the product belongs to a TAP campaign, a campaign_id is required. */
    "campaign_id"?: string;
    /** If the product belongs to a seller collaboration, a collaboration_id is required. */
    "collaboration_id"?: string;
}
export interface CreatorGetSampleRequestDeeplinkResponse {
    "code"?: number;
    "data"?: {
        "deeplink"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorSearchAffiliateTraceOrdersRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Default: 20 Valid Range: [1-100] */
    "page_size": number;
}
export interface CreatorSearchAffiliateTraceOrdersBody {
    "time_ge"?: number;
    "time_lt"?: number;
    "time_type"?: string;
}
export interface CreatorSearchAffiliateTraceOrdersResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "orders"?: Array<{
            "skus"?: {
                "actual_bonus_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_commission_base"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_creator_commission_reward_fee"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_shop_ads_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_bonus_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_commission_base"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_creator_commission_reward_fee"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_shop_ads_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "price"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "trace"?: {
                    "id"?: string;
                    "type"?: string;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorSearchOpenCollaborationProductRequest {
    /** Pagination offset determines where you begin to search for. It's empty when raise your first request. */
    "page_token"?: string;
    /** The value of "page_size" must be greater than 0 and less than or equal to 20. */
    "page_size": number;
    /** The returned results are sorted by the specified field. Possible values: - commission_rate - product_sales_price - commission - units_sold Specify the sort order using the sort_order parameter. */
    "sort_field"?: string;
    /** The sort order for the objects in the response. Default: ASC Possible values: - ASC: Ascending order - DESC: Descending order */
    "sort_order"?: string;
}
export interface CreatorSearchOpenCollaborationProductBody {
    "category"?: {
        "id"?: string;
    };
    "commission_rate_range"?: {
        "rate_ge"?: number;
        "rate_lt"?: number;
    };
    "sales_price_range"?: {
        "amount_ge"?: string;
        "amount_lt"?: string;
    };
    "title_keywords"?: Array<string>;
}
export interface CreatorSearchOpenCollaborationProductResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "commission"?: {
                "amount"?: string;
                "currency"?: string;
                "rate"?: number;
            };
            "original_price"?: {
                "currency"?: string;
                "maximum_amount"?: string;
                "minimum_amount"?: string;
            };
            "sales_price"?: {
                "currency"?: string;
                "maximum_amount"?: string;
                "minimum_amount"?: string;
            };
            "shop"?: {
                "name"?: string;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorSearchSampleApplicationFulfillmentsRequest {
    /** The sort order for the field specified in the sort_field parameter. Default: ASC Possible values: ASC: Ascending order DESC: Descending order */
    "sort_order"?: string;
    /** Some sorting fields are as follows: - expired_time: sort by left time to fulfill. - create_time: sort by fulfillment content create time. Default value is expired_time. */
    "sort_field"?: string;
}
export interface CreatorSearchSampleApplicationFulfillmentsBody {
    "fulfillment_statuses"?: Array<string>;
}
export interface CreatorSearchSampleApplicationFulfillmentsResponse {
    "code"?: number;
    "data"?: {
        "fulfillments"?: Array<Record<string, unknown>>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface CreatorSelectAffiliateProductRequest {
    /** Pagination offset determines where you begin to search for. It's empty when raise your first request. */
    "page_token"?: string;
    /** The value of "page_size" must be greater than 0 and less than or equal to 50. */
    "page_size"?: number;
}
export interface CreatorSelectAffiliateProductBody {
    "filter_params"?: {
        "category_ids"?: Array<string>;
        "commission_rate_range"?: {
            "rate_ge"?: number;
            "rate_le"?: number;
        };
        "pool_ids"?: Array<string>;
        "price_range"?: {
            "price_ge"?: string;
            "price_le"?: string;
        };
        "product_ids"?: Array<string>;
        "shop_rating_range"?: {
            "rating_ge"?: number;
            "rating_le"?: number;
        };
        "sold_quantity_range"?: {
            "quantity_ge"?: number;
            "quantity_le"?: number;
        };
        "title_keyword"?: string;
    };
    "sort_params"?: {
        "sort_type"?: string;
    };
}
export interface CreatorSelectAffiliateProductResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "commission"?: {
                "amount"?: string;
                "rate"?: number;
            };
            "market_performance"?: {
                "historical_sold_quantity"?: number;
            };
            "price"?: {
                "ceiling_price"?: string;
                "currency"?: string;
                "floor_price"?: string;
            };
            "review"?: {
                "count"?: number;
                "overall_score"?: string;
            };
            "shop"?: {
                "logo_url"?: string;
                "name"?: string;
                "rating"?: string;
            };
            "stock"?: {
                "quantity"?: number;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GenerateAffiliateSharingLinkRequest {
}
export interface GenerateAffiliateSharingLinkBody {
    "channel"?: string;
    "material"?: {
        "campaign_url"?: string;
        "id"?: string;
        "type"?: string;
    };
    "tags"?: Array<string>;
}
export interface GenerateAffiliateSharingLinkResponse {
    "code"?: number;
    "data"?: {
        "affiliate_sharing_links"?: Array<Record<string, unknown>>;
        "errors"?: Array<{
            "detail"?: {
                "fail_reason"?: string;
                "tag"?: string;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCreatorApplicableSampleLabelRequest {
    /** The TikTok Shop product identifier. */
    "product_id": string;
}
export interface GetCreatorApplicableSampleLabelResponse {
    "code"?: number;
    "data"?: {
        "label"?: {
            "application_id"?: string;
            "can_apply"?: boolean;
            "reach_limit"?: boolean;
            "sample_product"?: {
                "sample_sku_list"?: Array<{
                    "price"?: {
                        "amount"?: string;
                        "currency"?: string;
                    };
                }>;
            };
            "status"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCreatorProfileRequest {
}
export interface GetCreatorProfileResponse {
    "code"?: number;
    "data"?: {
        "avatar"?: {
            "height"?: number;
            "url"?: string;
            "width"?: number;
        };
        "creator_user_open_id"?: string;
        "permissions"?: Array<string>;
        "register_region"?: string;
        "selection_region"?: string;
        "seller_type"?: string;
        "user_type"?: string;
        "username"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetCreatorSampleApplicationDetailRequest {
}
export interface GetCreatorSampleApplicationDetailBody {
    "application_id"?: string;
    "application_type"?: string;
    "main_order_id"?: string;
    "product_id"?: string;
}
export interface GetCreatorSampleApplicationDetailResponse {
    "code"?: number;
    "data"?: {
        "sample_application"?: {
            "activity_id"?: string;
            "create_time"?: number;
            "creator_fulfillment"?: {
                "expiration_time"?: number;
                "id"?: string;
                "status"?: string;
                "total_suspend_duration"?: number;
            };
            "id"?: string;
            "main_order_id"?: string;
            "sample_product"?: {
                "id"?: string;
                "sku_id"?: string;
                "sku_sale_property_value_names"?: Array<string>;
            };
            "status"?: string;
            "type"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetOpenCollaborationProductListByProductIdsRequest {
    /** product id list */
    "product_ids"?: Array<string>;
}
export interface GetOpenCollaborationProductListByProductIdsResponse {
    "code"?: number;
    "data"?: {
        "products"?: Array<{
            "commission"?: {
                "amount"?: string;
                "currency"?: string;
                "rate"?: number;
            };
            "original_price"?: {
                "currency"?: string;
                "maximum_amount"?: string;
                "minimum_amount"?: string;
            };
            "sales_price"?: {
                "currency"?: string;
                "maximum_amount"?: string;
                "minimum_amount"?: string;
            };
            "shop"?: {
                "name"?: string;
            };
            "shop_ads_commission"?: {
                "rate"?: number;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShopProductsRequest {
    /** The title keyword of the product you wish to search by. */
    "title_keyword"?: string;
    /** Sort fields include PRODUCT_ID, PRICE and SALE. If sort_field is empty or invalid, PRODUCT_ID will be set as default. */
    "sort_field"?: string;
    /** Sort orders include DESC and ASC. If sort order is empty or invalid, DESC will be set as default. */
    "sort_order"?: string;
    /** Pagination count determines how many products you'll get after sending the request. 20 is a recommended number. Valid Range: [1-100] */
    "page_size": number;
    /** The pagination offset that determines where you begin your search. If you are making your first request, this will be empty. */
    "page_token"?: string;
}
export interface GetShopProductsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "price"?: {
                "amount"?: string;
                "currency"?: string;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShoppableVideoPrecheckResultRequest {
    /** task id from [Precheck Video Content](https://partner.tiktokshop.com/docv2/page/precheck-video-content-202511) (path) */
    "task_id": string;
}
export interface GetShoppableVideoPrecheckResultResponse {
    "code"?: number;
    "data"?: {
        "precheck_task"?: {
            "good_quality_check_result"?: {
                "issues"?: Array<Record<string, unknown>>;
                "status"?: string;
            };
            "id"?: string;
            "violation_check_result"?: {
                "issues"?: Array<Record<string, unknown>>;
                "status"?: string;
            };
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShoppableVideoStatusRequest {
    /** The video id from [Publish Shoppable Video] (path) */
    "video_id": string;
}
export interface GetShoppableVideoStatusResponse {
    "code"?: number;
    "data"?: {
        "video"?: {
            "id"?: string;
            "post_status"?: string;
            "post_time"?: number;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface GetShowcaseProductsRequest {
    /** The number of results to be returned per page. Valid range: [1-20]. */
    "page_size": number;
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** Set to LIVE to indicate the request originates from a Live room. Set to SHOWCASE to indicate that the request originates from the Showcase. */
    "origin": string;
}
export interface GetShowcaseProductsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "products"?: Array<{
            "addition"?: Array<{
                "customized_main_images"?: Array<Record<string, unknown>>;
            }>;
            "collaboration"?: {
                "id"?: string;
                "partner"?: {
                    "id"?: string;
                    "name"?: string;
                };
                "type"?: string;
            };
            "commission"?: {
                "rate"?: number;
                "reward_rate"?: number;
            };
            "price"?: {
                "original_price"?: {
                    "currency"?: string;
                    "maximum_amount"?: string;
                    "minimum_amount"?: string;
                };
                "platform_discount_price"?: {
                    "currency"?: string;
                    "maximum_amount"?: string;
                    "minimum_amount"?: string;
                };
                "seller_discount_price"?: {
                    "currency"?: string;
                    "maximum_amount"?: string;
                    "minimum_amount"?: string;
                };
            };
            "shop"?: {
                "name"?: string;
            };
            "status"?: {
                "added_status"?: string;
                "inventory_status"?: string;
                "is_hidden"?: boolean;
                "review_status"?: string;
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PostShoppableVideoRequest {
}
export interface PostShoppableVideoBody {
    "product_link_info"?: {
        "product_id"?: string;
        "title"?: string;
    };
    "video_info"?: {
        "file_id"?: string;
        "title"?: string;
    };
}
export interface PostShoppableVideoResponse {
    "code"?: number;
    "data"?: {
        "video"?: {
            "id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface PrecheckVideoContentRequest {
}
export interface PrecheckVideoContentBody {
    "product_link_info"?: {
        "product_id"?: string;
        "title"?: string;
    };
    "video_info"?: {
        "file_id"?: string;
    };
}
export interface PrecheckVideoContentResponse {
    "code"?: number;
    "data"?: {
        "precheck"?: {
            "task_id"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export interface RemoveShowcaseProductsRequest {
}
export interface RemoveShowcaseProductsBody {
    "product_ids"?: Array<string>;
}
export interface RemoveShowcaseProductsResponse {
    "code"?: number;
    "data"?: {
        "code"?: number;
        "message"?: string;
        "request_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCreatorAffiliateOrdersRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Default: 20 Valid Range: [1-100] */
    "page_size": number;
}
export interface SearchCreatorAffiliateOrdersBody {
    "create_time_ge"?: number;
    "create_time_lt"?: number;
}
export interface SearchCreatorAffiliateOrdersResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "orders"?: Array<{
            "skus"?: {
                "actual_bonus_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_commission_base"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_creator_commission_reward_fee"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "actual_shop_ads_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_bonus_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_commission_base"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_creator_commission_reward_fee"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "estimated_shop_ads_commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
                "price"?: {
                    "amount"?: string;
                    "currency"?: string;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCreatorSampleApplicationsRequest {
    /** Pagination offset determines where you begin to search for. It's empty when raise your first request. */
    "page_token"?: string;
    /** The value of "page_size" must be greater than 0 and less than or equal to 50. Default 20 */
    "page_size"?: number;
}
export interface SearchCreatorSampleApplicationsBody {
    "application_statuses"?: Array<string>;
}
export interface SearchCreatorSampleApplicationsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "sample_applications"?: Array<{
            "creator_fulfillment"?: {
                "bound_product_status"?: string;
                "expiration_time"?: number;
                "id"?: string;
                "status"?: string;
                "total_suspend_duration"?: number;
            };
            "sample_product"?: {
                "id"?: string;
                "sku_id"?: string;
                "sku_sale_property_value_names"?: Array<string>;
            };
        }>;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface SearchCreatorTargetCollaborationsRequest {
    /** An opaque token used to retrieve the next page of a paginated result set. Retrieve this value from the result of the next_page_token from a previous response. It is not needed for the first page. */
    "page_token"?: string;
    /** The number of results to be returned per page. Valid range: [0-100]. */
    "page_size": number;
}
export interface SearchCreatorTargetCollaborationsBody {
    "keyword"?: string;
    "keyword_type"?: string;
    "shop_id"?: string;
}
export interface SearchCreatorTargetCollaborationsResponse {
    "code"?: number;
    "data"?: {
        "next_page_token"?: string;
        "target_collaborations"?: Array<{
            "products"?: {
                "commission"?: {
                    "amount"?: string;
                    "currency"?: string;
                    "rate"?: number;
                };
            };
        }>;
        "total_count"?: number;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface TopShowcaseProductsRequest {
}
export interface TopShowcaseProductsBody {
    "product_ids"?: Array<string>;
}
export interface TopShowcaseProductsResponse {
    "code"?: number;
    "data"?: {
        "code"?: number;
        "message"?: string;
        "request_id"?: string;
    };
    "message"?: string;
    "request_id"?: string;
}
export interface UploadShoppableVideoFileRequest {
}
export interface UploadShoppableVideoFileResponse {
    "code"?: number;
    "data"?: {
        "video_file"?: {
            "id"?: string;
            "md5"?: string;
        };
    };
    "message"?: string;
    "request_id"?: string;
}
export declare class TikTokAffiliateCreatorApi {
    private client;
    constructor(client: TikTokClient);
    /**
     * AddShowcaseProducts
     * /affiliate_creator/202405/showcases/products/add (POST)
     */
    addShowcaseProducts(params: AddShowcaseProductsRequest, body?: AddShowcaseProductsBody, opts?: TikTokRequestOptions): Promise<AddShowcaseProductsResponse>;
    /**
     * CreatorGenerateGeneralLink
     * /affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch (POST)
     */
    creatorGenerateGeneralLink(params: CreatorGenerateGeneralLinkRequest, body?: CreatorGenerateGeneralLinkBody, opts?: TikTokRequestOptions): Promise<CreatorGenerateGeneralLinkResponse>;
    /**
     * CreatorGeneratePublisherLink
     * /affiliate_creator/202504/affiliate_sharing_links/publisher/{publisher_id}/generate_batch (POST)
     */
    creatorGeneratePublisherLink(params: CreatorGeneratePublisherLinkRequest, body?: CreatorGeneratePublisherLinkBody, opts?: TikTokRequestOptions): Promise<CreatorGeneratePublisherLinkResponse>;
    /**
     * CreatorGetSampleRequestDeeplink
     * /affiliate_creator/202512/samples/deeplink (GET)
     */
    creatorGetSampleRequestDeeplink(params: CreatorGetSampleRequestDeeplinkRequest, opts?: TikTokRequestOptions): Promise<CreatorGetSampleRequestDeeplinkResponse>;
    /**
     * CreatorSearchAffiliateTraceOrders
     * /affiliate_creator/202505/orders/trace/search (POST)
     */
    creatorSearchAffiliateTraceOrders(params: CreatorSearchAffiliateTraceOrdersRequest, body?: CreatorSearchAffiliateTraceOrdersBody, opts?: TikTokRequestOptions): Promise<CreatorSearchAffiliateTraceOrdersResponse>;
    /**
     * CreatorSearchOpenCollaborationProduct
     * /affiliate_creator/202405/open_collaborations/products/search (POST)
     */
    creatorSearchOpenCollaborationProduct(params: CreatorSearchOpenCollaborationProductRequest, body?: CreatorSearchOpenCollaborationProductBody, opts?: TikTokRequestOptions): Promise<CreatorSearchOpenCollaborationProductResponse>;
    /**
     * CreatorSearchSampleApplicationFulfillments
     * /affiliate_creator/202409/sample_applications/fulfillments/search (POST)
     */
    creatorSearchSampleApplicationFulfillments(params: CreatorSearchSampleApplicationFulfillmentsRequest, body?: CreatorSearchSampleApplicationFulfillmentsBody, opts?: TikTokRequestOptions): Promise<CreatorSearchSampleApplicationFulfillmentsResponse>;
    /**
     * CreatorSelectAffiliateProduct
     * /affiliate_creator/202501/selection/products/search (POST)
     */
    creatorSelectAffiliateProduct(params: CreatorSelectAffiliateProductRequest, body?: CreatorSelectAffiliateProductBody, opts?: TikTokRequestOptions): Promise<CreatorSelectAffiliateProductResponse>;
    /**
     * GenerateAffiliateSharingLink
     * /affiliate_creator/202501/affiliate_sharing_links/generate_batch (POST)
     */
    generateAffiliateSharingLink(params: GenerateAffiliateSharingLinkRequest, body?: GenerateAffiliateSharingLinkBody, opts?: TikTokRequestOptions): Promise<GenerateAffiliateSharingLinkResponse>;
    /**
     * GetCreatorApplicableSampleLabel
     * /affiliate_creator/202412/samples/labels (GET)
     */
    getCreatorApplicableSampleLabel(params: GetCreatorApplicableSampleLabelRequest, opts?: TikTokRequestOptions): Promise<GetCreatorApplicableSampleLabelResponse>;
    /**
     * GetCreatorProfile
     * /affiliate_creator/202508/profiles (GET)
     */
    getCreatorProfile(params: GetCreatorProfileRequest, opts?: TikTokRequestOptions): Promise<GetCreatorProfileResponse>;
    /**
     * GetCreatorSampleApplicationDetail
     * /affiliate_creator/202412/sample_applications/single_query (POST)
     */
    getCreatorSampleApplicationDetail(params: GetCreatorSampleApplicationDetailRequest, body?: GetCreatorSampleApplicationDetailBody, opts?: TikTokRequestOptions): Promise<GetCreatorSampleApplicationDetailResponse>;
    /**
     * GetOpenCollaborationProductListByProductIds
     * /affiliate_creator/202509/open_collaborations/products (POST)
     */
    getOpenCollaborationProductListByProductIds(params: GetOpenCollaborationProductListByProductIdsRequest, opts?: TikTokRequestOptions): Promise<GetOpenCollaborationProductListByProductIdsResponse>;
    /**
     * GetShopProducts
     * /affiliate_creator/202509/shop_products (GET)
     */
    getShopProducts(params: GetShopProductsRequest, opts?: TikTokRequestOptions): Promise<GetShopProductsResponse>;
    /**
     * GetShoppableVideoPrecheckResult
     * /affiliate_creator/202601/videos/precheck_tasks/{task_id} (GET)
     */
    getShoppableVideoPrecheckResult(params: GetShoppableVideoPrecheckResultRequest, opts?: TikTokRequestOptions): Promise<GetShoppableVideoPrecheckResultResponse>;
    /**
     * GetShoppableVideoStatus
     * /affiliate_creator/202509/videos/{video_id}/status (GET)
     */
    getShoppableVideoStatus(params: GetShoppableVideoStatusRequest, opts?: TikTokRequestOptions): Promise<GetShoppableVideoStatusResponse>;
    /**
     * GetShowcaseProducts
     * /affiliate_creator/202405/showcases/products (GET)
     */
    getShowcaseProducts(params: GetShowcaseProductsRequest, opts?: TikTokRequestOptions): Promise<GetShowcaseProductsResponse>;
    /**
     * PostShoppableVideo
     * /affiliate_creator/202505/videos (POST)
     */
    postShoppableVideo(params: PostShoppableVideoRequest, body?: PostShoppableVideoBody, opts?: TikTokRequestOptions): Promise<PostShoppableVideoResponse>;
    /**
     * PrecheckVideoContent
     * /affiliate_creator/202511/videos/precheck_task (POST)
     */
    precheckVideoContent(params: PrecheckVideoContentRequest, body?: PrecheckVideoContentBody, opts?: TikTokRequestOptions): Promise<PrecheckVideoContentResponse>;
    /**
     * RemoveShowcaseProducts
     * /affiliate_creator/202409/showcases/products (DELETE)
     */
    removeShowcaseProducts(params: RemoveShowcaseProductsRequest, body?: RemoveShowcaseProductsBody, opts?: TikTokRequestOptions): Promise<RemoveShowcaseProductsResponse>;
    /**
     * SearchCreatorAffiliateOrders
     * /affiliate_creator/202410/orders/search (POST)
     */
    searchCreatorAffiliateOrders(params: SearchCreatorAffiliateOrdersRequest, body?: SearchCreatorAffiliateOrdersBody, opts?: TikTokRequestOptions): Promise<SearchCreatorAffiliateOrdersResponse>;
    /**
     * SearchCreatorSampleApplications
     * /affiliate_creator/202412/sample_applications/search (POST)
     */
    searchCreatorSampleApplications(params: SearchCreatorSampleApplicationsRequest, body?: SearchCreatorSampleApplicationsBody, opts?: TikTokRequestOptions): Promise<SearchCreatorSampleApplicationsResponse>;
    /**
     * SearchCreatorTargetCollaborations
     * /affiliate_creator/202405/target_collaborations/search (POST)
     */
    searchCreatorTargetCollaborations(params: SearchCreatorTargetCollaborationsRequest, body?: SearchCreatorTargetCollaborationsBody, opts?: TikTokRequestOptions): Promise<SearchCreatorTargetCollaborationsResponse>;
    /**
     * TopShowcaseProducts
     * /affiliate_creator/202409/showcases/products/top (POST)
     */
    topShowcaseProducts(params: TopShowcaseProductsRequest, body?: TopShowcaseProductsBody, opts?: TikTokRequestOptions): Promise<TopShowcaseProductsResponse>;
    /**
     * UploadShoppableVideoFile
     * /affiliate_creator/202505/videos/video_files (POST)
     */
    uploadShoppableVideoFile(params: UploadShoppableVideoFileRequest, opts?: TikTokRequestOptions): Promise<UploadShoppableVideoFileResponse>;
}
