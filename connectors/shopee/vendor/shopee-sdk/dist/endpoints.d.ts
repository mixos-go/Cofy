import { ShopeeEnvironment, ShopeeRegion } from './types';
/**
 * Endpoint hosts by environment & region.
 *
 * Populated from the official Shopee reference docs (`references/api`), which
 * list the same 5 host permutations across every API:
 *
 * | Environment | Region      | Host                                                      |
 * | ----------- | ----------- | --------------------------------------------------------- |
 * | live        | GLOBAL      | partner.shopeemobile.com                                  |
 * | live        | CN          | openplatform.shopee.cn                                    |
 * | live        | BR          | openplatform.shopee.com.br                                |
 * | sandbox     | GLOBAL      | openplatform.sandbox.test-stable.shopee.sg                |
 * | sandbox     | CN          | openplatform.sandbox.test-stable.shopee.cn                |
 *
 * The full URL is `<host><httpPath>` where `httpPath` starts with `/api/v2/...`.
 */
export declare const ENDPOINT_HOSTS: Record<ShopeeEnvironment, Partial<Record<ShopeeRegion, string>>>;
/** Host for a given environment + region; throws if the combo is unsupported. */
export declare function resolveHost(environment: ShopeeEnvironment, region: ShopeeRegion | string): string;
