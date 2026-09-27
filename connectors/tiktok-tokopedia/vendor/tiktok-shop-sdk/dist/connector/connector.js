"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokShopConnector = void 0;
const auth_1 = require("../auth");
const client_1 = require("../client");
const types_1 = require("../types");
const token_store_1 = require("./token-store");
const DEFAULT_BASE = 'https://open-api.tiktokglobalshop.com';
/** Get Authorized Shops dipakai utk melengkapi `shop_cipher` bila token v2 tak membawanya. */
const AUTHORIZED_SHOPS_SPEC = {
    method: 'GET',
    path: '/authorization/202309/shops',
    baseUrl: DEFAULT_BASE,
    query: ['page_size', 'page_token', 'seller_type', 'shop_cipher'],
    headers: ['x-tts-access-token'],
    pathParams: [],
    body: [],
    bodyType: undefined,
};
function toExpiresAt(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const n = Number(value);
    if (!Number.isFinite(n))
        return undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    // v2: unix timestamp absolut (> now) → epoch ms; v1: detik tersisa (< now) → now + detik.
    return n > nowSec ? n * 1000 : Date.now() + n * 1000;
}
function toTokenSet(data, shopId) {
    const accessToken = data.access_token;
    if (accessToken === undefined)
        return {};
    return {
        accessToken,
        refreshToken: data.refresh_token,
        expiresAt: toExpiresAt(data.access_token_expire_in),
        shopId,
        openId: data.open_id,
        sellerName: data.seller_name,
        shopCipher: data.shop_cipher,
    };
}
function unwrap(json) {
    return (json?.data ?? json ?? {});
}
/**
 * Multi-seller OAuth connector untuk TikTok Shop Open Platform.
 *
 * Satu instance, banyak shop: token disimpan per `shopId` di `TokenStore`.
 * Access token TTS dikirim lewat header `x-tts-access-token` oleh TikTokClient.
 * Access token expire ~7 hari → sebelum tiap request, `beforeRequest` cek
 * `expiresAt` dan auto-refresh (single-flight) bila mendekat `< refreshThresholdMs`.
 */
