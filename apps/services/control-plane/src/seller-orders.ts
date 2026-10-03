/**
 * The seller-facing commerce read (docs/adr/0016).
 *
 * A seller sees orders by asking *us*, and we ask the tenant's own Medusa Admin API with the
 * platform's secret key. Nothing here reads a tenant table: the order comes from Medusa's own
 * `GET /admin/orders` and `GET /admin/orders/:id`, so the seller sees exactly what Medusa holds and
 * we never encode Medusa's schema into the platform.
 *
 * Two things this module is careful about:
 *
 * 1. **The channel is joined from platform-owned sync state, not from Medusa.** An imported order's
 *    marketplace lives in `channel_order_ref` (ADR 0010). The UI and the drift detector therefore
 *    read the same fact, and an order with no committed ref reports `channel: null` rather than a
 *    guess.
 * 2. **The response is an allowlist.** Medusa adding a field must not silently widen what a seller
 *    sees, so the projection below names every field it returns.
 * 3. **Shipments ride on the order read.** The engine's fulfillment *is* the shipment record
 *    (`recordShipmentWorkflow`), so `GET /admin/orders/:id?fields=*fulfillments,...` already carries
 *    the waybill, the courier and the delivery status the track pass wrote. The order detail projects
 *    them rather than calling a second route (docs/adr/0016, 0021).
 *
 * The credential is read per request and never stored, logged, or echoed. A missing key is
 * `TENANT_NOT_FOUND`; an unreachable instance is `UPSTREAM_ERROR`. A failure never degrades to an
 * empty list, because "no orders" and "we could not ask" must not look the same.
 */

import { PlatformError } from "@platform/contracts";
import type { ChannelCode, Money, TenantId } from "@platform/contracts";
import type { MedusaTargetStore } from "@platform/contracts";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type { SyncStateStore } from "@platform/sync-state";
import type { Logger } from "./logging.ts";

/**
 * The transport seam. Same shape as the worker's, and for the same reason: Node's `fetch` cannot be
 * handed a pinned CA, so the credential-bearing hop uses `node:https` (ADR 0012 point 6). Tests
 * stub this rather than reaching a real instance.
 */
export type SellerReadTransport = (
  url: string,
  init: RequestInit
) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

/** One order as a seller sees it. Every field here is deliberate (ADR 0016 point 5). */
export interface SellerOrderSummary {
  readonly orderId: string;
  readonly displayId: number | null;
  readonly status: string;
  /** Medusa's own fulfillment state, so the list shows delivery progress without a second read. */
  readonly fulfillmentStatus: string | null;
  readonly channel: ChannelCode | null;
  readonly externalOrderId: string | null;
  readonly email: string | null;
  readonly total: Money | null;
  readonly itemCount: number;
  readonly placedAt: string;
  readonly updatedAt: string;
}

/** One tracking event as the engine recorded it, normalised by the track pass (docs/adr/0021). */
export interface SellerShipmentEvent {
  readonly status: string;
  readonly occurredAt: string;
  readonly description: string;
}

/**
 * A shipment as a seller sees it (docs/PLAN.md M7).
 *
 * The fulfillment *is* the shipment record (`recordShipmentWorkflow`), so this is a projection of
 * the engine's own fulfillment plus the metadata and label we wrote on it — no new tenant route, the
 * same proxy rule ADR 0016 set for orders. It carries the courier-neutral vocabulary the platform
 * uses (`arrangement`, the normalised status) and the raw channel/courier names the seller sees.
 */
export interface SellerShipment {
  readonly fulfillmentId: string;
  readonly trackingNumber: string | null;
  readonly trackingUrl: string | null;
  readonly labelUrl: string | null;
  /** Our `CourierCode` for a self-arranged shipment, or the channel's courier name otherwise. */
  readonly courier: string | null;
  readonly serviceLevel: string | null;
  /** Who arranged the waybill, when the shipment carries our metadata. `null` otherwise. */
  readonly arrangement: "channel" | "courier" | null;
  /** The normalised delivery status (docs/adr/0021), or `created` when none was recorded yet. */
  readonly status: string;
  readonly events: readonly SellerShipmentEvent[];
  readonly shippedAt: string | null;
  readonly deliveredAt: string | null;
}

export interface SellerOrderList {
  readonly orders: readonly SellerOrderSummary[];
  /** How many the instance holds for this tenant, so the UI can page without guessing. */
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
}

export interface SellerOrderLine {
  readonly title: string;
  readonly sku: string | null;
  readonly quantity: number;
  readonly unitPrice: Money | null;
  readonly subtotal: Money | null;
}

