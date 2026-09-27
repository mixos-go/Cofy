"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_REFRESH_PATH = exports.TOKEN_PATH = exports.AUTHORIZE_PATH = exports.DEFAULT_TOKEN_BASE = exports.DEFAULT_AUTHORIZE_BASE = void 0;
exports.buildAuthUrl = buildAuthUrl;
exports.exchangeAuthCode = exchangeAuthCode;
exports.refreshAccessToken = refreshAccessToken;
/**
 * Host alur OAuth TikTok Shop (2024+):
 * - authorize  → browser di `services.tiktokshop.com` (ROW) / `services.us.tiktokshop.com` (US)
 * - token      → GET `auth.tiktok-shops.com/api/v2/token/get`
 * - refresh    → GET `auth.tiktok-shops.com/api/v2/token/refresh`
 * - business API → `open-api.tiktokglobalshop.com` (di-sign; lihat `client.sign`).
 *
 * Host authorize/token TIDAK menerima signature; token memakai app_secret + auth_code
 * langsung (grant_type=authorized_code / refresh_token).
 */
exports.DEFAULT_AUTHORIZE_BASE = 'https://services.tiktokshop.com';
exports.DEFAULT_TOKEN_BASE = 'https://auth.tiktok-shops.com';
exports.AUTHORIZE_PATH = '/open/authorize';
exports.TOKEN_PATH = '/api/v2/token/get';
exports.TOKEN_REFRESH_PATH = '/api/v2/token/refresh';
/**
 * Build URL authorize seller TikTok Shop (host `services.tiktokshop.com`).
 *
 * Setelah seller approve, TikTok redirect ke `path` (redirect URL) membawa `code` + `state`.
 * Tukar `code` via `exchangeAuthCode` (beri `auth_code`).
 */
function buildAuthUrl(credentials, redirectUrl, opts = {}) {
    const base = opts.baseUrl ?? exports.DEFAULT_AUTHORIZE_BASE;
    const timestamp = Math.floor(Date.now() / 1000);
    const query = {
        app_key: credentials.app_key,
        timestamp: String(timestamp),
        state: opts.state ?? '',
        path: redirectUrl,
        shop_type: opts.shopType ?? 0,
    };
    if (opts.serviceId !== undefined)
        query.service_id = opts.serviceId;
    if (opts.serviceIds !== undefined && opts.serviceIds.length > 0) {
        query.service_ids = opts.serviceIds.join(';');
    }
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query))
        search.set(k, String(v));
    return `${base}${exports.AUTHORIZE_PATH}?${search.toString()}`;
}
/**
 * Exchange authorization `code` → access_token + refresh_token.
 *
 * GET `auth.tiktok-shops.com/api/v2/token/get` dengan query:
 * `app_key`, `app_secret`, `auth_code` (= code callback), `grant_type=authorized_code`.
 * Tanpa signature/timestamp (spesial: token endpoint berbeda dari business API).
 */
async function exchangeAuthCode(credentials, code, opts = {}) {
    const params = {
        app_key: credentials.app_key,
        app_secret: credentials.app_secret,
        auth_code: code,
        grant_type: 'authorized_code',
    };
    return getTokenRequest(exports.DEFAULT_TOKEN_BASE, exports.TOKEN_PATH, params, opts.baseUrl, opts.fetch);
}
/**
 * Refresh access token → GET `auth.tiktok-shops.com/api/v2/token/refresh`.
 * Access token expire ~7 hari; refresh sebelum kedaluwarsa (token refresh single-use).
 */
async function refreshAccessToken(credentials, refreshToken, opts = {}) {
    const params = {
        app_key: credentials.app_key,
        app_secret: credentials.app_secret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
    };
    return getTokenRequest(exports.DEFAULT_TOKEN_BASE, exports.TOKEN_REFRESH_PATH, params, opts.baseUrl, opts.fetch);
}
async function getTokenRequest(defaultBase, path, params, overriddenBase, fetchImpl) {
    const base = overriddenBase ?? defaultBase;
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params))
        search.set(k, String(v));
    const fn = fetchImpl ?? globalThis.fetch;
    const res = await fn(`${base}${path}?${search.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });
    const text = await res.text();
    let json;
    try {
        json = text ? JSON.parse(text) : null;
    }
    catch {
        json = { code: 'invalid_json', message: text };
    }
    return json ?? {};
}
//# sourceMappingURL=auth.js.map