import type { ShopeeCredentials, ShopeeEnvironment, ShopeeRegion } from '../types';
import type { TokenStore } from './token-store';
/**
 * Token pasangan + metadata masa berlaku untuk satu shop/seller.
 * Key store = `shopId` (string). Field tambahan spesifik Shopee: `shopId` (number), `region`.
 */
export interface TokenSet {
    accessToken: string;
    refreshToken?: string;
    /** epoch ms saat token kedaluwarsa (dari expire_in platform saat diperoleh). */
    expiresAt?: number;
    [key: string]: unknown;
}
export type ShopeeConnectorScope = 'shop' | 'merchant';
export interface ShopeeConnectorConfig {
    credentials: ShopeeCredentials;
    redirectUri: string;
    store?: TokenStore;
    environment?: ShopeeEnvironment;
    region?: ShopeeRegion | string;
    scope?: ShopeeConnectorScope;
    fetch?: typeof fetch;
    /** Sisa waktu (ms) sebelum expiry yang memicu auto-refresh saat getClient. Default 5 mnt. */
    refreshThresholdMs?: number;
}
