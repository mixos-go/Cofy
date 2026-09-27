/**
 * Core types for the Shopee Open Platform SDK.
 *
 * These types are shared across every generated category client.
 */
/** API environment */
export type ShopeeEnvironment = 'live' | 'sandbox';
/** Region / Endpoint location selector, mirrors the documented endpoint locations. */
export type ShopeeRegion = 'GLOBAL' | 'CN' | 'BR';
/** Endpoint location values accepted from the CLI / shorthand. */
export declare const ENDPOINT_SITES: readonly ["GLOBAL", "CN", "BR"];
/** Credentials required to sign requests (HMAC-SHA256). */
export interface ShopeeCredentials {
    /** Partner ID assigned on registration. */
    partner_id: number;
    /** Secret partner key used for HMAC-SHA256 signing. */
    partner_key: string;
}
/** Per-request options. */
export interface ShopeeRequestOptions {
    /** Defaults to `GLOBAL`. */
    region?: ShopeeRegion | string;
    /** Defaults to `live`. */
    environment?: ShopeeEnvironment;
    /**
     * Short-lived access_token (expires in ~4h) issued after authorizing a shop.
     * Required for shop-scoped calls.
     */
    access_token?: string;
    /** Shopee unique identifier for a shop. Required for most APIs. */
    shop_id?: number;
    /** Override the nano/milli second timestamp for signing (testing). */
    timestamp?: number | string | Date;
    /** Abort signal for the underlying HTTP request (Node 18+). */
    signal?: AbortSignal;
    /** Optional extra query string params appended to the URL (e.g. pagination). */
    query?: Record<string, string | number | boolean | undefined>;
}
/** Standard Shopee API v2 error response envelope. */
export interface ShopeeErrorResponse {
    error: string;
    message: string;
    request_id?: string;
    response?: unknown;
}
/** Generic success envelope returned by Shopee API v2. */
export interface ShopeeApiResult<T = unknown> {
    error: string;
    message: string;
    request_id?: string;
    warning?: string;
    response?: T;
}
/** Maps a TS type against the standard Shopee success envelope. */
export type ApiResponse<T> = ShopeeApiResult<T>;
export declare class ShopeeError extends Error {
    readonly error: string;
    readonly requestId?: string;
    readonly status?: number;
    readonly body?: ShopeeErrorResponse | unknown;
    constructor(msg: string, opts?: {
        error?: string;
        requestId?: string;
        status?: number;
        body?: unknown;
    });
}
