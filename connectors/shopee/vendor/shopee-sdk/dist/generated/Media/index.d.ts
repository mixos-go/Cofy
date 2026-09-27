import { ShopeeClient } from '../../client';
import { ApiResponse, ShopeeRequestOptions } from '../../types';
export interface CancelVideoUploadRequest {
    "video_upload_id": string;
}
export interface CancelVideoUploadResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface CompleteVideoUploadRequest {
    "video_upload_id": string;
}
export interface CompleteVideoUploadResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export interface GetVideoUploadResultRequest {
    /** The unique ID of the upload task, returned by v2.media.init_video_upload. Example: sg-11110201-6kh48-mepm7a0ttcw3c3 */
    "video_upload_id": string;
}
export interface GetVideoUploadResultResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "status"?: string;
        "reason"?: string;
        "update_time"?: number;
        "video_info": {
            "video_url"?: string;
            "video_thumbnail_url"?: string;
            "thumbnail_width"?: number;
            "thumbnail_height"?: number;
            "duration"?: number;
            "resolution"?: string;
        };
    };
}
export interface InitVideoUploadRequest {
    "business": number;
    "scene": number;
    "file_name": string;
    "file_size": number;
    "duration": number;
}
export interface InitVideoUploadResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
    "response"?: {
        "video_upload_id"?: string;
        "part_size"?: number;
    };
}
export interface UploadImageRequest {
    "business": number;
    "scene": number;
    "images": string;
}
export interface UploadImageResponse {
    "error"?: string;
    "message"?: string;
    "request_id"?: string;
    "response"?: {
        "image_list"?: Array<{
            "image_id"?: string;
            "image_url"?: string;
        }>;
    };
    "warning"?: string;
}
export interface UploadVideoPartRequest {
    "video_upload_id": string;
    "part_seq": number;
    "part_md5": string;
    "part_content": string;
}
export interface UploadVideoPartResponse {
    "error"?: string;
    "message"?: string;
    "warning"?: string;
    "request_id"?: string;
}
export declare class ShopeeMediaApi {
    private client;
    constructor(client: ShopeeClient);
    /**
     * cancel video upload
     * /api/v2/media/cancel_video_upload (POST)
     */
    cancelVideoUpload(params: CancelVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CancelVideoUploadResponse>>;
    /**
     * complete video upload
     * /api/v2/media/complete_video_upload (POST)
     */
    completeVideoUpload(params: CompleteVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<CompleteVideoUploadResponse>>;
    /**
     * get video upload result
     * /api/v2/media/get_video_upload_result (GET)
     */
    getVideoUploadResult(params: GetVideoUploadResultRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<GetVideoUploadResultResponse>>;
    /**
     * init video upload
     * /api/v2/media/init_video_upload (POST)
     */
    initVideoUpload(params: InitVideoUploadRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<InitVideoUploadResponse>>;
    /**
     * upload image
     * /api/v2/media/upload_image (POST)
     */
    uploadImage(params: UploadImageRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadImageResponse>>;
    /**
     * upload video part
     * /api/v2/media/upload_video_part (POST)
     */
    uploadVideoPart(params: UploadVideoPartRequest, opts?: ShopeeRequestOptions): Promise<ApiResponse<UploadVideoPartResponse>>;
}
