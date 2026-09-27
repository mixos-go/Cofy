/**
 * Provisioning step handlers.
 *
 * Each handler is idempotent: on resume it may run again for a tenant that already ran it. That
 * is why `createSchema` uses `if not exists`, migrations are re-runnable by Medusa's design, and
 * seeding converges rather than inserting blindly.
 *
 * `mark_active` deliberately does nothing here. The state transition is owned by the orchestrator
 * and only applied after this step is recorded as succeeded, so the tenant can never be `active`
 * while the run still shows a pending step.
 */

import { PlatformError } from "@platform/contracts";
import type { TenantId } from "@platform/contracts";
import type { ProvisioningStep, ProvisioningStepHandler } from "./provisioning.ts";
import type { TenantSchemaAdmin } from "./tenant-schema.ts";
import type { TenantMigrationRunner } from "./migrations.ts";

/**
 * Seeds a freshly migrated tenant with the defaults every tenant needs: a default region, a
 * default stock location, and so on.
 *
 * MUST be idempotent.
 */
export interface TenantSeeder {
  seed(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void>;
}

/**
 * Makes a provisioned tenant resolvable by `packages/tenant-client`.
 *
 * Until this runs, the router cannot find the tenant's schema, so a request would fail with
 * TENANT_NOT_FOUND even though the schema exists. Running it before `mark_active` is what keeps
 * "active" and "reachable" the same statement.
 */
export interface TenantRouteRegistrar {
  register(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void>;
}

export interface ProvisioningDependencies {
  readonly schemaAdmin: TenantSchemaAdmin;
  readonly migrationRunner: TenantMigrationRunner;
  readonly seeder: TenantSeeder;
  readonly routes: TenantRouteRegistrar;
}

export function createProvisioningHandlers(
  deps: ProvisioningDependencies
): Record<ProvisioningStep, ProvisioningStepHandler> {
  return {
    create_schema: async ({ schemaName, logger }) => {
      await deps.schemaAdmin.createSchema(schemaName);
      logger.info("provisioning.create_schema.done", { schemaName });
    },

    run_medusa_migrations: async ({ schemaName, logger }) => {
      if (!(await deps.schemaAdmin.schemaExists(schemaName))) {
        // A migration without a schema means a previous step silently did nothing. Fail with a
        // clear cause rather than letting the CLI fail with a confusing connection error.
        throw new PlatformError("PROVISIONING_FAILED", "Cannot migrate a schema that does not exist.", {
          details: { schemaName }
        });
      }
      await deps.migrationRunner.run(schemaName);
      logger.info("provisioning.migrations.done", { schemaName });
    },

    seed_defaults: async ({ tenantId, schemaName, logger }) => {
      await deps.seeder.seed({ tenantId, schemaName });
      logger.info("provisioning.seed.done", {});
    },

    register_routes: async ({ tenantId, schemaName, logger }) => {
      await deps.routes.register({ tenantId, schemaName });
      logger.info("provisioning.routes.done", {});
    },

    mark_active: async ({ tenantId, logger }) => {
      logger.info("provisioning.mark_active.done", { tenantId });
    }
  };
}

/** In-memory seeder for tests and local development. Records what it was asked to seed. */
export class InMemorySeeder implements TenantSeeder {
  readonly seeded: string[] = [];

  async seed(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void> {
    if (this.seeded.includes(input.schemaName)) return;
    this.seeded.push(input.schemaName);
  }
}

/** In-memory route registrar. The control plane's real one writes to its registry. */
export class InMemoryRouteRegistrar implements TenantRouteRegistrar {
  readonly registered = new Map<TenantId, string>();

  async register(input: { readonly tenantId: TenantId; readonly schemaName: string }): Promise<void> {
    this.registered.set(input.tenantId, input.schemaName);
  }
}
