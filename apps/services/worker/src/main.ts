/**
 * Worker entry point.
 *
 * Wires the HTTP ports (control plane for sync state, integration plane for marketplaces, each
 * tenant's Medusa Admin API for commerce) and starts the workflow engine (ADR 0013). The engine is
 * the only thing that starts sync work: AGENTS.md §2.5 forbids `setTimeout`/in-process cron, so the
 * reconciliation cadence lives in the queue as a scheduled job rather than a timer here.
 *
 * Nothing here imports a connector or Medusa. The worker orchestrates over HTTP (ADR 0010).
 */

import { createServer } from "node:http";
import { createLogger } from "@platform/observability";
import type { LogLevel } from "@platform/observability";
import type { ChannelCode } from "@platform/contracts";
import { CHANNEL_SYNC_SLO_SECONDS, cadenceMeetsSyncSlo } from "@platform/contracts";
import { InMemoryMedusaAdminKeyStore } from "@platform/secrets";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import {
  BullMqWorkflowConsumer,
  BullMqWorkflowQueue,
  connectionOptionsFromUrl
} from "@platform/workflow-queue/bullmq";
import {
  HttpChannelGateway,
  HttpCommerceClient,
  HttpCourierGateway,
  HttpMedusaTargetResolver,
  HttpRateShoppingRulesClient,
  HttpSyncStateClient
} from "./ports.ts";
import { createTlsTransport, readOptionalCa } from "@platform/http-transport";
import { InMemoryEventPublisher } from "./events.ts";
import { createWorkflowHandlers, REGISTERED_UNITS } from "./units.ts";
import { parseReconciliationTargets, ReconciliationScheduler } from "./reconcile.ts";

function readToken(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    // A missing service token is a misconfiguration that must stop startup, not degrade to
    // unauthenticated calls that a marketplace would reject anyway.
    throw new Error(`${name} is required.`);
  }
  return value;
}

/**
 * The CA bundle used to verify a tenant's engine certificate (ADR 0012 point 6).
 *
 * Absent means "use the system trust store", which is correct for a publicly trusted issuer. A
 * private issuer must supply a bundle, and a malformed one stops startup rather than silently
 * falling back to an unverified connection.
 */
/**
 * The reconciliation cadence, in seconds.
 *
 * Required rather than defaulted: a default here would be a policy decision (how often we spend a
 * marketplace's shared budget on convergence) hidden in code, and too-short a value starves
 * real-time work. The operator sets it explicitly.
 */
function readReconciliationInterval(): number {
  const raw = process.env.RECONCILIATION_INTERVAL_SECONDS;
  const seconds = Number(raw);
  if (raw === undefined || raw === "" || !Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("RECONCILIATION_INTERVAL_SECONDS must be a positive number of seconds.");
  }
  // The pull path is the source of truth (ADR 0002), so a stock change is only as fresh as the
  // interval between passes. A cadence longer than the declared SLO promises freshness the system
  // cannot deliver, so it stops startup rather than shipping a number we cannot meet. A deployment
  // that genuinely needs a longer cadence must revisit the SLO, not quietly exceed it.
  if (!cadenceMeetsSyncSlo(seconds)) {
    throw new Error(
      `RECONCILIATION_INTERVAL_SECONDS=${seconds} exceeds the channel sync SLO of ` +
        `${CHANNEL_SYNC_SLO_SECONDS}s; the cadence is what determines stock freshness (ADR 0002).`
    );
  }
  return seconds;
}

/**
 * How old an uncommitted order reservation must be before it counts as drift (ADR 0014).
 *
 * Required, like the cadence: it is a policy value (how long a partial commit may sit before we call
 * it broken), and a default in code would be a decision nobody reviewed. It must exceed the
 * idempotency lease, or a healthy in-flight attempt would be reclassified as drift.
 */
function readStaleReservationMs(): number {
  const raw = process.env.STALE_RESERVATION_SECONDS;
  const seconds = Number(raw);
  if (raw === undefined || raw === "" || !Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("STALE_RESERVATION_SECONDS must be a positive number of seconds.");
  }
  return seconds * 1_000;
}

/** Bound on refs one drift pass considers, so one tenant's backlog cannot eat a whole run. */
function readMaxRefsPerPass(): number {
  const raw = process.env.MAX_DRIFT_REFS_PER_PASS;
  if (raw === undefined || raw === "") return 500;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("MAX_DRIFT_REFS_PER_PASS must be a positive integer.");
  }
  return value;
}

