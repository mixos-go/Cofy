/**
 * The warehouse surface, proxied to the tenant's own Medusa Admin API (docs/PLAN.md M6).
 *
 * The WMS modules, the workflows and the Admin routes all live inside the tenant instance
 * (docs/adr/0018). The control plane owns the seller's session and the tenant's admin credential, so
 * it is the only place that can join the two — the same split the order read uses (ADR 0016), and
 * for the same reasons:
 *
 * - **The credential stays inside the request.** It is read from `MedusaAdminKeyStore`, used for one
 *   request over the pinned-CA TLS transport, and never logged or returned.
 * - **The seller path never carries a tenant.** The tenant comes from the session, so a seller
 *   cannot address another tenant by editing a URL.
 * - **The response is a projection.** Each tenant response is parsed by a schema that allowlists the
 *   fields a seller may see, so a field added to the data plane cannot reach a seller by default.
 * - **A failure is never an empty list.** An unreachable instance is `UPSTREAM_ERROR`, not "no
 *   purchase orders", because a seller has to be able to tell "nothing" from "we could not ask".
 *
 * The write half is deliberately a thin passthrough to the tenant's own workflows: the control plane
 * decides *who* may act and *for which tenant*, and the instance decides what the act means. No stock
 * arithmetic happens here — the ledger and the engine's inventory level are the instance's business
 * (docs/adr/0018), and duplicating the rule here is how two numbers start to disagree.
 */

import { z } from "zod";
import { PlatformError } from "@platform/contracts";
import type { TenantId } from "@platform/contracts";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type { MedusaTargetStore } from "@platform/contracts";
import type { Logger } from "./logging.ts";

/**
 * The transport seam, shaped like the seller read's. Tests install their own so the client is
 * exercised without a live tenant; production uses the TLS transport.
 */
export type WmsTransport = (
  url: string,
  init: RequestInit
) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

export interface Warehouse {
  readonly id: string;
  readonly name: string;
  readonly stockLocationId: string | null;
}

export type BinKind = "staging" | "storage" | "packing";

export interface Bin {
  readonly id: string;
  readonly warehouseId: string;
  readonly code: string;
  readonly kind: BinKind;
}

export interface BinContents {
  readonly binId: string;
  readonly code: string;
  readonly kind: BinKind;
  readonly contents: readonly { readonly sku: string; readonly quantity: number }[];
}

export interface PurchaseOrderLine {
  readonly id: string;
  readonly sku: string;
  readonly title: string;
  readonly orderedQuantity: number;
  readonly receivedQuantity: number;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly warehouseId: string;
  readonly supplierReference: string | null;
  readonly status: string;
  readonly receivedAt: string | null;
  readonly lines: readonly PurchaseOrderLine[];
}

export interface PickTaskLine {
  readonly id: string;
  readonly sku: string;
  readonly quantity: number;
  readonly binId: string | null;
  readonly pickedBinId: string | null;
  readonly expectedBarcode: string | null;
  readonly scannedBarcode: string | null;
  readonly pickedQuantity: number;
}

export interface PickTask {
  readonly id: string;
  readonly warehouseId: string;
  readonly orderId: string;
  readonly packingBinId: string | null;
  readonly status: string;
  readonly completedAt: string | null;
  readonly lines: readonly PickTaskLine[];
}

export interface Stocktake {
  readonly id: string;
  readonly warehouseId: string;
  readonly binId: string;
  readonly sku: string;
  readonly systemQuantity: number;
  readonly countedQuantity: number | null;
  readonly variance: number | null;
  readonly status: string;
  readonly countedBy: string | null;
  readonly appliedAt: string | null;
}

export interface StockMovement {
  readonly id: string;
  readonly binId: string;
  readonly sku: string;
  readonly kind: string;
  readonly delta: number;
  readonly quantityBefore: number;
  readonly quantityAfter: number;
  readonly reason: string | null;
  readonly actor: string | null;
  readonly createdAt: string;
}

