/**
 * The one place the seller UI talks to the control plane (ADR 0017).
 *
 * Server-side only. The session token is read from an httpOnly cookie and forwarded as a bearer
 * header, so the browser never holds it, never sends it, and no CORS policy is needed. That is why
 * every read here runs in a Server Component rather than in the browser.
 *
 * Failures are returned as a discriminated union instead of thrown, because every caller has to
 * render *something* for them: an expired session is a redirect, a missing order is a message, and a
 * control plane that is down is a different message. Throwing would push that decision to each page
 * and let one of them forget it.
 */

export interface OrderSummary {
  readonly orderId: string;
  readonly displayId: number | null;
  readonly status: string;
  /** Medusa's own fulfillment state, so the list shows delivery progress without a second read. */
  readonly fulfillmentStatus: string | null;
  readonly channel: string | null;
  readonly externalOrderId: string | null;
  readonly email: string | null;
  /** Integer sen. Converted only at the display boundary. */
  readonly total: { readonly amount: number; readonly currency: string } | null;
  readonly itemCount: number;
  readonly placedAt: string;
  readonly updatedAt: string;
}

export interface OrderLine {
  readonly title: string;
  readonly sku: string | null;
  readonly quantity: number;
  readonly unitPrice: { readonly amount: number; readonly currency: string } | null;
}

/** One tracking event on a shipment, as the track pass recorded it (docs/adr/0021). */
export interface ShipmentEvent {
  readonly status: string;
  readonly occurredAt: string;
  readonly description: string;
}

/**
 * A shipment on an order (docs/PLAN.md M7).
 *
 * The fulfillment *is* the shipment record, so this rides on the order detail rather than a route of
 * its own. `arrangement` says who booked the waybill — the marketplace or one of our couriers — and
 * `status` is the courier-neutral delivery status the track pass writes.
 */
export interface Shipment {
  readonly fulfillmentId: string;
  readonly trackingNumber: string | null;
  readonly trackingUrl: string | null;
  readonly labelUrl: string | null;
  readonly courier: string | null;
  readonly serviceLevel: string | null;
  readonly arrangement: "channel" | "courier" | null;
  readonly status: string;
  readonly events: readonly ShipmentEvent[];
  readonly shippedAt: string | null;
  readonly deliveredAt: string | null;
}

export interface OrderDetail extends OrderSummary {
  readonly lines: readonly OrderLine[];
  readonly shipments: readonly Shipment[];
}

export interface OrderPage {
  readonly orders: readonly OrderSummary[];
  readonly total: number;
  readonly offset: number;
}

export interface SyncProblem {
  readonly externalOrderId: string;
  readonly kind: string;
  readonly since: string;
  readonly explanation: string;
}

export interface SyncChannel {
  readonly channel: string;
  readonly unresolved: number;
  readonly observedAt: string;
  readonly problems: readonly SyncProblem[];
}

export interface SyncHealth {
  readonly channels: readonly SyncChannel[];
}

/** One connected channel, as the control plane projects it. No credential ever appears here. */
export interface ChannelConnection {
  readonly tenantId: string;
  readonly channel: string;
  readonly expiresAt: string | null;
  readonly context: Readonly<Record<string, string>>;
}

export interface ChannelList {
  readonly tenantId: string;
  readonly connections: readonly ChannelConnection[];
  /** Every channel the platform serves, connected or not, so the screen never infers absence. */
  readonly availableChannels: readonly string[];
}

export interface ChannelAuthorization {
  readonly authorizeUrl: string;
  readonly expiresAt: string;
}

export interface Session {
  readonly token: string;
  readonly role: string;
  readonly tenantId: string | null;
  readonly expiresAt: string;
}

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  // `unauthenticated` is separated from the other failures because it is the only one the caller
  // answers with a redirect rather than a message.
  | { readonly ok: false; readonly kind: "unauthenticated"; readonly message: string }
  | { readonly ok: false; readonly kind: "failed"; readonly status: number; readonly message: string };

function controlPlaneBaseUrl(): string {
  const base = process.env.CONTROL_PLANE_BASE_URL;
  if (base === undefined || base === "") {
    // A missing base URL is a deployment mistake, not a seller-facing condition. Failing loudly at
    // the first request beats rendering an empty order list that looks like "no orders".
    throw new Error("CONTROL_PLANE_BASE_URL is not set.");
  }
  return base.replace(/\/$/, "");
}

