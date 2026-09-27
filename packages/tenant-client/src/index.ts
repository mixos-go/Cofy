import type { TenantId } from "@platform/contracts";

/**
 * The single permitted path to tenant data (AGENTS.md §2.3).
 *
 * No other component may hold credentials for, or issue queries against, a tenant's schema.
 * The implementation lands in M1; this file fixes the boundary that everything else depends on.
 */

/** A resolved route to one tenant's data plane. */
export interface TenantConnection {
  readonly tenantId: TenantId;
  /** Schema name for this tenant. Never constructed from user input without validation. */
  readonly schema: string;
}

export interface TenantClient {
  /** Resolve a tenant to its connection. Throws TENANT_NOT_FOUND when it does not exist. */
  resolve(tenantId: TenantId): Promise<TenantConnection>;

  /** Run a function with a scoped handle to one tenant. The handle must not leak outside. */
  withTenant<T>(tenantId: TenantId, fn: (connection: TenantConnection) => Promise<T>): Promise<T>;
}

/**
 * Guard against a schema name that could escape its tenant.
 *
 * Schema-per-tenant means the schema name reaches SQL identifiers, where parameters cannot be
 * used. Validating the shape is the only safe way to avoid injection.
 */
export function assertValidSchemaName(schema: string): void {
  if (!/^tenant_[a-z0-9_]{1,60}$/.test(schema)) {
    throw new Error(
      `Refusing to use schema name '${schema}': expected ^tenant_[a-z0-9_]{1,60}$.`
    );
  }
}
