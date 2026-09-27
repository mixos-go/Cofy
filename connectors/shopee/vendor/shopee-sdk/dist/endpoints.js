"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINT_HOSTS = void 0;
exports.resolveHost = resolveHost;
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
exports.ENDPOINT_HOSTS = {
    live: {
        GLOBAL: 'https://partner.shopeemobile.com',
        CN: 'https://openplatform.shopee.cn',
        BR: 'https://openplatform.shopee.com.br',
    },
    sandbox: {
        GLOBAL: 'https://openplatform.sandbox.test-stable.shopee.sg',
        CN: 'https://openplatform.sandbox.test-stable.shopee.cn',
    },
};
const UNKNOWN_REGION = '(unknown)';
/** Host for a given environment + region; throws if the combo is unsupported. */
function resolveHost(environment, region) {
    const key = (region || 'GLOBAL').toUpperCase();
    const host = exports.ENDPOINT_HOSTS[environment]?.[key];
    if (!host) {
        throw new Error(`Unsupported endpoint: environment=${environment} region=${key}. ` +
            `Supported regions for ${environment}: ${Object.keys(exports.ENDPOINT_HOSTS[environment]).join(', ') || UNKNOWN_REGION}`);
    }
    return host;
}
//# sourceMappingURL=endpoints.js.map