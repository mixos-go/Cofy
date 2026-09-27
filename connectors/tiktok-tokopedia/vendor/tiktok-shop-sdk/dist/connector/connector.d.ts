import { TikTokClient } from '../client';
import { TikTokCredentials } from '../types';
import { TikTokShopConnectorConfig, TokenSet } from './types';
/**
 * Multi-seller OAuth connector untuk TikTok Shop Open Platform.
 *
 * Satu instance, banyak shop: token disimpan per `shopId` di `TokenStore`.
 * Access token TTS dikirim lewat header `x-tts-access-token` oleh TikTokClient.
 * Access token expire ~7 hari → sebelum tiap request, `beforeRequest` cek
 * `expiresAt` dan auto-refresh (single-flight) bila mendekat `< refreshThresholdMs`.
 */
export declare class TikTokShopConnector {
    readonly credentials: TikTokCredentials;
    readonly redirectUri: string;
    /** Base business OpenAPI (`open-api.tiktokglobalshop.com`). */
    readonly baseUrl: string;
    /** Base host authorize (default ROW `services.tiktokshop.com`). */
    readonly authorizeBaseUrl: string;
    /** Base host token (`auth.tiktok-shops.com`). */
    readonly tokenBaseUrl: string;
    readonly serviceIds?: string[];
    readonly shopType: number;
    readonly category?: string;
    /** Optional `shop_cipher` preseed bila caller sudah tahu cipher shop-nya. */
    readonly shopCipher?: string;
    readonly refreshThresholdMs: number;
    private readonly store;
    private readonly fetchImpl;
    private readonly shopIds;
    /** Single-flight refresh per shop: beberapa request paralel tidak refresh dobel. */
    private readonly refreshing;
    constructor(config: TikTokShopConnectorConfig);
    /**
     * URL OAuth yang harus dikunjungi seller untuk authorize shop-nya.
     * `shopId` disisipkan ke query redirect (caller tahu shop mana yang authorize);
     * `state` dipasang ke parameter `state` TikTok. `serviceIds` di-wire ke query
     * `service_ids` (join ';'), `shopType` ke `shop_type`.
     */
    buildAuthUrl(shopId: string, state?: string): string;
    /** Exchange `code` hasil callback → token, simpan ke store, return TokenSet. */
    handleCallback(shopId: string, code: string): Promise<TokenSet>;
    /** Refresh token untuk shop tertentu, update store (pakai primitif auth.ts). */
    refresh(shopId: string): Promise<TokenSet>;
    /**
     * Client untuk satu shop dengan access_token (header x-tts-access-token) +
     * shopCipher ter-inject. Sebelum tiap request, `beforeRequest` mengecek
     * `expiresAt`: bila mendekat token di-refresh dulu (single-flight) lalu
     * token baru di-inject ke client.
     */
    getClient(shopId: string): Promise<TikTokClient>;
    /** Daftar shop yang sudah pernah connect (punya token di store). */
    listShopIds(): string[];
    /** Get Authorized Shops → cari cipher utk shopId (fallback shop pertama). */
    private resolveShopCipher;
    /** Token saat ini dari store; bila tak ada → error jelas. */
    private ensureFreshToken;
    /** Auto-refresh single-flight per shop agar request paralel tak refresh dobel. */
    private ensureFresh;
}
