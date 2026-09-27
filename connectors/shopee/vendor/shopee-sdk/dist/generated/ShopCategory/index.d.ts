import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface AddItemListRequest {
    /** ShopCategory's unique identifier. Example: 29333 */
    "shop_category_id": number;
    /** Shopee's unique identifiers list for an item. Max. 100 items to be deleted per request. Example: [100908152,100908153,100908154,100908155] */
    "item_list": Array<number>;
}
export interface AddItemListResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "shop_category_id"?: number;
        "current_count"?: number;
    };
    "request_id"?: string;
}
export interface AddShopCategoryRequest {
    /** ShopCategory's name. Example: OA_V2_1 */
    "name": string;
    /** ShopCategory's sort weight. The maximum number should be 2147483546. Example: 21 */
    "sort_weight"?: number;
}
export interface AddShopCategoryResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "shop_category_id"?: number;
    };
    "request_id"?: string;
}
export interface DeleteItemListRequest {
    /** The list of items need to be deleted. To note that the items which can be deleted successfully should be under this category. Example: 29333 */
    "shop_category_id": number;
    /** ShopCategory's unique identifier. Example: [100908152,100908153] */
    "item_list": Array<number>;
}
export interface DeleteItemListResponse {
    "request_id"?: string;
    "message"?: string;
    "error"?: string;
    "response"?: {
        "shop_category_id"?: number;
        "current_count"?: number;
        "invalid_item_id_list"?: Array<{
            "item_id"?: number;
            "fail_message"?: string;
            "fail_error"?: string;
        }>;
    };
}
export interface DeleteShopCategoryRequest {
    /** ShopCategory's unique identifier. Example: 9209570 */
    "shop_category_id": number;
}
export interface DeleteShopCategoryResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "shop_category_id"?: number;
    };
    "request_id"?: string;
}
export interface GetItemListRequest {
    /** ShopCategory's unique identifier. Example: 231232 */
    "shop_category_id": number;
    /** Specifies the starting entry of data to return in the current call. Default is 1000. The input range of page_size is [0, 1000] Example: 20 */
    "page_size"?: number;
    /** If many items are available to retrieve, you may need to call this api multiple times to retrieve all the data. And the default will be 0. page_size*page_no should be [0, 2147483446]. Example: 4 */
    "page_no"?: number;
}
export interface GetItemListResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "item_list"?: Array<number>;
        "more"?: boolean;
        "total_count"?: number;
    };
    "request_id"?: string;
}
export interface GetShopCategoryListRequest {
    /** Specifies the starting entry of data to return in the current call. The parameter range of page_size should be [1, 2147483647] Example: 100 */
    "page_size": number;
    /** Specifies the total returned data per entry. The parameter range of page_no should be [1, 100] Example: 1 */
    "page_no": number;
}
export interface GetShopCategoryListResponse {
    "request_id"?: string;
    "message"?: string;
    "error"?: string;
    "response"?: {
        "shop_categorys"?: Array<{
            "shop_category_id"?: number;
            "status"?: number;
            "name"?: string;
            "sort_weight"?: number;
            "created_by"?: string;
        }>;
        "more"?: boolean;
        "total_count"?: number;
    };
}
export interface UpdateShopCategoryRequest {
    /** ShopCategory's unique identifier. Example: 29333 */
    "shop_category_id": number;
    /** ShopCategory's name. Example: OA_V2_11 */
    "name"?: string;
    /** ShopCategory's sort weight. Example: 21 */
    "sort_weight"?: number;
    /** ShopCategory's status. Applicable values: NORMAL, INACTIVE, DELETED. Example: NORMAL */
    "status"?: string;
}
export interface UpdateShopCategoryResponse {
    "message"?: string;
    "error"?: string;
    "response"?: {
        "status"?: string;
        "shop_category_id"?: number;
        "sort_weight"?: number;
        "name"?: string;
    };
    "request_id"?: string;
}
export declare class ShopeeShopCategoryApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * add item list
     * /api/v2/shop_category/add_item_list (POST)
     */
    addItemList(params: AddItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddItemListResponse>>;
    /**
     * add shop category
     * /api/v2/shop_category/add_shop_category (POST)
     */
    addShopCategory(params: AddShopCategoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<AddShopCategoryResponse>>;
    /**
     * delete item list
     * /api/v2/shop_category/delete_item_list (POST)
     */
    deleteItemList(params: DeleteItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteItemListResponse>>;
    /**
     * delete shop category
     * /api/v2/shop_category/delete_shop_category (POST)
     */
    deleteShopCategory(params: DeleteShopCategoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<DeleteShopCategoryResponse>>;
    /**
     * get item list
     * /api/v2/shop_category/get_item_list (GET)
     */
    getItemList(params: GetItemListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetItemListResponse>>;
    /**
     * get shop category list
     * /api/v2/shop_category/get_shop_category_list (GET)
     */
    getShopCategoryList(params: GetShopCategoryListRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetShopCategoryListResponse>>;
    /**
     * update shop category
     * /api/v2/shop_category/update_shop_category (POST)
     */
    updateShopCategory(params: UpdateShopCategoryRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UpdateShopCategoryResponse>>;
}
