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

export interface OrderDetail extends OrderSummary {
  readonly lines: readonly OrderLine[];
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
async function request<T>(token: string, path: string): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${controlPlaneBaseUrl()}${path}`, {
      headers: { authorization: `Bearer ${token}` },
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