export interface SellerOrderDetail extends SellerOrderSummary {
  readonly lines: readonly SellerOrderLine[];
  /** The order's shipments, as the engine recorded them (docs/PLAN.md M7). */
  readonly shipments: readonly SellerShipment[];
  readonly subtotal: Money | null;
  readonly shipping: Money | null;
  readonly discount: Money | null;
}

export interface SellerOrderReaderOptions {
  readonly targets: MedusaTargetStore;
  readonly keys: MedusaAdminKeyStore;
  readonly syncState: SyncStateStore;
  readonly transport: SellerReadTransport;
  readonly logger: Logger;
}

/**
 * Medusa stores IDR in whole rupiah; the platform counts sen (ADR 0012's money boundary, and
 * `data-plane/medusa-config/src/lib/money.ts` converts the other way when an order is imported).
 * Going back is exact — multiplying by 100 cannot lose a digit — but it must be applied, because a
 * missed 100x is an order priced 100x wrong with no error anywhere.
 */
function senFromMedusaRupiah(amount: number): Money {
  return { amount: amount * 100, currency: "IDR" };
}

/** Medusa money fields arrive as integers, but a nullable total must stay null rather than become 0. */
function optionalMoney(value: unknown): Money | null {
  return typeof value === "number" && Number.isFinite(value) ? senFromMedusaRupiah(value) : null;
}

/** An optional ISO timestamp as a string, keeping an absent one absent rather than inventing a date. */
function optionalTimestamp(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** An optional non-empty string, so an empty tracking/label URL reads as absent, not as "". */
function optionalString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** The normalised tracking events the track pass wrote, ignoring anything malformed rather than guessing. */
function shipmentEvents(metadata: Record<string, unknown>): readonly SellerShipmentEvent[] {
  const raw = metadata.shipment_events;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): SellerShipmentEvent[] => {
    if (entry === null || typeof entry !== "object") return [];
    const event = entry as Record<string, unknown>;
    if (typeof event.status !== "string" || typeof event.occurredAt !== "string") return [];
    return [
      {
        status: event.status,
        occurredAt: event.occurredAt,
        description: typeof event.description === "string" ? event.description : ""
      }
    ];
  });
}

/**
 * Project one engine fulfillment into the shipment a seller sees (docs/PLAN.md M7).
 *
 * The fulfillment is the shipment record: our `recordShipmentWorkflow` writes the courier, the
 * arrangement and the delivery status into its `metadata`, and the waybill into its label. This
 * reads those back with the same allowlist discipline the order projection uses (ADR 0016 point 5),
 * so a field we did not write cannot reach a seller by default. A fulfillment with no label — one
 * the engine created by some other path — still projects, with `trackingNumber: null`, rather than
 * being dropped, because the seller should see that the order shipped.
 */
function projectShipment(fulfillment: MedusaFulfillment): SellerShipment | null {
  const fulfillmentId = typeof fulfillment.id === "string" ? fulfillment.id : null;
  if (fulfillmentId === null) return null;

  const metadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
  const label = (fulfillment.labels ?? [])[0];
  const arrangement = metadata.arrangement === "channel" || metadata.arrangement === "courier"
    ? metadata.arrangement
    : null;

  return {
    fulfillmentId,
    trackingNumber: optionalString(label?.tracking_number),
    trackingUrl: optionalString(label?.tracking_url),
    labelUrl: optionalString(label?.label_url),
    courier: optionalString(metadata.courier),
    serviceLevel: optionalString(metadata.service_level),
    arrangement,
    // A shipment with no recorded status has not had a track pass yet; `created` is what the engine
    // stamps at booking time, so reporting it is honest rather than inventing "unknown".
    status: typeof metadata.shipment_status === "string" ? metadata.shipment_status : "created",
    events: shipmentEvents(metadata),
    shippedAt: optionalTimestamp(fulfillment.shipped_at),
    deliveredAt: optionalTimestamp(fulfillment.delivered_at)
  };
}

interface MedusaOrderItem {
  readonly title?: unknown;
  readonly variant_sku?: unknown;
  readonly quantity?: unknown;
  readonly unit_price?: unknown;
  readonly subtotal?: unknown;
}

interface MedusaFulfillmentLabel {
  readonly tracking_number?: unknown;
  readonly tracking_url?: unknown;
  readonly label_url?: unknown;
}

interface MedusaFulfillment {
  readonly id?: unknown;
  readonly metadata?: unknown;
  readonly shipped_at?: unknown;
  readonly delivered_at?: unknown;
  readonly labels?: readonly MedusaFulfillmentLabel[];
}

