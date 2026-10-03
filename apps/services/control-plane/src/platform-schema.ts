/**
 * The platform bookkeeping schema and its name guard.
 *
 * Platform tables (tenant registry, sync state, rate-shopping rules) live in one Postgres schema
 * the control plane owns, never in a tenant's schema. The schema name reaches SQL as an identifier,
 * which cannot be parameterised, so it is validated in one place here rather than re-implemented by
 * each store — a second copy of the guard is how one store silently accepts a name another refuses.
 *
 * This is deliberately not `assertSafeSchemaName` from `tenant-client`: that guard requires the
 * `tenant_` prefix, which is right for tenant schemas and wrong for platform bookkeeping. The rule
 * here is the narrower "a bare lowercase identifier", which still refuses anything that could
 * terminate the identifier and start a new statement.
 */

import { PlatformError } from "@platform/contracts";

export const DEFAULT_PLATFORM_SCHEMA = "platform_ops";

const SAFE_PLATFORM_SCHEMA = /^[a-z_][a-z0-9_]{0,62}$/;

export function assertSafePlatformSchema(schema: string): void {
  if (!SAFE_PLATFORM_SCHEMA.test(schema)) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      `Refusing to use an unsafe schema name '${schema}' for platform bookkeeping.`,
      { details: { schema } }
    );
  }
}
