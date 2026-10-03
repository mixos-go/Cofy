/**
 * The worker's outbound ports.
 *
 * The worker owns orchestration and nothing else: it never imports `@medusajs/*`, never touches a
 * tenant database, and never talks to a marketplace directly (AGENTS.md §2.3, §3, §4; ADR 0010).
 * Everything it needs from the outside arrives through one of these three interfaces, which makes
 * the workflows testable with a fake and keeps the raw shapes of marketplaces and Medusa out of
 * the workflow code.
 *
 * The HTTP implementations below are thin: they serialize the contract types and map a non-2xx
 * response back into the platform error taxonomy, so a workflow can decide retry from the code
 * rather than from a status number.
 */

import { PlatformError, isRetryable } from "@platform/contracts";
import type { Transport } from "@platform/http-transport";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type {
  ChannelCapabilities,
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  ChannelStockLevel,
  IdempotencyClaim,
  OrderId,
  StockResult,
  StockUpdate,
  SyncEntity,
  TenantId,
  ChannelSkuMap,
  ChannelOrderRef,
  ChannelOrderRefStatus,
  TrackingWriteBack,
  Shipment
} from "@platform/contracts";

/** Platform-owned sync state (ADR 0010). Backed by the control-plane registry. */
export interface SyncStateClient {
  reserveOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<{ readonly kind: "reserved" | "exists"; readonly ref: ChannelOrderRef }>;
  commitOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly orderId: OrderId;
  }): Promise<ChannelOrderRef>;
  failOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<ChannelOrderRef>;

  /**
   * Every order ref for one target, optionally narrowed to one status (ADR 0014).
   *
   * Drift is derived from these refs rather than stored beside them, so this is the read the drift
   * detector and the dashboard both use.
   */
  listOrderRefs(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly status?: ChannelOrderRefStatus;
    readonly limit?: number;
  }): Promise<readonly ChannelOrderRef[]>;

  /**
   * Return a `failed` ref to `reserved`, so the import path retries the order (ADR 0014's repair).
   * A `committed` ref is final and is refused.
   */
  reopenOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<ChannelOrderRef>;

  claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
  }): Promise<IdempotencyClaim>;
  completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: "succeeded" | "failed";
    readonly result: unknown;
  }): Promise<void>;
  /**
   * Release a claim this attempt never used, so a rescheduled retry can take it (ADR 0013).
   *
   * Called when the governor refused the marketplace call: nothing was sent, so neither
   * `succeeded` nor `failed` describes the operation, and leaving the claim in place would turn
   * the retry into a no-op until the lease expired.
   */
  abandonIdempotency(input: { readonly tenantId: TenantId; readonly key: string }): Promise<void>;

  upsertSkuMap(entry: ChannelSkuMap): Promise<void>;
  getSkuMap(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly sku: string;
  }): Promise<ChannelSkuMap | null>;

  getCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
  }): Promise<string | null>;
  setCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
    readonly cursor: string | null;
  }): Promise<void>;
}

/** One page or one batch against the integration plane. The plane owns the marketplace. */
export interface ChannelGateway {
  /**
   * What the channel's connector can do. Read once at startup to decide which reconciliation passes
   * are worth arming, so a channel that cannot report stock is not walked every cadence (ADR 0015).
   */
  capabilities(input: { readonly channel: ChannelCode }): Promise<ChannelCapabilities>;

  fetchOrders(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }): Promise<{ readonly items: readonly ChannelOrder[]; readonly nextCursor: string | null }>;

  fetchListings(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }): Promise<{ readonly items: readonly ChannelListing[]; readonly nextCursor: string | null }>;

  /**
   * Pull a page of the channel's current stock levels (docs/adr/0015). The comparison this feeds is
   * what makes a corrupted level detectable.
   */
  fetchStockSnapshot(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }): Promise<{ readonly items: readonly ChannelStockLevel[]; readonly nextCursor: string | null }>;

  pushStock(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly items: readonly StockUpdate[];
  }): Promise<readonly StockResult[]>;

  /**
   * Write a courier's waybill back to the channel (docs/adr/0020). Gated by the channel's
   * `supportsTrackingWriteBack` capability, which the integration plane also enforces; the worker
   * checks it so a channel without the operation is a clear skip rather than a failed call.
   */
  attachTrackingNumber(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly tracking: TrackingWriteBack;
  }): Promise<void>;
}

