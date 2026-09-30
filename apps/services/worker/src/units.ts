/**
 * The worker's unit table (docs/adr/0013).
 *
 * This is the one place a queued `WorkflowJob` becomes a call into a workflow function. The mapping
 * is a visible edit — a unit in the union with no handler is a job that can never succeed, so it is
 * reported as failed rather than silently dropped.
 *
 * Three responsibilities, and nothing else:
 *   1. **Validate the payload.** A job's payload arrives from outside this process (it was
 *      serialized into Redis), so it is validated with zod before use, exactly like an HTTP body
 *      (AGENTS.md §5). A bad payload is a bug in the producer and can never succeed by retrying.
 *   2. **Run the unit** with the dependencies the worker already holds.
 *   3. **Translate the outcome.** The workflows report business results by returning or throwing
 *      platform errors, and this is where those become the engine's three outcomes — including the
 *      governor deferral, which must *not* look like a failure (ADR 0013).
 *
 * A `CHANNEL_RATE_LIMITED` is the interesting case: the work is valid and must run later, so it
 * becomes a `reschedule` carrying the governor's `Retry-After`. The delay is read from the error,
 * never computed here, because only the governor sees the shared per-app-key budget.
 */

import { z } from "zod";
import { PlatformError } from "@platform/contracts";
import type { ChannelCode } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type {
  WorkflowHandlerTable,
  WorkflowJob,
  WorkflowQueue,
  WorkflowRunResult,
  WorkflowUnit
} from "@platform/workflow-queue";
import { importListingsOnce } from "./listing-import.ts";
import { importOrdersOnce } from "./order-import.ts";
import type { EventPublisher } from "./order-import.ts";
import { pushStockOnce } from "./stock-push.ts";
import { deferralFor } from "./rate-limit.ts";
import { reArmedJobId } from "./reconcile.ts";
import type { ChannelGateway, CommerceClient, SyncStateClient } from "./ports.ts";

/** Everything the units need. The engine supplies the queue; these come from `main.ts`. */
export interface WorkflowDependencies {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
  /** The engine, so a unit can re-arm itself. Only the reconciliation unit uses it. */
  readonly queue: WorkflowQueue;
  /** When a reconciliation pass that just finished should next run. Owned by the scheduler. */
  readonly nextReconcileRunAt: (from: Date) => string;
  readonly now?: () => Date;
}

/**
 * The payload each unit accepts.
 *
 * A unit whose work is fully described by its envelope (a pull for one tenant and channel) takes an
 * empty payload, and the schema still rejects unknown keys so a producer that sends the wrong shape
 * fails loudly instead of having its fields quietly ignored.
 */
const stockPushPayload = z
  .object({
    changes: z
      .array(
        z.object({
          sku: z.string().min(1),
          // Stock is a whole number of units. A fractional or negative level is a producer bug that
          // would push nonsense to a marketplace, so it is refused at the boundary.
          available: z.number().int().min(0)
        })
      )
      .min(1)
  })
  .strict();

const emptyPayload = z.object({}).strict();

/** Pulls are addressed by the envelope; a job without a channel cannot be routed to a marketplace. */
function requireChannel(job: WorkflowJob): ChannelCode {
  if (job.channel === null) {
    throw new PlatformError("VALIDATION_FAILED", "This unit requires a channel.", {
      details: { unit: job.unit, jobId: job.jobId }
    });
  }
  return job.channel;
}

/**
 * Run one unit and map its outcome, including the governor deferral.
 *
 * A deferral is checked first because it is the one error that is not a failure: the workflow
 * deliberately rethrew it after releasing its claim, so treating it as `failed` would undo the
 * reschedule and tell reconciliation that healthy work is broken.
 */
async function runUnit(
  job: WorkflowJob,
  logger: Logger,
  now: () => Date,
  run: () => Promise<void>
): Promise<WorkflowRunResult> {
  try {
    await run();
    return { kind: "completed" };
  } catch (error) {
    const deferral = deferralFor(error, now());
    if (deferral !== null) {
      return { kind: "reschedule", runAt: deferral.runAt, reason: deferral.reason };
    }
    const message = error instanceof Error ? error.message : "unknown";
    logger.error("workflow.unit_failed", {
      jobId: job.jobId,
      unit: job.unit,
      tenantId: job.tenantId,
      channel: job.channel,
      errorMessage: message
    });
    // `retryable` is recorded for the operator, not acted on: the queue does not invent a retry
    // delay (ADR 0013) and the workflow has already left state for reconciliation (ADR 0002).
    return {
      kind: "failed",
      retryable: error instanceof PlatformError ? error.retryable : false,
      errorMessage: message
    };
  }
}

export function createWorkflowHandlers(dependencies: WorkflowDependencies): WorkflowHandlerTable {
  const { syncState, gateway, commerce, events, logger, queue, nextReconcileRunAt } = dependencies;
  const now = dependencies.now ?? ((): Date => new Date());

  return {
    "order.import": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await importOrdersOnce(
          { syncState, gateway, commerce, events, logger, now },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.order.import.completed", { tenantId: job.tenantId, channel, ...outcome });
      });
    },

    "listing.import": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await importListingsOnce(
          { syncState, gateway, logger, now },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.listing.import.completed", { tenantId: job.tenantId, channel, ...outcome });
      });
    },

    "stock.push": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        const parsed = stockPushPayload.parse(job.payload);
        const outcome = await pushStockOnce(
          { syncState, gateway, events, logger },
          { tenantId: job.tenantId, channel, changes: parsed.changes }
        );
        logger.info("unit.stock.push.completed", {
          tenantId: job.tenantId,
          channel,
          replayed: outcome.replayed,
          items: outcome.results.length
        });
      });
    },

    // Scheduled convergence (docs/PLAN.md M4). Deliberately the *same* function the real-time unit
    // calls, so repair and real-time import cannot drift into two behaviours (ADR 0002, ADR 0013).
    // A pull is idempotent through the order refs, so re-running it on a schedule converges orders
    // rather than duplicating them.
    "reconcile.orders": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      const result = await runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await importOrdersOnce(
          { syncState, gateway, commerce, events, logger, now },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.reconcile.orders.completed", { tenantId: job.tenantId, channel, ...outcome });
      });

      // Re-arm only after a pass that ran to completion. A deferred pass is retried by the dispatcher
      // and will re-arm when it finally finishes, so re-arming here too would double the cadence.
      if (result.kind === "completed") {
        const runAt = nextReconcileRunAt(now());
        await queue.schedule("reconcile.orders", job.tenantId, channel, {}, {
          jobId: reArmedJobId({ tenantId: job.tenantId, channel }, runAt),
          runAt
        });
      }
      return result;
    }
  };
}

/** The units this worker can actually run. Used to keep the reconciliation scheduler honest. */
export const REGISTERED_UNITS: readonly WorkflowUnit[] = [
  "order.import",
  "listing.import",
  "stock.push",
  "reconcile.orders"
];
