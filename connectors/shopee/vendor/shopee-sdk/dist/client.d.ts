import { ShopeeCredentials, ShopeeEnvironment, ShopeeRequestOptions, ShopeeRegion } from './types';
export type HttpMethod = 'GET' | 'POST';
/** Which identity fields participate in the sign base string. */
export type SignScope = 'shop' | 'merchant' | 'public';
/** Internal normalized request description for a generated API call. */
export interface ApiCallSpec {
    method: HttpMethod;
    path: string;
    /** Which params are sent as query string (besides the always-present common ones). */
    query: string[];
    /** Body params (JSON). */
    body: string[];
    /** Scope determines the sign base string and required identity. */
    scope: SignScope;
    /** For merchant-scope calls. */
    merchantId?: string;
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
export declare function sign(credentials: ShopeeCredentials, path: string, timestamp: number, opts?: {
    accessToken?: string;
    shopId?: number;
    merchantId?: string;
    scope?: SignScope;
}): string;
export interface ShopeeClientConfig {
    credentials: ShopeeCredentials;
    environment?: ShopeeEnvironment;
    region?: ShopeeRegion | string;
    /** Default access_token / shop_id applied to every call unless overridden. */
    accessToken?: string;
    shopId?: number;
    /** Custom fetch impl (defaults to globalThis.fetch). */
    fetch?: typeof fetch;
    /** Response ttl in ms until throwing on non-2xx (default false). */
    throwOnHttpError?: boolean;
    /**
     * Optional hook invoked at the start of every `request()`. The connector uses
     * this to check token expiry and auto-refresh (single-flight) before a call.
     */
    beforeRequest?: () => Promise<void>;
}
/**
 * Low-level HTTP client for the Shopee Open Platform API v2.
 *
 * Handles endpoint resolution, HMAC-SHA256 signing, common-parameter
 * injection and JSON (un)wrapping. Category clients and generated per-API
 * methods are built on top of this.
 */
export declare class ShopeeClient {
    readonly environment: ShopeeEnvironment;
    readonly region: ShopeeRegion | string;
    private readonly credentials;
    private defaults;
    private readonly fetchImpl;
    private readonly throwOnHttpError;
    private readonly beforeRequest?;
    constructor(cfg: ShopeeClientConfig);
    /**
     * Update the default access_token/shop_id at runtime (used by the connector
     * after an auto-refresh so subsequent calls sign with the fresh token).
     * Hanya field yang diberikan yang diganti; field lain tidak tersentuh.
     */
    updateToken(accessToken?: string, shopId?: number): void;
    private now;
    /** Resolve the full endpoint URL (host + path) for env/region. */
    endpoint(path: string): string;
    /**
     * Perform a signed request.
     *
     * @param spec        The generated API call specification.
     * @param params      Flat map of the API's own request parameters. Which keys
     *                    are treated as query vs body is governed by `spec`.
     * @param opts        Per-call overrides (region, environment, tokens, ...).
     */
    request(spec: ApiCallSpec, params: Record<string, unknown>, opts?: ShopeeRequestOptions): Promise<any>;
}