/** A sellable variant in the tenant's Medusa, resolved by our own SKU. */
export interface MedusaVariant {
  readonly variantId: string;
  readonly sku: string | null;
}

/**
 * A variant's available stock in the tenant's Medusa, resolved by our own SKU (docs/adr/0015).
 *
 * This is the local side of the stock comparison. A SKU the tenant does not sell, or a variant that
 * does not manage inventory, is simply absent from the result — "not comparable", not zero.
 */
export interface MedusaStockLevel {
  readonly sku: string;
  readonly available: number;
}

/**
 * The transport shape every HTTP client here depends on is `Transport` from
 * `@platform/http-transport`: narrower than `typeof fetch` on purpose, because the clients only
 * ever read `ok`, `status` and the body, so a test fake satisfies it without a full `Response`.
 */

/**
 * A tenant's commerce engine, as resolved for one call (ADR 0012).
 *
 * The credential is tenant-critical: a Medusa secret key carries full admin authority inside its
 * own instance (only publishable keys can be scoped), so this value must never be logged, cached to
 * disk, or shared between tenants.
 */
export interface ResolvedMedusaTarget {
  readonly baseUrl: string;
  readonly secretKey: string;
}

/**
 * Resolves a tenant to the engine the worker should call.
 *
 * The worker never holds a default base URL: a tenant that cannot be resolved is an error, and a
 * resolution failure must never silently fall back to another tenant's engine.
 */
export interface MedusaTargetResolver {
  resolve(tenantId: TenantId): Promise<ResolvedMedusaTarget>;
}

/** The tenant's commerce engine, reached through its own Admin API (ADR 0010). */
export interface CommerceClient {
  /** Find the variant ids for a set of SKUs. Missing SKUs are simply absent from the result. */
  resolveVariantsBySku(input: {
    readonly tenantId: TenantId;
    readonly skus: readonly string[];
  }): Promise<readonly MedusaVariant[]>;

  /**
   * Find the order a channel order already became, through the `channel-order-link` module
   * (ADR 0010 point 3). This is how compensation and a resumed import learn whether a create
   * actually landed, without relying on the worker's own memory.
   */
  findOrderByExternalRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }): Promise<{ readonly orderId: OrderId } | null>;

  /** Create an order with reservations. The idempotency key is sent so a retry cannot duplicate. */
  createOrder(input: {
    readonly tenantId: TenantId;
    readonly order: ChannelOrder;
    readonly lines: readonly { readonly sku: string; readonly variantId: string; readonly quantity: number }[];
    readonly idempotencyKey: string;
  }): Promise<{ readonly orderId: OrderId }>;

  /** Release the reservations of an order that must be rolled back (M3 compensation test). */
  releaseOrder(input: {
    readonly tenantId: TenantId;
    readonly orderId: OrderId;
    readonly reason: string;
  }): Promise<void>;

  /**
   * The tenant's available stock for a set of SKUs (docs/adr/0015).
   *
   * The local half of the stock comparison. Like `resolveVariantsBySku`, a SKU the tenant does not
   * sell is absent from the result rather than zero, so "unknown to us" stays distinguishable from
   * "none left".
   */
  listStockLevels(input: {
    readonly tenantId: TenantId;
    readonly skus: readonly string[];
  }): Promise<readonly MedusaStockLevel[]>;

  /**
   * Record a booked courier shipment against the tenant's order (M7, docs/adr/0020).
   *
   * The courier call already happened in the integration plane; this is the tenant-side half that
   * makes the engine's own records agree the order shipped — a Fulfillment that consumes the
   * reservation, and a shipment carrying the waybill. The tenant's Medusa owns the fulfillment id;
   * the caller gets it back so the write-back can be correlated to the shipment it came from.
   *
   * Idempotent on the waybill: a retried call for the same order and tracking number returns the
   * fulfillment the first call created rather than fulfilling the items twice.
   */
  recordShipment(input: {
    readonly tenantId: TenantId;
    readonly orderId: OrderId;
    /** The lines shipped, by our SKU — the same vocabulary an order import uses. */
    readonly items: readonly { readonly sku: string; readonly quantity: number }[];
    readonly shipment: Shipment;
    readonly trackingUrl: string | null;
  }): Promise<{ readonly fulfillmentId: string; readonly trackingNumber: string }>;
}

