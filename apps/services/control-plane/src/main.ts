/**
 * Control plane entry point.
 *
 * Wires the in-memory adapters by default so the service starts with no infrastructure. The
 * Postgres adapters are selected when `DATABASE_URL` is present. Wiring is explicit rather than
 * discovered, so it is obvious which implementation a running process uses.
 */

import { Pool } from "pg";
import type { TenantId } from "@platform/contracts";
import { InMemorySecretStore } from "@platform/secrets";
import type { SecretStore } from "@platform/secrets";
import { createLogger } from "./logging.ts";
import type { LogLevel } from "./logging.ts";
import { InMemoryTenantStore } from "./tenant-store.ts";
import type { TenantStore } from "./tenant-store.ts";
import { InMemoryTenantSchemaAdmin, PostgresTenantSchemaAdmin } from "./tenant-schema.ts";
import type { TenantSchemaAdmin } from "./tenant-schema.ts";
import { MedusaCliMigrationRunner } from "./migrations.ts";
import type { TenantMigrationRunner } from "./migrations.ts";
import { ProvisioningOrchestrator } from "./provisioning.ts";
import { InMemoryRouteRegistrar, InMemorySeeder, createProvisioningHandlers } from "./steps.ts";
import { InMemoryAccountStore, SessionManager } from "./identity.ts";
import { TenantTerminationService } from "./termination.ts";
import { TenantRegistry } from "./tenants.ts";
import { createControlPlaneServer } from "./http.ts";
import { TenantClient } from "@platform/tenant-client";
import { InMemorySyncStateStore } from "@platform/sync-state";
import type { SyncStateStore } from "@platform/sync-state";

async function main(): Promise<void> {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel | undefined) ?? "info");
  const databaseUrl = process.env.DATABASE_URL;

  const store: TenantStore = new InMemoryTenantStore();
  const secrets: SecretStore = new InMemorySecretStore();

  let schemaAdmin: TenantSchemaAdmin;
  let migrationRunner: TenantMigrationRunner;
  let adminPool: Pool | null = null;

  if (databaseUrl !== undefined && databaseUrl !== "") {
    const pgAdmin = new PostgresTenantSchemaAdmin(databaseUrl);
    schemaAdmin = pgAdmin;
    migrationRunner = new MedusaCliMigrationRunner({
      connectionString: databaseUrl,
      cwd: process.env.MEDUSA_CWD ?? "../../data-plane/medusa-config"
    });
    adminPool = new Pool({ connectionString: databaseUrl, max: 2 });
  } else {
    logger.warn("startup.no_database_url", {});
    schemaAdmin = new InMemoryTenantSchemaAdmin();
    // Without a database there is nothing to migrate, so the runner is never invoked; the
    // orchestrator still executes the step so local runs exercise the same sequence.
    migrationRunner = {
      async run(schemaName: string): Promise<void> {
        logger.debug("migration.skipped_no_database", { schemaName });
      }
    };
  }

  const registry = new TenantRegistry({ store, logger });
  const tenantClient = new TenantClient({
    connectionString: databaseUrl ?? "postgres://localhost/platform",
    directory: {
      async resolve(tenantId: TenantId) {
        const tenant = await store.getTenant(tenantId);
        if (tenant === null) return null;
        return { tenantId: tenant.id, schemaName: tenant.schemaName, state: tenant.state };
      }
    }
  });

  const provisioning = new ProvisioningOrchestrator({
    store,
    logger,
    handlers: createProvisioningHandlers({
      schemaAdmin,
      migrationRunner,
      seeder: new InMemorySeeder(),
      routes: new InMemoryRouteRegistrar()
    })
  });

  const termination = new TenantTerminationService({
    store,
    secrets,
    schemaAdmin,
    logger,
    onTerminated: (tenantId) => tenantClient.evict(tenantId)
  });

  const accounts = new InMemoryAccountStore();
  const sessions = new SessionManager({
    accounts,
    ttlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 43200)
  });

  // Platform-owned channel sync state (ADR 0010). In-memory here so the service starts with no
  // infrastructure; the Postgres-backed store lands behind this same interface when the registry
  // database is wired in. The service tokens are the worker's credential to this surface.
  const syncState: SyncStateStore = new InMemorySyncStateStore();
  const serviceTokens = (process.env.CONTROL_PLANE_SERVICE_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  if (process.env.BOOTSTRAP_OPERATOR_EMAIL !== undefined && process.env.BOOTSTRAP_OPERATOR_PASSWORD !== undefined) {
    await accounts.create({
      email: process.env.BOOTSTRAP_OPERATOR_EMAIL,
      displayName: "Bootstrap Operator",
      password: process.env.BOOTSTRAP_OPERATOR_PASSWORD,
      role: "operator",
      tenantId: null,
      now: new Date().toISOString()
    });
    logger.info("startup.operator_created", {});
  }

  const server = createControlPlaneServer({
    registry,
    provisioning,
    termination,
    sessions,
    syncState,
    serviceTokens,
    logger
  });
  const port = Number(process.env.CONTROL_PLANE_PORT ?? 4001);

  server.listen(port, () => {
    logger.info("startup.listening", { port });
  });

  const shutdown = async (): Promise<void> => {
    logger.info("shutdown.begin", {});
    await tenantClient.closeAll();
    await adminPool?.end();
    server.close();
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

await main();
