/**
 * Shopee adapter.
 *
 * Implements `ChannelConnector` (packages/channel-sdk) on top of the vendored SDK. Everything
 * Shopee-shaped lives here or in the modules it imports; nothing outside this package may know
 * these field names (AGENTS.md §4).
 *
 * Deliberate scope choices, each recorded rather than silently no-op'd:
 * - `pushStock` addresses items by `item_id`/`model_id`, which come from `fetchListings`
 *   (`get_item_list` + `get_model_list`, docs/adr/0009). An item without a resolved mapping is
 *   reported `unknown_sku`, never sent.
 * - `splitsOrderHistory` is `false`. ADR-0003's two-API split applies to the
 *   TikTok Shop + Tokopedia channel, not to Shopee.
 */

import { PlatformError } from "@platform/contracts";
import type {
  ArrangedShipment,
  ChannelListing,
  ChannelListingVariant,
  ChannelOrder,
  ChannelOrderLine,
  ChannelOrderTotals,
  ChannelStockLevel,
  ChannelTrackingPage,
  Cursor,
  Instant,
  Page,
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
  WebhookEnvelope,
  WebhookHandler
} from "@platform/channel-sdk";

import type { ShopeeConnectorConfig } from "./config.ts";
import { assertNoErrorBody, toPlatformError } from "./errors.ts";
import type {
  ShopeeItemBaseInfoResponse,
  ShopeeItemListResponse,
  ShopeeModelListResponse
} from "./listing-schema.ts";
import { shopeeListingStatus } from "./listing-schema.ts";
import { assertIdr, epochSecondsToInstant, rupiahToMinor } from "./money.ts";
import { Shopee, asResponseBody, verifyPushSignature } from "./vendor/shopee-sdk.ts";
import type {
  CreateShippingDocumentResponse,
  DownloadShippingDocumentResponse,
  GetAccessTokenResponse,
  GetOrderDetailResponse,
  GetOrderListResponse,
  GetShippingParameterResponse,
  GetTrackingInfoResponse,
  GetTrackingNumberResponse,
  RefreshAccessTokenResponse,
  ShipOrderResponse
} from "./vendor/shopee-sdk.ts";

type ShopeeOrderDetail = NonNullable<NonNullable<GetOrderDetailResponse["response"]>["order_list"]>[number];

/**
 * Map Shopee's `logistics_status` onto our neutral `ShipmentStatus` (docs/adr/0021).
 *
 * Shopee's vocabulary is not our vocabulary, and an unknown value must not become a guess: the
 * mapping returns null and the caller skips it, so the pull path never invents a state the channel
 * did not report. The values here are the documented `logistics_status` set; a value outside it is
 * silently ignored rather than mislabelled.
 */
function shopeeTrackingStatus(raw: string | undefined): ShipmentStatus | null {
  switch (raw) {
    case "LOGISTICS_REQUEST_CREATED":
    case "LOGISTICS_PICKUP_DONE":
      return "picked_up";
    case "LOGISTICS_PICKUP_RETRY":
      return "picked_up";
    case "LOGISTICS_DELIVERY_DONE":
      return "delivered";
    case "LOGISTICS_DELIVERY_FAILED":
      return "failed";
    case "LOGISTICS_REQUEST_CANCELED":
      return "cancelled";
    case "LOGISTICS_IN_TRANSIT":
    case "LOGISTICS_PICKUP_ARRIVED":
    case "LOGISTICS_DELIVERY_ARRIVED":
      return "in_transit";
    case "LOGISTICS_DELIVERY_OUT_FOR_DELIVERY":
      return "out_for_delivery";
    case "LOGISTICS_PICKUP_FAILED":
      return "failed";
    case "LOGISTICS_RETURNED":
    case "LOGISTICS_RETURN_INITIATED":
      return "returned";
    default:
      return null;
  }
}

/** Cursor payload. Opaque to the caller; only this connector may interpret it (contract doc). */
interface ShopeeCursor {
  /** Cursor for the next `get_order_list` page; empty string means this window is exhausted. */
  readonly listCursor: string;
  /** Inclusive epoch-seconds lower bound of the time window being walked. */
  readonly windowFrom: number;
  /** Exclusive epoch-seconds upper bound of the time window being walked. */
  readonly windowTo: number;
  /** The moment the walk started. When the window reaches it, the walk is complete. */
  readonly horizon: number;
}

const MAX_WINDOW_SECONDS = 15 * 24 * 60 * 60;

export class ShopeeConnector implements ChannelConnector {
  readonly channel = "shopee" as const;

