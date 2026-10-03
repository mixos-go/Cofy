/**
 * Test doubles for the worker's outbound ports.
 *
 * These stand in for *external boundaries* — a marketplace HTTP API and a tenant's Medusa — which
 * AGENTS.md §6 permits and asks to be justified: we cannot run Shopee or a real Medusa in a unit
 * test. The sync-state side is deliberately **not** faked past the transport: the adapter below
 * wraps the real `InMemorySyncStateStore`, so idempotency and ref uniqueness are exercised as real
 * code, not a stand-in.
 */

import type { InMemorySyncStateStore } from "@platform/sync-state";
import type {
  ActiveShipment,
  ArrangedShipment,
  ChannelCapabilities,
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  ChannelShippingOption,
  ChannelStockLevel,
  ChannelTrackingPage,
  CourierCode,
  RateShoppingRules,
  Shipment,
  ShipmentQuote,
  ShipmentRecord,
  ShipmentRequest,
  ShipmentStatus,
  ShippingArrangementParameters,
  ShippingArrangementRequest,
  ShippingLabel,
  StockResult,
  StockUpdate,
  TenantId,
  TrackingEvent,
  TrackingWriteBack
} from "@platform/contracts";
import { defaultRateShoppingRules, PlatformError } from "@platform/contracts";
import type {
  ChannelGateway,
  CommerceClient,
  CourierGateway,
  MedusaStockLevel,
  MedusaVariant,
  RateShoppingRulesClient,
  SyncStateClient
} from "../src/ports.ts";

/** Adapts the real sync-state store to the worker's client port, with no behaviour of its own. */
export function syncStateClient(store: InMemorySyncStateStore): SyncStateClient {
  const now = (): string => new Date().toISOString();
  return {
    reserveOrderRef: (input) => store.reserveOrderRef({ ...input, now: now() }),
    commitOrderRef: (input) =>
      store.commitOrderRef(input.tenantId, input.channel, input.externalOrderId, input.orderId, now()),
    failOrderRef: (input) => store.failOrderRef(input.tenantId, input.channel, input.externalOrderId, now()),
    listOrderRefs: (input) => store.listOrderRefs(input),
    reopenOrderRef: (input) =>
      store.reopenOrderRef(input.tenantId, input.channel, input.externalOrderId, now()),
    claimIdempotency: (input) => store.claimIdempotency({ ...input, now: now() }),
    completeIdempotency: async (input) => {
      await store.completeIdempotency({
        tenantId: input.tenantId,
        key: input.key,
        outcome: input.outcome,
        result: input.result,
        now: now()
      });
    },
    abandonIdempotency: async (input) => {
      await store.abandonIdempotency(input.tenantId, input.key, now());
    },
    upsertSkuMap: async (entry) => {
      await store.upsertSkuMap(entry);
    },
    getSkuMap: (input) => store.getSkuMap(input.tenantId, input.channel, input.sku),
    getCursor: async (input) => (await store.getCursor(input.tenantId, input.channel, input.entity))?.cursor ?? null,
    setCursor: async (input) => {
      await store.setCursor({ ...input, now: now() });
    }
  };
}

type OrderPage = { readonly items: readonly ChannelOrder[]; readonly nextCursor: string | null };

/** A scripted marketplace. Pages are keyed by cursor so a walk can be resumed. */
export class FakeChannelGateway implements ChannelGateway {
  readonly #orderPages = new Map<string, OrderPage>();
  readonly #listingPages = new Map<string, { items: readonly ChannelListing[]; nextCursor: string | null }>();
  readonly #stockPages = new Map<string, { items: readonly ChannelStockLevel[]; nextCursor: string | null }>();
  #pagesRead = 0;
  readonly pushCalls: { tenantId: TenantId; channel: ChannelCode; items: readonly StockUpdate[] }[] = [];
  pushResults: ReadonlyMap<string, StockResult> = new Map();
  /** When set, the next push throws this, to exercise the failure path. */
  pushError: Error | null = null;
  /** When set, the next order read throws this — e.g. the governor refusing the call. */
  fetchOrdersError: Error | null = null;
  /**
   * Throw once after this many successful reads, to simulate a crash mid-pass. A plain
   * `fetchOrdersError` cannot do this: it fails the *first* read, before any page has committed.
   */
  fetchOrdersErrorAfterPages: number | null = null;
  /**
   * Every read *attempted*, including the one that throws. `orderFetches` records only successful
   * reads, so a test that must observe the crashing read itself (a worker dying mid-pass) needs this.
   */
  orderFetchAttempts = 0;
  readonly orderFetches: { tenantId: TenantId; channel: ChannelCode; cursor: string | null }[] = [];

