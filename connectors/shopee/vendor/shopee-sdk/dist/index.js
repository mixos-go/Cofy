"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShopeeError = exports.Shopee = exports.ShopeeVoucherApi = exports.ShopeeVideoApi = exports.ShopeeTopPicksApi = exports.ShopeeShopFlashSaleApi = exports.ShopeeShopCategoryApi = exports.ShopeeShopApi = exports.ShopeeSBSApi = exports.ShopeeReturnsApi = exports.ShopeePushApi = exports.ShopeePublicApi = exports.ShopeeProductApi = exports.ShopeePaymentApi = exports.ShopeeOrderApi = exports.ShopeeMerchantApi = exports.ShopeeMediaSpaceApi = exports.ShopeeMediaApi = exports.ShopeeLogisticsApi = exports.ShopeeLivestreamApi = exports.ShopeeGlobalProductApi = exports.ShopeeFollowPrizeApi = exports.ShopeeFirstMileApi = exports.ShopeeFBSApi = exports.ShopeeDiscountApi = exports.ShopeeBundleDealApi = exports.ShopeeBrandPortalApi = exports.ShopeeAdsApi = exports.ShopeeAddOnDealApi = exports.ShopeeAccountHealthApi = exports.ShopeeAMSApi = exports.generated = exports.ShopeeClient = void 0;
const client_1 = require("./client");
const types_1 = require("./types");
Object.defineProperty(exports, "ShopeeError", { enumerable: true, get: function () { return types_1.ShopeeError; } });
const generated = __importStar(require("./generated"));
exports.generated = generated;
__exportStar(require("./types"), exports);
__exportStar(require("./client"), exports);
__exportStar(require("./endpoints"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./connector"), exports);
var client_2 = require("./client");
Object.defineProperty(exports, "ShopeeClient", { enumerable: true, get: function () { return client_2.ShopeeClient; } });
// Re-export every category client class for ergonomic imports.
var generated_1 = require("./generated");
Object.defineProperty(exports, "ShopeeAMSApi", { enumerable: true, get: function () { return generated_1.ShopeeAMSApi; } });
Object.defineProperty(exports, "ShopeeAccountHealthApi", { enumerable: true, get: function () { return generated_1.ShopeeAccountHealthApi; } });
Object.defineProperty(exports, "ShopeeAddOnDealApi", { enumerable: true, get: function () { return generated_1.ShopeeAddOnDealApi; } });
Object.defineProperty(exports, "ShopeeAdsApi", { enumerable: true, get: function () { return generated_1.ShopeeAdsApi; } });
Object.defineProperty(exports, "ShopeeBrandPortalApi", { enumerable: true, get: function () { return generated_1.ShopeeBrandPortalApi; } });
Object.defineProperty(exports, "ShopeeBundleDealApi", { enumerable: true, get: function () { return generated_1.ShopeeBundleDealApi; } });
Object.defineProperty(exports, "ShopeeDiscountApi", { enumerable: true, get: function () { return generated_1.ShopeeDiscountApi; } });
Object.defineProperty(exports, "ShopeeFBSApi", { enumerable: true, get: function () { return generated_1.ShopeeFBSApi; } });
Object.defineProperty(exports, "ShopeeFirstMileApi", { enumerable: true, get: function () { return generated_1.ShopeeFirstMileApi; } });
Object.defineProperty(exports, "ShopeeFollowPrizeApi", { enumerable: true, get: function () { return generated_1.ShopeeFollowPrizeApi; } });
Object.defineProperty(exports, "ShopeeGlobalProductApi", { enumerable: true, get: function () { return generated_1.ShopeeGlobalProductApi; } });
Object.defineProperty(exports, "ShopeeLivestreamApi", { enumerable: true, get: function () { return generated_1.ShopeeLivestreamApi; } });
Object.defineProperty(exports, "ShopeeLogisticsApi", { enumerable: true, get: function () { return generated_1.ShopeeLogisticsApi; } });
Object.defineProperty(exports, "ShopeeMediaApi", { enumerable: true, get: function () { return generated_1.ShopeeMediaApi; } });
Object.defineProperty(exports, "ShopeeMediaSpaceApi", { enumerable: true, get: function () { return generated_1.ShopeeMediaSpaceApi; } });
Object.defineProperty(exports, "ShopeeMerchantApi", { enumerable: true, get: function () { return generated_1.ShopeeMerchantApi; } });
Object.defineProperty(exports, "ShopeeOrderApi", { enumerable: true, get: function () { return generated_1.ShopeeOrderApi; } });
Object.defineProperty(exports, "ShopeePaymentApi", { enumerable: true, get: function () { return generated_1.ShopeePaymentApi; } });
Object.defineProperty(exports, "ShopeeProductApi", { enumerable: true, get: function () { return generated_1.ShopeeProductApi; } });
Object.defineProperty(exports, "ShopeePublicApi", { enumerable: true, get: function () { return generated_1.ShopeePublicApi; } });
Object.defineProperty(exports, "ShopeePushApi", { enumerable: true, get: function () { return generated_1.ShopeePushApi; } });
Object.defineProperty(exports, "ShopeeReturnsApi", { enumerable: true, get: function () { return generated_1.ShopeeReturnsApi; } });
Object.defineProperty(exports, "ShopeeSBSApi", { enumerable: true, get: function () { return generated_1.ShopeeSBSApi; } });
Object.defineProperty(exports, "ShopeeShopApi", { enumerable: true, get: function () { return generated_1.ShopeeShopApi; } });
Object.defineProperty(exports, "ShopeeShopCategoryApi", { enumerable: true, get: function () { return generated_1.ShopeeShopCategoryApi; } });
Object.defineProperty(exports, "ShopeeShopFlashSaleApi", { enumerable: true, get: function () { return generated_1.ShopeeShopFlashSaleApi; } });
Object.defineProperty(exports, "ShopeeTopPicksApi", { enumerable: true, get: function () { return generated_1.ShopeeTopPicksApi; } });
Object.defineProperty(exports, "ShopeeVideoApi", { enumerable: true, get: function () { return generated_1.ShopeeVideoApi; } });
Object.defineProperty(exports, "ShopeeVoucherApi", { enumerable: true, get: function () { return generated_1.ShopeeVoucherApi; } });
const generated_2 = require("./generated");
/**
 * `Shopee` is the main entry point. It wires a low-level `ShopeeClient` to all
 * 29 generated category APIs under typed sub-clients.
 *
 * @example
 * import { Shopee } from './index'
 *
 * const shopee = new Shopee({
 *   credentials: { partner_id: 2001887, partner_key: '...' },
 *   environment: 'sandbox',
 *   region: 'GLOBAL',
 *   accessToken: '...',
 *   shopId: 14701711,
 * })
 *
 * const res = await shopee.order.getOrderList({
 *   time_range_field: 'create_time',
 *   time_from: 1607235072,
 *   time_to: 1608271872,
 *   page_size: 20,
 * })
 */
class Shopee {
    constructor(options) {
        this.options = options;
        const client = new client_1.ShopeeClient({
            credentials: options.credentials,
            environment: options.environment,
            region: options.region,
            accessToken: options.accessToken,
            shopId: options.shopId,
            fetch: options.fetch,
        });
        this.client = client;
        this.ams = new generated_2.ShopeeAMSApi(client);
        this.accountHealth = new generated_2.ShopeeAccountHealthApi(client);
        this.addOnDeal = new generated_2.ShopeeAddOnDealApi(client);
        this.ads = new generated_2.ShopeeAdsApi(client);
        this.brandPortal = new generated_2.ShopeeBrandPortalApi(client);
        this.bundleDeal = new generated_2.ShopeeBundleDealApi(client);
        this.discount = new generated_2.ShopeeDiscountApi(client);
        this.fbs = new generated_2.ShopeeFBSApi(client);
        this.firstMile = new generated_2.ShopeeFirstMileApi(client);
        this.followPrize = new generated_2.ShopeeFollowPrizeApi(client);
        this.globalProduct = new generated_2.ShopeeGlobalProductApi(client);
        this.livestream = new generated_2.ShopeeLivestreamApi(client);
        this.logistics = new generated_2.ShopeeLogisticsApi(client);
        this.media = new generated_2.ShopeeMediaApi(client);
        this.mediaSpace = new generated_2.ShopeeMediaSpaceApi(client);
        this.merchant = new generated_2.ShopeeMerchantApi(client);
        this.order = new generated_2.ShopeeOrderApi(client);
        this.payment = new generated_2.ShopeePaymentApi(client);
        this.product = new generated_2.ShopeeProductApi(client);
        this.publicApi = new generated_2.ShopeePublicApi(client);
        this.push = new generated_2.ShopeePushApi(client);
        this.returns = new generated_2.ShopeeReturnsApi(client);
        this.sbs = new generated_2.ShopeeSBSApi(client);
        this.shop = new generated_2.ShopeeShopApi(client);
        this.shopCategory = new generated_2.ShopeeShopCategoryApi(client);
        this.shopFlashSale = new generated_2.ShopeeShopFlashSaleApi(client);
        this.topPicks = new generated_2.ShopeeTopPicksApi(client);
        this.video = new generated_2.ShopeeVideoApi(client);
        this.voucher = new generated_2.ShopeeVoucherApi(client);
    }
}
exports.Shopee = Shopee;
//# sourceMappingURL=index.js.map