interface HttpOptions {
  readonly baseUrl: string;
  readonly serviceToken: string;
  readonly transport?: typeof fetch;
}

/** Options for the tenant-facing client. The target is resolved per tenant, never configured once. */
interface CommerceHttpOptions {
  readonly resolver: MedusaTargetResolver;
  readonly transport: Transport;
}

async function request(
  transport: Transport,
  url: string,
  init: RequestInit
): Promise<unknown> {
  const response = await transport(url, init);
  const text = await response.text();
  const body: unknown = text === "" ? null : JSON.parse(text);

  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    // Rebuild the platform error so retry policy is decided by code, not by HTTP status. A
    // CHANNEL_RATE_LIMITED arrives as a 429, which `status >= 500` would wrongly call terminal, so
    // retryability comes from the taxonomy helper. An unparseable body is upstream, never success.
    const code = (error?.code as PlatformError["code"] | undefined) ?? "UPSTREAM_ERROR";
    throw new PlatformError(code, error?.message ?? `Request failed with status ${response.status}.`, {
      retryable: isRetryable(response.status, code),
      details: (error?.details as Record<string, unknown>) ?? {}
    });
  }
  return body;
}

/** HTTP client for the control plane's sync-state surface (ADR 0010). */
export class HttpSyncStateClient implements SyncStateClient {
  readonly #options: HttpOptions;

  constructor(options: HttpOptions) {
    this.#options = options;
  }

  #post(path: string, payload: Record<string, unknown>): Promise<unknown> {
    const transport = this.#options.transport ?? fetch;
    return request(transport, `${this.#options.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.#options.serviceToken}`
      },
      body: JSON.stringify(payload)
    });
  }

  #get(path: string): Promise<unknown> {
    const transport = this.#options.transport ?? fetch;
    return request(transport, `${this.#options.baseUrl}${path}`, {
      method: "GET",
      headers: { authorization: `Bearer ${this.#options.serviceToken}` }
    });
  }

  /** Read a tenant's engine location (ADR 0012). Never returns the credential. */
  async getMedusaTarget(tenantId: TenantId): Promise<unknown> {
    return this.#get(`/v1/tenants/${encodeURIComponent(tenantId)}/medusa-target`);
  }

  async reserveOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }) {
    return (await this.#post("/v1/sync/order-refs/reserve", input)) as {
      readonly kind: "reserved" | "exists";
      readonly ref: ChannelOrderRef;
    };
  }

  async commitOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly orderId: OrderId;
  }) {
    return (await this.#post("/v1/sync/order-refs/commit", input)) as ChannelOrderRef;
  }

  async failOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }) {
    return (await this.#post("/v1/sync/order-refs/fail", input)) as ChannelOrderRef;
  }

  async listOrderRefs(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly status?: ChannelOrderRefStatus;
    readonly limit?: number;
  }) {
    // Path-addressed like the other per-target reads (sku-maps, cursors): the target is part of the
    // resource, and only the filters travel as a query.
    const query = new URLSearchParams();
    if (input.status !== undefined) query.set("status", input.status);
    if (input.limit !== undefined) query.set("limit", String(input.limit));
    const suffix = query.size === 0 ? "" : `?${query.toString()}`;
    const path = `/v1/sync/order-refs/${encodeURIComponent(input.tenantId)}/${input.channel}${suffix}`;
    const body = (await this.#get(path)) as { readonly refs: readonly ChannelOrderRef[] };
    return body.refs;
  }

  async reopenOrderRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }) {
    return (await this.#post("/v1/sync/order-refs/reopen", input)) as ChannelOrderRef;
  }

  async claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
  }) {
    return (await this.#post("/v1/sync/idempotency/claim", input)) as IdempotencyClaim;
  }

  async completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: "succeeded" | "failed";
    readonly result: unknown;
  }) {
    await this.#post("/v1/sync/idempotency/complete", input);
  }

  async abandonIdempotency(input: { readonly tenantId: TenantId; readonly key: string }) {
    await this.#post("/v1/sync/idempotency/abandon", input);
  }

  async upsertSkuMap(entry: ChannelSkuMap) {
    await this.#post("/v1/sync/sku-maps/upsert", { ...entry });
  }

  async getSkuMap(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly sku: string;
  }) {
    const transport = this.#options.transport ?? fetch;
    const url = `${this.#options.baseUrl}/v1/sync/sku-maps/${encodeURIComponent(input.tenantId)}/${input.channel}/${encodeURIComponent(input.sku)}`;
    const body = (await request(transport, url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.#options.serviceToken}` }
    })) as { readonly map: ChannelSkuMap | null };
    return body.map;
  }

  async getCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
  }) {
    const transport = this.#options.transport ?? fetch;
    const url = `${this.#options.baseUrl}/v1/sync/cursors/${encodeURIComponent(input.tenantId)}/${input.channel}/${input.entity}`;
    const body = (await request(transport, url, {
      method: "GET",
      headers: { authorization: `Bearer ${this.#options.serviceToken}` }
    })) as { readonly cursor: { readonly cursor: string | null } | null };
    return body.cursor?.cursor ?? null;
  }

  async setCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
    readonly cursor: string | null;
  }) {
    await this.#post("/v1/sync/cursors/set", input);
  }
}

