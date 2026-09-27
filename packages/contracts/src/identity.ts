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
  "channel:connect",
  "channel:disconnect",
  "order:read",
  "order:write",
  "stock:write",
  "user:invite",
  "user:remove"
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
    "channel:connect",
    "channel:disconnect",
    "order:read",
    "order:write",
    "stock:write",
    "user:invite",
    "user:remove"
  ],
  seller_staff: ["tenant:read", "order:read", "order:write", "stock:write"],
  seller_viewer: ["tenant:read", "order:read"],
  // Operators can read, create and terminate, but they can never act inside a tenant's commerce
  // data. Those are seller capabilities, and holding them would make operator actions unauditable.
  operator: ["tenant:read", "tenant:create", "tenant:terminate"]
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
}
