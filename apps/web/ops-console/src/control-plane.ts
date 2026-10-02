/**
 * The one place the operator console talks to the control plane (ADR 0019).
 *
 * Server-side only, same shape as the seller UI (ADR 0017): the session token lives in an httpOnly
 * cookie and is forwarded as a bearer header, so the browser never holds it. Every call here is on
 * the `ops:*` surface, which only an `operator` credential can reach.
 *
 * The distinction that matters on this side: an impersonation token is a *seller* session, and it is
 * kept in its own cookie rather than the operator one. The operator's session stays put so the
 * console can keep calling `ops:*` routes while it acts for a tenant; the impersonation cookie is
 * written with the impersonation's own expiry, so the browser drops it at the same moment the
 * control plane stops honouring the token. Two independent time-boxes, and the shorter one wins.
 */

export interface TenantSummary {
  readonly id: string;
  readonly slug: string;
  readonly displayName: string;
  readonly plan: string;
  readonly region: string;
  readonly state: string;
}

export interface ImpersonationSession {
  readonly token: string;
  readonly role: string;
  readonly tenantId: string;
  readonly expiresAt: string;
  readonly tenant: { readonly id: string; readonly displayName: string };
  readonly actor: { readonly accountId: string; readonly email: string };
}

export interface ImpersonationRecord {
  readonly id: string;
  readonly actorAccountId: string;
  readonly actorEmail: string;
  readonly tenantId: string;
  readonly startedAt: string;
  readonly expiresAt: string;
}

export interface TenantDetail {
  readonly tenant: TenantSummary & { readonly schemaName: string; readonly createdAt: string };
  readonly provisioning: { readonly status: string } | null;
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

export interface Session {
  readonly token: string;
  readonly role: string;
  readonly tenantId: string | null;
  readonly expiresAt: string;
}

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: "unauthenticated"; readonly message: string }
  | { readonly ok: false; readonly kind: "failed"; readonly status: number; readonly message: string };

function controlPlaneBaseUrl(): string {
  const base = process.env.CONTROL_PLANE_BASE_URL;
  if (base === undefined || base === "") {
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

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${controlPlaneBaseUrl()}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
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
    return {
      ok: false,
      kind: "failed",
      status: response.status,
      message: errorMessage(body, "Invalid email or password.")
    };
  }
  return { ok: true, value: body as Session };
}

export function listTenants(token: string): Promise<ApiResult<{ readonly tenants: readonly TenantSummary[] }>> {
  return request(token, "/v1/tenants");
}

/**
 * Opens an audited impersonation for one tenant.
 *
 * The control plane mints the session and writes the audit record before returning, so a success
 * here means the act is already recorded. The console does not write its own copy: two records that
 * can disagree are worse than one that cannot.
 */
export function impersonate(token: string, tenantId: string): Promise<ApiResult<ImpersonationSession>> {
  return request<ImpersonationSession>(token, "/v1/ops/impersonate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tenantId })
  });
}

export function listImpersonations(
  token: string,
  tenantId?: string
): Promise<ApiResult<{ readonly impersonations: readonly ImpersonationRecord[] }>> {
  const query = tenantId === undefined ? "" : `?tenantId=${encodeURIComponent(tenantId)}`;
  return request(token, `/v1/ops/impersonations${query}`);
}

export function getTenant(token: string, tenantId: string): Promise<ApiResult<TenantDetail>> {
  return request<TenantDetail>(token, `/v1/tenants/${encodeURIComponent(tenantId)}`);
}

/**
 * The seller-facing reads, taken with an impersonation token rather than the operator's.
 *
 * These are the *seller* routes on purpose. Support sees exactly what the seller sees — the same
 * projection, the same tenant scoping — so an operator cannot be shown a field a seller is not. The
 * impersonated session is a `seller_viewer`, so these calls are read-only by construction.
 */
export function getImpersonatedSyncHealth(token: string): Promise<ApiResult<{ readonly channels: readonly SyncChannel[] }>> {
  return request(token, "/v1/sync/health");
}

export function listImpersonatedOrders(
  token: string
): Promise<ApiResult<{ readonly orders: readonly unknown[]; readonly total: number }>> {
  return request(token, "/v1/seller/orders");
}