export interface WmsClient {
  listWarehouses(tenantId: TenantId): Promise<readonly Warehouse[]>;
  listBins(tenantId: TenantId, warehouseId?: string): Promise<readonly Bin[]>;
  getBinContents(tenantId: TenantId, binId: string): Promise<BinContents>;
  listPurchaseOrders(tenantId: TenantId, warehouseId?: string): Promise<readonly PurchaseOrder[]>;
  listPickTasks(
    tenantId: TenantId,
    filter?: { readonly warehouseId?: string; readonly status?: string }
  ): Promise<readonly PickTask[]>;
  listStocktakes(
    tenantId: TenantId,
    filter?: { readonly warehouseId?: string; readonly status?: string }
  ): Promise<readonly Stocktake[]>;
  listStockMovements(
    tenantId: TenantId,
    filter: { readonly binId: string; readonly sku?: string }
  ): Promise<readonly StockMovement[]>;

  createWarehouse(input: {
    readonly tenantId: TenantId;
    readonly name: string;
    readonly stockLocationId?: string | null;
  }): Promise<Warehouse>;
  createBin(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly code: string;
    readonly kind: BinKind;
  }): Promise<Bin>;
  createPurchaseOrder(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly supplierReference?: string | null;
    readonly expectedAt?: string | null;
    readonly lines: readonly { readonly sku: string; readonly title: string; readonly orderedQuantity: number }[];
  }): Promise<PurchaseOrder>;
  receivePurchaseOrder(input: {
    readonly tenantId: TenantId;
    readonly purchaseOrderId: string;
    readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
    readonly actor: string | null;
  }): Promise<{ readonly purchaseOrderId: string; readonly stagingBinId: string; readonly status: string }>;
  putAway(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly fromBinId: string;
    readonly toBinId: string;
    readonly sku: string;
    readonly quantity: number;
    readonly actor: string | null;
  }): Promise<{ readonly fromBinId: string; readonly toBinId: string; readonly sku: string; readonly quantity: number }>;
  createPickTask(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly orderId: string;
    readonly packingBinId: string;
    readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  }): Promise<PickTask>;
  scanPickLine(input: {
    readonly tenantId: TenantId;
    readonly pickTaskId: string;
    readonly sku: string;
    readonly barcode: string;
    readonly quantity: number;
    readonly actor: string | null;
  }): Promise<{ readonly pickTaskId: string; readonly sku: string; readonly picked: number; readonly status: string }>;
  openStocktake(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly binId: string;
    readonly sku: string;
  }): Promise<{ readonly stocktakeId: string; readonly systemQuantity: number }>;
  applyStocktake(input: {
    readonly tenantId: TenantId;
    readonly stocktakeId: string;
    readonly countedQuantity: number;
    readonly countedBy: string | null;
  }): Promise<Stocktake>;
}

/**
 * The tenant responses, allowlisted.
 *
 * `z.object` strips unrecognised keys, so parsing *is* the projection: a field the data plane adds
 * later does not reach a seller until it is named here. The write schemas only require what the
 * caller needs back — a receipt's status, a scan's resulting task status — rather than echoing the
 * whole workflow result, which is not a seller-facing shape.
 */
const warehouseSchema = z.object({
  id: z.string(),
  name: z.string(),
  stockLocationId: z.string().nullable()
});

const binKindSchema = z.enum(["staging", "storage", "packing"]);

const binSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  code: z.string(),
  kind: binKindSchema
});

const binContentsSchema = z.object({
  binId: z.string(),
  code: z.string(),
  kind: binKindSchema,
  contents: z.array(z.object({ sku: z.string(), quantity: z.number() }))
});

const purchaseOrderLineSchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  orderedQuantity: z.number(),
  receivedQuantity: z.number()
});

const purchaseOrderSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  supplierReference: z.string().nullable(),
  status: z.string(),
  receivedAt: z.string().nullable(),
  lines: z.array(purchaseOrderLineSchema)
});

const pickTaskLineSchema = z.object({
  id: z.string(),
  sku: z.string(),
  quantity: z.number(),
  binId: z.string().nullable(),
  pickedBinId: z.string().nullable(),
  expectedBarcode: z.string().nullable(),
  scannedBarcode: z.string().nullable(),
  pickedQuantity: z.number()
});

const pickTaskSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  orderId: z.string(),
  packingBinId: z.string().nullable(),
  status: z.string(),
  completedAt: z.string().nullable(),
  lines: z.array(pickTaskLineSchema)
});

const stocktakeSchema = z.object({
  id: z.string(),
  warehouseId: z.string(),
  binId: z.string(),
  sku: z.string(),
  systemQuantity: z.number(),
  countedQuantity: z.number().nullable(),
  variance: z.number().nullable(),
  status: z.string(),
  countedBy: z.string().nullable(),
  appliedAt: z.string().nullable()
});

const stockMovementSchema = z.object({
  id: z.string(),
  binId: z.string(),
  sku: z.string(),
  kind: z.string(),
  delta: z.number(),
  quantityBefore: z.number(),
  quantityAfter: z.number(),
  reason: z.string().nullable(),
  actor: z.string().nullable(),
  createdAt: z.string()
});

const warehouseListSchema = z.object({ warehouses: z.array(warehouseSchema) });
const binListSchema = z.object({ bins: z.array(binSchema) });
const purchaseOrderListSchema = z.object({ purchaseOrders: z.array(purchaseOrderSchema) });
const pickTaskListSchema = z.object({ pickTasks: z.array(pickTaskSchema) });
const stocktakeListSchema = z.object({ stocktakes: z.array(stocktakeSchema) });
const stockMovementListSchema = z.object({ movements: z.array(stockMovementSchema) });

export interface HttpWmsClientOptions {
  readonly targets: MedusaTargetStore;
  readonly keys: MedusaAdminKeyStore;
  readonly transport: WmsTransport;
  readonly logger: Logger;
}

export class HttpWmsClient implements WmsClient {
  readonly #options: HttpWmsClientOptions;

  constructor(options: HttpWmsClientOptions) {
    this.#options = options;
  }

