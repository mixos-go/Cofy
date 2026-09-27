/**
 * Core types for the TikTok Shop Open Platform SDK.
 *
 * These types are shared across every generated category client.
 */
/** Credentials required to sign requests (HMAC-SHA256 over app_secret). */
export interface TikTokCredentials {
    /** Application key (app_key) issued when you register your app. */
    app_key: string;
    /** Application secret (used as the HMAC key). Never ship this client-side. */
    app_secret: string;
}
/** Per-request options. */
export interface TikTokRequestOptions {
    /**
     * Short-lived seller access_token. Sent in the `x-tts-access-token` header.
     */
    access_token?: string;
    /** The shop_cipher for the target shop (cross-border/multi-shop apps). */
    shop_cipher?: string;
    /** Override the (second) timestamp used for signing (testing). */
    timestamp?: number | string | Date;
    /** Abort signal for the underlying HTTP request (Node 18+). */
    signal?: AbortSignal;
    /** Override the API base URL (defaults to the doc's base_url). */
    baseUrl?: string;
}
/** Standard TikTok Shop success/error envelope. `code` is `0` on success. */
export interface TikTokErrorResponse {
    code: number | string;
    message?: string;
    request_id?: string;
    data?: unknown;
}
/**
 * Generic success envelope returned by the TikTok Shop Open Platform API.
 * Business data lives under `data`. `code === 0` indicates success.
 */
export interface TikTokApiResult<T = unknown> {
    code: number | string;
    message: string;
    request_id?: string;
    data?: T;
}
/** Maps a TS payload type against the TikTok Shop envelope. */
export type ApiResponse<T> = TikTokApiResult<T>;
export declare class TikTokError extends Error {
    readonly code: number | string;
    readonly requestId?: string;
    readonly status?: number;
    readonly body?: unknown;
    constructor(msg: string, opts?: {
        code?: number | string;
        requestId?: string;
        status?: number;
        body?: unknown;
    });
}
