/**
 * Identity contracts: our own accounts, roles, and sessions.
 *
 * This is deliberately **not** Medusa's auth. Tenants, plans, and operators belong to the
 * platform, and the tenant data plane is a black box we do not authenticate against
 * (ADR 0001, docs/ARCHITECTURE.md §2).
 */

import type { Instant, TenantId } from "./ids.ts";

export type UserId = string;

export type SessionToken = string;

/**
 * Platform-level roles. A seller staff member gets `seller_*`; our own staff get `operator`.
 *
 * `operator` is intentionally the only cross-tenant role. Everything else is scoped to exactly
 * one tenant, and the control plane asserts that scope on every request.
 */
export const ROLES = ["seller_owner", "seller_staff", "seller_viewer", "operator"] as const;

export type Role = (typeof ROLES)[number];

/** Capabilities are coarse on purpose. Fine-grained permissions can be layered on later. */
export const CAPABILITIES = [
  "tenant:read",
  "tenant:create",
  "tenant:update",
  "tenant:terminate",
  "channel:read",
  "channel:connect",
  "channel:disconnect",
  "order:read",
  "order:write",
  "stock:write",
  "user:invite",
  "user:remove",
  // Operator-only. Kept out of every `seller_*` role so the ops surface is unreachable with a
  // seller credential, which is the M5 criterion stated as a capability rather than a convention.
  "ops:read",
  "ops:impersonate"
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/**
 * Role to capability mapping. Kept as data rather than branching logic so that a change is
 * reviewable in one place and testable without a request.
 */
export const ROLE_CAPABILITIES: Readonly<Record<Role, readonly Capability[]>> = {
  seller_owner: [
    "tenant:read",
    "tenant:update",
    "channel:read",
    "channel:connect",
    "channel:disconnect",
    "order:read",
    "order:write",
    "stock:write",
    "user:invite",
    "user:remove"
  ],
  seller_staff: ["tenant:read", "channel:read", "order:read", "order:write", "stock:write"],
  seller_viewer: ["tenant:read", "channel:read", "order:read"],
  // Operators can read, create and terminate, but they can never act inside a tenant's commerce
  // data. Those are seller capabilities, and holding them would make operator actions unauditable.
  operator: ["tenant:read", "tenant:create", "tenant:terminate", "ops:read", "ops:impersonate"]
};

export function capabilitiesFor(role: Role): readonly Capability[] {
  return ROLE_CAPABILITIES[role];
}

export function roleHasCapability(role: Role, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export interface Account {
  readonly id: UserId;
  readonly email: string;
  readonly displayName: string;
  /**
   * The single tenant a seller account belongs to. `null` only for `operator` accounts, which
   * exist above tenancy rather than inside it.
   */
  readonly tenantId: TenantId | null;
  readonly role: Role;
  readonly createdAt: Instant;
  /** Set when access is revoked without deleting the account, so history stays readable. */
  readonly disabledAt: Instant | null;
}

export interface Session {
  readonly token: SessionToken;
  readonly accountId: UserId;
  readonly tenantId: TenantId | null;
  readonly role: Role;
  readonly issuedAt: Instant;
  readonly expiresAt: Instant;
  /**
   * Set when this session was minted by an operator impersonating a tenant (ADR 0019). The actor
   * is named here so every action taken through the session is attributable to a person, not to
   * the tenant's own staff — an impersonated session that looked ordinary would make support
   * actions indistinguishable from a seller's, which is exactly what the M5 criterion forbids.
   */
  readonly impersonation: Impersonation | null;
}

/** Who is acting through an impersonated session, and under whose authority. */
export interface Impersonation {
  readonly actorAccountId: UserId;
  readonly actorEmail: string;
}

/**
 * How long an impersonated session lives.
 *
 * Deliberately far shorter than a normal session: support needs to look at one tenant now, not to
 * hold a standing key. Time-boxing is the control that makes an impersonation a bounded act, and it
 * is enforced by the session's own expiry rather than by a sweeper that could fail silently.
 */
export const DEFAULT_IMPERSONATION_TTL_SECONDS = 30 * 60;
