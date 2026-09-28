import type { TenantId } from "./ids.ts";

/**
 * Where a tenant's commerce engine lives, as the worker needs to reach it (ADR 0012).
 *
 * `baseUrl` is the tenant's Medusa Admin API. The admin credential is deliberately **not** here:
 * it lives in `MedusaAdminKeyStore` (packages/secrets), so a target can be listed, logged or
 * cached without ever carrying the secret.
 *
 * In production `baseUrl` must be `https`. The worker refuses to send the credential in clear
 * (ADR 0012 point 6), so a plain-http target is a configuration error rather than a silent
 * downgrade.
 */
export interface MedusaTarget {
  readonly tenantId: TenantId;
  readonly baseUrl: string;
}

/**
 * Reads a tenant's Medusa target.
 *
 * The worker asks the control plane for this before it can call a tenant (ADR 0010: per-tenant
 * configuration lives in the control plane). Returning `null` means the tenant has no reachable
 * engine, which the worker must treat as a hard failure — never as "use the default".
 */
export interface MedusaTargetStore {
  get(tenantId: TenantId): Promise<MedusaTarget | null>;
  set(target: MedusaTarget): Promise<void>;
  /** Clear a tenant's target, so termination leaves it unresolvable rather than pointing at a host. */
  delete(tenantId: TenantId): Promise<void>;
}
