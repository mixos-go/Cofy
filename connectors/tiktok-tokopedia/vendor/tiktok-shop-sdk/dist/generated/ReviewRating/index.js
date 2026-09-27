"use strict";
// AUTO-GENERATED from TikTok Shop reference docs (references/api/review_rating).
// Do not edit by hand; run `npm run generate` in sdk/.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokReviewRatingApi = void 0;
class TikTokReviewRatingApi {
    constructor(client) {
        this.client = client;
    }
    /**
     * ImportProductReviews
     * /review_rating/202508/product_reviews (POST)
     */
    async importProductReviews(params, body, opts) {
        return this.client.request({ "method": "POST", "path": "/review_rating/202508/product_reviews", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": ["shop_cipher"], "headers": [], "pathParams": [], "body": ["product_review"] }, { ...params, ...(body || {}) }, opts);
    }
    /**
     * UploadReviewMedia
     * /review_rating/202410/media/upload (POST)
     */
    async uploadReviewMedia(params, opts) {
        return this.client.request({ "method": "POST", "path": "/review_rating/202410/media/upload", "baseUrl": "https://open-api.tiktokglobalshop.com", "query": [], "headers": [], "pathParams": [], "body": [] }, params, opts);
    }
}
exports.TikTokReviewRatingApi = TikTokReviewRatingApi;
//# sourceMappingURL=index.js.map