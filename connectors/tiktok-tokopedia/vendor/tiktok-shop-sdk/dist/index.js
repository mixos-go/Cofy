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
exports.TikTokError = exports.TikTokShop = exports.TikTokSupplyChainApi = exports.TikTokSellerApi = exports.TikTokReviewRatingApi = exports.TikTokReturnRefundApi = exports.TikTokPromotionApi = exports.TikTokProductApi = exports.TikTokOrderApi = exports.TikTokLogisticsApi = exports.TikTokGsFullServiceShipmentApi = exports.TikTokGsFullServiceInventoryApi = exports.TikTokGsFullServiceCommodityApi = exports.TikTokFulfillmentApi = exports.TikTokFinanceApi = exports.TikTokFbtApi = exports.TikTokEventApi = exports.TikTokEpharmacyApi = exports.TikTokDataReconciliationApi = exports.TikTokCustomerServiceApi = exports.TikTokCustomerEngagementApi = exports.TikTokAuthorizationApi = exports.TikTokAnalyticsApi = exports.TikTokAffiliateSellerApi = exports.TikTokAffiliatePartnerApi = exports.TikTokAffiliateCreatorApi = exports.TikTokAffiliateApi = exports.generated = exports.TikTokClient = void 0;
const client_1 = require("./client");
const types_1 = require("./types");
Object.defineProperty(exports, "TikTokError", { enumerable: true, get: function () { return types_1.TikTokError; } });
const generated = __importStar(require("./generated"));
exports.generated = generated;
__exportStar(require("./types"), exports);
__exportStar(require("./client"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./connector"), exports);
var client_2 = require("./client");
Object.defineProperty(exports, "TikTokClient", { enumerable: true, get: function () { return client_2.TikTokClient; } });
// Re-export every category client class.
var generated_1 = require("./generated");
Object.defineProperty(exports, "TikTokAffiliateApi", { enumerable: true, get: function () { return generated_1.TikTokAffiliateApi; } });
Object.defineProperty(exports, "TikTokAffiliateCreatorApi", { enumerable: true, get: function () { return generated_1.TikTokAffiliateCreatorApi; } });
Object.defineProperty(exports, "TikTokAffiliatePartnerApi", { enumerable: true, get: function () { return generated_1.TikTokAffiliatePartnerApi; } });
Object.defineProperty(exports, "TikTokAffiliateSellerApi", { enumerable: true, get: function () { return generated_1.TikTokAffiliateSellerApi; } });
Object.defineProperty(exports, "TikTokAnalyticsApi", { enumerable: true, get: function () { return generated_1.TikTokAnalyticsApi; } });
Object.defineProperty(exports, "TikTokAuthorizationApi", { enumerable: true, get: function () { return generated_1.TikTokAuthorizationApi; } });
Object.defineProperty(exports, "TikTokCustomerEngagementApi", { enumerable: true, get: function () { return generated_1.TikTokCustomerEngagementApi; } });
Object.defineProperty(exports, "TikTokCustomerServiceApi", { enumerable: true, get: function () { return generated_1.TikTokCustomerServiceApi; } });
Object.defineProperty(exports, "TikTokDataReconciliationApi", { enumerable: true, get: function () { return generated_1.TikTokDataReconciliationApi; } });
Object.defineProperty(exports, "TikTokEpharmacyApi", { enumerable: true, get: function () { return generated_1.TikTokEpharmacyApi; } });
Object.defineProperty(exports, "TikTokEventApi", { enumerable: true, get: function () { return generated_1.TikTokEventApi; } });
Object.defineProperty(exports, "TikTokFbtApi", { enumerable: true, get: function () { return generated_1.TikTokFbtApi; } });
Object.defineProperty(exports, "TikTokFinanceApi", { enumerable: true, get: function () { return generated_1.TikTokFinanceApi; } });
Object.defineProperty(exports, "TikTokFulfillmentApi", { enumerable: true, get: function () { return generated_1.TikTokFulfillmentApi; } });
Object.defineProperty(exports, "TikTokGsFullServiceCommodityApi", { enumerable: true, get: function () { return generated_1.TikTokGsFullServiceCommodityApi; } });
Object.defineProperty(exports, "TikTokGsFullServiceInventoryApi", { enumerable: true, get: function () { return generated_1.TikTokGsFullServiceInventoryApi; } });
Object.defineProperty(exports, "TikTokGsFullServiceShipmentApi", { enumerable: true, get: function () { return generated_1.TikTokGsFullServiceShipmentApi; } });
Object.defineProperty(exports, "TikTokLogisticsApi", { enumerable: true, get: function () { return generated_1.TikTokLogisticsApi; } });
Object.defineProperty(exports, "TikTokOrderApi", { enumerable: true, get: function () { return generated_1.TikTokOrderApi; } });
Object.defineProperty(exports, "TikTokProductApi", { enumerable: true, get: function () { return generated_1.TikTokProductApi; } });
Object.defineProperty(exports, "TikTokPromotionApi", { enumerable: true, get: function () { return generated_1.TikTokPromotionApi; } });
Object.defineProperty(exports, "TikTokReturnRefundApi", { enumerable: true, get: function () { return generated_1.TikTokReturnRefundApi; } });
Object.defineProperty(exports, "TikTokReviewRatingApi", { enumerable: true, get: function () { return generated_1.TikTokReviewRatingApi; } });
Object.defineProperty(exports, "TikTokSellerApi", { enumerable: true, get: function () { return generated_1.TikTokSellerApi; } });
Object.defineProperty(exports, "TikTokSupplyChainApi", { enumerable: true, get: function () { return generated_1.TikTokSupplyChainApi; } });
const generated_2 = require("./generated");
/**
 * `TikTokShop` is the main entry point. It wires a low-level `TikTokClient` to
 * all 25 generated category APIs under typed sub-clients.
 *
 * @example
 * import { TikTokShop } from './index'
 *
 * const tiktok = new TikTokShop({
 *   credentials: { app_key: 'YOUR_APP_KEY', app_secret: 'YOUR_APP_SECRET' },
 *   accessToken: 'YOUR_ACCESS_TOKEN',
 *   shopCipher: 'ROW_...',
 * })
 *
 * const res = await tiktok.order.getOrderList({ page_size: 20 })
 */
class TikTokShop {
    constructor(options) {
        this.options = options;
        const client = new client_1.TikTokClient({
            credentials: options.credentials,
            accessToken: options.accessToken,
            shopCipher: options.shopCipher,
            fetch: options.fetch,
        });
        this.client = client;
        this.affiliate = new generated_2.TikTokAffiliateApi(client);
        this.affiliateCreator = new generated_2.TikTokAffiliateCreatorApi(client);
        this.affiliatePartner = new generated_2.TikTokAffiliatePartnerApi(client);
        this.affiliateSeller = new generated_2.TikTokAffiliateSellerApi(client);
        this.analytics = new generated_2.TikTokAnalyticsApi(client);
        this.authorization = new generated_2.TikTokAuthorizationApi(client);
        this.customerEngagement = new generated_2.TikTokCustomerEngagementApi(client);
        this.customerService = new generated_2.TikTokCustomerServiceApi(client);
        this.dataReconciliation = new generated_2.TikTokDataReconciliationApi(client);
        this.epharmacy = new generated_2.TikTokEpharmacyApi(client);
        this.event = new generated_2.TikTokEventApi(client);
        this.fbt = new generated_2.TikTokFbtApi(client);
        this.finance = new generated_2.TikTokFinanceApi(client);
        this.fulfillment = new generated_2.TikTokFulfillmentApi(client);
        this.gsFullServiceCommodity = new generated_2.TikTokGsFullServiceCommodityApi(client);
        this.gsFullServiceInventory = new generated_2.TikTokGsFullServiceInventoryApi(client);
        this.gsFullServiceShipment = new generated_2.TikTokGsFullServiceShipmentApi(client);
        this.logistics = new generated_2.TikTokLogisticsApi(client);
        this.order = new generated_2.TikTokOrderApi(client);
        this.product = new generated_2.TikTokProductApi(client);
        this.promotion = new generated_2.TikTokPromotionApi(client);
        this.returnRefund = new generated_2.TikTokReturnRefundApi(client);
        this.reviewRating = new generated_2.TikTokReviewRatingApi(client);
        this.seller = new generated_2.TikTokSellerApi(client);
        this.supplyChain = new generated_2.TikTokSupplyChainApi(client);
    }
}
exports.TikTokShop = TikTokShop;
//# sourceMappingURL=index.js.map