interface MedusaOrder {
  readonly id?: unknown;
  readonly display_id?: unknown;
  readonly status?: unknown;
  readonly fulfillment_status?: unknown;
  readonly email?: unknown;
  readonly total?: unknown;
  readonly subtotal?: unknown;
  readonly shipping_total?: unknown;
  readonly discount_total?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
  readonly items?: readonly MedusaOrderItem[];
  readonly fulfillments?: readonly MedusaFulfillment[];
}

/** The fields the proxy asks Medusa for. Both lists are spelled out so the request is reviewable. */
const LIST_FIELDS = [
  "id",
  "display_id",
  "status",
  "fulfillment_status",
  "email",
  "total",
  "created_at",
  "updated_at",
  "*items"
];
const DETAIL_FIELDS = [
  ...LIST_FIELDS,
  "subtotal",
  "shipping_total",
  "discount_total",
  // The fulfillment *is* the shipment record, so the order read carries it: no second route, and the
  // seller sees tracking and delivery status on the order they belong to (docs/adr/0016, 0021).
  "*fulfillments",
  "*fulfillments.labels",
  "*fulfillments.metadata"
];

export class SellerOrderReader {
  readonly #options: SellerOrderReaderOptions;

  constructor(options: SellerOrderReaderOptions) {
    this.#options = options;
  }

