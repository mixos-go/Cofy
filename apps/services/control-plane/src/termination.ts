/**
 * Tenant termination.
 *
 * Terminating a tenant is three effects that must all happen, in an order that stays safe if the
 * process dies part-way (docs/PLAN.md M1):
 *
 * 1. **Revoke credentials.** All channel credentials are deleted from `packages/secrets`.
 * 2. **Schedule data deletion.** A durable record is written saying this tenant's schema is to be
 *    purged. Deletion itself is not performed inline: it is irreversible, and a mis-click must be
 *    recoverable up to the moment the purge actually runs.
 * 3. **Mark terminated.**
 *
 * Order matters. Credentials are revoked *first*, so a crash mid-way leaves a tenant that is still
 * nominally active but has no access to any marketplace. The opposite order would leave a
 * terminated tenant holding live credentials — the one outcome that is a security incident rather
 * than an inconsistency.
 */

import { PlatformError } from "@platform/contracts";
import type { ChannelCode, MedusaTargetStore, TenantId, TenantRecord } from "@platform/contracts";
import type { SecretStore, MedusaAdminKeyStore } from "@platform/secrets";
import { assertTenantTransition } from "./state.ts";
import type { Logger } from "./logging.ts";
import type { TenantSchemaAdmin } from "./tenant-schema.ts";
import type { TenantStore } from "./tenant-store.ts";

export interface TerminationResult {
  readonly tenant: TenantRecord;
  readonly revokedChannels: readonly ChannelCode[];
  readonly deletionScheduledAt: string;
}

export interface TenantTerminationOptions {
  readonly store: TenantStore;
  readonly secrets: SecretStore;
  readonly schemaAdmin: TenantSchemaAdmin;
  readonly logger: Logger;
  readonly now?: () => string;
  /**
   * The tenant's engine credential and target (ADR 0012). Both are optional so a deployment that
   * predates them still terminates; when present they are cleared alongside channel credentials,
   * for the same reason — a terminated tenant must not keep live access to anything.
   */
  readonly medusaAdminKeys?: MedusaAdminKeyStore;
  readonly medusaTargets?: MedusaTargetStore;
  /** Drops any pooled tenant connections so a terminated tenant cannot keep serving. */
  readonly onTerminated?: (tenantId: TenantId) => Promise<void>;
}

export class TenantTerminationService {
  readonly #store: TenantStore;
  readonly #secrets: SecretStore;
  readonly #schemaAdmin: TenantSchemaAdmin;
  readonly #logger: Logger;
  readonly #now: () => string;
  readonly #medusaAdminKeys: MedusaAdminKeyStore | undefined;
  readonly #medusaTargets: MedusaTargetStore | undefined;
  readonly #onTerminated: ((tenantId: TenantId) => Promise<void>) | undefined;

  constructor(options: TenantTerminationOptions) {
    this.#store = options.store;
    this.#secrets = options.secrets;
    this.#schemaAdmin = options.schemaAdmin;
    this.#logger = options.logger;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#medusaAdminKeys = options.medusaAdminKeys;
    this.#medusaTargets = options.medusaTargets;
    this.#onTerminated = options.onTerminated;
  }

  async terminate(tenantId: TenantId): Promise<TerminationResult> {
    const tenant = await this.#store.getTenant(tenantId);
    if (tenant === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }

    const log = this.#logger.child({ tenantId, correlationId: `terminate:${tenantId}` });

    // Fail before any side effect if the tenant is already terminated, rather than revoking twice.
    assertTenantTransition(tenant.state, "terminated");

    const revokedChannels = await this.#secrets.deleteAllForTenant(tenantId);
    log.info("termination.credentials_revoked", { channels: revokedChannels.length });

    // The engine credential is revoked with the same priority as channel credentials. A terminated
    // tenant whose Medusa admin key outlives it is the same class of incident as a live marketplace
    // token, so this happens before the state change, not after.
    await this.#medusaAdminKeys?.delete(tenantId);
    await this.#medusaTargets?.delete(tenantId);
    if (this.#medusaAdminKeys !== undefined) log.info("termination.medusa_credential_revoked", {});

    const scheduledAt = this.#now();
    await this.#schemaAdmin.scheduleDeletion(tenantId, tenant.schemaName, scheduledAt);
    log.info("termination.deletion_scheduled", { schemaName: tenant.schemaName });

    const terminated = await this.#store.setTenantState(tenantId, "terminated", scheduledAt);
    log.info("termination.complete", {});

    // Best-effort and after the fact: the tenant is already unreachable through tenant-client
    // because its state is terminated, so a failure here does not need to fail the operation.
    if (this.#onTerminated !== undefined) {
      try {
        await this.#onTerminated(tenantId);
      } catch (error) {
        log.warn("termination.evict_failed", {
          errorMessage: error instanceof Error ? error.message : "unknown"
        });
      }
    }

    return { tenant: terminated, revokedChannels, deletionScheduledAt: scheduledAt };
  }
}
