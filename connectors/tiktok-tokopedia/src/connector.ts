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
 * - `pushStock` reports per-item `channel_error`. TikTok's `updateInventory` addresses items by a
 *   platform `product_id` plus `sku_id`, which TikTok assigns. Until listing import maps our SKUs,
 *   an end-to-end stock push cannot be honest, so the capability says `false`.
 * - Webhooks are declared unsupported. See `webhookHandlers()` for why: the signature scheme is not
 *   in the official OAS or the vendored SDK, and implementing a guess would fail open or reject
 *   valid traffic.
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
  WebhookHandler
} from "@platform/channel-sdk";

import type { TikTokConnectorConfig } from "./config.ts";
import { assertSuccess, toPlatformError } from "./errors.ts";
import { assertIdr, decimalToMinor, epochSecondsToInstant } from "./money.ts";
import type { TikTokOrder, TikTokOrderDetailResponse, TikTokOrderSearchResponse } from "./order-schema.ts";
import { lineQuantity } from "./order-schema.ts";
import { TikTokShop, buildAuthUrl, exchangeAuthCode, refreshAccessToken } from "./vendor/tiktok-shop-sdk.ts";
import type { GetOrderListBody, TokenResponse } from "./vendor/tiktok-shop-sdk.ts";

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

/** The token endpoint types `code` as `number | string`; normalise before classifying it. */
function normalizeCode(code: number | string | undefined): number | undefined {
  if (code === undefined) return undefined;
  const parsed = typeof code === "number" ? code : Number(code);
  return Number.isNaN(parsed) ? undefined : parsed;
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

  async pushStock(items: readonly StockUpdate[], credential: Credential): Promise<readonly StockResult[]> {
    // Declared `false` in capabilities(): updateInventory wants TikTok's own product_id and sku_id.
    void credential;
    return items.map((item) => ({
      sku: item.sku,
      accepted: false,
      reason: "channel_error" as const
    }));
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
      supportsStockPush: false,
      supportsWebhooks: false,
      supportsOrderAcknowledgement: false,
      // See the file header: search returns partial orders, detail fills them (docs/adr/0003).
      splitsOrderHistory: true
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
