"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/MediaSpace).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeMediaSpaceApi = void 0;
class ShopeeMediaSpaceApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * cancel video upload
     * /api/v2/media_space/cancel_video_upload (POST)
     */
    async cancelVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media_space/cancel_video_upload", "query": [], "body": ["video_upload_id"], "scope": "shop" }, params, opts);
    }
    /**
     * complete video upload
     * /api/v2/media_space/complete_video_upload (POST)
     */
    async completeVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media_space/complete_video_upload", "query": [], "body": ["video_upload_id", "part_seq_list", "report_data"], "scope": "shop" }, params, opts);
    }
    /**
     * get video upload result
     * /api/v2/media_space/get_video_upload_result (GET)
     */
    async getVideoUploadResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/media_space/get_video_upload_result", "query": ["video_upload_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * init video upload
     * /api/v2/media_space/init_video_upload (POST)
     */
    async initVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media_space/init_video_upload", "query": [], "body": ["file_size", "file_md5"], "scope": "shop" }, params, opts);
    }
    /**
     * upload image
     * /api/v2/media_space/upload_image (POST)
     */
    async uploadImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media_space/upload_image", "query": [], "body": ["scene", "ratio", "image"], "scope": "shop" }, params, opts);
    }
    /**
     * upload video part
     * /api/v2/media_space/upload_video_part (POST)
     */
    async uploadVideoPart(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media_space/upload_video_part", "query": [], "body": ["video_upload_id", "part_seq", "content_md5", "part_content"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeMediaSpaceApi = ShopeeMediaSpaceApi;
//# sourceMappingURL=index.js.map