function errorMessage(body: unknown, fallback: string): string {
  const message = (body as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message !== "" ? message : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * A session-bearing request. `token` is always the cookie value, never something a page supplies.
 */
async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${controlPlaneBaseUrl()}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      // Seller reads are live operational data. Caching them would show a seller a stale status
      // during exactly the incident where the status matters.
      cache: "no-store"
    });
  } catch {
    return { ok: false, kind: "failed", status: 0, message: "The control plane could not be reached." };
  }

  const body = await readJson(response);

  if (response.status === 401) {
    return { ok: false, kind: "unauthenticated", message: errorMessage(body, "Your session has expired.") };
  }
  if (!response.ok) {
    return {
      ok: false,
      kind: "failed",
      status: response.status,
      message: errorMessage(body, "The request failed.")
    };
  }
  return { ok: true, value: body as T };
}

/** Exchanges credentials for a session. The only unauthenticated call the UI makes. */
export async function login(email: string, password: string): Promise<ApiResult<Session>> {
  let response: Response;
  try {
    response = await fetch(`${controlPlaneBaseUrl()}/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store"
    });
  } catch {
    return { ok: false, kind: "failed", status: 0, message: "The control plane could not be reached." };
  }

  const body = await readJson(response);
  if (!response.ok) {
    // A wrong password is not an expired session, so it must not trigger the redirect path.
    return {
      ok: false,
      kind: "failed",
      status: response.status,
      message: errorMessage(body, "Invalid email or password.")
    };
  }
  return { ok: true, value: body as Session };
}

export function listOrders(
  token: string,
  options: { readonly limit?: number; readonly offset?: number } = {}
): Promise<ApiResult<OrderPage>> {
  const query = new URLSearchParams();
  query.set("limit", String(options.limit ?? 20));
  query.set("offset", String(options.offset ?? 0));
  return request<OrderPage>(token, `/v1/seller/orders?${query.toString()}`);
}

export function getOrder(token: string, orderId: string): Promise<ApiResult<OrderDetail>> {
  return request<OrderDetail>(token, `/v1/seller/orders/${encodeURIComponent(orderId)}`);
}

export function getSyncHealth(token: string): Promise<ApiResult<SyncHealth>> {
  return request<SyncHealth>(token, "/v1/sync/health");
}

export function listChannels(token: string): Promise<ApiResult<ChannelList>> {
  return request<ChannelList>(token, "/v1/seller/channels");
}

/**
 * Begins a channel authorization and returns the marketplace URL to send the browser to.
 *
 * The state the control plane issues is single-use and short-lived, and it is the only thing tying
 * the callback back to this tenant. The UI does not hold it beyond the redirect.
 */
export function connectChannel(token: string, channel: string): Promise<ApiResult<ChannelAuthorization>> {
  return request<ChannelAuthorization>(token, `/v1/seller/channels/${encodeURIComponent(channel)}/connect`, {
    method: "POST"
  });
}

export function disconnectChannel(
  token: string,
  channel: string
): Promise<ApiResult<{ readonly disconnected: boolean; readonly channel: string }>> {
  return request(token, `/v1/seller/channels/${encodeURIComponent(channel)}/disconnect`, {
    method: "POST"
  });
}

// --- The warehouse surface (docs/PLAN.md M6, ADR 0018). The shapes mirror the control plane's
// projection, which is what a seller may see — not the tenant instance's own response, which carries
// fields the seller has no business with. ---

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

export function listWarehouses(token: string): Promise<ApiResult<{ readonly warehouses: readonly Warehouse[] }>> {
  return request(token, "/v1/seller/wms/warehouses");
}

export function listBins(
  token: string,
  warehouseId?: string
): Promise<ApiResult<{ readonly bins: readonly Bin[] }>> {
  const query = warehouseId === undefined ? "" : `?warehouseId=${encodeURIComponent(warehouseId)}`;
  return request(token, `/v1/seller/wms/bins${query}`);
}

export function getBinContents(token: string, binId: string): Promise<ApiResult<BinContents>> {
  return request(token, `/v1/seller/wms/bins/${encodeURIComponent(binId)}/contents`);
}

export function listStockMovements(
  token: string,
  binId: string,
  sku?: string
): Promise<ApiResult<{ readonly movements: readonly StockMovement[] }>> {
  const query = new URLSearchParams({ binId });
  if (sku !== undefined && sku !== "") query.set("sku", sku);
  return request(token, `/v1/seller/wms/stock-movements?${query.toString()}`);
}

export function listPurchaseOrders(
  token: string,
  warehouseId?: string
): Promise<ApiResult<{ readonly purchaseOrders: readonly PurchaseOrder[] }>> {
  const query = warehouseId === undefined ? "" : `?warehouseId=${encodeURIComponent(warehouseId)}`;
  return request(token, `/v1/seller/wms/purchase-orders${query}`);
}

export function listPickTasks(
  token: string,
  filter: { readonly warehouseId?: string; readonly status?: string } = {}
): Promise<ApiResult<{ readonly pickTasks: readonly PickTask[] }>> {
  const query = new URLSearchParams();
  if (filter.warehouseId !== undefined && filter.warehouseId !== "") query.set("warehouseId", filter.warehouseId);
  if (filter.status !== undefined && filter.status !== "") query.set("status", filter.status);
  const suffix = query.size === 0 ? "" : `?${query.toString()}`;
  return request(token, `/v1/seller/wms/pick-tasks${suffix}`);
}

export function listStocktakes(
  token: string,
  filter: { readonly warehouseId?: string; readonly status?: string } = {}
): Promise<ApiResult<{ readonly stocktakes: readonly Stocktake[] }>> {
  const query = new URLSearchParams();
  if (filter.warehouseId !== undefined && filter.warehouseId !== "") query.set("warehouseId", filter.warehouseId);
  if (filter.status !== undefined && filter.status !== "") query.set("status", filter.status);
  const suffix = query.size === 0 ? "" : `?${query.toString()}`;
  return request(token, `/v1/seller/wms/stocktakes${suffix}`);
}

export function createWarehouse(
  token: string,
  input: { readonly name: string; readonly stockLocationId?: string | null }
): Promise<ApiResult<{ readonly warehouse: Warehouse }>> {
  return request(token, "/v1/seller/wms/warehouses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function createBin(
  token: string,
  input: { readonly warehouseId: string; readonly code: string; readonly kind: BinKind }
): Promise<ApiResult<{ readonly bin: Bin }>> {
  return request(token, "/v1/seller/wms/bins", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function createPurchaseOrder(
  token: string,
  input: {
    readonly warehouseId: string;
    readonly supplierReference?: string | null;
    readonly expectedAt?: string | null;
    readonly lines: readonly { readonly sku: string; readonly title: string; readonly orderedQuantity: number }[];
  }
): Promise<ApiResult<{ readonly purchaseOrder: PurchaseOrder }>> {
  return request(token, "/v1/seller/wms/purchase-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function receivePurchaseOrder(
  token: string,
  purchaseOrderId: string,
  lines: readonly { readonly sku: string; readonly quantity: number }[]
): Promise<ApiResult<{ readonly receipt: { readonly purchaseOrderId: string; readonly stagingBinId: string; readonly status: string } }>> {
  return request(token, `/v1/seller/wms/purchase-orders/${encodeURIComponent(purchaseOrderId)}/receive`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ lines })
  });
}

export function putAway(
  token: string,
  input: {
    readonly warehouseId: string;
    readonly fromBinId: string;
    readonly toBinId: string;
    readonly sku: string;
    readonly quantity: number;
  }
): Promise<ApiResult<{ readonly putAway: { readonly fromBinId: string; readonly toBinId: string; readonly sku: string; readonly quantity: number } }>> {
  return request(token, "/v1/seller/wms/put-away", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function createPickTask(
  token: string,
  input: {
    readonly warehouseId: string;
    readonly orderId: string;
    readonly packingBinId: string;
    readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  }
): Promise<ApiResult<{ readonly pickTask: PickTask }>> {
  return request(token, "/v1/seller/wms/pick-tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function scanPickLine(
  token: string,
  pickTaskId: string,
  input: { readonly sku: string; readonly barcode: string; readonly quantity: number }
): Promise<ApiResult<{ readonly scan: { readonly pickTaskId: string; readonly sku: string; readonly picked: number; readonly status: string } }>> {
  return request(token, `/v1/seller/wms/pick-tasks/${encodeURIComponent(pickTaskId)}/scans`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function openStocktake(
  token: string,
  input: { readonly warehouseId: string; readonly binId: string; readonly sku: string }
): Promise<ApiResult<{ readonly stocktake: { readonly stocktakeId: string; readonly systemQuantity: number } }>> {
  return request(token, "/v1/seller/wms/stocktakes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });
}

export function applyStocktake(
  token: string,
  stocktakeId: string,
  countedQuantity: number
): Promise<ApiResult<{ readonly stocktake: Stocktake }>> {
  return request(token, `/v1/seller/wms/stocktakes/${encodeURIComponent(stocktakeId)}/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ countedQuantity })
  });
}