  /**
   * One authenticated GET against the tenant's instance.
   *
   * The credential is a Medusa secret API key presented over HTTP Basic — a secret sent as Bearer
   * is rejected (ADR 0012). `tenantId` selects the target and is never forwarded: the instance
   * already is that tenant, so there is no tenant header to forget.
   */
  async #get(tenantId: TenantId, path: string): Promise<unknown> {
    const target = await this.#options.targets.get(tenantId);
    if (target === null) {
      // Absence is a hard answer. Falling back to another base URL would read one tenant's orders
      // for another; a 404 is the honest response.
      throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no reachable commerce engine.", {
        details: { tenantId }
      });
    }

    const secretKey = await this.#options.keys.get(tenantId);
    if (secretKey === null) {
      // A target without a key would send an empty credential and surface as an auth error at the
      // tenant. Fail here, naming the tenant and never the value.
      throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no Medusa admin credential.", {
        details: { tenantId }
      });
    }

    const credential = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
    let response;
    try {
      response = await this.#options.transport(`${target.baseUrl}${path}`, {
        method: "GET",
        headers: { authorization: `Basic ${credential}`, "content-type": "application/json" }
      });
    } catch (error) {
      // A transport failure is the instance being unreachable, not a bad request. It must not look
      // like an empty result: the seller has to be able to tell "nothing" from "we could not ask".
      this.#options.logger.error("seller_read.transport_failed", {
        tenantId,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      throw new PlatformError("UPSTREAM_ERROR", "Could not reach the tenant's commerce engine.", {
        retryable: true,
        details: { tenantId }
      });
    }

    const text = await response.text();
    if (!response.ok) {
      // A 404 from Medusa is a real answer about this tenant's data (no such order), not an upstream
      // fault, so it maps to NOT_FOUND. Anything else is the instance failing to serve us, which is
      // UPSTREAM_ERROR — the two must not collapse into one status.
      if (response.status === 404) {
        throw new PlatformError("NOT_FOUND", "No such order.", { details: { tenantId } });
      }
      this.#options.logger.warn("seller_read.upstream_failed", { tenantId, status: response.status });
      throw new PlatformError("UPSTREAM_ERROR", "The tenant's commerce engine rejected the read.", {
        retryable: response.status >= 500,
        details: { tenantId, status: response.status }
      });
    }

    if (text === "") return null;
    try {
      return JSON.parse(text);
    } catch {
      // A 200 with a body we cannot read is an upstream fault, not an empty result.
      throw new PlatformError("UPSTREAM_ERROR", "The tenant's commerce engine returned unreadable JSON.", {
        retryable: false,
        details: { tenantId }
      });
    }
  }

  /**
   * Channel attribution for a batch of orders.
   *
   * Resolved per order through the store rather than by listing a whole channel: the caller has
   * order ids and no channel, and the store's indexed lookup is the reverse direction (ADR 0016).
   * A lookup failure is deliberately *not* fatal to the read — the order still exists in Medusa, so
   * the summary is returned with `channel: null` and the UI shows an unattributed order rather than
   * the seller losing the order entirely.
   */
  async #attribution(
    tenantId: TenantId,
    orderIds: readonly string[]
  ): Promise<ReadonlyMap<string, { channel: ChannelCode; externalOrderId: string }>> {
    const found = new Map<string, { channel: ChannelCode; externalOrderId: string }>();
    for (const orderId of orderIds) {
      const ref = await this.#options.syncState.findOrderRefByOrderId(tenantId, orderId);
      // Only a committed ref names a real import. A `reserved` ref has no order yet, and a `failed`
      // one describes an import that did not land, so neither should attribute an existing order.
      if (ref !== null && ref.status === "committed") {
        found.set(orderId, { channel: ref.channel, externalOrderId: ref.externalOrderId });
      }
    }
    return found;
  }

  #summarise(
    order: MedusaOrder,
    attribution: ReadonlyMap<string, { channel: ChannelCode; externalOrderId: string }>
  ): SellerOrderSummary | null {
    const orderId = typeof order.id === "string" ? order.id : null;
    if (orderId === null) return null;
    const ref = attribution.get(orderId);
    return {
      orderId,
      displayId: typeof order.display_id === "number" ? order.display_id : null,
      status: typeof order.status === "string" ? order.status : "unknown",
      fulfillmentStatus: typeof order.fulfillment_status === "string" ? order.fulfillment_status : null,
      channel: ref?.channel ?? null,
      externalOrderId: ref?.externalOrderId ?? null,
      email: typeof order.email === "string" ? order.email : null,
      total: optionalMoney(order.total),
      itemCount: (order.items ?? []).reduce(
        (count, item) => count + (typeof item.quantity === "number" ? item.quantity : 0),
        0
      ),
      placedAt: typeof order.created_at === "string" ? order.created_at : "",
      updatedAt: typeof order.updated_at === "string" ? order.updated_at : ""
    };
  }

  async listOrders(input: {
    readonly tenantId: TenantId;
    readonly limit: number;
    readonly offset: number;
    readonly status?: string;
  }): Promise<SellerOrderList> {
    const query = new URLSearchParams();
    query.set("limit", String(input.limit));
    query.set("offset", String(input.offset));
    // `fields` and `*items` are what keep this to one request per page: the item count is shown in
    // the list, so fetching items separately would be an N+1 against a credential-bearing hop.
    query.set("fields", LIST_FIELDS.join(","));
    if (input.status !== undefined) query.set("status", input.status);

    const body = (await this.#get(input.tenantId, `/admin/orders?${query.toString()}`)) as {
      readonly orders?: readonly MedusaOrder[];
      readonly count?: unknown;
    } | null;

    const orders = body?.orders ?? [];
    const attribution = await this.#attribution(
      input.tenantId,
      orders.map((order) => (typeof order.id === "string" ? order.id : "")).filter((id) => id !== "")
    );

    return {
      orders: orders
        .map((order) => this.#summarise(order, attribution))
        .filter((summary): summary is SellerOrderSummary => summary !== null),
      total: typeof body?.count === "number" ? body.count : orders.length,
      offset: input.offset,
      limit: input.limit
    };
  }

  async getOrder(input: { readonly tenantId: TenantId; readonly orderId: string }): Promise<SellerOrderDetail> {
    const query = new URLSearchParams();
    query.set("fields", DETAIL_FIELDS.join(","));

    const body = (await this.#get(
      input.tenantId,
      `/admin/orders/${encodeURIComponent(input.orderId)}?${query.toString()}`
    )) as { readonly order?: MedusaOrder } | null;

    const order = body?.order;
    if (order === undefined) {
      // Medusa answered 200 without an order, which should not happen. Treat it as not found rather
      // than as an empty order the seller would read as a broken record.
      throw new PlatformError("NOT_FOUND", "No such order.", { details: { orderId: input.orderId } });
    }

    const attribution = await this.#attribution(input.tenantId, [
      typeof order.id === "string" ? order.id : input.orderId
    ]);
    const summary = this.#summarise(order, attribution);
    if (summary === null) {
      throw new PlatformError("NOT_FOUND", "No such order.", { details: { orderId: input.orderId } });
    }

    const lines: SellerOrderLine[] = (order.items ?? []).map((item) => ({
      title: typeof item.title === "string" ? item.title : "",
      sku: typeof item.variant_sku === "string" ? item.variant_sku : null,
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      unitPrice: optionalMoney(item.unit_price),
      subtotal: optionalMoney(item.subtotal)
    }));

    // The order read carries the fulfillments because the fulfillment is the shipment record; a
    // fulfillment with no id is skipped rather than projected into an unaddressable shipment.
    const shipments = (order.fulfillments ?? [])
      .map((fulfillment) => projectShipment(fulfillment))
      .filter((shipment): shipment is SellerShipment => shipment !== null);

    return {
      ...summary,
      lines,
      shipments,
      subtotal: optionalMoney(order.subtotal),
      shipping: optionalMoney(order.shipping_total),
      discount: optionalMoney(order.discount_total)
    };
  }
}
