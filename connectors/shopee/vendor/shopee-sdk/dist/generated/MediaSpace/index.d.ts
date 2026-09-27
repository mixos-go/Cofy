import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface CancelVideoUploadRequest {
    "video_upload_id": string;
}
export interface CancelVideoUploadResponse {
    "message"?: string;
    "error"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface CompleteVideoUploadRequest {
    "video_upload_id": string;
    "part_seq_list": Array<number>;
    "report_data"?: {
        "upload_cost"?: number;
    };
}
export interface CompleteVideoUploadResponse {
    "message"?: string;
    "error"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface GetVideoUploadResultRequest {
    /** Example: sg_90ce045e-fd92-4f0b-97a4-eda40546cd9f_000000 */
    "video_upload_id": string;
}
export interface GetVideoUploadResultResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "status"?: string;
        "message"?: string;
        "video_info": {
            "video_url_list"?: Array<{
                "video_url_region"?: string;
                "video_url"?: string;
            }>;
            "thumbnail_url_list"?: Array<{
                "image_url_region"?: string;
                "image_url"?: string;
            }>;
            "duration"?: number;
        };
    };
}
export interface InitVideoUploadRequest {
    "file_size": number;
    "file_md5": string;
}
export interface InitVideoUploadResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "video_upload_id"?: string;
    };
}
export interface UploadImageRequest {
    "scene"?: string;
    "ratio"?: string;
    "image": string;
}
export interface UploadImageResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "image_info": {
            "image_id"?: string;
            "image_url_list"?: Array<{
                "image_url_region"?: string;
                "image_url"?: string;
            }>;
        };
        "image_info_list"?: Array<{
            "id"?: number;
            "error"?: string;
            "message"?: string;
            "image_info": {
                "image_id"?: string;
                "image_url_list"?: Array<{
                    "image_url_region"?: string;
                    "image_url"?: string;
                }>;
            };
        }>;
    };
}
export interface UploadVideoPartRequest {
    "video_upload_id": string;
    "part_seq": number;
    "content_md5": string;
    "part_content": string;
}
export interface UploadVideoPartResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export declare class ShopeeMediaSpaceApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * cancel video upload
     * /api/v2/media_space/cancel_video_upload (POST)
     */
    cancelVideoUpload(params: CancelVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CancelVideoUploadResponse>>;
    /**
     * complete video upload
     * /api/v2/media_space/complete_video_upload (POST)
     */
    completeVideoUpload(params: CompleteVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CompleteVideoUploadResponse>>;
    /**
     * get video upload result
     * /api/v2/media_space/get_video_upload_result (GET)
     */
    getVideoUploadResult(params: GetVideoUploadResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoUploadResultResponse>>;
    /**
     * init video upload
     * /api/v2/media_space/init_video_upload (POST)
     */
    initVideoUpload(params: InitVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<InitVideoUploadResponse>>;
    /**
     * upload image
     * /api/v2/media_space/upload_image (POST)
     */
    uploadImage(params: UploadImageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadImageResponse>>;
    /**
     * upload video part
     * /api/v2/media_space/upload_video_part (POST)
     */
    uploadVideoPart(params: UploadVideoPartRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadVideoPartResponse>>;
}