  /**
   * One authenticated request against the tenant's instance.
   *
   * The credential is a Medusa secret API key over HTTP Basic — a secret sent as Bearer is rejected
   * (ADR 0012). `tenantId` selects the target and is never forwarded: the instance already is that
   * tenant, so there is no tenant header to forget.
   */
  async #request(tenantId: TenantId, path: string, init: RequestInit): Promise<unknown> {
    const target = await this.#options.targets.get(tenantId);
    if (target === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no reachable commerce engine.", {
        details: { tenantId }
      });
    }

    const secretKey = await this.#options.keys.get(tenantId);
    if (secretKey === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no Medusa admin credential.", {
        details: { tenantId }
      });
    }

    const credential = Buffer.from(`${secretKey}:`, "utf8").toString("base64");
    let response;
    try {
      response = await this.#options.transport(`${target.baseUrl}${path}`, {
        ...init,
        headers: {
          authorization: `Basic ${credential}`,
          "content-type": "application/json",
          ...(init.headers ?? {})
        }
      });
    } catch (error) {
      this.#options.logger.error("wms.transport_failed", {
        tenantId,
        path,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      throw new PlatformError("UPSTREAM_ERROR", "Could not reach the tenant's commerce engine.", {
        retryable: true,
        details: { tenantId }
      });
    }

    const text = await response.text();
    const body: unknown = text === "" ? null : safeJson(text);

    if (!response.ok) {
      // Medusa's own error body carries a human message the seller needs — "no single storage bin
      // holds 3 of SKU-1" is the actionable part of a failed pick, and replacing it with a generic
      // string would hide the one thing the picker has to act on. It is still not trusted as a
      // status: the status decides the code.
      const message = vendorMessage(body) ?? `The tenant's commerce engine failed with status ${response.status}.`;

      if (response.status === 404) {
        throw new PlatformError("NOT_FOUND", message, { details: { tenantId } });
      }
      if (response.status === 400 || response.status === 422) {
        throw new PlatformError("VALIDATION_FAILED", message, { details: { tenantId } });
      }
      // A 401 or 403 here is our own key being wrong or under-privileged, never the seller's fault,
      // so it must not read as a permission error the seller could act on.
      this.#options.logger.warn("wms.upstream_failed", { tenantId, path, status: response.status });
      throw new PlatformError("UPSTREAM_ERROR", "The tenant's commerce engine rejected the request.", {
        retryable: response.status >= 500,
        details: { tenantId, status: response.status }
      });
    }

    if (body === null) {
      throw new PlatformError("UPSTREAM_ERROR", "The tenant's commerce engine returned an empty body.", {
        retryable: false,
        details: { tenantId, path }
      });
    }
    return body;
  }

  async #get<T>(tenantId: TenantId, path: string, schema: z.ZodType<T>): Promise<T> {
    return parseOrUpstream(await this.#request(tenantId, path, { method: "GET" }), schema, tenantId, path);
  }

  async #post<T>(tenantId: TenantId, path: string, payload: unknown, schema: z.ZodType<T>): Promise<T> {
    return parseOrUpstream(
      await this.#request(tenantId, path, { method: "POST", body: JSON.stringify(payload) }),
      schema,
      tenantId,
      path
    );
  }

  async listWarehouses(tenantId: TenantId): Promise<readonly Warehouse[]> {
    return (await this.#get(tenantId, "/admin/wms/warehouses", warehouseListSchema)).warehouses;
  }

  async listBins(tenantId: TenantId, warehouseId?: string): Promise<readonly Bin[]> {
    const query = warehouseId === undefined ? "" : `?warehouseId=${encodeURIComponent(warehouseId)}`;
    return (await this.#get(tenantId, `/admin/wms/bins${query}`, binListSchema)).bins;
  }

  async getBinContents(tenantId: TenantId, binId: string): Promise<BinContents> {
    return this.#get(tenantId, `/admin/wms/bins/${encodeURIComponent(binId)}/contents`, binContentsSchema);
  }

  async listPurchaseOrders(tenantId: TenantId, warehouseId?: string): Promise<readonly PurchaseOrder[]> {
    const query = warehouseId === undefined ? "" : `?warehouseId=${encodeURIComponent(warehouseId)}`;
    return (await this.#get(tenantId, `/admin/wms/purchase-orders${query}`, purchaseOrderListSchema))
      .purchaseOrders;
  }

  async listPickTasks(
    tenantId: TenantId,
    filter: { readonly warehouseId?: string; readonly status?: string } = {}
  ): Promise<readonly PickTask[]> {
    const query = new URLSearchParams();
    if (filter.warehouseId !== undefined) query.set("warehouseId", filter.warehouseId);
    if (filter.status !== undefined) query.set("status", filter.status);
    const suffix = query.size === 0 ? "" : `?${query.toString()}`;
    return (await this.#get(tenantId, `/admin/wms/pick-tasks${suffix}`, pickTaskListSchema)).pickTasks;
  }

  async listStocktakes(
    tenantId: TenantId,
    filter: { readonly warehouseId?: string; readonly status?: string } = {}
  ): Promise<readonly Stocktake[]> {
    const query = new URLSearchParams();
    if (filter.warehouseId !== undefined) query.set("warehouseId", filter.warehouseId);
    if (filter.status !== undefined) query.set("status", filter.status);
    const suffix = query.size === 0 ? "" : `?${query.toString()}`;
    return (await this.#get(tenantId, `/admin/wms/stocktakes${suffix}`, stocktakeListSchema)).stocktakes;
  }

  async listStockMovements(
    tenantId: TenantId,
    filter: { readonly binId: string; readonly sku?: string }
  ): Promise<readonly StockMovement[]> {
    const query = new URLSearchParams({ binId: filter.binId });
    if (filter.sku !== undefined) query.set("sku", filter.sku);
    return (await this.#get(tenantId, `/admin/wms/stock-movements?${query.toString()}`, stockMovementListSchema))
      .movements;
  }

  async createWarehouse(input: {
    readonly tenantId: TenantId;
    readonly name: string;
    readonly stockLocationId?: string | null;
  }): Promise<Warehouse> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/warehouses",
      { name: input.name, stockLocationId: input.stockLocationId ?? null },
      z.object({ warehouse: warehouseSchema })
    );
    return body.warehouse;
  }

  async createBin(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly code: string;
    readonly kind: BinKind;
  }): Promise<Bin> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/bins",
      { warehouseId: input.warehouseId, code: input.code, kind: input.kind },
      z.object({ bin: binSchema })
    );
    return body.bin;
  }

  async createPurchaseOrder(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly supplierReference?: string | null;
    readonly expectedAt?: string | null;
    readonly lines: readonly { readonly sku: string; readonly title: string; readonly orderedQuantity: number }[];
  }): Promise<PurchaseOrder> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/purchase-orders",
      {
        warehouseId: input.warehouseId,
        supplierReference: input.supplierReference ?? null,
        expectedAt: input.expectedAt ?? null,
        lines: input.lines
      },
      // The create route answers with a narrower shape than the list route (it has no
      // `receivedQuantity` yet), so it is read as a PO with empty lines and the created lines filled
      // in from the response. The seller's screen re-reads the list, which is the authoritative view.
      z.object({
        purchaseOrder: z.object({
          id: z.string(),
          warehouseId: z.string(),
          status: z.string(),
          lines: z.array(z.object({ id: z.string(), sku: z.string(), orderedQuantity: z.number() }))
        })
      })
    );
    return {
      id: body.purchaseOrder.id,
      warehouseId: body.purchaseOrder.warehouseId,
      supplierReference: input.supplierReference ?? null,
      status: body.purchaseOrder.status,
      receivedAt: null,
      lines: body.purchaseOrder.lines.map((line) => ({
        id: line.id,
        sku: line.sku,
        title: input.lines.find((candidate) => candidate.sku === line.sku)?.title ?? line.sku,
        orderedQuantity: line.orderedQuantity,
        receivedQuantity: 0
      }))
    };
  }

  async receivePurchaseOrder(input: {
    readonly tenantId: TenantId;
    readonly purchaseOrderId: string;
    readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
    readonly actor: string | null;
  }): Promise<{ readonly purchaseOrderId: string; readonly stagingBinId: string; readonly status: string }> {
    const body = await this.#post(
      input.tenantId,
      `/admin/wms/purchase-orders/${encodeURIComponent(input.purchaseOrderId)}/receive`,
      { lines: input.lines, actor: input.actor },
      z.object({
        receipt: z.object({
          purchaseOrderId: z.string(),
          stagingBinId: z.string(),
          status: z.string()
        })
      })
    );
    return body.receipt;
  }

  async putAway(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly fromBinId: string;
    readonly toBinId: string;
    readonly sku: string;
    readonly quantity: number;
    readonly actor: string | null;
  }): Promise<{ readonly fromBinId: string; readonly toBinId: string; readonly sku: string; readonly quantity: number }> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/put-away",
      {
        warehouseId: input.warehouseId,
        fromBinId: input.fromBinId,
        toBinId: input.toBinId,
        sku: input.sku,
        quantity: input.quantity,
        actor: input.actor
      },
      z.object({
        putAway: z.object({
          fromBinId: z.string(),
          toBinId: z.string(),
          sku: z.string(),
          quantity: z.number()
        })
      })
    );
    return body.putAway;
  }

  async createPickTask(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly orderId: string;
    readonly packingBinId: string;
    readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  }): Promise<PickTask> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/pick-tasks",
      {
        warehouseId: input.warehouseId,
        orderId: input.orderId,
        packingBinId: input.packingBinId,
        lines: input.lines
      },
      z.object({
        pickTask: z.object({
          pickTaskId: z.string(),
          orderId: z.string(),
          packingBinId: z.string(),
          lines: z.array(
            z.object({
              id: z.string(),
              sku: z.string(),
              quantity: z.number(),
              binId: z.string().nullable(),
              expectedBarcode: z.string().nullable()
            })
          )
        })
      })
    );
    return {
      id: body.pickTask.pickTaskId,
      warehouseId: input.warehouseId,
      orderId: body.pickTask.orderId,
      packingBinId: body.pickTask.packingBinId,
      status: "open",
      completedAt: null,
      lines: body.pickTask.lines.map((line) => ({
        id: line.id,
        sku: line.sku,
        quantity: line.quantity,
        binId: line.binId,
        pickedBinId: null,
        expectedBarcode: line.expectedBarcode,
        scannedBarcode: null,
        pickedQuantity: 0
      }))
    };
  }

  async scanPickLine(input: {
    readonly tenantId: TenantId;
    readonly pickTaskId: string;
    readonly sku: string;
    readonly barcode: string;
    readonly quantity: number;
    readonly actor: string | null;
  }): Promise<{ readonly pickTaskId: string; readonly sku: string; readonly picked: number; readonly status: string }> {
    const body = await this.#post(
      input.tenantId,
      `/admin/wms/pick-tasks/${encodeURIComponent(input.pickTaskId)}/scans`,
      { sku: input.sku, barcode: input.barcode, quantity: input.quantity, actor: input.actor },
      z.object({
        scan: z.object({
          pickTaskId: z.string(),
          sku: z.string(),
          picked: z.number(),
          status: z.string()
        })
      })
    );
    return body.scan;
  }

  async openStocktake(input: {
    readonly tenantId: TenantId;
    readonly warehouseId: string;
    readonly binId: string;
    readonly sku: string;
  }): Promise<{ readonly stocktakeId: string; readonly systemQuantity: number }> {
    const body = await this.#post(
      input.tenantId,
      "/admin/wms/stocktakes",
      { warehouseId: input.warehouseId, binId: input.binId, sku: input.sku },
      z.object({
        stocktake: z.object({ stocktakeId: z.string(), systemQuantity: z.number() })
      })
    );
    return body.stocktake;
  }

  async applyStocktake(input: {
    readonly tenantId: TenantId;
    readonly stocktakeId: string;
    readonly countedQuantity: number;
    readonly countedBy: string | null;
  }): Promise<Stocktake> {
    const body = await this.#post(
      input.tenantId,
      `/admin/wms/stocktakes/${encodeURIComponent(input.stocktakeId)}/apply`,
      { countedQuantity: input.countedQuantity, countedBy: input.countedBy },
      z.object({
        stocktake: z.object({
          stocktakeId: z.string(),
          warehouseId: z.string(),
          sku: z.string(),
          binId: z.string(),
          systemQuantity: z.number(),
          countedQuantity: z.number(),
          variance: z.number(),
          quantityAfter: z.number()
        })
      })
    );
    // The apply route answers with the applied correction, not the stored row: the seller's screen
    // re-reads the stocktake list for the row, and this shape is what the immediate confirmation
    // needs (system vs counted vs the variance that was applied).
    return {
      id: body.stocktake.stocktakeId,
      warehouseId: body.stocktake.warehouseId,
      binId: body.stocktake.binId,
      sku: body.stocktake.sku,
      systemQuantity: body.stocktake.systemQuantity,
      countedQuantity: body.stocktake.countedQuantity,
      variance: body.stocktake.variance,
      status: "applied",
      countedBy: input.countedBy,
      appliedAt: null
    };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Medusa's error body carries the human message; anything else is left to the status. */
function vendorMessage(body: unknown): string | null {
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === "string" && message !== "" ? message : null;
}

/**
 * A response we cannot read is an upstream fault, not an empty result.
 *
 * Collapsing a schema mismatch into "no rows" is exactly how a renamed field becomes a silently
 * empty warehouse list, so a parse failure is `UPSTREAM_ERROR` naming the path.
 */
function parseOrUpstream<T>(body: unknown, schema: z.ZodType<T>, tenantId: TenantId, path: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new PlatformError("UPSTREAM_ERROR", "The tenant's commerce engine returned an unexpected shape.", {
      retryable: false,
      details: { tenantId, path, issues: parsed.error.issues }
    });
  }
  return parsed.data;
}
