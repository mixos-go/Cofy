import { TikTokClient } from './client';
import { TikTokCredentials, TikTokError, TikTokRequestOptions } from './types';
import * as generated from './generated';
export * from './types';
export * from './client';
export * from './auth';
export * from './connector';
export { TikTokClient } from './client';
export { generated };
export { TikTokAffiliateApi, TikTokAffiliateCreatorApi, TikTokAffiliatePartnerApi, TikTokAffiliateSellerApi, TikTokAnalyticsApi, TikTokAuthorizationApi, TikTokCustomerEngagementApi, TikTokCustomerServiceApi, TikTokDataReconciliationApi, TikTokEpharmacyApi, TikTokEventApi, TikTokFbtApi, TikTokFinanceApi, TikTokFulfillmentApi, TikTokGsFullServiceCommodityApi, TikTokGsFullServiceInventoryApi, TikTokGsFullServiceShipmentApi, TikTokLogisticsApi, TikTokOrderApi, TikTokProductApi, TikTokPromotionApi, TikTokReturnRefundApi, TikTokReviewRatingApi, TikTokSellerApi, TikTokSupplyChainApi, } from './generated';
import { TikTokAffiliateApi, TikTokAffiliateCreatorApi, TikTokAffiliatePartnerApi, TikTokAffiliateSellerApi, TikTokAnalyticsApi, TikTokAuthorizationApi, TikTokCustomerEngagementApi, TikTokCustomerServiceApi, TikTokDataReconciliationApi, TikTokEpharmacyApi, TikTokEventApi, TikTokFbtApi, TikTokFinanceApi, TikTokFulfillmentApi, TikTokGsFullServiceCommodityApi, TikTokGsFullServiceInventoryApi, TikTokGsFullServiceShipmentApi, TikTokLogisticsApi, TikTokOrderApi, TikTokProductApi, TikTokPromotionApi, TikTokReturnRefundApi, TikTokReviewRatingApi, TikTokSellerApi, TikTokSupplyChainApi } from './generated';
export interface TikTokOptions {
    credentials: TikTokCredentials;
    /** Default seller access_token (sent as `x-tts-access-token`). */
    accessToken?: string;
    /** Default shop_cipher for shop-scoped calls. */
    shopCipher?: string;
    /** Node 18+ native fetch is used by default; override for custom transport. */
    fetch?: typeof fetch;
}
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
export declare class TikTokShop {
    /** Low-level client (signing, endpoint resolution, request). */
    readonly client: TikTokClient;
    readonly options: TikTokOptions;
    readonly affiliate: TikTokAffiliateApi;
    readonly affiliateCreator: TikTokAffiliateCreatorApi;
    readonly affiliatePartner: TikTokAffiliatePartnerApi;
    readonly affiliateSeller: TikTokAffiliateSellerApi;
    readonly analytics: TikTokAnalyticsApi;
    readonly authorization: TikTokAuthorizationApi;
    readonly customerEngagement: TikTokCustomerEngagementApi;
    readonly customerService: TikTokCustomerServiceApi;
    readonly dataReconciliation: TikTokDataReconciliationApi;
    readonly epharmacy: TikTokEpharmacyApi;
    readonly event: TikTokEventApi;
    readonly fbt: TikTokFbtApi;
    readonly finance: TikTokFinanceApi;
    readonly fulfillment: TikTokFulfillmentApi;
    readonly gsFullServiceCommodity: TikTokGsFullServiceCommodityApi;
    readonly gsFullServiceInventory: TikTokGsFullServiceInventoryApi;
    readonly gsFullServiceShipment: TikTokGsFullServiceShipmentApi;
    readonly logistics: TikTokLogisticsApi;
    readonly order: TikTokOrderApi;
    readonly product: TikTokProductApi;
    readonly promotion: TikTokPromotionApi;
    readonly returnRefund: TikTokReturnRefundApi;
    readonly reviewRating: TikTokReviewRatingApi;
    readonly seller: TikTokSellerApi;
    readonly supplyChain: TikTokSupplyChainApi;
    constructor(options: TikTokOptions);
}
export { TikTokError };
export type { TikTokRequestOptions };
