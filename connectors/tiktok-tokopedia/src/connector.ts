/**
 * TikTok Shop / Tokopedia adapter.
 *
 * Implements `ChannelConnector` (packages/channel-sdk) on top of the vendored SDK. Everything
 * TikTok-shaped lives here or in the modules it imports (AGENTS.md §4).
 *
 * Honest scope choices, each recorded rather than silently no-op'd:
 *
 * - `splitsOrderHistory` is `true`, and this is the reason docs/adr/0003 exists. The search endpoint
 *   (`/order/202309/orders/search`) can return orders with only `{ id, external_order, line_items }`
 *   when the query is narrow; full detail needs the detail endpoint per order id. Reconciliation
 *   therefore reads both APIs.
 * - `pushStock` addresses items by the platform `product_id` plus `sku_id` that `fetchListings`
 *   resolves (docs/adr/0009). An item without a mapping is reported `unknown_sku`, never sent, so
 *   the capability can say `true` without pretending a mapping exists.
 * - The listing field names (`products[].id`, `products[].status`, per-SKU `id`/`seller_sku`) come
 *   from the official OAS and are not yet confirmed against a live Development Shop; that gap is
 *   recorded in docs/PLAN.md rather than hidden.
 * - Webhooks are declared unsupported. See `webhookHandlers()` for why: the signature scheme is not
 *   in the official OAS or the vendored SDK, and implementing a guess would fail open or reject
 *   valid traffic.
 */

import { PlatformError } from "@platform/contracts";
import type {
  ArrangedShipment,
  ChannelListing,
  ChannelListingVariant,
  ChannelOrder,
  ChannelOrderLine,
  ChannelOrderTotals,
  ChannelShippingOption,
  ChannelStockLevel,
  ChannelTrackingPage,
  Cursor,
  Instant,
  Page,
  ServiceLevel,
  ShipmentStatus,
  ShippingArrangementParameters,
  ShippingArrangementRequest,
  ShippingLabel,
  StockResult,
  StockUpdate,
  TrackingEvent,
  TrackingWriteBack
} from "@platform/contracts";
import type {
  AuthorizationContext,
  AuthorizationRequest,
  ChannelCapabilities,
  ChannelConnector,
  Credential,
  OAuthCallbackParams,
  WebhookHandler
} from "@platform/channel-sdk";

import type { TikTokConnectorConfig } from "./config.ts";
import { assertSuccess, toPlatformError } from "./errors.ts";
import type { TikTokProduct, TikTokSearchProductsResponse, TikTokUpdateInventoryResponse } from "./listing-schema.ts";
import { listingStatusOf } from "./listing-schema.ts";
import { assertIdr, decimalToMinor, epochSecondsToInstant } from "./money.ts";
import type { TikTokOrder, TikTokOrderDetailResponse, TikTokOrderSearchResponse } from "./order-schema.ts";
import { lineQuantity } from "./order-schema.ts";
import { TikTokShop, buildAuthUrl, exchangeAuthCode, refreshAccessToken } from "./vendor/tiktok-shop-sdk.ts";
import type {
  CreatePackagesResponse,
  GetEligibleShippingServiceResponse,
  GetOrderListBody,
  GetPackageShippingDocumentResponse,
  GetTrackingResponse,
  SearchProductsBody,
  ShipPackageResponse,
  TokenResponse,
  UpdateShippingInfoResponse
} from "./vendor/tiktok-shop-sdk.ts";

/** Cursor payload. Opaque to the caller; only this connector may interpret it (contract doc). */
interface TikTokCursor {
  /** Opaque token for the next search page. */
  readonly pageToken: string;
  /** Inclusive lower bound of the create-time window, in epoch seconds. */
  readonly createTimeGe: number;
  /** Exclusive upper bound of the create-time window. */
  readonly createTimeLt: number;
}

const MAX_WINDOW_SECONDS = 24 * 60 * 60;

/** Listing cursor. Like the order cursor, opaque to callers; `pageToken: ""` means "start". */
interface TikTokListingCursor {
  readonly pageToken: string;
  /** Inclusive lower bound of the update-time window, in epoch seconds. */
  readonly updateTimeGe: number;
  /** Exclusive upper bound of the update-time window, in epoch seconds. */
  readonly updateTimeLt: number;
}

/** How far back a first listing walk looks. Listings change less often than orders. */
const LISTING_LOOKBACK_SECONDS = 30 * 24 * 60 * 60;

