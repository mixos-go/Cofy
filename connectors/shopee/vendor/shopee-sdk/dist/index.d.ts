import { ShopeeClient } from './client';
import { ShopeeCredentials, ShopeeEnvironment, ShopeeError, ShopeeRegion } from './types';
import * as generated from './generated';
export * from './types';
export * from './client';
export * from './endpoints';
export * from './auth';
export * from './connector';
export { ShopeeClient } from './client';
export { generated };
export { ShopeeAMSApi, ShopeeAccountHealthApi, ShopeeAddOnDealApi, ShopeeAdsApi, ShopeeBrandPortalApi, ShopeeBundleDealApi, ShopeeDiscountApi, ShopeeFBSApi, ShopeeFirstMileApi, ShopeeFollowPrizeApi, ShopeeGlobalProductApi, ShopeeLivestreamApi, ShopeeLogisticsApi, ShopeeMediaApi, ShopeeMediaSpaceApi, ShopeeMerchantApi, ShopeeOrderApi, ShopeePaymentApi, ShopeeProductApi, ShopeePublicApi, ShopeePushApi, ShopeeReturnsApi, ShopeeSBSApi, ShopeeShopApi, ShopeeShopCategoryApi, ShopeeShopFlashSaleApi, ShopeeTopPicksApi, ShopeeVideoApi, ShopeeVoucherApi, } from './generated';
import { ShopeeAMSApi, ShopeeAccountHealthApi, ShopeeAddOnDealApi, ShopeeAdsApi, ShopeeBrandPortalApi, ShopeeBundleDealApi, ShopeeDiscountApi, ShopeeFBSApi, ShopeeFirstMileApi, ShopeeFollowPrizeApi, ShopeeGlobalProductApi, ShopeeLivestreamApi, ShopeeLogisticsApi, ShopeeMediaApi, ShopeeMediaSpaceApi, ShopeeMerchantApi, ShopeeOrderApi, ShopeePaymentApi, ShopeeProductApi, ShopeePublicApi, ShopeePushApi, ShopeeReturnsApi, ShopeeSBSApi, ShopeeShopApi, ShopeeShopCategoryApi, ShopeeShopFlashSaleApi, ShopeeTopPicksApi, ShopeeVideoApi, ShopeeVoucherApi } from './generated';
export interface ShopeeOptions {
    credentials: ShopeeCredentials;
    /** Default environment. Defaults to `live`. */
    environment?: ShopeeEnvironment;
    /** Default region. Defaults to `GLOBAL`. */
    region?: ShopeeRegion | string;
    /** Default access_token for shop-scoped calls. */
    accessToken?: string;
    /** Default shop_id for shop-scoped calls. */
    shopId?: number;
    /** Node 18+ native fetch is used by default; override for custom transport. */
    fetch?: typeof fetch;
}
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
export declare class Shopee {
    /** Low-level client (signing, endpoint resolution, request). */
    readonly client: ShopeeClient;
    readonly options: ShopeeOptions;
    readonly ams: ShopeeAMSApi;
    readonly accountHealth: ShopeeAccountHealthApi;
    readonly addOnDeal: ShopeeAddOnDealApi;
    readonly ads: ShopeeAdsApi;
    readonly brandPortal: ShopeeBrandPortalApi;
    readonly bundleDeal: ShopeeBundleDealApi;
    readonly discount: ShopeeDiscountApi;
    readonly fbs: ShopeeFBSApi;
    readonly firstMile: ShopeeFirstMileApi;
    readonly followPrize: ShopeeFollowPrizeApi;
    readonly globalProduct: ShopeeGlobalProductApi;
    readonly livestream: ShopeeLivestreamApi;
    readonly logistics: ShopeeLogisticsApi;
    readonly media: ShopeeMediaApi;
    readonly mediaSpace: ShopeeMediaSpaceApi;
    readonly merchant: ShopeeMerchantApi;
    readonly order: ShopeeOrderApi;
    readonly payment: ShopeePaymentApi;
    readonly product: ShopeeProductApi;
    readonly publicApi: ShopeePublicApi;
    readonly push: ShopeePushApi;
    readonly returns: ShopeeReturnsApi;
    readonly sbs: ShopeeSBSApi;
    readonly shop: ShopeeShopApi;
    readonly shopCategory: ShopeeShopCategoryApi;
    readonly shopFlashSale: ShopeeShopFlashSaleApi;
    readonly topPicks: ShopeeTopPicksApi;
    readonly video: ShopeeVideoApi;
    readonly voucher: ShopeeVoucherApi;
    constructor(options: ShopeeOptions);
}
export { ShopeeError };
