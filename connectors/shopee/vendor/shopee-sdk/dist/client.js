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
exports.ShopeeClient = void 0;
exports.sign = sign;
const crypto = __importStar(require("crypto"));
const types_1 = require("./types");
const endpoints_1 = require("./endpoints");
function toTimestamp(value) {
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
 * Compute the Shopee v2 HMAC-SHA256 signature.
 *
 * Base string (concatenation, in order, no separators):
 *  - shop:     partner_id + api_path + timestamp + access_token + shop_id
 *  - merchant: partner_id + api_path + timestamp + access_token + merchant_id
 *  - public:   partner_id + api_path + timestamp
 *
 * Sign  = hex(HMAC-SHA256(partner_key, base_string))
 */
function sign(credentials, path, timestamp, opts = {}) {
    const scope = opts.scope ?? 'shop';
    let base = `${credentials.partner_id}${path}${timestamp}`;
    if (scope === 'shop' || scope === 'merchant') {
        base += opts.accessToken ?? '';
        if (scope === 'shop')
            base += opts.shopId ?? '';
        else
            base += opts.merchantId ?? '';
    }
    return crypto.createHmac('sha256', credentials.partner_key).update(base).digest('hex');
}
/**
 * Low-level HTTP client for the Shopee Open Platform API v2.
 *
 * Handles endpoint resolution, HMAC-SHA256 signing, common-parameter
 * injection and JSON (un)wrapping. Category clients and generated per-API
 * methods are built on top of this.
 */
class ShopeeClient {
    constructor(cfg) {
        this.credentials = cfg.credentials;
        this.environment = cfg.environment ?? 'live';
        this.region = cfg.region ?? 'GLOBAL';
        this.defaults = { accessToken: cfg.accessToken, shopId: cfg.shopId };
        this.fetchImpl = cfg.fetch ?? globalThis.fetch;
        this.throwOnHttpError = cfg.throwOnHttpError ?? false;
        this.beforeRequest = cfg.beforeRequest;
        if (typeof this.fetchImpl !== 'function') {
            throw new Error('Fetch is not available. Use Node 18+ or supply a `fetch` implementation in the client config.');
        }
    }
    /**
     * Update the default access_token/shop_id at runtime (used by the connector
     * after an auto-refresh so subsequent calls sign with the fresh token).
     * Hanya field yang diberikan yang diganti; field lain tidak tersentuh.
     */
    updateToken(accessToken, shopId) {
        const next = { ...this.defaults };
        if (accessToken !== undefined)
            next.accessToken = accessToken;
        if (shopId !== undefined)
            next.shopId = shopId;
        this.defaults = next;
    }
    now() {
        return Math.floor(Date.now() / 1000);
    }
    /** Resolve the full endpoint URL (host + path) for env/region. */
    endpoint(path) {
        return (0, endpoints_1.resolveHost)(this.environment, this.region) + path;
    }
    /**
     * Perform a signed request.
     *
     * @param spec        The generated API call specification.
     * @param params      Flat map of the API's own request parameters. Which keys
     *                    are treated as query vs body is governed by `spec`.
     * @param opts        Per-call overrides (region, environment, tokens, ...).
     */
    async request(spec, params, opts = {}) {
        await this.beforeRequest?.();
        const environment = opts.environment ?? this.environment;
        const region = (opts.region ?? this.region).toUpperCase();
        const host = (0, endpoints_1.resolveHost)(environment, region);
        const accessToken = opts.access_token ?? this.defaults.accessToken;
        const shopId = opts.shop_id ?? this.defaults.shopId;
        const timestamp = toTimestamp(opts.timestamp) ?? this.now();
        const signature = sign(this.credentials, spec.path, timestamp, {
            accessToken,
            shopId,
            scope: spec.scope,
            merchantId: spec.merchantId,
        });
        const common = {
            partner_id: this.credentials.partner_id,
            timestamp,
            sign: signature,
        };
        if (accessToken !== undefined)
            common.access_token = accessToken;
        if (spec.scope === 'shop' && shopId !== undefined)
            common.shop_id = shopId;
        const q = new URLSearchParams();
        for (const k of Object.keys(common))
            q.set(k, String(common[k]));
        for (const k of spec.query) {
            const v = params[k];
            if (v !== undefined && v !== null)
                q.set(k, String(v));
        }
        for (const k of Object.keys(opts.query ?? {})) {
            const v = opts.query[k];
            if (v !== undefined && v !== null)
                q.set(k, String(v));
        }
        const url = `${host}${spec.path}?${q.toString()}`;
        const body = {};
        for (const k of spec.body) {
            const v = params[k];
            if (v !== undefined)
                body[k] = v;
        }
        const init = {
            method: spec.method,
            headers: { 'Content-Type': 'application/json' },
            signal: opts.signal,
        };
        if (spec.method === 'POST' && Object.keys(body).length > 0) {
            init.body = JSON.stringify(body);
        }
        let res;
        try {
            res = await this.fetchImpl(url, init);
        }
        catch (e) {
            throw new types_1.ShopeeError(`Network error: ${e?.message ?? e}`, { body: e });
        }
        const text = await res.text();
        let json;
        try {
            json = text ? JSON.parse(text) : null;
        }
        catch {
            json = { error: 'invalid_json', message: text };
        }
        if (!res.ok && this.throwOnHttpError) {
            throw new types_1.ShopeeError(json?.message || `HTTP ${res.status}`, {
                error: json?.error,
                requestId: json?.request_id,
                status: res.status,
                body: json,
            });
        }
        const errBody = json;
        if (errBody && errBody.error) {
            throw new types_1.ShopeeError(errBody.message || errBody.error, {
                error: errBody.error,
                requestId: errBody.request_id,
                status: res.status,
                body: json,
            });
        }
        return json;
    }
}
exports.ShopeeClient = ShopeeClient;
//# sourceMappingURL=client.js.map