  withOrderPage(key: string, page: OrderPage): this {
    this.#orderPages.set(key, page);
    return this;
  }

  withListingPage(key: string, page: { items: readonly ChannelListing[]; nextCursor: string | null }): this {
    this.#listingPages.set(key, page);
    return this;
  }

  withStockPage(key: string, page: { items: readonly ChannelStockLevel[]; nextCursor: string | null }): this {
    this.#stockPages.set(key, page);
    return this;
  }

  /** What the fake reports for a channel. Defaults to a channel that can do everything we read. */
  capabilitiesFor: (channel: ChannelCode) => ChannelCapabilities = () => ({
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: true,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: false,
    supportsListingRead: true,
    supportsStockSnapshotRead: true,
    supportsTrackingWriteBack: true,
    supportsShippingArrangement: true,
    supportsShippingLabel: true,
    supportsChannelTracking: true
  });

  async capabilities(input: { readonly channel: ChannelCode }): Promise<ChannelCapabilities> {
    return this.capabilitiesFor(input.channel);
  }

  async fetchOrders(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }): Promise<OrderPage> {
    this.orderFetchAttempts += 1;
    if (this.fetchOrdersError !== null) {
      const error = this.fetchOrdersError;
      this.fetchOrdersError = null;
      throw error;
    }
    if (this.fetchOrdersErrorAfterPages !== null) {
      this.#pagesRead += 1;
      if (this.#pagesRead > this.fetchOrdersErrorAfterPages) {
        this.fetchOrdersErrorAfterPages = null;
        throw new PlatformError("UPSTREAM_ERROR", "Simulated crash mid-pass.");
      }
    }
    this.orderFetches.push(input);
    const key = `${input.channel}:${input.cursor ?? "start"}`;
    return this.#orderPages.get(key) ?? { items: [], nextCursor: null };
  }

  async fetchListings(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }) {
    const key = `${input.channel}:${input.cursor ?? "start"}`;
    return this.#listingPages.get(key) ?? { items: [], nextCursor: null };
  }

  async fetchStockSnapshot(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }) {
    const key = `${input.channel}:${input.cursor ?? "start"}`;
    return this.#stockPages.get(key) ?? { items: [], nextCursor: null };
  }

  async pushStock(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly items: readonly StockUpdate[];
  }): Promise<readonly StockResult[]> {
    if (this.pushError !== null) {
      const error = this.pushError;
      this.pushError = null;
      throw error;
    }
    this.pushCalls.push(input);
    return input.items.map((item) => {
      const scripted = this.pushResults.get(item.sku);
      if (scripted !== undefined) return scripted;
      // Mirrors the connectors: no address means the SKU is not mapped on the channel.
      if (item.externalSkuId === undefined) return { sku: item.sku, accepted: false, reason: "unknown_sku" };
      return { sku: item.sku, accepted: true, reason: null };
    });
  }

  /** Every tracking write-back attempted, in order, so a test can prove what the channel was told. */
  readonly trackingWrites: {
    tenantId: TenantId;
    channel: ChannelCode;
    externalOrderId: string;
    tracking: TrackingWriteBack;
  }[] = [];
  /** When set, the next write-back throws this — e.g. the governor refusing the call. */
  trackingWriteError: Error | null = null;

  async attachTrackingNumber(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly tracking: TrackingWriteBack;
  }): Promise<void> {
    if (this.trackingWriteError !== null) {
      const error = this.trackingWriteError;
      this.trackingWriteError = null;
      throw error;
    }
    this.trackingWrites.push(input);
  }

  /** Every arrangement read/booking/read attempted, so a test can prove what the channel was asked. */
  readonly arrangementParameterCalls: {
    tenantId: TenantId;
    channel: ChannelCode;
    externalOrderId: string;
  }[] = [];
  readonly arrangeCalls: {
    tenantId: TenantId;
    channel: ChannelCode;
    arrangement: ShippingArrangementRequest;
  }[] = [];
  readonly labelCalls: { tenantId: TenantId; channel: ChannelCode; externalOrderId: string }[] = [];
  readonly channelTrackingCalls: { tenantId: TenantId; channel: ChannelCode; externalOrderId: string }[] = [];
  /** The options an arrangement read reports. Empty is the honest "no choice for this order". */
  arrangementOptions: readonly ChannelShippingOption[] = [];
  /** When set, the next arrangement call throws this — e.g. the governor refusing the call. */
  arrangementError: Error | null = null;
  channelTrackingEvents: readonly TrackingEvent[] = [];

  async getShippingArrangementParameters(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<ShippingArrangementParameters> {
    this.arrangementParameterCalls.push(input);
    return {
      externalOrderId: input.externalOrderId,
      options: this.arrangementOptions,
      requiresPickup: false,
      requiresDropoff: false,
      pickupAddressIds: []
    };
  }

  async arrangeShipment(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly arrangement: ShippingArrangementRequest;
  }): Promise<ArrangedShipment> {
    if (this.arrangementError !== null) {
      const error = this.arrangementError;
      this.arrangementError = null;
      throw error;
    }
    this.arrangeCalls.push(input);
    return {
      externalOrderId: input.arrangement.externalOrderId,
      trackingNumber: input.arrangement.selfShipTrackingNumber ?? "CHANNEL-ARRANGED-0001",
      status: "created",
      arrangedAt: new Date().toISOString()
    };
  }

  async fetchShippingLabel(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<ShippingLabel> {
    this.labelCalls.push(input);
    return {
      externalOrderId: input.externalOrderId,
      url: "https://label.example.test/label.pdf",
      inlineBase64: null,
      format: "pdf",
      documentType: "SHIPPING_LABEL"
    };
  }

  async fetchChannelTracking(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<ChannelTrackingPage> {
    this.channelTrackingCalls.push(input);
    return { externalOrderId: input.externalOrderId, events: this.channelTrackingEvents };
  }
}

/**
 * A fake tenant Medusa with a real inventory ledger.
 *
 * The ledger is what makes the oversell test meaningful: reservation is a check-and-decrement that
 * cannot interleave, so if the workflow imports concurrently and stock goes negative, the ledger
 * says so. Failure after creation is injectable via `failCommitAfterCreate` to exercise compensation.
 */
export class FakeCommerceClient implements CommerceClient {
  readonly orders: { orderId: string; externalOrderId: string; lines: readonly { sku: string; quantity: number }[] }[] = [];
  readonly released: string[] = [];
  /** variantId -> on-hand units. */
  readonly stock = new Map<string, number>();
  /** sku -> variantId the tenant knows. A SKU absent here is not in the catalogue. */
  readonly catalogue = new Map<string, string>();
  /** Keys already created, to prove the idempotency key reaches Medusa and blocks a duplicate. */
  readonly #byKey = new Map<string, string>();
  /** When true, createOrder reserves stock and creates the order, then throws (partial commit). */
  failAfterCreate = false;
  #counter = 0;

  withVariant(sku: string, variantId: string, onHand: number): this {
    this.catalogue.set(sku, variantId);
    this.stock.set(variantId, onHand);
    return this;
  }

  async resolveVariantsBySku(input: {
    readonly tenantId: TenantId;
    readonly skus: readonly string[];
  }): Promise<readonly MedusaVariant[]> {
    const variants: MedusaVariant[] = [];
    for (const sku of input.skus) {
      const variantId = this.catalogue.get(sku);
      if (variantId !== undefined) variants.push({ variantId, sku });
    }
    return variants;
  }

  /** Mirrors the `channel-order-link` module: the durable record of a create (ADR 0010 point 3). */
  async findOrderByExternalRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<{ readonly orderId: string } | null> {
    const order = this.orders.find((entry) => entry.externalOrderId === input.externalOrderId);
    return order === undefined ? null : { orderId: order.orderId };
  }

  async createOrder(input: {
    readonly tenantId: TenantId;
    readonly order: ChannelOrder;
    readonly lines: readonly { readonly sku: string; readonly variantId: string; readonly quantity: number }[];
    readonly idempotencyKey: string;
  }): Promise<{ readonly orderId: string }> {
    const existing = this.#byKey.get(input.idempotencyKey);
    if (existing !== undefined) return { orderId: existing };

    // Check every line before reserving any, so a rejected order reserves nothing (all-or-nothing).
    for (const line of input.lines) {
      const available = this.stock.get(line.variantId) ?? 0;
      if (available < line.quantity) {
        throw new PlatformError("UPSTREAM_ERROR", "Insufficient stock to reserve.", {
          details: { variantId: line.variantId, available, requested: line.quantity }
        });
      }
    }
    for (const line of input.lines) {
      this.stock.set(line.variantId, (this.stock.get(line.variantId) ?? 0) - line.quantity);
    }

    this.#counter += 1;
    const orderId = `order-${String(this.#counter).padStart(3, "0")}`;
    this.#byKey.set(input.idempotencyKey, orderId);
    this.orders.push({ orderId, externalOrderId: input.order.externalOrderId, lines: input.lines });

    if (this.failAfterCreate) {
      this.failAfterCreate = false;
      throw new PlatformError("UPSTREAM_ERROR", "Simulated failure after order creation.");
    }
    return { orderId };
  }

  async releaseOrder(input: { readonly tenantId: TenantId; readonly orderId: string; readonly reason: string }): Promise<void> {
    const order = this.orders.find((entry) => entry.orderId === input.orderId);
    // Give the reserved units back, mirroring a release.
    if (order !== undefined) {
      for (const line of order.lines) {
        const variantId = this.catalogue.get(line.sku);
        if (variantId !== undefined) this.stock.set(variantId, (this.stock.get(variantId) ?? 0) + line.quantity);
      }
    }
    this.released.push(input.orderId);
  }

  async listStockLevels(input: { readonly tenantId: TenantId; readonly skus: readonly string[] }) {
    const levels: MedusaStockLevel[] = [];
    for (const sku of input.skus) {
      const variantId = this.catalogue.get(sku);
      // Absent SKU is absent from the result, not zero: the comparison must be able to tell
      // "we do not sell this" from "none left" (docs/adr/0015).
      if (variantId === undefined) continue;
      levels.push({ sku, available: this.stock.get(variantId) ?? 0 });
    }
    return levels;
  }

  /** Shipments recorded, in order, so a test can prove what the engine was told. */
  readonly shipments: {
    tenantId: TenantId;
    orderId: string;
    items: readonly { sku: string; quantity: number }[];
    shipment: ShipmentRecord;
  }[] = [];
  /** When set, the next `recordShipment` throws this, to exercise the failure path. */
  recordShipmentError: Error | null = null;
  /** `orderId:trackingNumber` -> fulfillment id, mirroring the workflow's waybill idempotency. */
  readonly #shipmentByWaybill = new Map<string, string>();
  #shipmentCounter = 0;

  async recordShipment(input: {
    readonly tenantId: TenantId;
    readonly orderId: string;
    readonly items: readonly { readonly sku: string; readonly quantity: number }[];
    readonly shipment: ShipmentRecord;
  }): Promise<{ readonly fulfillmentId: string; readonly trackingNumber: string }> {
    if (this.recordShipmentError !== null) {
      const error = this.recordShipmentError;
      this.recordShipmentError = null;
      throw error;
    }
    const waybill = `${input.orderId}:${input.shipment.trackingNumber}`;
    const existing = this.#shipmentByWaybill.get(waybill);
    if (existing !== undefined) {
      return { fulfillmentId: existing, trackingNumber: input.shipment.trackingNumber };
    }
    this.#shipmentCounter += 1;
    const fulfillmentId = `ful-${String(this.#shipmentCounter).padStart(3, "0")}`;
    this.#shipmentByWaybill.set(waybill, fulfillmentId);
    this.shipments.push({ ...input, items: [...input.items] });
    return { fulfillmentId, trackingNumber: input.shipment.trackingNumber };
  }

  /** Active shipments the track pass walks. `arranged` shipments are channel-arranged. */
  activeShipments: ActiveShipment[] = [];
  /** Status advances written, in order, so a test can prove what the engine recorded. */
  readonly advances: {
    tenantId: TenantId;
    fulfillmentId: string;
    status: ShipmentStatus;
    events: readonly TrackingEvent[];
  }[] = [];
  /** When set, the next `listActiveShipments` throws this — e.g. the governor refusing the call. */
  listActiveError: Error | null = null;
  /** When set, the next `advanceShipment` throws this — e.g. a validation failure. */
  advanceError: Error | null = null;

  async listActiveShipments(input: {
    readonly tenantId: TenantId;
    readonly limit: number;
  }): Promise<readonly ActiveShipment[]> {
    if (this.listActiveError !== null) {
      const error = this.listActiveError;
      this.listActiveError = null;
      throw error;
    }
    return this.activeShipments.slice(0, input.limit);
  }

  async advanceShipment(input: {
    readonly tenantId: TenantId;
    readonly fulfillmentId: string;
    readonly status: ShipmentStatus;
    readonly events: readonly TrackingEvent[];
  }): Promise<void> {
    if (this.advanceError !== null) {
      const error = this.advanceError;
      this.advanceError = null;
      throw error;
    }
    this.advances.push({ ...input, events: [...input.events] });
  }
}

/**
 * A scripted courier surface (an external boundary, docs/adr/0020).
 *
 * Quotes are keyed by courier so a test can script exactly what rate shopping has to choose from.
 * A per-courier quote failure is injectable, because "one courier is down" must not sink the
 * fan-out — that is a behaviour the workflow owns and a real courier cannot be asked to produce.
 */
export class FakeCourierGateway implements CourierGateway {
  /** courier -> the service levels it will quote. Absent courier fails to quote. */
  readonly #quotes = new Map<CourierCode, readonly ShipmentQuote[]>();
  readonly quoteCalls: { tenantId: TenantId; couriers: readonly CourierCode[] | undefined }[] = [];
  readonly createCalls: { tenantId: TenantId; quote: ShipmentQuote }[] = [];
  /** When set, the next create throws this, to exercise the failure and deferral paths. */
  createError: Error | null = null;
  #waybillCounter = 0;

  withQuotes(courier: CourierCode, quotes: readonly ShipmentQuote[]): this {
    this.#quotes.set(courier, quotes);
    return this;
  }

  async quote(input: {
    readonly tenantId: TenantId;
    readonly shipment: ShipmentRequest;
    readonly couriers?: readonly CourierCode[];
  }) {
    const requested = input.couriers ?? [...this.#quotes.keys()];
    this.quoteCalls.push({ tenantId: input.tenantId, couriers: input.couriers });
    const quotes: ShipmentQuote[] = [];
    const failures: { courier: CourierCode; reason: string }[] = [];
    for (const courier of requested) {
      const scripted = this.#quotes.get(courier);
      if (scripted === undefined) failures.push({ courier, reason: "courier_error" });
      else quotes.push(...scripted);
    }
    return { quotes, failures };
  }

  async createShipment(input: {
    readonly tenantId: TenantId;
    readonly quote: ShipmentQuote;
    readonly shipment: ShipmentRequest;
  }): Promise<{ readonly shipment: Shipment }> {
    if (this.createError !== null) {
      const error = this.createError;
      this.createError = null;
      throw error;
    }
    this.createCalls.push({ tenantId: input.tenantId, quote: input.quote });
    this.#waybillCounter += 1;
    return {
      shipment: {
        courier: input.quote.courier,
        serviceLevel: input.quote.serviceLevel,
        trackingNumber: `WAYBILL-${String(this.#waybillCounter).padStart(4, "0")}`,
        status: "created",
        createdAt: new Date().toISOString()
      }
    };
  }

  readonly trackingCalls: { tenantId: TenantId; courier: CourierCode; trackingNumber: string }[] = [];
  trackEvents: readonly TrackingEvent[] = [];

  async track(input: {
    readonly tenantId: TenantId;
    readonly courier: CourierCode;
    readonly trackingNumber: string;
  }) {
    this.trackingCalls.push(input);
    return { events: this.trackEvents };
  }
}

/** A scripted rate-shopping rules read. Defaults to the honest "no constraints, cheapest first". */
export class FakeRateShoppingRulesClient implements RateShoppingRulesClient {
  readonly #rules = new Map<TenantId, RateShoppingRules>();
  readonly calls: TenantId[] = [];

  withRules(tenantId: TenantId, rules: RateShoppingRules): this {
    this.#rules.set(tenantId, rules);
    return this;
  }

  async get(input: { readonly tenantId: TenantId }): Promise<RateShoppingRules> {
    this.calls.push(input.tenantId);
    return this.#rules.get(input.tenantId) ?? defaultRateShoppingRules();
  }
}
