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

import { PlatformError } from "@platform/contracts";
import type {
  ChannelCode,
  ChannelListing,
  ChannelOrder,
  IdempotencyClaim,
  OrderId,
  StockResult,
  StockUpdate,
  SyncEntity,
  TenantId,
  ChannelSkuMap,
  ChannelOrderRef
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

  pushStock(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly items: readonly StockUpdate[];
  }): Promise<readonly StockResult[]>;
}

/** A sellable variant in the tenant's Medusa, resolved by our own SKU. */
export interface MedusaVariant {
  readonly variantId: string;
  readonly sku: string | null;
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
}

interface HttpOptions {
  readonly baseUrl: string;
  readonly serviceToken: string;
  readonly transport?: typeof fetch;
}

async function request(
  transport: typeof fetch,
  url: string,
  init: RequestInit
): Promise<unknown> {
  const response = await transport(url, init);
  const text = await response.text();
  const body: unknown = text === "" ? null : JSON.parse(text);

  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    // Rebuild the platform error so retry policy is decided by code, not by HTTP status. An
    // unparseable error body is an upstream failure, never a silent success.
    throw new PlatformError(
      (error?.code as PlatformError["code"] | undefined) ?? "UPSTREAM_ERROR",
      error?.message ?? `Request failed with status ${response.status}.`,
      { retryable: response.status >= 500, details: (error?.details as Record<string, unknown>) ?? {} }
    );
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
}

/** HTTP client for a tenant's Medusa Admin API. Never its database (ADR 0010). */
export class HttpCommerceClient implements CommerceClient {
  readonly #options: HttpOptions;

  constructor(options: HttpOptions) {
    this.#options = options;
  }

  #request(path: string, init: RequestInit): Promise<unknown> {
    const transport = this.#options.transport ?? fetch;
    return request(transport, `${this.#options.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.#options.serviceToken}`,
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
    const body = (await this.#request(`/admin/variants?${query.toString()}`, { method: "GET" })) as {
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
    const body = (await this.#request(`/admin/channel-order-links?${query.toString()}`, { method: "GET" })) as {
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
    const body = (await this.#request("/admin/orders", {
      method: "POST",
      headers: { "idempotency-key": input.idempotencyKey },
      body: JSON.stringify({ order: input.order, lines: input.lines })
    })) as { readonly orderId: OrderId };
    return body;
  }

  async releaseOrder(input: { readonly tenantId: TenantId; readonly orderId: OrderId; readonly reason: string }) {
    await this.#request(`/admin/orders/${encodeURIComponent(input.orderId)}/release`, {
      method: "POST",
      body: JSON.stringify({ reason: input.reason })
    });
  }
}
