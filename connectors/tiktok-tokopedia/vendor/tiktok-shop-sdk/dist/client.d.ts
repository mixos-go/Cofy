import { TikTokCredentials, TikTokRequestOptions } from './types';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
/** Internal normalized request description for a generated API call. */
export interface ApiCallSpec {
    method: HttpMethod;
    path: string;
    baseUrl: string;
    /** Request params that are sent as query string. */
    query: string[];
    /** Request params sent as headers (e.g. x-tts-access-token, Content-Type). */
    headers: string[];
    /** Path params substituted into `{param}` placeholders. */
    pathParams: string[];
    /** Request Body fields (dot-notation keys). */
    body: string[];
    /** A body example snippet, used to derive a body-only type name. */
    bodyType?: string;
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
export declare function sign(appSecret: string, path: string, query: Record<string, unknown>, body?: string): string;
/** Compact deterministic JSON for bodies used in both request + signature. */
export declare function serializeBody(params: Record<string, unknown>, keys: string[]): string;
export interface TikTokClientConfig {
    credentials: TikTokCredentials;
    /** Default access_token sent as `x-tts-access-token`. */
    accessToken?: string;
    /** Default shop_cipher for shop-scoped calls. */
    shopCipher?: string;
    /** Custom fetch impl (defaults to globalThis.fetch). */
    fetch?: typeof fetch;
    /** Throw on non-2xx HTTP response (default false). */
    throwOnHttpError?: boolean;
    /**
     * Optional hook invoked at the start of every `request()`. The connector uses
     * this to check token expiry and auto-refresh (single-flight) before a call.
     */
    beforeRequest?: () => Promise<void>;
}
/**
 * Low-level HTTP client for the TikTok Shop Open Platform API.
 *
 * Handles base-URL resolution, HMAC-SHA256 signing, common-parameter
 * injection (app_key, timestamp, sign, shop_cipher) and JSON unwrapping.
 * Category clients and generated per-API methods are built on top of this.
 */
export declare class TikTokClient {
    private readonly credentials;
    private defaults;
    private readonly fetchImpl;
    private readonly throwOnHttpError;
    private readonly beforeRequest?;
    constructor(cfg: TikTokClientConfig);
    /**
     * Update the default access_token/shop_cipher at runtime (used by the
     * connector after an auto-refresh so subsequent calls sign with the fresh
     * token + send the fresh `x-tts-access-token` header).
     * Hanya field yang diberikan yang diganti; field lain tidak tersentuh.
     */
    updateToken(accessToken?: string, shopCipher?: string): void;
    /**
     * Perform a signed request.
     *
     * @param spec    The generated API call specification.
     * @param params  Flat map of the API's own request parameters.
     * @param opts    Per-call overrides (access_token, shop_cipher, ...).
     */
    request(spec: ApiCallSpec, params: Record<string, unknown>, opts?: TikTokRequestOptions): Promise<any>;
}
