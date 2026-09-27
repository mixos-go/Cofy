/**
 * Migration fan-out.
 *
 * Applies a schema migration across every tenant and records per-tenant success or failure
 * (docs/PLAN.md M1). The point is not the migration — it is that one broken tenant does not stop
 * the others, and that the failures are a list you can retry rather than a message in a log.
 *
 * Only tenants in a servable state are migrated. A tenant mid-provisioning gets its migrations
 * from the provisioning orchestrator, and running both would race.
 */

import type { TenantId } from "@platform/contracts";
import type { Logger } from "./logging.ts";
import type { TenantMigrationRunner } from "./migrations.ts";
import type { TenantStore } from "./tenant-store.ts";

/**
 * Outcomes are separate types rather than one union with optional fields, so a caller that reads
 * `errorMessage` has to be looking at a failure. Optional fields would let a compiler-blessed
 * `report.failed[0].reason` compile and fail at runtime.
 */
export type TenantMigrationSkip = {
  readonly tenantId: TenantId;
  readonly status: "skipped";
  readonly reason: string;
};

export type TenantMigrationFailure = {
  readonly tenantId: TenantId;
  readonly status: "failed";
  readonly errorMessage: string;
};

export interface FanOutReport {
  /** Tenant ids that were migrated. */
  readonly succeeded: readonly TenantId[];
  readonly skipped: readonly TenantMigrationSkip[];
  readonly failed: readonly TenantMigrationFailure[];
}

export interface MigrationFanOutOptions {
  readonly store: TenantStore;
  readonly runner: TenantMigrationRunner;
  readonly logger: Logger;
  /**
   * Tenants eligible for migration. `active` and `suspended` are included: a suspended tenant
   * still owns data and must not drift from the schema its peers run.
   */
  readonly targetStates?: readonly string[];
}

export class MigrationFanOut {
  readonly #store: TenantStore;
  readonly #runner: TenantMigrationRunner;
  readonly #logger: Logger;
  readonly #targetStates: readonly string[];

  constructor(options: MigrationFanOutOptions) {
    this.#store = options.store;
    this.#runner = options.runner;
    this.#logger = options.logger;
    this.#targetStates = options.targetStates ?? ["active", "suspended"];
  }

  /** Migrates every eligible tenant. Never throws for a per-tenant failure. */
  async runAll(): Promise<FanOutReport> {
    const tenants = await this.#store.listTenants();
    return this.#applyTo(tenants);
  }

  /**
   * Retries only the tenants named. This is the operation an operator reaches for after a
   * partial failure, and it must not re-touch tenants that already succeeded.
   */
  async retry(tenantIds: readonly TenantId[]): Promise<FanOutReport> {
    const wanted = new Set(tenantIds);
    const tenants = (await this.#store.listTenants()).filter((t) => wanted.has(t.id));
    return this.#applyTo(tenants);
  }

  async #applyTo(
    tenants: readonly { id: TenantId; state: string; schemaName: string }[]
  ): Promise<FanOutReport> {
    const succeeded: TenantId[] = [];
    const skipped: TenantMigrationSkip[] = [];
    const failed: TenantMigrationFailure[] = [];

    for (const tenant of tenants) {
      if (!this.#targetStates.includes(tenant.state)) {
        skipped.push({
          tenantId: tenant.id,
          status: "skipped",
          reason: `state '${tenant.state}' is not eligible`
        });
        this.#logger.debug("migration.fanout.skipped", {
          tenantId: tenant.id,
          state: tenant.state
        });
        continue;
      }

      try {
        await this.#runner.run(tenant.schemaName);
        succeeded.push(tenant.id);
        this.#logger.info("migration.fanout.succeeded", { tenantId: tenant.id });
      } catch (error) {
        // Message only, never the raw error: it can carry a connection string (AGENTS.md §2.6).
        const errorMessage = error instanceof Error ? error.message : "Migration failed.";
        failed.push({ tenantId: tenant.id, status: "failed", errorMessage });
        this.#logger.error("migration.fanout.failed", { tenantId: tenant.id, errorMessage });
      }
    }

    this.#logger.info("migration.fanout.complete", {
      succeeded: succeeded.length,
      skipped: skipped.length,
      failed: failed.length
    });

    return { succeeded, skipped, failed };
  }
}