/** The token endpoint types `code` as `number | string`; normalise before classifying it. */
function normalizeCode(code: number | string | undefined): number | undefined {
  if (code === undefined) return undefined;
  const parsed = typeof code === "number" ? code : Number(code);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Map TikTok's `shipping_type` onto our neutral `ServiceLevel` (docs/adr/0021).
 *
 * TikTok names its services `STANDARD`/`EXPRESS`/`ECONOMY`; anything else is `regular`, which is the
 * honest default rather than an invented tier. The raw name is kept on the option's `courier` field
 * via the service name, so no information is lost.
 */
function tiktokServiceLevel(shippingType: string | undefined): ServiceLevel {
  switch ((shippingType ?? "").toUpperCase()) {
    case "EXPRESS":
      return "express";
    case "ECONOMY":
      return "cargo";
    default:
      return "regular";
  }
}

/** Parse TikTok's decimal price string into IDR minor units, or null when absent/unparseable. */
function tiktokPriceMinor(price: string | undefined): { amount: number; currency: "IDR" } | null {
  if (price === undefined || price === "") return null;
  const parsed = Number(price);
  if (Number.isNaN(parsed)) return null;
  return { amount: Math.round(parsed * 100), currency: "IDR" };
}

/**
 * Map TikTok's package/tracking status onto our neutral `ShipmentStatus` (docs/adr/0021).
 *
 * The values come from the tracking payload's `status`/`description`; an unknown value is skipped
 * (returns null) rather than guessed, so the pull path never invents a state TikTok did not report.
 */
function tiktokTrackingStatus(raw: unknown): ShipmentStatus | null {
  if (typeof raw !== "string") return null;
  switch (raw.toUpperCase()) {
    case "IN_TRANSIT":
    case "SHIPPED":
    case "DISPATCHED":
      return "in_transit";
    case "DELIVERED":
      return "delivered";
    case "DELIVERY_FAILED":
    case "FAILED":
      return "failed";
    case "RETURNED":
    case "RETURN":
      return "returned";
    case "CANCELLED":
    case "CANCELED":
      return "cancelled";
    case "OUT_FOR_DELIVERY":
      return "out_for_delivery";
    case "COLLECTED":
    case "PICKED_UP":
      return "picked_up";
    default:
      return null;
  }
}

/**
 * The first package id on an order detail, or null.
 *
 * TikTok addresses packages, not orders, for the label and shipping calls, and the order detail is
 * where the package id lives (`line_items[].package_id`, the same field `order-schema.ts` maps). An
 * order with no package has not been arranged yet, which is a real state and not an error here.
 */
function readPackageId(detail: TikTokOrderDetailResponse): string | null {
  for (const order of detail.data?.orders ?? []) {
    for (const line of order.line_items ?? []) {
      const packageId = line.package_id;
      if (typeof packageId === "string" && packageId !== "") return packageId;
    }
  }
  return null;
}

export class TikTokConnector implements ChannelConnector {
  readonly channel = "tiktok_tokopedia" as const;

  private readonly config: TikTokConnectorConfig;

  constructor(config: TikTokConnectorConfig) {
    this.config = config;
  }

  private appOnlyClient(accessToken?: string): TikTokShop {
    return new TikTokShop({
      credentials: { app_key: this.config.app.appKey, app_secret: this.config.app.appSecret },
      accessToken,
      fetch: this.config.transport
    });
  }

  private clientFor(credential: Credential): TikTokShop {
    return new TikTokShop({
      credentials: { app_key: this.config.app.appKey, app_secret: this.config.app.appSecret },
      accessToken: credential.accessToken,
      shopCipher: this.shopCipherOf(credential),
      fetch: this.config.transport
    });
  }

  private shopCipherOf(credential: Credential): string {
    const cipher = credential.context["shopCipher"];
    if (cipher === undefined || cipher === "") {
      throw new PlatformError(
        "VALIDATION_FAILED",
        "TikTok credential is missing shopCipher in its context. It is issued during authorization."
      );
    }
    return cipher;
  }

  async beginAuthorization(ctx: AuthorizationContext): Promise<AuthorizationRequest> {
    try {
      // The authorize host is not signed; the app_key, redirect and state travel as query params.
      // Delegating to the vendored `buildAuthUrl` keeps one description of the URL shape; it names
      // the redirect parameter `path` and adds `timestamp` and `shop_type`.
      //
      // Verified live (2026-09-27): the host answers and our app_key is accepted. NOT verified: a
      // full seller authorization, which needs a shop to approve. If TikTok rejects `path` and wants
      // `redirect_uri`, that is a one-line change here plus this test.
      return {
        url: buildAuthUrl(
          { app_key: this.config.app.appKey, app_secret: this.config.app.appSecret },
          ctx.redirectUri,
          { state: ctx.state }
        )
      };
    } catch (error) {
      throw toPlatformError(error, "beginAuthorization");
    }
  }

  async completeAuthorization(ctx: AuthorizationContext, params: OAuthCallbackParams): Promise<Credential> {
    if (params.state !== ctx.state) {
      throw new PlatformError("VALIDATION_FAILED", "TikTok OAuth state did not match the value we issued.");
    }
    try {
      const token = await exchangeAuthCode(
        { app_key: this.config.app.appKey, app_secret: this.config.app.appSecret },
        params.code,
        { fetch: this.config.transport }
      );
      const { accessToken, refreshToken, expiresAt } = this.readToken(token, "completeAuthorization");

      // The token response may carry the shop cipher; when it does not, it is resolved from the
      // authorized-shops API using the freshly minted access token.
      const cipherFromToken = this.cipherFromToken(token);
      const shopCipher = cipherFromToken ?? (await this.resolveShopCipher(accessToken));

      return {
        channel: this.channel,
        accessToken,
        refreshToken,
        expiresAt,
        context: { shopCipher }
      };
    } catch (error) {
      throw toPlatformError(error, "completeAuthorization");
    }
  }

  async refreshCredential(credential: Credential): Promise<Credential> {
    if (credential.refreshToken === null) {
      throw new PlatformError("CREDENTIAL_EXPIRED", "TikTok credential has no refresh token; re-authorize the shop.");
    }
    try {
      const token = await refreshAccessToken(
        { app_key: this.config.app.appKey, app_secret: this.config.app.appSecret },
        credential.refreshToken,
        { fetch: this.config.transport }
      );
      const { accessToken, refreshToken, expiresAt } = this.readToken(token, "refreshCredential");
      return {
        channel: this.channel,
        accessToken,
        refreshToken,
        expiresAt,
        context: credential.context
      };
    } catch (error) {
      throw toPlatformError(error, "refreshCredential");
    }
  }

  private readToken(token: TokenResponse, context: string): {
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Instant | null;
  } {
    // The token endpoint returns the same envelope as the business APIs: a non-zero `code` in the
    // body on failure. Without this check a failed exchange would look like a dataless success.
    assertSuccess(
      { code: normalizeCode(token.code), message: token.message },
      context
    );
    const data = token.data;
    const accessToken = typeof data?.["access_token"] === "string" ? data["access_token"] : undefined;
    if (accessToken === undefined || accessToken === "") {
      throw new PlatformError("UPSTREAM_ERROR", `TikTok returned no access_token during ${context}.`);
    }
    const refresh = typeof data?.["refresh_token"] === "string" ? data["refresh_token"] : null;
    const expireIn = data?.["access_token_expire_in"];
    return {
      accessToken,
      refreshToken: refresh,
      // v2 sends an absolute Unix timestamp for expiry, so it is interpreted as such.
      expiresAt: typeof expireIn === "number" ? epochSecondsToInstant(expireIn) : null
    };
  }

  private cipherFromToken(token: TokenResponse): string | null {
    const cipher = token.data?.["shop_cipher"];
    if (typeof cipher === "string" && cipher !== "") return cipher;
    if (cipher !== null && typeof cipher === "object" && "cipher" in cipher) {
      const nested = (cipher as { cipher?: unknown }).cipher;
      if (typeof nested === "string" && nested !== "") return nested;
    }
    return null;
  }

  private async resolveShopCipher(accessToken: string): Promise<string> {
    const response = await this.appOnlyClient(accessToken).authorization.getAuthorizedShops({});
    assertSuccess(response, "resolveShopCipher");
    const shops = response.data?.shops ?? [];
    for (const shop of shops) {
      const cipher = shop["cipher"];
      if (typeof cipher === "string" && cipher !== "") return cipher;
    }
    throw new PlatformError("UPSTREAM_ERROR", "TikTok returned no authorized shop cipher to bind the credential to.");
  }

  async fetchOrders(cursor: Cursor, credential: Credential): Promise<Page<ChannelOrder>> {
    const window = this.resolveCursor(cursor);
    const client = this.clientFor(credential);
    try {
      const body: GetOrderListBody = {
        create_time_ge: window.createTimeGe,
        create_time_lt: window.createTimeLt
      };
      const search = (await client.order.getOrderList(
        { page_size: this.config.pageSize, page_token: window.pageToken === "" ? undefined : window.pageToken },
        body
      )) as TikTokOrderSearchResponse;
      assertSuccess(search, "fetchOrders/getOrderList");

      const summaries = search.data?.orders ?? [];
      const orders = await this.fetchDetails(client, summaries);

      const nextToken = search.data?.next_page_token ?? "";
      const next: Cursor =
        nextToken === ""
          ? { value: null } // caught up: reconciliation can stop (docs/adr/0002)
          : { value: JSON.stringify({ ...window, pageToken: nextToken }) };

      return { items: orders, next };
    } catch (error) {
      throw toPlatformError(error, "fetchOrders");
    }
  }

  /**
   * The search endpoint may return only ids, so every order is read through the detail endpoint in
   * bounded batches. This is the two-API read that docs/adr/0003 calls for.
   */
  private async fetchDetails(client: TikTokShop, summaries: readonly TikTokOrder[]): Promise<ChannelOrder[]> {
    const ids = summaries.map((order) => order.id).filter((id): id is string => id !== undefined && id !== "");
    if (ids.length === 0) return [];

    const orders: ChannelOrder[] = [];
    for (let index = 0; index < ids.length; index += this.config.pageSize) {
      const batch = ids.slice(index, index + this.config.pageSize);
      const detail = (await client.order.getOrderDetail({ ids: batch })) as TikTokOrderDetailResponse;
      assertSuccess(detail, "fetchOrders/getOrderDetail");
      for (const raw of detail.data?.orders ?? []) {
        orders.push(this.toChannelOrder(raw));
      }
    }
    return orders;
  }

  private toChannelOrder(raw: TikTokOrder): ChannelOrder {
    const orderId = raw.id;
    if (orderId === undefined || orderId === "") {
      throw new PlatformError("UPSTREAM_ERROR", "TikTok returned an order without an id.");
    }
    const payment = raw.payment;
    const currency = payment?.currency;
    assertIdr(currency, `order ${orderId}`);

    if (raw.create_time === undefined) {
      throw new PlatformError("UPSTREAM_ERROR", `TikTok order ${orderId} has no create_time.`);
    }

    const lines: ChannelOrderLine[] = (raw.line_items ?? []).map((item, index) => ({
      externalLineId: item.id ?? `${orderId}-${index}`,
      // A sandbox product carried `seller_sku: ""`; an empty string must not become a real key that
      // downstream matching treats differently from "no sku".
      sku: item.seller_sku !== undefined && item.seller_sku !== "" ? item.seller_sku : null,
      title: item.product_name ?? item.sku_name ?? "",
      // TikTok sends one line item per unit and no quantity field, so a line is one unit unless a
      // chargeable quantity is ever reported. See order-schema.ts.
      quantity: lineQuantity(item),
      unitPrice: decimalToMinor(item.sale_price ?? item.original_price ?? "0", currency ?? "IDR")
    }));

    const subtotal = decimalToMinor(payment?.sub_total ?? "0", currency ?? "IDR");
    const shipping = decimalToMinor(payment?.shipping_fee ?? "0", currency ?? "IDR");
    const grandTotal = decimalToMinor(payment?.total_amount ?? "0", currency ?? "IDR");
    // TikTok reports seller and platform discounts separately. Only the seller-funded part is our
    // discount; the platform funds its own. Both are summed only if present.
    const sellerDiscount = decimalToMinor(payment?.seller_discount ?? "0", currency ?? "IDR");

    const totals: ChannelOrderTotals = {
      subtotal,
      shipping,
      discount: sellerDiscount,
      grandTotal
    };

    return {
      channel: this.channel,
      externalOrderId: orderId,
      placedAt: epochSecondsToInstant(raw.create_time),
      buyerEmail: null,
      currency: "IDR",
      lines,
      totals
    };
  }

  async acknowledgeOrder(externalOrderId: string, credential: Credential): Promise<void> {
    void credential;
    throw new PlatformError(
      "VALIDATION_FAILED",
      `TikTok Shop does not support order acknowledgement (attempted for ${externalOrderId}); see capabilities().`
    );
  }

  /**
   * Write a courier's waybill back to the order (docs/adr/0020).
   *
   * `updateShippingInfo` addresses the order and takes the tracking number. The courier-neutral
   * input carries no TikTok shipping-provider id, so only `tracking_number` is sent; a shop that
   * requires a provider id will reject this and the failure is surfaced rather than guessed at
   * (recorded under M7 known limits). TikTok answers an application error in a 200 body, so the
   * response passes through `assertSuccess` before it is treated as accepted.
   */
  async attachTrackingNumber(
    externalOrderId: string,
    tracking: TrackingWriteBack,
    credential: Credential
  ): Promise<void> {
    const client = this.clientFor(credential);
    try {
      const response = (await client.fulfillment.updateShippingInfo(
        { order_id: externalOrderId },
        { tracking_number: tracking.trackingNumber }
      )) as UpdateShippingInfoResponse;
      assertSuccess(response, "attachTrackingNumber");
    } catch (error) {
      throw toPlatformError(error, "attachTrackingNumber");
    }
  }

  /**
   * The couriers TikTok offers for an order (docs/adr/0021).
   *
   * `getEligibleShippingService` answers with the services this order may use, each carrying its own
   * id, provider name and delivery window. TikTok returns them as free-form objects, so every field
   * is read defensively: a service without an id is skipped rather than emitted with an empty
   * handle, because `arrangeShipment` could not address it.
   */
  async getShippingArrangementParameters(
    externalOrderId: string,
    credential: Credential
  ): Promise<ShippingArrangementParameters> {
    const client = this.clientFor(credential);
    try {
      const response = (await client.fulfillment.getEligibleShippingService({
        order_id: externalOrderId
      })) as GetEligibleShippingServiceResponse;
      assertSuccess(response, "getShippingArrangementParameters/getEligibleShippingService");

      const options: ChannelShippingOption[] = [];
      for (const raw of response.data?.shipping_services ?? []) {
        const id = raw["id"];
        if (typeof id !== "string" || id === "") continue;
        const providerName = raw["shipping_provider_name"];
        const name = raw["name"];
        const courier =
          typeof providerName === "string" && providerName !== ""
            ? providerName
            : typeof name === "string" && name !== ""
              ? name
              : "TikTok Shop logistics";
        const earliest = raw["earliest_delivery_days"];
        const latest = raw["latest_delivery_days"];
        options.push({
          channelOptionId: id,
          courier,
          serviceLevel: tiktokServiceLevel(typeof raw["shipping_type"] === "string" ? raw["shipping_type"] : undefined),
          price: tiktokPriceMinor(typeof raw["price"] === "string" ? raw["price"] : undefined),
          estimatedDays:
            typeof earliest === "number" && typeof latest === "number"
              ? { min: earliest, max: latest }
              : null
        });
      }

      // TikTok decides pickup vs dropoff per shop, not per order here; the caller learns which from
      // the handover timeslots, which this read does not fetch. Both are reported false so the
      // caller does not assume a shape it was not told.
      return {
        externalOrderId,
        options,
        requiresPickup: false,
        requiresDropoff: false,
        pickupAddressIds: []
      };
    } catch (error) {
      throw toPlatformError(error, "getShippingArrangementParameters");
    }
  }

  /**
   * Have TikTok book the shipment, or record the seller's own waybill (docs/adr/0021).
   *
   * Two shapes, chosen by the request. Self-arranged: `markPackageAsShipped` records the seller's
   * waybill directly against the order, which is the verified shape. Channel-arranged:
   * `createPackages` mints a package for the chosen service, `shipPackage` books it, and the waybill
   * is read from the shipping response or `getTracking` afterwards. The channel-arranged branch is
   * built against the official OAS but not yet confirmed against a live shop (recorded in
   * docs/PLAN.md): its handover method and pickup slot may need a value this connector does not yet
   * send, and a rejection surfaces as an error rather than being guessed at.
   */
  async arrangeShipment(
    request: ShippingArrangementRequest,
    credential: Credential
  ): Promise<ArrangedShipment> {
    const client = this.clientFor(credential);
    const externalOrderId = request.externalOrderId;

    if (request.selfShipTrackingNumber !== null) {
      try {
        const response = (await client.fulfillment.markPackageAsShipped(
          { order_id: externalOrderId },
          { tracking_number: request.selfShipTrackingNumber }
        )) as CreatePackagesResponse;
        assertSuccess(response, "arrangeShipment/markPackageAsShipped");
        return {
          externalOrderId,
          trackingNumber: request.selfShipTrackingNumber,
          status: "created",
          arrangedAt: new Date().toISOString()
        };
      } catch (error) {
        throw toPlatformError(error, "arrangeShipment");
      }
    }

    if (request.channelOptionId === null) {
      throw new PlatformError(
        "VALIDATION_FAILED",
        `arrangeShipment needs either a channel option or a self-ship waybill (order ${externalOrderId}).`
      );
    }

    try {
      const created = (await client.fulfillment.createPackages(
        {},
        { order_id: externalOrderId, shipping_service_id: request.channelOptionId }
      )) as CreatePackagesResponse;
      assertSuccess(created, "arrangeShipment/createPackages");
      const packageId = created.data?.package_id;
      if (packageId === undefined || packageId === "") {
        throw new PlatformError("UPSTREAM_ERROR", `TikTok created no package for ${externalOrderId}.`);
      }

      const shipped = (await client.fulfillment.shipPackage({ package_id: packageId })) as ShipPackageResponse;
      assertSuccess(shipped, "arrangeShipment/shipPackage");

      let trackingNumber =
        typeof shipped.data?.["tracking_number"] === "string" ? (shipped.data["tracking_number"] as string) : null;
      if (trackingNumber === null) {
        const tracking = (await client.fulfillment.getTracking({ order_id: externalOrderId })) as GetTrackingResponse;
        assertSuccess(tracking, "arrangeShipment/getTracking");
        for (const entry of tracking.data?.tracking ?? []) {
          const value = entry["tracking_number"];
          if (typeof value === "string" && value !== "") {
            trackingNumber = value;
            break;
          }
        }
      }
      if (trackingNumber === null || trackingNumber === "") {
        throw new PlatformError(
          "UPSTREAM_ERROR",
          `TikTok accepted the shipment for ${externalOrderId} but returned no tracking number.`
        );
      }

      return {
        externalOrderId,
        trackingNumber,
        status: "created",
        arrangedAt: new Date().toISOString()
      };
    } catch (error) {
      throw toPlatformError(error, "arrangeShipment");
    }
  }

  /**
   * The printable label for a package TikTok arranged (docs/adr/0021).
   *
   * `getPackageShippingDocument` addresses a package, so the order's package is resolved first: the
   * order detail carries `line_items[].package_id`, which is what `getPackageDetail` and the
   * document call need. TikTok answers with a `doc_url`, so `url` is set and `inlineBase64` is null —
   * the opposite of Shopee, which returns the bytes.
   */
  async fetchShippingLabel(externalOrderId: string, credential: Credential): Promise<ShippingLabel> {
    const client = this.clientFor(credential);
    const documentType = "SHIPPING_LABEL";
    try {
      const detail = (await client.order.getOrderDetail({
        ids: [externalOrderId]
      })) as TikTokOrderDetailResponse;
      assertSuccess(detail, "fetchShippingLabel/getOrderDetail");
      const packageId = readPackageId(detail);
      if (packageId === null) {
        throw new PlatformError(
          "UPSTREAM_ERROR",
          `TikTok returned no package for order ${externalOrderId}; arrange the shipment before fetching its label.`
        );
      }

      const response = (await client.fulfillment.getPackageShippingDocument({
        package_id: packageId,
        document_type: documentType,
        document_format: "PDF"
      })) as GetPackageShippingDocumentResponse;
      assertSuccess(response, "fetchShippingLabel/getPackageShippingDocument");

      const url = response.data?.doc_url;
      if (typeof url !== "string" || url === "") {
        throw new PlatformError("UPSTREAM_ERROR", `TikTok returned no shipping label for ${externalOrderId}.`);
      }
      return {
        externalOrderId,
        url,
        inlineBase64: null,
        format: "pdf",
        documentType
      };
    } catch (error) {
      throw toPlatformError(error, "fetchShippingLabel");
    }
  }

  /**
   * TikTok's tracking events for an order it arranged (docs/adr/0021).
   *
   * `getTracking` returns free-form entries; each is read for a status and a timestamp. An entry
   * without a recognisable status is skipped, so the pull path never invents a state.
   */
  async fetchChannelTracking(externalOrderId: string, credential: Credential): Promise<ChannelTrackingPage> {
    const client = this.clientFor(credential);
    try {
      const response = (await client.fulfillment.getTracking({
        order_id: externalOrderId
      })) as GetTrackingResponse;
      assertSuccess(response, "fetchChannelTracking/getTracking");

      const events: TrackingEvent[] = [];
      for (const entry of response.data?.tracking ?? []) {
        const status = tiktokTrackingStatus(entry["status"] ?? entry["logistics_status"]);
        if (status === null) continue;
        const occurredAtRaw = entry["update_time"] ?? entry["update_time_ms"] ?? entry["time"];
        const occurredAt =
          typeof occurredAtRaw === "number"
            ? occurredAtRaw > 1e12
              ? new Date(occurredAtRaw).toISOString()
              : epochSecondsToInstant(occurredAtRaw)
            : new Date().toISOString();
        const description = entry["description"] ?? entry["status"] ?? "";
        events.push({
          status,
          occurredAt,
          description: typeof description === "string" ? description : ""
        });
      }
      return { externalOrderId, events };
    } catch (error) {
      throw toPlatformError(error, "fetchChannelTracking");
    }
  }

  async pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]> {
    const client = this.clientFor(credential);
    const results: StockResult[] = [];

    // TikTok's updateInventory addresses one product per call, so items are grouped by the
    // product_id a listing import resolved. An item without a mapping is reported `unknown_sku`
    // rather than sent anywhere: an unmapped SKU has no place to go (docs/adr/0009).
    const byProduct = new Map<string, StockUpdate[]>();
    for (const item of items) {
      if (item.externalProductId === undefined || item.externalSkuId === undefined) {
        results.push({ sku: item.sku, accepted: false, reason: "unknown_sku" });
        continue;
      }
      const bucket = byProduct.get(item.externalProductId);
      if (bucket === undefined) byProduct.set(item.externalProductId, [item]);
      else bucket.push(item);
    }

    for (const [productId, group] of byProduct) {
      const skus = group.map((item) => ({
        id: item.externalSkuId,
        inventory: [
          {
            // TikTok needs the warehouse the stock is for when a shop has more than one. A listing
            // import resolves it; without it the update is rejected by TikTok, which we surface
            // rather than guessing a default.
            warehouse_id: item.externalInventoryId,
            quantity: item.available
          }
        ]
      }));

      try {
        const response = (await client.product.updateInventory(
          { product_id: productId },
          { skus }
        )) as TikTokUpdateInventoryResponse;
        assertSuccess(response, "pushStock/updateInventory");

        // A success envelope can still carry per-SKU errors. A SKU TikTok rejected must not be
        // reported as accepted, so failures are read out of the body, not inferred from code === 0.
        const failed = new Set<string>();
        for (const error of response.data?.errors ?? []) {
          for (const detail of error.detail ?? []) {
            if (detail.sku_id !== undefined) failed.add(detail.sku_id);
          }
        }
        for (const item of group) {
          const rejected = item.externalSkuId !== undefined && failed.has(item.externalSkuId);
          results.push(
            rejected
              ? { sku: item.sku, accepted: false, reason: "channel_error" }
              : { sku: item.sku, accepted: true, reason: null }
          );
        }
      } catch (error) {
        const mapped = toPlatformError(error, "pushStock");
        const reason: StockResult["reason"] = mapped.code === "CHANNEL_RATE_LIMITED" ? "rate_limited" : "channel_error";
        for (const item of group) {
          results.push({ sku: item.sku, accepted: false, reason });
        }
      }
    }

    return results;
  }

  async fetchListings(cursor: Cursor, credential: Credential): Promise<Page<ChannelListing>> {
    const window = this.resolveListingCursor(cursor);
    const client = this.clientFor(credential);
    try {
      const body: SearchProductsBody = {
        update_time_ge: window.updateTimeGe,
        update_time_le: window.updateTimeLt
      };
      const response = (await client.product.searchProducts(
        { page_size: this.config.pageSize, page_token: window.pageToken === "" ? undefined : window.pageToken },
        body
      )) as TikTokSearchProductsResponse;
      assertSuccess(response, "fetchListings/searchProducts");

      const listings = (response.data?.products ?? []).map((product) => this.toChannelListing(product));
      const nextToken = response.data?.next_page_token ?? "";
      const next: Cursor =
        nextToken === ""
          ? { value: null } // caught up (AGENTS.md §9)
          : { value: JSON.stringify({ ...window, pageToken: nextToken }) };

      return { items: listings, next };
    } catch (error) {
      throw toPlatformError(error, "fetchListings");
    }
  }

  private toChannelListing(product: TikTokProduct): ChannelListing {
    const productId = product.id;
    if (productId === undefined || productId === "") {
      throw new PlatformError("UPSTREAM_ERROR", "TikTok returned a product without an id.");
    }

    const variants: ChannelListingVariant[] = (product.skus ?? []).map((sku) => {
      const skuId = sku.id;
      if (skuId === undefined || skuId === "") {
        throw new PlatformError("UPSTREAM_ERROR", `TikTok product ${productId} has a SKU without an id.`);
      }
      // The first inventory entry is the shop's stock location. TikTok accepts stock updates per
      // warehouse; when a product has several, later stock pushes need the same pick, so the choice
      // is recorded here rather than made implicitly downstream.
      const warehouse = sku.inventory?.[0]?.warehouse_id;
      return {
        externalSkuId: skuId,
        sku: sku.seller_sku !== undefined && sku.seller_sku !== "" ? sku.seller_sku : null,
        externalInventoryId: warehouse !== undefined && warehouse !== "" ? warehouse : null
      };
    });

    return {
      channel: this.channel,
      externalProductId: productId,
      title: product.title ?? "",
      status: listingStatusOf(product.status),
      variants,
      updatedAt: typeof product.update_time === "number" ? epochSecondsToInstant(product.update_time) : null
    };
  }

  /** Rebuild the listing window from an opaque cursor, defaulting to the last 30 days. */
  private resolveListingCursor(cursor: Cursor): TikTokListingCursor {
    if (cursor.value !== null && cursor.value !== "") {
      try {
        const parsed = JSON.parse(cursor.value) as TikTokListingCursor;
        if (typeof parsed.updateTimeGe !== "number" || typeof parsed.updateTimeLt !== "number") {
          throw new Error("cursor fields missing");
        }
        return parsed;
      } catch (error) {
        throw new PlatformError("VALIDATION_FAILED", "TikTok listing cursor is not a payload this connector produced.", {
          cause: error
        });
      }
    }
    const now = Math.floor(Date.now() / 1000);
    return { pageToken: "", updateTimeGe: now - LISTING_LOOKBACK_SECONDS, updateTimeLt: now };
  }

  /**
   * Read the stock level of every SKU of every product (docs/adr/0015).
   *
   * `searchProducts` already carries each SKU's `inventory` entries, so the snapshot reuses the
   * listing walk rather than calling `inventorySearch` per product: one cursor, one page shape, and
   * no per-product fan-out against the shared budget. The warehouse pick matches the listing import
   * — the first entry — so a snapshot compares the same location a push would write to.
   */
  async fetchStockSnapshot(cursor: Cursor, credential: Credential): Promise<Page<ChannelStockLevel>> {
    const window = this.resolveListingCursor(cursor);
    const client = this.clientFor(credential);
    try {
      const body: SearchProductsBody = {
        update_time_ge: window.updateTimeGe,
        update_time_le: window.updateTimeLt
      };
      const response = (await client.product.searchProducts(
        { page_size: this.config.pageSize, page_token: window.pageToken === "" ? undefined : window.pageToken },
        body
      )) as TikTokSearchProductsResponse;
      assertSuccess(response, "fetchStockSnapshot/searchProducts");

      const levels: ChannelStockLevel[] = [];
      for (const product of response.data?.products ?? []) {
        const productId = product.id;
        if (productId === undefined || productId === "") {
          throw new PlatformError("UPSTREAM_ERROR", "TikTok returned a product without an id.");
        }
        for (const sku of product.skus ?? []) {
          const skuId = sku.id;
          if (skuId === undefined || skuId === "") {
            throw new PlatformError("UPSTREAM_ERROR", `TikTok product ${productId} has a SKU without an id.`);
          }
          levels.push({
            channel: this.channel,
            externalSkuId: skuId,
            sku: sku.seller_sku !== undefined && sku.seller_sku !== "" ? sku.seller_sku : null,
            // A SKU with no inventory entry reports nothing, which is read as zero: TikTok would
            // reject a push that assumes stock it never reported, and treating it as uncomparable
            // would hide a genuine out-of-stock drift.
            available: sku.inventory?.[0]?.quantity ?? 0
          });
        }
      }

      const nextToken = response.data?.next_page_token ?? "";
      const next: Cursor =
        nextToken === ""
          ? { value: null } // caught up (AGENTS.md §9)
          : { value: JSON.stringify({ ...window, pageToken: nextToken }) };

      return { items: levels, next };
    } catch (error) {
      throw toPlatformError(error, "fetchStockSnapshot");
    }
  }

  /**
   * No handlers, because TikTok's webhook signature scheme is not documented in the official OAS or
   * in the vendored SDK, and this connector will not ship a guessed one: a wrong verifier either
   * rejects legitimate push traffic or accepts forged traffic.
   *
   * The contract permits this: `capabilities().supportsWebhooks` is `false`, and callers must not
   * assume a capability (packages/channel-sdk). Consequently order freshness is pull-based, and the
   * reconciliation loop (docs/adr/0002) is the source of truth.
   *
   * To enable: confirm the signature algorithm from TikTok's push documentation, implement it in a
   * dedicated `webhook.ts` with tests, then flip the capability in the same change.
   */
  webhookHandlers(): Readonly<Record<string, WebhookHandler>> {
    return {};
  }

  capabilities(): ChannelCapabilities {
    return {
      supportsOrderPull: true,
      // Implemented against the identifiers a listing import resolves (docs/adr/0009). It is a
      // real push now, but the end-to-end path is unproven until a live Development Shop confirms
      // the listing field names and warehouse id; see the known limit in docs/PLAN.md.
      supportsStockPush: true,
      supportsWebhooks: false,
      supportsOrderAcknowledgement: false,
      // See the file header: search returns partial orders, detail fills them (docs/adr/0003).
      splitsOrderHistory: true,
      supportsListingRead: true,
      // `searchProducts` carries per-SKU `inventory`, so a snapshot is a real read (docs/adr/0015).
      supportsStockSnapshotRead: true,
      // Implemented against `fulfillment/updateShippingInfo` and proven by the contract test; see
      // `attachTrackingNumber` for the shipping-provider-id gap (docs/adr/0020).
      supportsTrackingWriteBack: true,
      // TikTok orchestrates logistics for its orders: `getEligibleShippingService` offers the
      // couriers, `createPackages`+`shipPackage` book, `markPackageAsShipped` records a self-ship
      // waybill (docs/adr/0021). The channel-arranged branch awaits live-shop confirmation.
      supportsShippingArrangement: true,
      // `getPackageShippingDocument` produces `SHIPPING_LABEL` as a PDF `doc_url`.
      supportsShippingLabel: true,
      // `getTracking` reports events for an arranged order (docs/adr/0021).
      supportsChannelTracking: true
    };
  }

  /** Rebuild the window from an opaque cursor, defaulting to all orders visible right now. */
  private resolveCursor(cursor: Cursor): TikTokCursor {
    if (cursor.value !== null && cursor.value !== "") {
      try {
        const parsed = JSON.parse(cursor.value) as TikTokCursor;
        if (typeof parsed.createTimeGe !== "number" || typeof parsed.createTimeLt !== "number") {
          throw new Error("cursor fields missing");
        }
        return parsed;
      } catch (error) {
        throw new PlatformError("VALIDATION_FAILED", "TikTok cursor is not a payload this connector produced.", {
          cause: error
        });
      }
    }
    const now = Math.floor(Date.now() / 1000);
    return { pageToken: "", createTimeGe: now - MAX_WINDOW_SECONDS, createTimeLt: now };
  }
}
