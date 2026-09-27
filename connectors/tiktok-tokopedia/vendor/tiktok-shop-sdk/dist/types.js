"use strict";
/**
 * Core types for the TikTok Shop Open Platform SDK.
 *
 * These types are shared across every generated category client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokError = void 0;
class TikTokError extends Error {
    constructor(msg, opts = {}) {
        super(msg);
        this.name = 'TikTokError';
        this.code = opts.code ?? 'unknown_error';
        this.requestId = opts.requestId;
        this.status = opts.status;
        this.body = opts.body;
    }
}
exports.TikTokError = TikTokError;
//# sourceMappingURL=types.js.map