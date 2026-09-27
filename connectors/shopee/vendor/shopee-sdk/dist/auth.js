"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthUrl = buildAuthUrl;
exports.verifyPushSignature = verifyPushSignature;
const crypto = __importStar(require("crypto"));
const endpoints_1 = require("./endpoints");
function ts() {
    return Math.floor(Date.now() / 1000);
}
/**
 * Build a Shopee OAuth authorization URL for the shop-level authorization flow.
 *
 * After the seller grants access, they are redirected back with a `code` and
 * `shop_id`, which you exchange for an access_token via
 * `public.getAccessToken({ code, shop_id, partner_id })`.
 *
 * @param redirectUrl Encoded redirect URL of your app.
 * @param scope       Identity scope. Defaults to `shop` (shop-level auth).
 */
function buildAuthUrl(credentials, redirectUrl, opts = {}) {
    const environment = opts.environment ?? 'live';
    const region = opts.region ?? 'GLOBAL';
    const path = opts.scope === 'merchant' ? '/api/v2/merchant/auth_partner' : '/api/v2/shop/auth_partner';
    const timestamp = ts();
    const signature = signPublic(credentials, path, timestamp);
    const q = new URLSearchParams({
        partner_id: String(credentials.partner_id),
        timestamp: String(timestamp),
        sign: signature,
        redirect: redirectUrl,
    });
    if (opts.codeChallenge)
        q.set('code_challenge', opts.codeChallenge);
    return `${(0, endpoints_1.resolveHost)(environment, region)}${path}?${q.toString()}`;
}
/** Public-API style signature: partner_id + path + timestamp. */
function signPublic(credentials, path, timestamp) {
    const base = `${credentials.partner_id}${path}${timestamp}`;
    return crypto.createHmac('sha256', credentials.partner_key).update(base).digest('hex');
}
/**
 * Verify an incoming Shopee push (callback) webhook signature.
 *
 * Shopee signs push payloads with:
 * `signature = hex(HMAC-SHA256(partner_key, url + '|' + request_body))`.
 *
 * @returns true when the computed signature matches the `Authorization` header.
 */
function verifyPushSignature(partnerKey, url, requestBody, authorizationHeader) {
    const base = `${url}|${requestBody}`;
    const computed = crypto.createHmac('sha256', partnerKey).update(base).digest('hex');
    return safeEqual(computed, authorizationHeader.trim());
}
function safeEqual(a, b) {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ba.length !== bb.length)
        return false;
    return crypto.timingSafeEqual(ba, bb);
}
//# sourceMappingURL=auth.js.map