"use strict";
// AUTO-GENERATED from Shopee reference docs (references/api/Media).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeMediaApi = void 0;
class ShopeeMediaApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * cancel video upload
     * /api/v2/media/cancel_video_upload (POST)
     */
    async cancelVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media/cancel_video_upload", "query": [], "body": ["video_upload_id"], "scope": "shop" }, params, opts);
    }
    /**
     * complete video upload
     * /api/v2/media/complete_video_upload (POST)
     */
    async completeVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media/complete_video_upload", "query": [], "body": ["video_upload_id"], "scope": "shop" }, params, opts);
    }
    /**
     * get video upload result
     * /api/v2/media/get_video_upload_result (GET)
     */
    async getVideoUploadResult(params, opts) {
        return this.client.request({ "method": "GET", "path": "/api/v2/media/get_video_upload_result", "query": ["video_upload_id"], "body": [], "scope": "shop" }, params, opts);
    }
    /**
     * init video upload
     * /api/v2/media/init_video_upload (POST)
     */
    async initVideoUpload(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media/init_video_upload", "query": [], "body": ["business", "scene", "file_name", "file_size", "duration"], "scope": "shop" }, params, opts);
    }
    /**
     * upload image
     * /api/v2/media/upload_image (POST)
     */
    async uploadImage(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media/upload_image", "query": [], "body": ["business", "scene", "images"], "scope": "shop" }, params, opts);
    }
    /**
     * upload video part
     * /api/v2/media/upload_video_part (POST)
     */
    async uploadVideoPart(params, opts) {
        return this.client.request({ "method": "POST", "path": "/api/v2/media/upload_video_part", "query": [], "body": ["video_upload_id", "part_seq", "part_md5", "part_content"], "scope": "shop" }, params, opts);
    }
}
exports.ShopeeMediaApi = ShopeeMediaApi;
//# sourceMappingURL=index.js.map