class TikTokShopConnector {
    constructor(config) {
        this.shopIds = new Set();
        /** Single-flight refresh per shop: beberapa request paralel tidak refresh dobel. */
        this.refreshing = new Map();
        this.credentials = config.credentials;
        this.redirectUri = config.redirectUri;
        this.baseUrl = config.baseUrl ?? DEFAULT_BASE;
        this.authorizeBaseUrl = config.authorizeBaseUrl ?? auth_1.DEFAULT_AUTHORIZE_BASE;
        this.tokenBaseUrl = config.tokenBaseUrl ?? auth_1.DEFAULT_TOKEN_BASE;
        this.serviceIds = config.serviceIds;
        this.shopType = config.shopType ?? 0;
        this.category = config.category;
        this.shopCipher = config.shopCipher;
        this.refreshThresholdMs = config.refreshThresholdMs ?? 5 * 60000;
        this.store = config.store ?? new token_store_1.InMemoryTokenStore();
        this.fetchImpl = config.fetch ?? globalThis.fetch;
    }
    /**
     * URL OAuth yang harus dikunjungi seller untuk authorize shop-nya.
     * `shopId` disisipkan ke query redirect (caller tahu shop mana yang authorize);
     * `state` dipasang ke parameter `state` TikTok. `serviceIds` di-wire ke query
     * `service_ids` (join ';'), `shopType` ke `shop_type`.
     */
    buildAuthUrl(shopId, state) {
        const redirect = new URL(this.redirectUri);
        redirect.searchParams.set('shop_id', shopId);
        return (0, auth_1.buildAuthUrl)(this.credentials, redirect.toString(), {
            baseUrl: this.authorizeBaseUrl,
            state: state ?? '',
            shopType: this.shopType,
            serviceIds: this.serviceIds,
        });
    }
    /** Exchange `code` hasil callback → token, simpan ke store, return TokenSet. */
    async handleCallback(shopId, code) {
        const json = await (0, auth_1.exchangeAuthCode)(this.credentials, code, {
            baseUrl: this.tokenBaseUrl,
            fetch: this.fetchImpl,
        });
        const data = unwrap(json);
        if (data.access_token === undefined) {
            throw new types_1.TikTokError('Token exchange gagal: response tidak berisi access_token', { body: json });
        }
        const token = toTokenSet(data, shopId);
        await this.store.set(shopId, token);
        this.shopIds.add(shopId);
        if (token.shopCipher === undefined && (this.shopCipher !== undefined || (json.data !== undefined && json.data.shop_cipher === undefined))) {
            const cipher = this.shopCipher ?? (await this.resolveShopCipher(shopId, token.accessToken));
            if (cipher !== undefined) {
                token.shopCipher = cipher;
                await this.store.set(shopId, token);
            }
        }
        return token;
    }
    /** Refresh token untuk shop tertentu, update store (pakai primitif auth.ts). */
    async refresh(shopId) {
        const current = await this.store.get(shopId);
        if (current === undefined || current.refreshToken === undefined) {
            throw new types_1.TikTokError(`Shop ${shopId} belum punya refresh_token. Panggil handleCallback(shopId, code) dulu.`);
        }
        const json = await (0, auth_1.refreshAccessToken)(this.credentials, current.refreshToken, {
            baseUrl: this.tokenBaseUrl,
            fetch: this.fetchImpl,
        });
        const data = unwrap(json);
        if (data.access_token === undefined) {
            throw new types_1.TikTokError('Refresh gagal: response tidak berisi access_token', { body: json });
        }
        const token = {
            ...toTokenSet(data, shopId),
            refreshToken: data.refresh_token ?? current.refreshToken,
            openId: data.open_id ?? current.openId,
            sellerName: data.seller_name ?? current.sellerName,
            shopCipher: data.shop_cipher ?? current.shopCipher,
        };
        await this.store.set(shopId, token);
        this.shopIds.add(shopId);
        return token;
    }
    /**
     * Client untuk satu shop dengan access_token (header x-tts-access-token) +
     * shopCipher ter-inject. Sebelum tiap request, `beforeRequest` mengecek
     * `expiresAt`: bila mendekat token di-refresh dulu (single-flight) lalu
     * token baru di-inject ke client.
     */
    async getClient(shopId) {
        const token = await this.store.get(shopId);
        if (token === undefined) {
            throw new types_1.TikTokError(`Shop ${shopId} belum connect. Panggil handleCallback(shopId, code) dulu.`);
        }
        const client = new client_1.TikTokClient({
            credentials: this.credentials,
            accessToken: typeof token.accessToken === 'string' ? token.accessToken : undefined,
            shopCipher: typeof token.shopCipher === 'string' ? token.shopCipher : undefined,
            fetch: this.fetchImpl,
            beforeRequest: () => this.ensureFreshToken(shopId).then((fresh) => {
                client.updateToken(fresh.accessToken);
            }),
        });
        return client;
    }
    /** Daftar shop yang sudah pernah connect (punya token di store). */
    listShopIds() {
        const store = this.store;
        const fromStore = store.keys ? store.keys() : [];
        return Array.from(new Set([...fromStore, ...this.shopIds]));
    }
    /** Get Authorized Shops → cari cipher utk shopId (fallback shop pertama). */
    async resolveShopCipher(shopId, accessToken) {
        try {
            const client = new client_1.TikTokClient({
                credentials: this.credentials,
                accessToken,
                fetch: this.fetchImpl,
            });
            const json = (await client.request(AUTHORIZED_SHOPS_SPEC, {}));
            const shops = json?.data?.shops;
            if (shops === undefined || shops.length === 0)
                return undefined;
            const match = shops.find((s) => String(s.id) === String(shopId));
            return (match ?? shops[0])?.cipher;
        }
        catch {
            return undefined;
        }
    }
    /** Token saat ini dari store; bila tak ada → error jelas. */
    async ensureFreshToken(shopId) {
        const token = await this.store.get(shopId);
        if (token === undefined) {
            throw new types_1.TikTokError(`Shop ${shopId} belum connect. Panggil handleCallback(shopId, code) dulu.`);
        }
        const expired = token.expiresAt !== undefined && token.expiresAt - Date.now() < this.refreshThresholdMs;
        if (expired)
            return this.ensureFresh(shopId);
        return token;
    }
    /** Auto-refresh single-flight per shop agar request paralel tak refresh dobel. */
    ensureFresh(shopId) {
        const inFlight = this.refreshing.get(shopId);
        if (inFlight !== undefined)
            return inFlight;
        const p = this.refresh(shopId).finally(() => {
            this.refreshing.delete(shopId);
        });
        this.refreshing.set(shopId, p);
        return p;
    }
}
exports.TikTokShopConnector = TikTokShopConnector;
//# sourceMappingURL=connector.js.map