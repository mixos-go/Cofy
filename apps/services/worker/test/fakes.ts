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
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  StockResult,
  StockUpdate,
  TenantId
} from "@platform/contracts";
import { PlatformError } from "@platform/contracts";
import type {
  ChannelGateway,
  CommerceClient,
  MedusaVariant,
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
}
