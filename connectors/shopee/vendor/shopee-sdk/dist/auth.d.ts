import { ShopeeCredentials, ShopeeEnvironment, ShopeeRegion } from './types';
import { SignScope } from './client';
/**
 * Build a Shopee OAuth authorization URL for the shop-level authorization flow.
 *
 * After the seller grants access, they are redirected back with a `code` and
 * `shop_id`, which you exchange for an access_token via
 * `public.getAccessToken({ code, shop_id, partner_id })`.
 *
 * @param redirectUrl Encoded redirect URL of your app.
 * @param scope       Identity scope. Defaults to `shop` (shop-level auth).
 */
export declare function buildAuthUrl(credentials: ShopeeCredentials, redirectUrl: string, opts?: {
    environment?: ShopeeEnvironment;
    region?: ShopeeRegion | string;
    scope?: SignScope;
    merchantId?: string;
    codeChallenge?: string;
}): string;
/**
 * Verify an incoming Shopee push (callback) webhook signature.
 *
 * Shopee signs push payloads with:
 * `signature = hex(HMAC-SHA256(partner_key, url + '|' + request_body))`.
 *
 * @returns true when the computed signature matches the `Authorization` header.
 */
export declare function verifyPushSignature(partnerKey: string, url: string, requestBody: string, authorizationHeader: string): boolean;