/** HTTP client for the integration plane's marketplace surface. */
export class HttpChannelGateway implements ChannelGateway {
  readonly #options: HttpOptions;

  constructor(options: HttpOptions) {
    this.#options = options;
  }

  #post(path: string, payload: Record<string, unknown>): Promise<unknown> {
    const transport = this.#options.transport ?? fetch;
    return request(transport, `${this.#options.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.#options.serviceToken}`
      },
      body: JSON.stringify(payload)
    });
  }

  async capabilities(input: { readonly channel: ChannelCode }) {
    const body = (await this.#post(`/v1/channels/${input.channel}/capabilities`, {})) as {
      readonly capabilities: ChannelCapabilities;
    };
    return body.capabilities;
  }

  async fetchOrders(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }) {
    return (await this.#post(`/v1/channels/${input.channel}/orders/page`, {
      tenantId: input.tenantId,
      cursor: input.cursor
    })) as { readonly items: readonly ChannelOrder[]; readonly nextCursor: string | null };
  }

  async fetchListings(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }) {
    return (await this.#post(`/v1/channels/${input.channel}/listings/page`, {
      tenantId: input.tenantId,
      cursor: input.cursor
    })) as { readonly items: readonly ChannelListing[]; readonly nextCursor: string | null };
  }

  async fetchStockSnapshot(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly cursor: string | null;
  }) {
    return (await this.#post(`/v1/channels/${input.channel}/stock-snapshot/page`, {
      tenantId: input.tenantId,
      cursor: input.cursor
    })) as { readonly items: readonly ChannelStockLevel[]; readonly nextCursor: string | null };
  }

  async pushStock(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly items: readonly StockUpdate[];
  }) {
    const body = (await this.#post(`/v1/channels/${input.channel}/stock`, {
      tenantId: input.tenantId,
      items: input.items
    })) as { readonly results: readonly StockResult[] };
    return body.results;
  }

  async attachTrackingNumber(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly tracking: TrackingWriteBack;
  }) {
    await this.#post(`/v1/channels/${input.channel}/tracking`, {
      tenantId: input.tenantId,
      externalOrderId: input.externalOrderId,
      trackingNumber: input.tracking.trackingNumber,
      trackingUrl: input.tracking.trackingUrl
    });
  }
}

/** HTTP client for a tenant's Medusa Admin API. Never its database (ADR 0010, ADR 0012). */
export class HttpCommerceClient implements CommerceClient {
  readonly #options: CommerceHttpOptions;

  constructor(options: CommerceHttpOptions) {
    this.#options = options;
  }

