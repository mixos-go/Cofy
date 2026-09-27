import { ShopeeClient } from '../client';
import { ShopeeCredentials, ShopeeEnvironment, ShopeeRegion } from '../types';
import { ShopeeConnectorConfig, ShopeeConnectorScope, TokenSet } from './types';
/**
 * Multi-seller OAuth connector untuk Shopee Open Platform.
 *
 * Satu instance, banyak shop: token disimpan per `shopId` di `TokenStore`.
 * Access token Shopee expire ~4 jam dan refresh token 30 hari (single-use →
 * selalu simpan refresh_token baru hasil refresh).
 */
export declare class ShopeeConnector {
    readonly credentials: ShopeeCredentials;
    readonly redirectUri: string;
    readonly environment: ShopeeEnvironment;
    readonly region: ShopeeRegion | string;
    readonly scope: ShopeeConnectorScope;
    readonly refreshThresholdMs: number;
    private readonly store;
    private readonly fetchImpl?;
    private readonly shopIds;
    /** Single-flight refresh per shop: beberapa request paralel tidak refresh dobel. */
    private readonly refreshing;
    constructor(config: ShopeeConnectorConfig);
    /**
     * URL OAuth yang harus dikunjungi seller untuk authorize shop-nya.
     * `shopId` dan `state` (opsional) disisipkan ke query redirect, sehingga
     * callback bisa tahu shop mana yang baru saja authorize (Shopee mengembalikan
     * redirect URL beserta query-nya apa adanya + code + shop_id).
     */
    buildAuthUrl(shopId: string, state?: string): string;
    /** Exchange `code` hasil callback → token, simpan ke store, return TokenSet. */
    handleCallback(shopId: string, code: string): Promise<TokenSet>;
    /** Refresh token untuk shop tertentu, update store (pakai refresh_token baru). */
    refresh(shopId: string): Promise<TokenSet>;
    /**
     * Client untuk satu shop dengan access token + shop_id ter-inject.
     * Sebelum tiap request, `beforeRequest` mengecek `expiresAt`: bila mendekat
     * (< `refreshThresholdMs`) token di-refresh dulu (single-flight, pakai
     * refresh_token terbaru di store) lalu token baru di-inject ke client.
     */
    getClient(shopId: string): Promise<ShopeeClient>;
    /** Daftar shop yang sudah pernah connect (punya token di store). */
    listShopIds(): string[];
    private client;
    /** Token saat ini dari store; bila tak ada → error jelas. */
    private ensureFreshToken;
    /** Auto-refresh single-flight per shop agar request paralel tak refresh dobel. */
    private ensureFresh;
    private exchangeToken;
    private refreshToken;
}
