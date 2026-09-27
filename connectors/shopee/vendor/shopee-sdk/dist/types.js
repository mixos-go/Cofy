"use strict";
/**
 * Core types for the Shopee Open Platform SDK.
 *
 * These types are shared across every generated category client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeError = exports.ENDPOINT_SITES = void 0;
/** Endpoint location values accepted from the CLI / shorthand. */
exports.ENDPOINT_SITES = ['GLOBAL', 'CN', 'BR'];
class ShopeeError extends Error {
    constructor(msg, opts = {}) {
        super(msg);
        this.name = 'ShopeeError';
        this.error = opts.error ?? 'unknown_error';
        this.requestId = opts.requestId;
        this.status = opts.status;
        this.body = opts.body;
    }
}
exports.ShopeeError = ShopeeError;
//# sourceMappingURL=types.js.map