  /**
   * Resolve the tenant's target, then issue one authenticated request to it.
   *
   * The credential is a Medusa secret API key, which Medusa accepts over HTTP **Basic** — a secret
   * sent as a Bearer token is rejected (ADR 0012). `tenantId` selects the target and is never
   * forwarded as a header: the instance already is that tenant.
   */
  async #request(tenantId: TenantId, path: string, init: RequestInit): Promise<unknown> {
    const target = await this.#options.resolver.resolve(tenantId);
    const credential = Buffer.from(`${target.secretKey}:`, "utf8").toString("base64");
    return request(this.#options.transport, `${target.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${credential}`,
        ...(init.headers ?? {})
      }
    });
  }

  async resolveVariantsBySku(input: {
    readonly tenantId: TenantId;
    readonly skus: readonly string[];
  }) {
    const query = new URLSearchParams();
    for (const sku of input.skus) query.append("sku", sku);
    const body = (await this.#request(input.tenantId, `/admin/variants?${query.toString()}`, { method: "GET" })) as {
      readonly variants: readonly MedusaVariant[];
    };
    return body.variants;
  }

  async findOrderByExternalRef(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
  }) {
    const query = new URLSearchParams({ channel: input.channel, externalOrderId: input.externalOrderId });
    const body = (await this.#request(
      input.tenantId,
      `/admin/channel-order-links?${query.toString()}`,
      { method: "GET" }
    )) as {
      readonly orderId: OrderId | null;
    };
    return body.orderId === null ? null : { orderId: body.orderId };
  }

  async createOrder(input: {
    readonly tenantId: TenantId;
    readonly order: ChannelOrder;
    readonly lines: readonly { readonly sku: string; readonly variantId: string; readonly quantity: number }[];
    readonly idempotencyKey: string;
  }) {
    const body = (await this.#request(input.tenantId, "/admin/orders", {
      method: "POST",
      headers: { "idempotency-key": input.idempotencyKey },
      body: JSON.stringify({ order: input.order, lines: input.lines })
    })) as { readonly orderId: OrderId };
    return body;
  }

  async releaseOrder(input: { readonly tenantId: TenantId; readonly orderId: OrderId; readonly reason: string }) {
    await this.#request(input.tenantId, `/admin/orders/${encodeURIComponent(input.orderId)}/release`, {
      method: "POST",
      body: JSON.stringify({ reason: input.reason })
    });
  }

  async listStockLevels(input: { readonly tenantId: TenantId; readonly skus: readonly string[] }) {
    const query = new URLSearchParams();
    for (const sku of input.skus) query.append("sku", sku);
    const body = (await this.#request(input.tenantId, `/admin/stock-levels?${query.toString()}`, {
      method: "GET"
    })) as { readonly levels: readonly MedusaStockLevel[] };
    return body.levels;
  }

  async recordShipment(input: {
    readonly tenantId: TenantId;
    readonly orderId: OrderId;
    readonly items: readonly { readonly sku: string; readonly quantity: number }[];
    readonly shipment: Shipment;
    readonly trackingUrl: string | null;
  }) {
    const body = (await this.#request(input.tenantId, "/admin/shipments", {
      method: "POST",
      body: JSON.stringify({
        orderId: input.orderId,
        items: input.items,
        trackingNumber: input.shipment.trackingNumber,
        trackingUrl: input.trackingUrl,
        courier: input.shipment.courier,
        serviceLevel: input.shipment.serviceLevel
      })
    })) as { readonly fulfillmentId: string; readonly trackingNumber: string };
    return body;
  }
}

/**
 * Resolves a tenant to its Medusa target by asking the control plane, then reading the admin key
 * from the secret store (ADR 0012).
 *
 * The opener hop is the control plane's own service-token surface and carries no seller or tenant
 * secret, so it uses the plain transport. The key itself never leaves the process here: it goes
 * from the store into the resolver result and from there into one request header.
 */
export class HttpMedusaTargetResolver implements MedusaTargetResolver {
  readonly #options: {
    readonly controlPlane: HttpSyncStateClient;
    readonly keys: MedusaAdminKeyStore;
  };

  constructor(options: { readonly controlPlane: HttpSyncStateClient; readonly keys: MedusaAdminKeyStore }) {
    this.#options = options;
  }

  async resolve(tenantId: TenantId): Promise<ResolvedMedusaTarget> {
    const { target } = (await this.#options.controlPlane.getMedusaTarget(tenantId)) as {
      readonly target: { readonly baseUrl: string };
    };
    const secretKey = await this.#options.keys.get(tenantId);
    if (secretKey === null) {
      // A target without a key would send an empty credential and look like an auth bug at the
      // tenant. Fail here with the real cause, naming the tenant and never the value.
      throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no Medusa admin credential.", {
        details: { tenantId }
      });
    }
    return { baseUrl: target.baseUrl, secretKey };
  }
}