  // Explicit field rather than a constructor parameter property: Node's type stripping does not
  // support parameter properties (docs/adr/0006).
  private readonly config: ShopeeConnectorConfig;

  constructor(config: ShopeeConnectorConfig) {
    this.config = config;
  }

  private appOnlyClient(): Shopee {
    return new Shopee({
      credentials: { partner_id: this.config.app.partnerId, partner_key: this.config.app.partnerKey },
      environment: this.config.environment,
      region: this.config.region,
      fetch: this.config.transport
    });
  }

  private clientFor(credential: Credential): Shopee {
    return new Shopee({
      credentials: { partner_id: this.config.app.partnerId, partner_key: this.config.app.partnerKey },
      environment: this.config.environment,
      region: this.config.region,
      accessToken: credential.accessToken,
      shopId: this.shopIdOf(credential),
      fetch: this.config.transport
    });
  }

  private shopIdOf(credential: Credential): number {
    const raw = credential.context["shopId"];
    const parsed = raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new PlatformError(
        "VALIDATION_FAILED",
        "Shopee credential is missing a numeric shopId in its context. The shop_id is issued during authorization."
      );
    }
    return parsed;
  }

  async beginAuthorization(ctx: AuthorizationContext): Promise<AuthorizationRequest> {
    try {
      // `state` is generated and persisted by the integration plane; it is passed through so the
      // marketplace echoes it back and completeAuthorization can validate it.
      const url = new URL("https://partner.shopeemobile.com/api/v2/shop/auth_partner");
      url.searchParams.set("partner_id", String(this.config.app.partnerId));
      url.searchParams.set("redirect", ctx.redirectUri);
      url.searchParams.set("state", ctx.state);
      return { url: url.toString() };
    } catch (error) {
      throw toPlatformError(error, "beginAuthorization");
    }
  }

  async completeAuthorization(ctx: AuthorizationContext, params: OAuthCallbackParams): Promise<Credential> {
    if (params.state !== ctx.state) {
      throw new PlatformError("VALIDATION_FAILED", "Shopee OAuth state did not match the value we issued.");
    }
    try {
      const raw = await this.appOnlyClient().publicApi.getAccessToken({
        code: params.code,
        partner_id: this.config.app.partnerId
      });
      // See asResponseBody: the generated return type adds an envelope the SDK does not return.
      const response = asResponseBody<GetAccessTokenResponse>(raw);
      assertNoErrorBody(response, "completeAuthorization");

      const accessToken = response.access_token;
      if (accessToken === undefined || accessToken === "") {
        throw new PlatformError("UPSTREAM_ERROR", "Shopee returned no access_token for the authorization code.");
      }

      const shopId = response.shop_id_list?.[0];
      if (shopId === undefined) {
        throw new PlatformError(
          "UPSTREAM_ERROR",
          "Shopee returned no shop_id_list; the credential could not be bound to a shop."
        );
      }

      return {
        channel: this.channel,
        accessToken,
        refreshToken: response.refresh_token ?? null,
        expiresAt: this.expiryFrom(response.expire_in),
        context: { shopId: String(shopId) }
      };
    } catch (error) {
      throw toPlatformError(error, "completeAuthorization");
    }
  }

  async refreshCredential(credential: Credential): Promise<Credential> {
    if (credential.refreshToken === null) {
      throw new PlatformError("CREDENTIAL_EXPIRED", "Shopee credential has no refresh token; re-authorize the shop.");
    }
    try {
      const raw = await this.appOnlyClient().publicApi.refreshAccessToken({
        refresh_token: credential.refreshToken,
        partner_id: this.config.app.partnerId,
        shop_id: this.shopIdOf(credential)
      });
      const response = asResponseBody<RefreshAccessTokenResponse>(raw);
      assertNoErrorBody(response, "refreshCredential");

      const accessToken = response.access_token;
      if (accessToken === undefined || accessToken === "") {
        throw new PlatformError("CREDENTIAL_EXPIRED", "Shopee refresh returned no access_token; re-authorize the shop.");
      }
      return {
        channel: this.channel,
        accessToken,
        refreshToken: response.refresh_token ?? credential.refreshToken,
        expiresAt: this.expiryFrom(response.expire_in),
        context: credential.context
      };
    } catch (error) {
      throw toPlatformError(error, "refreshCredential");
    }
  }

  private expiryFrom(expireInSeconds: number | undefined): Instant | null {
    if (expireInSeconds === undefined) return null;
    return new Date(Date.now() + expireInSeconds * 1000).toISOString();
  }

  async fetchOrders(cursor: Cursor, credential: Credential): Promise<Page<ChannelOrder>> {
    const window = this.resolveCursor(cursor);
    const client = this.clientFor(credential);
    try {
      const list = asResponseBody<GetOrderListResponse>(
        await client.order.getOrderList({
          time_range_field: "create_time",
          time_from: window.windowFrom,
          time_to: window.windowTo,
          page_size: this.config.pageSize,
          cursor: window.listCursor
        })
      );
      assertNoErrorBody(list, "fetchOrders/getOrderList");

      const orderIds = (list.response?.order_list ?? [])
        .map((entry) => entry.order_sn)
        .filter((id): id is string => id !== undefined && id !== "");

      const orders = orderIds.length === 0 ? [] : await this.fetchDetails(client, orderIds);

      // `more` false or an empty cursor both mean this window is done. Advancing the window keeps
      // the cursor format identical between pages, which keeps the contract tests simple.
      const listCursor = list.response?.next_cursor ?? "";
      const exhausted = list.response?.more !== true || listCursor === "";
      const next = exhausted
        ? this.advanceWindow(window)
        : {
            value: JSON.stringify({
              listCursor,
              windowFrom: window.windowFrom,
              windowTo: window.windowTo,
              horizon: window.horizon
            })
          };

      return { items: orders, next };
    } catch (error) {
      throw toPlatformError(error, "fetchOrders");
    }
  }

  /** `get_order_list` returns only order ids, so details are fetched in bounded batches. */
  private async fetchDetails(client: Shopee, orderIds: readonly string[]): Promise<ChannelOrder[]> {
    const orders: ChannelOrder[] = [];
    for (let index = 0; index < orderIds.length; index += this.config.detailBatchSize) {
      const batch = orderIds.slice(index, index + this.config.detailBatchSize);
      const detail = asResponseBody<GetOrderDetailResponse>(
        await client.order.getOrderDetail({
          order_sn_list: batch.join(","),
          response_optional_fields: "item_list,total_amount,estimated_shipping_fee"
        })
      );
      assertNoErrorBody(detail, "fetchOrders/getOrderDetail");
      for (const raw of detail.response?.order_list ?? []) {
        orders.push(this.toChannelOrder(raw));
      }
    }
    return orders;
  }

  private toChannelOrder(raw: ShopeeOrderDetail): ChannelOrder {
    const orderId = raw.order_sn;
    if (orderId === undefined || orderId === "") {
      throw new PlatformError("UPSTREAM_ERROR", "Shopee returned an order without order_sn.");
    }
    assertIdr(raw.currency, `order ${orderId}`);

    const placedAtSeconds = raw.create_time;
    if (placedAtSeconds === undefined) {
      throw new PlatformError("UPSTREAM_ERROR", `Shopee order ${orderId} has no create_time.`);
    }

    const lines: ChannelOrderLine[] = (raw.item_list ?? []).map((item, index) => ({
      externalLineId: String(item.order_item_id ?? `${orderId}-${index}`),
      sku: item.model_sku ?? item.item_sku ?? null,
      title: item.item_name ?? "",
      quantity: item.model_quantity_purchased ?? 0,
      unitPrice: rupiahToMinor(item.model_discounted_price ?? item.model_original_price ?? 0)
    }));

    const itemTotalAmount = lines.reduce((total, line) => total + line.unitPrice.amount * line.quantity, 0);
    const shipping = rupiahToMinor(raw.estimated_shipping_fee ?? 0);
    const grandTotal = rupiahToMinor(raw.total_amount ?? 0);
    // Shopee's order detail has no seller-funded discount field. The grand total is authoritative
    // for what the buyer paid, so the discount is whatever the known parts exceed it by, clamped
    // at zero. `total_amount` is 0 until the buyer pays, so clamping keeps it non-negative.
    const discountAmount = Math.max(0, itemTotalAmount + shipping.amount - grandTotal.amount);

    const totals: ChannelOrderTotals = {
      subtotal: { amount: itemTotalAmount, currency: "IDR" },
      shipping,
      discount: { amount: discountAmount, currency: "IDR" },
      grandTotal
    };

    return {
      channel: this.channel,
      externalOrderId: orderId,
      placedAt: epochSecondsToInstant(placedAtSeconds),
      buyerEmail: null,
      currency: "IDR",
      lines,
      totals
    };
  }

  async acknowledgeOrder(externalOrderId: string, credential: Credential): Promise<void> {
    // Declared `false` in capabilities(): Shopee has no acknowledgement call, and order state
    // moves through the logistics and status endpoints instead. Refusing loudly means a workflow
    // cannot mistake silence for success.
    void credential;
    throw new PlatformError(
      "VALIDATION_FAILED",
      `Shopee does not support order acknowledgement (attempted for ${externalOrderId}); see capabilities().`
    );
  }

  /**
   * Write a waybill back to Shopee by booking the shipment (docs/adr/0020, corrected by ADR 0021).
   *
   * Shopee's `ship_order` is the write-back, and its shape is genuinely channel-dependent, which is
   * why the caller must first read `getShippingArrangementParameters`: a shop that Arranges its own
   * courier sends `pickup.tracking_number` (the waybill we hold), while a Shopee-arranged order sends
   * the pickup address or nothing for a dropoff. `attachTrackingNumber` is the self-arranged half of
   * that pair, so it always sends the waybill under `pickup.tracking_number`; the full arrangement
   * path goes through `arrangeShipment`. Shopee answers an application error in a 200 body, so the
   * response passes `assertNoErrorBody` before it is treated as accepted.
   */
  async attachTrackingNumber(
    externalOrderId: string,
    tracking: TrackingWriteBack,
    credential: Credential
  ): Promise<void> {
    const client = this.clientFor(credential);
    try {
      const response = asResponseBody<ShipOrderResponse>(
        await client.logistics.shipOrder({
          order_sn: externalOrderId,
          pickup: { tracking_number: tracking.trackingNumber }
        })
      );
      assertNoErrorBody(response, "attachTrackingNumber/shipOrder");
    } catch (error) {
      throw toPlatformError(error, "attachTrackingNumber");
    }
  }

  /**
   * What Shopee needs to arrange this order's shipment (docs/adr/0021).
   *
   * `get_shipping_parameter` answers `info_needed`: a non-empty `pickup` means the caller must send a
   * pickup address, a non-empty `dropoff` means a dropoff branch. Shopee fixes the logistics channel
   * on the order itself before shipping, so there is no per-order courier choice to offer here and
   * `options` is empty; the actionable output is which shape `arrangeShipment` must take and the
   * pickup addresses the shop holds.
   */
  async getShippingArrangementParameters(
    externalOrderId: string,
    credential: Credential
  ): Promise<ShippingArrangementParameters> {
    const client = this.clientFor(credential);
    try {
      const response = asResponseBody<GetShippingParameterResponse>(
        await client.logistics.getShippingParameter({ order_sn: externalOrderId })
      );
      assertNoErrorBody(response, "getShippingArrangementParameters/getShippingParameter");

      const infoNeeded = response.response?.info_needed;
      const pickup = infoNeeded?.pickup;
      const dropoff = infoNeeded?.dropoff;
      const addresses = response.response?.pickup?.address_list ?? [];

      return {
        externalOrderId,
        options: [],
        requiresPickup: Array.isArray(pickup) && pickup.length > 0,
        requiresDropoff: Array.isArray(dropoff) && dropoff.length > 0,
        pickupAddressIds: addresses
          .map((address) => address.address_id)
          .filter((id): id is number => typeof id === "number")
          .map((id) => String(id))
      };
    } catch (error) {
      throw toPlatformError(error, "getShippingArrangementParameters");
    }
  }

  /**
   * Have Shopee book the shipment (or record the seller's own waybill) and read the waybill it
   * issues (docs/adr/0021).
   *
   * `ship_order` is the booking; `get_tracking_number` is how the marketplace-issued waybill is read
   * back afterwards (Shopee issues it as part of shipping, not in the `ship_order` response). A
   * self-arranged request sends the seller's own waybill under `pickup.tracking_number` and Shopee
   * accepts it as-is; a channel-arranged request sends the pickup address when Shopee requires one.
   */
  async arrangeShipment(
    request: ShippingArrangementRequest,
    credential: Credential
  ): Promise<ArrangedShipment> {
    const client = this.clientFor(credential);
    const externalOrderId = request.externalOrderId;
    try {
      const pickup =
        request.selfShipTrackingNumber !== null
          ? { tracking_number: request.selfShipTrackingNumber }
          : request.pickupAddressId !== null
            ? { address_id: Number(request.pickupAddressId) }
            : undefined;

      const shipResponse = asResponseBody<ShipOrderResponse>(
        await client.logistics.shipOrder({
          order_sn: externalOrderId,
          ...(pickup === undefined ? {} : { pickup })
        })
      );
      assertNoErrorBody(shipResponse, "arrangeShipment/shipOrder");

      // The waybill: the seller's own when it was self-arranged, otherwise the marketplace's.
      let trackingNumber = request.selfShipTrackingNumber;
      if (trackingNumber === null) {
        const tracking = asResponseBody<GetTrackingNumberResponse>(
          await client.logistics.getTrackingNumber({ order_sn: externalOrderId })
        );
        assertNoErrorBody(tracking, "arrangeShipment/getTrackingNumber");
        trackingNumber = tracking.response?.tracking_number ?? null;
      }
      if (trackingNumber === null || trackingNumber === "") {
        throw new PlatformError(
          "UPSTREAM_ERROR",
          `Shopee accepted the shipment for ${externalOrderId} but returned no tracking number.`
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
   * The printable label for a shipment Shopee arranged (docs/adr/0021).
   *
   * Shopee's label flow is create-then-download: `create_shipping_document` asks Shopee to produce
   * the document for the order, then `download_shipping_document` returns it. Shopee returns the file
   * inline (a base64 `waybill`), not a URL, so `url` is null and `inlineBase64` carries the bytes; the
   * caller stores or streams them.
   */
  async fetchShippingLabel(externalOrderId: string, credential: Credential): Promise<ShippingLabel> {
    const client = this.clientFor(credential);
    const documentType = "NORMAL_AIR_WAYBILL";
    try {
      const created = asResponseBody<CreateShippingDocumentResponse>(
        await client.logistics.createShippingDocument({
          order_list: [{ order_sn: externalOrderId, shipping_document_type: documentType }]
        })
      );
      assertNoErrorBody(created, "fetchShippingLabel/createShippingDocument");

      const downloaded = asResponseBody<DownloadShippingDocumentResponse>(
        await client.logistics.downloadShippingDocument({
          shipping_document_type: documentType,
          order_list: [{ order_sn: externalOrderId }]
        })
      );
      // `DownloadShippingDocumentResponse` carries only `waybill` (no error envelope in the vendored
      // spec), so there is nothing to assert here; an absent document is caught below.

      const waybill = downloaded.waybill;
      if (typeof waybill !== "string" || waybill === "") {
        throw new PlatformError(
          "UPSTREAM_ERROR",
          `Shopee returned no shipping document for ${externalOrderId}.`
        );
      }
      return {
        externalOrderId,
        url: null,
        inlineBase64: waybill,
        format: "pdf",
        documentType
      };
    } catch (error) {
      throw toPlatformError(error, "fetchShippingLabel");
    }
  }

  /**
   * Shopee's tracking events for an order it arranged (docs/adr/0021).
   *
   * `get_tracking_info` returns a `logistics_status` plus a list of events, each with its own
   * `logistics_status`. Every status is mapped to our neutral `ShipmentStatus`; a status we do not
   * recognise is skipped rather than guessed, so the pull path never invents a state the channel did
   * not report.
   */
  async fetchChannelTracking(externalOrderId: string, credential: Credential): Promise<ChannelTrackingPage> {
    const client = this.clientFor(credential);
    try {
      const response = asResponseBody<GetTrackingInfoResponse>(
        await client.logistics.getTrackingInfo({ order_sn: externalOrderId })
      );
      assertNoErrorBody(response, "fetchChannelTracking/getTrackingInfo");

      const events: TrackingEvent[] = [];
      for (const entry of response.response?.tracking_info ?? []) {
        const status = shopeeTrackingStatus(entry.logistics_status);
        if (status === null) continue;
        const occurredAt =
          typeof entry.update_time === "number" ? epochSecondsToInstant(entry.update_time) : new Date().toISOString();
        events.push({ status, occurredAt, description: entry.description ?? "" });
      }
      // The summary status is included as a final event so an order whose detail list is empty still
      // yields a status; its timestamp is the read time, which is honest ("as of now it is X").
      const summaryStatus = shopeeTrackingStatus(response.response?.logistics_status);
      if (summaryStatus !== null && !events.some((event) => event.status === summaryStatus)) {
        events.push({
          status: summaryStatus,
          occurredAt: new Date().toISOString(),
          description: response.response?.logistics_status ?? ""
        });
      }
      return { externalOrderId, events };
    } catch (error) {
      throw toPlatformError(error, "fetchChannelTracking");
    }
  }

  webhookHandlers(): Readonly<Record<string, WebhookHandler>> {
    return {
      order_status: {
        verify: (rawBody, headers) => {
          this.verifyPush(rawBody, headers);
        },
        normalize: (rawBody) => this.normalizePush(rawBody)
      }
    };
  }

  private verifyPush(rawBody: string, headers: Readonly<Record<string, string>>): void {
    // The signed URL is OUR registered webhook URL, taken from configuration. It must never come
    // from a request header, which the sender controls, or an attacker could choose the signing
    // input. Shopee signs `HMAC-SHA256(partner_key, url + '|' + body)`.
    const signature = headers["authorization"] ?? "";
    if (signature === "") {
      throw new PlatformError("UNAUTHENTICATED", "Shopee push is missing the Authorization header.");
    }
    if (!verifyPushSignature(this.config.app.partnerKey, this.config.webhookUrl, rawBody, signature)) {
      throw new PlatformError("UNAUTHENTICATED", "Shopee push signature did not validate.");
    }
  }

  private normalizePush(rawBody: string): WebhookEnvelope {
    let parsed: { code?: number; shop_id?: number; data?: unknown };
    try {
      parsed = JSON.parse(rawBody) as typeof parsed;
    } catch (error) {
      throw new PlatformError("VALIDATION_FAILED", "Shopee push body is not valid JSON.", { cause: error });
    }
    // The push payload has no event id of its own, so the body digest is the dedup key. It is
    // stable across redeliveries of the same event (docs/adr/0002).
    return {
      channel: this.channel,
      eventId: bodyDigest(rawBody),
      eventType: String(parsed.code ?? "unknown"),
      receivedAt: new Date().toISOString()
    };
  }

  async pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]> {
    const client = this.clientFor(credential);
    const results: StockResult[] = [];

    // `update_stock` is per item: one call carries every model of one item. Items without a
    // resolved item_id are reported `unknown_sku` rather than sent (docs/adr/0009).
    const byItem = new Map<string, StockUpdate[]>();
    for (const item of items) {
      if (item.externalProductId === undefined || item.externalSkuId === undefined) {
        results.push({ sku: item.sku, accepted: false, reason: "unknown_sku" });
        continue;
      }
      const bucket = byItem.get(item.externalProductId);
      if (bucket === undefined) byItem.set(item.externalProductId, [item]);
      else bucket.push(item);
    }

    for (const [itemId, group] of byItem) {
      const stockList = group.map((item) => ({
        model_id: Number(item.externalSkuId),
        seller_stock: [{ stock: item.available }]
      }));

      try {
        const response = asResponseBody<{ error?: string; message?: string }>(
          await client.product.updateStock({ item_id: Number(itemId), stock_list: stockList })
        );
        assertNoErrorBody(response, "pushStock/updateStock");
        // Shopee answers with per-model `failure_list` inside a success envelope, so acceptance is
        // read from the body rather than assumed from the absence of an error.
        const failed = new Set(
          (response as { response?: { failure_list?: readonly { model_id?: number }[] } }).response?.failure_list
            ?.map((entry) => String(entry.model_id ?? ""))
            .filter((id) => id !== "") ?? []
        );
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
        const reason: StockResult["reason"] =
          mapped.code === "CHANNEL_RATE_LIMITED" ? "rate_limited" : "channel_error";
        for (const item of group) {
          results.push({ sku: item.sku, accepted: false, reason });
        }
      }
    }

    return results;
  }

  async fetchListings(cursor: Cursor, credential: Credential): Promise<Page<ChannelListing>> {
    const offset = cursor.value === null || cursor.value === "" ? 0 : this.listingOffset(cursor);
    const client = this.clientFor(credential);
    try {
      const list = asResponseBody<ShopeeItemListResponse>(
        await client.product.getItemList({
          offset,
          page_size: this.config.pageSize,
          item_status: ["NORMAL"]
        })
      );
      assertNoErrorBody(list, "fetchListings/getItemList");

      const summaries = list.response?.item ?? [];
      const listings = await this.fetchListingDetails(client, summaries);

      const hasNext = list.response?.has_next_page === true;
      const nextOffset = list.response?.next_offset;
      const next: Cursor =
        hasNext && typeof nextOffset === "number"
          ? { value: JSON.stringify({ offset: nextOffset }) }
          : { value: null }; // caught up (AGENTS.md §9)

      return { items: listings, next };
    } catch (error) {
      throw toPlatformError(error, "fetchListings");
    }
  }

  private listingOffset(cursor: Cursor): number {
    try {
      const parsed = JSON.parse(cursor.value ?? "") as { offset?: unknown };
      if (typeof parsed.offset !== "number") throw new Error("offset missing");
      return parsed.offset;
    } catch (error) {
      throw new PlatformError("VALIDATION_FAILED", "Shopee listing cursor is not a payload this connector produced.", {
        cause: error
      });
    }
  }

  /**
   * Read the stock level of every active item's models (docs/adr/0015).
   *
   * The walk is the listing walk: `get_item_list` pages by offset, and each item's models come from
   * `get_model_list`, which carries `stock_info_v2.summary_info.total_available_stock`. The same
   * item-level SKU fallback as the listing read applies, so a single-variant item whose SKU lives on
   * the item still compares.
   */
  async fetchStockSnapshot(cursor: Cursor, credential: Credential): Promise<Page<ChannelStockLevel>> {
    const offset = cursor.value === null || cursor.value === "" ? 0 : this.listingOffset(cursor);
    const client = this.clientFor(credential);
    try {
      const list = asResponseBody<ShopeeItemListResponse>(
        await client.product.getItemList({
          offset,
          page_size: this.config.pageSize,
          item_status: ["NORMAL"]
        })
      );
      assertNoErrorBody(list, "fetchStockSnapshot/getItemList");

      const summaries = list.response?.item ?? [];
      const levels = await this.fetchStockLevels(client, summaries);

      const hasNext = list.response?.has_next_page === true;
      const nextOffset = list.response?.next_offset;
      const next: Cursor =
        hasNext && typeof nextOffset === "number"
          ? { value: JSON.stringify({ offset: nextOffset }) }
          : { value: null }; // caught up (AGENTS.md §9)

      return { items: levels, next };
    } catch (error) {
      throw toPlatformError(error, "fetchStockSnapshot");
    }
  }

  private async fetchStockLevels(
    client: Shopee,
    summaries: readonly { item_id?: number }[]
  ): Promise<ChannelStockLevel[]> {
    const ids = summaries.map((item) => item.item_id).filter((id): id is number => typeof id === "number");
    if (ids.length === 0) return [];

    const baseInfo = new Map<number, string>();
    for (let index = 0; index < ids.length; index += this.config.detailBatchSize) {
      const batch = ids.slice(index, index + this.config.detailBatchSize);
      const info = asResponseBody<ShopeeItemBaseInfoResponse>(
        await client.product.getItemBaseInfo({ item_id_list: batch })
      );
      assertNoErrorBody(info, "fetchStockSnapshot/getItemBaseInfo");
      for (const entry of info.response?.item_list ?? []) {
        if (typeof entry.item_id === "number" && entry.item_sku !== undefined) {
          baseInfo.set(entry.item_id, entry.item_sku);
        }
      }
    }

    const levels: ChannelStockLevel[] = [];
    for (const summary of summaries) {
      const itemId = summary.item_id;
      if (typeof itemId !== "number") continue;

      const models = asResponseBody<ShopeeModelListResponse>(
        await client.product.getModelList({ item_id: itemId })
      );
      assertNoErrorBody(models, "fetchStockSnapshot/getModelList");

      const itemSku = baseInfo.get(itemId);
      for (const model of models.response?.model ?? []) {
        if (typeof model.model_id !== "number") {
          throw new PlatformError("UPSTREAM_ERROR", `Shopee item ${itemId} has a model without an id.`);
        }
        const modelSku = model.model_sku !== undefined && model.model_sku !== "" ? model.model_sku : null;
        levels.push({
          channel: this.channel,
          externalSkuId: String(model.model_id),
          sku: modelSku ?? (itemSku !== undefined && itemSku !== "" ? itemSku : null),
          // Shopee omits the field on some items rather than sending zero. Absent is read as zero
          // because a model with no reported stock is not sellable, and treating it as uncomparable
          // would hide a real out-of-stock drift.
          available: model.stock_info_v2?.summary_info?.total_available_stock ?? 0
        });
      }
    }
    return levels;
  }

  /**
   * `get_item_list` returns ids and status only, so each item's SKUs are read through
   * `get_model_list` in bounded batches, and the item-level seller SKU from `get_item_base_info`.
   * This is the same two-read shape the order path uses.
   */
  private async fetchListingDetails(
    client: Shopee,
    summaries: readonly { item_id?: number; item_status?: string; update_time?: number }[]
  ): Promise<ChannelListing[]> {
    const ids = summaries.map((item) => item.item_id).filter((id): id is number => typeof id === "number");
    if (ids.length === 0) return [];

    const baseInfo = new Map<number, string>();
    for (let index = 0; index < ids.length; index += this.config.detailBatchSize) {
      const batch = ids.slice(index, index + this.config.detailBatchSize);
      const info = asResponseBody<ShopeeItemBaseInfoResponse>(
        await client.product.getItemBaseInfo({ item_id_list: batch })
      );
      assertNoErrorBody(info, "fetchListings/getItemBaseInfo");
      for (const entry of info.response?.item_list ?? []) {
        if (typeof entry.item_id === "number" && entry.item_sku !== undefined) {
          baseInfo.set(entry.item_id, entry.item_sku);
        }
      }
    }

    const listings: ChannelListing[] = [];
    for (const summary of summaries) {
      const itemId = summary.item_id;
      if (typeof itemId !== "number") continue;

      const models = asResponseBody<ShopeeModelListResponse>(
        await client.product.getModelList({ item_id: itemId })
      );
      assertNoErrorBody(models, "fetchListings/getModelList");

      const itemSku = baseInfo.get(itemId);
      const variants: ChannelListingVariant[] = (models.response?.model ?? []).map((model) => {
        if (typeof model.model_id !== "number") {
          throw new PlatformError("UPSTREAM_ERROR", `Shopee item ${itemId} has a model without an id.`);
        }
        const sku = model.model_sku !== undefined && model.model_sku !== "" ? model.model_sku : null;
        return {
          externalSkuId: String(model.model_id),
          // Fall back to the item-level SKU for a single-variant item, where Shopee leaves
          // `model_sku` empty and stores the SKU on the item (confirmed shape in the OAS).
          sku: sku ?? (itemSku !== undefined && itemSku !== "" ? itemSku : null),
          externalInventoryId: null
        };
      });

      listings.push({
        channel: this.channel,
        externalProductId: String(itemId),
        title: "",
        status: shopeeListingStatus(summary.item_status),
        variants,
        updatedAt: typeof summary.update_time === "number" ? epochSecondsToInstant(summary.update_time) : null
      });
    }
    return listings;
  }

  capabilities(): ChannelCapabilities {
    return {
      supportsOrderPull: true,
      // A real push now: `updateStock` is addressed by the item_id/model_id a listing import
      // resolves (docs/adr/0009).
      supportsStockPush: true,
      supportsWebhooks: true,
      supportsOrderAcknowledgement: false,
      splitsOrderHistory: false,
      supportsListingRead: true,
      // `get_model_list` carries `stock_info_v2`, so a snapshot is a real read (docs/adr/0015).
      supportsStockSnapshotRead: true,
      // `ship_order` writes the waybill back; the shape is channel-dependent and is resolved by
      // `getShippingArrangementParameters` first (docs/adr/0020, corrected by ADR 0021).
      supportsTrackingWriteBack: true,
      // Shopee is the logistics orchestrator for its orders: `get_shipping_parameter`, `ship_order`
      // and `get_tracking_number` are the arrangement (docs/adr/0021). The courier is fixed on the
      // order before shipping, so `options` is empty and the shape is what matters.
      supportsShippingArrangement: true,
      // `create_shipping_document` + `download_shipping_document` produce the printable label.
      supportsShippingLabel: true,
      // `get_tracking_info` reports `logistics_status` plus events (docs/adr/0021).
      supportsChannelTracking: true
    };
  }

  /** Rebuild the walk from an opaque cursor, defaulting to "the last `lookbackDays` days". */
  private resolveCursor(cursor: Cursor): ShopeeCursor {
    if (cursor.value !== null && cursor.value !== "") {
      try {
        const parsed = JSON.parse(cursor.value) as ShopeeCursor;
        if (typeof parsed.windowFrom !== "number" || typeof parsed.windowTo !== "number") {
          throw new Error("cursor fields missing");
        }
        return parsed;
      } catch (error) {
        throw new PlatformError("VALIDATION_FAILED", "Shopee cursor is not a payload this connector produced.", {
          cause: error
        });
      }
    }
    const horizon = Math.floor(Date.now() / 1000);
    const windowFrom = horizon - this.config.lookbackDays * 24 * 60 * 60;
    // The first window is capped at 15 days so a lookback longer than that walks forward in
    // valid steps instead of issuing one request Shopee would reject.
    return {
      listCursor: "",
      windowFrom,
      windowTo: Math.min(windowFrom + MAX_WINDOW_SECONDS, horizon),
      horizon
    };
  }

  /**
   * Advance to the next time window, or end the walk.
   *
   * A `null` cursor is how a connector tells the reconciliation loop it has caught up
   * (docs/adr/0002). Without a terminating cursor a reconciliation run would never finish.
   */
  private advanceWindow(window: ShopeeCursor): Cursor {
    if (window.windowTo >= window.horizon) return { value: null };
    const nextTo = Math.min(window.windowTo + MAX_WINDOW_SECONDS, window.horizon);
    return {
      value: JSON.stringify({
        listCursor: "",
        windowFrom: window.windowTo,
        windowTo: nextTo,
        horizon: window.horizon
      })
    };
  }
}

function bodyDigest(rawBody: string): string {
  // Stable, dependency-free digest. Not a security primitive: it only has to be identical for
  // redeliveries of the same payload, and the signature check already authenticated it.
  let hash = 0;
  for (let index = 0; index < rawBody.length; index += 1) {
    hash = (hash * 31 + rawBody.charCodeAt(index)) | 0;
  }
  return `shopee-${(hash >>> 0).toString(16)}`;
}