async function main(): Promise<void> {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel | undefined) ?? "info");
  // The per-tenant admin keys hand to the tenant-facing client (ADR 0012). The in-memory store is
  // the local/dev adapter; production selects the KMS-backed one behind the same interface.
  const medusaAdminKeys: MedusaAdminKeyStore = new InMemoryMedusaAdminKeyStore();

  const controlPlane = new HttpSyncStateClient({
    baseUrl: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    serviceToken: readToken("CONTROL_PLANE_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const gateway = new HttpChannelGateway({
    baseUrl: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    serviceToken: readToken("INTEGRATION_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  // The courier surface lives on the same plane as the marketplace surface, so it shares the same
  // base URL and service token (docs/adr/0020).
  const couriers = new HttpCourierGateway({
    baseUrl: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    serviceToken: readToken("INTEGRATION_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  // Rate-shopping rules are platform config stored with the control-plane tenant record, so this is
  // a control-plane read, not a tenant-engine one (docs/adr/0020).
  const rateShoppingRules = new HttpRateShoppingRulesClient({
    baseUrl: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    serviceToken: readToken("CONTROL_PLANE_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const commerce = new HttpCommerceClient({
    resolver: new HttpMedusaTargetResolver({
      controlPlane,
      keys: medusaAdminKeys
    }),
    transport: createTlsTransport({ ca: readOptionalCa() })
  });

  logger.info("startup.ports_ready", {
    controlPlane: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    integrationPlane: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    tenantEngine: "resolved-per-tenant"
  });

  // The queue Redis is the engine's durability (ADR 0013). Required: without it there is no engine,
  // and AGENTS.md §2.5 says no sync work runs without one, so a worker that cannot reach Redis must
  // not start pretending to work.
  const connection = connectionOptionsFromUrl(readToken("WORKFLOW_ENGINE_REDIS_URL"));
  const queue = new BullMqWorkflowQueue({ connection });

  const intervalSeconds = readReconciliationInterval();
  const targets = parseReconciliationTargets(process.env.RECONCILIATION_TARGETS);

  // Ask the integration plane which channels can report stock, once at startup, so a stock pass is
  // armed only where the connector implements it (docs/adr/0015). A probe failure is not fatal: it
  // leaves the stock set empty and order reconciliation still arms, which is the safer default. The
  // answer is cached because capabilities are a property of the app registration, not of a connection.
  const stockCapable = new Map<ChannelCode, boolean>();
  for (const channel of new Set(targets.map((target) => target.channel))) {
    try {
      stockCapable.set(channel, (await gateway.capabilities({ channel })).supportsStockSnapshotRead);
    } catch (error) {
      logger.warn("startup.capability_probe_failed", {
        channel,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      stockCapable.set(channel, false);
    }
  }

  const scheduler = new ReconciliationScheduler({
    queue,
    targets,
    intervalSeconds,
    logger,
    stockCapableChannels: (channel) => stockCapable.get(channel) === true
  });

  const handlers = createWorkflowHandlers({
    syncState: controlPlane,
    gateway,
    commerce,
    couriers,
    rateShoppingRules,
    events: new InMemoryEventPublisher(logger),
    logger,
    queue,
    nextReconcileRunAt: (from) => scheduler.nextRunAt(from),
    staleReservationMs: readStaleReservationMs(),
    maxRefsPerPass: readMaxRefsPerPass()
  });

  const consumer = new BullMqWorkflowConsumer({
    connection,
    queue,
    handlers,
    logger,
    concurrency: Number(process.env.WORKER_CONCURRENCY ?? 4)
  });
  consumer.start();

  // Seed the first pass of each target. Idempotent by job id, so a restart does not multiply work
  // (see `ReconciliationScheduler`). The cadence after that is the unit re-arming itself, which is
  // what survives a restart.
  await scheduler.arm();

  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", workflows: REGISTERED_UNITS }));
  });
  const port = Number(process.env.WORKER_PORT ?? 4003);
  server.listen(port, () => {
    logger.info("startup.listening", { port, units: REGISTERED_UNITS, reconciliationTargets: targets.length });
  });

  // Drain in-flight jobs and close both Redis connections before exiting, so a deploy does not cut a
  // marketplace call in half. The queue's idempotency lease makes that safe, but a clean stop is
  // cheaper than a repair.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info("shutdown.begin", { signal });
    server.close();
    await consumer.stop();
    await queue.close();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

await main();
