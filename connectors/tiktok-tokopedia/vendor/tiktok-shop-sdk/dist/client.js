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
exports.TikTokClient = void 0;
exports.sign = sign;
exports.serializeBody = serializeBody;
const crypto = __importStar(require("crypto"));
const types_1 = require("./types");
function toSeconds(value) {
    if (value === undefined)
        return Math.floor(Date.now() / 1000);
    if (value instanceof Date)
        return Math.floor(value.getTime() / 1000);
    if (typeof value === 'string' && !/^\d+$/.test(value)) {
        const t = Date.parse(value);
        if (!Number.isNaN(t))
            return Math.floor(t / 1000);
    }
    return Math.floor(Number(value));
}
/**
 * Compute the TikTok Shop HMAC-SHA256 signature.
 *
 * 1. Collect all query params (common + business), excluding `sign` and
 *    `access_token`.
 * 2. Sort keys in ASCII ascending order.
 * 3. `signString = apiPath + concatenated(key+value...)`.
 * 4. If a JSON body is present (non-multipart), append the compact JSON body.
 * 5. Wrap with the app_secret: `input = secret + signString + secret`.
 * 6. `sign = hex(HMAC-SHA256(secret, input))`.
 */
function sign(appSecret, path, query, body) {
    const keys = Object.keys(query)
        .filter((k) => k !== 'sign' && k !== 'access_token')
        .sort();
    let str = path;
    for (const k of keys) {
        const v = query[k];
        if (v === undefined || v === null)
            continue;
        str += k + (typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    if (body)
        str += body;
    const input = appSecret + str + appSecret;
    return crypto.createHmac('sha256', appSecret).update(input).digest('hex');
}
/** Compact deterministic JSON for bodies used in both request + signature. */
function serializeBody(params, keys) {
    const body = {};
    for (const k of keys) {
        if (params[k] !== undefined)
            body[k] = params[k];
    }
    return JSON.stringify(body);
}
/**
 * Low-level HTTP client for the TikTok Shop Open Platform API.
 *
 * Handles base-URL resolution, HMAC-SHA256 signing, common-parameter
 * injection (app_key, timestamp, sign, shop_cipher) and JSON unwrapping.
 * Category clients and generated per-API methods are built on top of this.
 */
class TikTokClient {
    constructor(cfg) {
        this.credentials = cfg.credentials;
        this.defaults = { accessToken: cfg.accessToken, shopCipher: cfg.shopCipher };
        this.fetchImpl = cfg.fetch ?? globalThis.fetch;
        this.throwOnHttpError = cfg.throwOnHttpError ?? false;
        this.beforeRequest = cfg.beforeRequest;
        if (typeof this.fetchImpl !== 'function') {
            throw new Error('Fetch is not available. Use Node 18+ or supply a `fetch` implementation in the client config.');
        }
    }
    /**
     * Update the default access_token/shop_cipher at runtime (used by the
     * connector after an auto-refresh so subsequent calls sign with the fresh
     * token + send the fresh `x-tts-access-token` header).
     * Hanya field yang diberikan yang diganti; field lain tidak tersentuh.
     */
    updateToken(accessToken, shopCipher) {
        const next = { ...this.defaults };
        if (accessToken !== undefined)
            next.accessToken = accessToken;
        if (shopCipher !== undefined)
            next.shopCipher = shopCipher;
        this.defaults = next;
    }
    /**
     * Perform a signed request.
     *
     * @param spec    The generated API call specification.
     * @param params  Flat map of the API's own request parameters.
     * @param opts    Per-call overrides (access_token, shop_cipher, ...).
     */
    async request(spec, params, opts = {}) {
        await this.beforeRequest?.();
        const accessToken = opts.access_token ?? this.defaults.accessToken;
        const shopCipher = opts.shop_cipher ?? this.defaults.shopCipher;
        const timestamp = toSeconds(opts.timestamp);
        const baseUrl = opts.baseUrl ?? spec.baseUrl;
        // Substitute path params into the path.
        let path = spec.path;
        for (const p of spec.pathParams) {
            const v = params[p];
            if (v !== undefined && v !== null)
                path = path.replace(`{${p}}`, String(v));
        }
        // Build query params (common + business).
        const query = {
            app_key: this.credentials.app_key,
            timestamp: String(timestamp),
        };
        for (const k of spec.query) {
            const v = params[k];
            if (v !== undefined && v !== null) {
                query[k] = typeof v === 'object' ? JSON.stringify(v) : v;
            }
        }
        if (shopCipher !== undefined)
            query.shop_cipher = shopCipher;
        // Build body (if any).
        let body;
        if (spec.body.length)
            body = serializeBody(params, spec.body);
        // Sign (body included for non-multipart JSON). Path di SUBSTITUSI dulu
        // (product_id dst) — server menghitung sign atas final path, bukan template.
        query.sign = sign(this.credentials.app_secret, path, query, body);
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(query))
            search.set(k, String(v));
        const url = `${baseUrl}${path}?${search.toString()}`;
        const headers = { 'Content-Type': 'application/json' };
        for (const h of spec.headers) {
            const v = params[h];
            if (v !== undefined && v !== null)
                headers[h] = String(v);
        }
        if (accessToken !== undefined)
            headers['x-tts-access-token'] = accessToken;
        const init = {
            method: spec.method,
            headers,
            signal: opts.signal,
        };
        if (body !== undefined && !['GET'].includes(spec.method)) {
            init.body = body;
        }
        let res;
        try {
            res = await this.fetchImpl(url, init);
        }
        catch (e) {
            throw new types_1.TikTokError(`Network error: ${e?.message ?? e}`, { body: e });
        }
        const text = await res.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            json = { code: 'invalid_json', message: text };
        }
        if (!res.ok && this.throwOnHttpError) {
            throw new types_1.TikTokError(json?.message || `HTTP ${res.status}`, {
                code: json?.code,
                requestId: json?.request_id,
                status: res.status,
                body: json,
            });
        }
        const errBody = json;
        if (errBody && errBody.code !== undefined && Number(errBody.code) !== 0) {
            throw new types_1.TikTokError(errBody.message || String(errBody.code), {
                code: errBody.code,
                requestId: errBody.request_id,
                status: res.status,
                body: json,
            });
        }
        return json;
    }
}
exports.TikTokClient = TikTokClient;
//# sourceMappingURL=client.js.map