/**
 * Shopee adapter.
 *
 * Implements `ChannelConnector` (packages/channel-sdk) on top of the vendored SDK. Everything
 * Shopee-shaped lives here or in the modules it imports; nothing outside this package may know
 * these field names (AGENTS.md §4).
 *
 * Deliberate scope choices, each recorded rather than silently no-op'd:
 * - `pushStock` reports `channel_error` with a clear reason. Shopee's `update_stock` addresses
 *   items by `item_id`/`model_id`, which Shopee assigns, not by our SKU. Until listing import
 *   maps our SKUs to Shopee ids, a stock push cannot be honest, so
 *   `capabilities().supportsStockPush` says so instead of pretending.
 * - `splitsOrderHistory` is `false`. ADR-0003's two-API split applies to the
 *   TikTok Shop + Tokopedia channel, not to Shopee.
 */

import { PlatformError } from "@platform/contracts";
import type {
  ChannelOrder,
  ChannelOrderLine,
  ChannelOrderTotals,
  Cursor,
  Instant,
  Page,
  StockResult,
  StockUpdate
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
import { assertIdr, epochSecondsToInstant, rupiahToMinor } from "./money.ts";
import { Shopee, asResponseBody, verifyPushSignature } from "./vendor/shopee-sdk.ts";
import type {
  GetAccessTokenResponse,
  GetOrderDetailResponse,
  GetOrderListResponse,
  RefreshAccessTokenResponse
} from "./vendor/shopee-sdk.ts";

type ShopeeOrderDetail = NonNullable<NonNullable<GetOrderDetailResponse["response"]>["order_list"]>[number];

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

  async pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]> {
    // Declared `false` in capabilities(). Returning per-item rejections rather than throwing keeps
    // the batch contract: the caller learns which SKUs were not pushed and can act on it.
    void credential;
    return items.map((item) => ({
      sku: item.sku,
      accepted: false,
      reason: "channel_error" as const
    }));
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

  capabilities(): ChannelCapabilities {
    return {
      supportsOrderPull: true,
      // See pushStock: Shopee addresses stock by its own item_id/model_id, not by SKU.
      supportsStockPush: false,
      supportsWebhooks: true,
      supportsOrderAcknowledgement: false,
      splitsOrderHistory: false
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
