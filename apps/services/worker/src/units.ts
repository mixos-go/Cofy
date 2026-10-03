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
import { PlatformError, COURIER_CODES } from "@platform/contracts";
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
import { createShipmentOnce } from "./shipment-create.ts";
import { arrangeShipmentOnce } from "./shipment-arrange.ts";
import { trackShipmentsOnce } from "./shipment-track.ts";
import { writeBackTrackingOnce } from "./tracking-writeback.ts";
import { repairDrift } from "./drift.ts";
import { reconcileStockOnce } from "./stock-reconcile.ts";
import { deferralFor } from "./rate-limit.ts";
import { reArmedJobId } from "./reconcile.ts";
import type {
  ChannelGateway,
  CommerceClient,
  CourierGateway,
  RateShoppingRulesClient,
  SyncStateClient
} from "./ports.ts";

/** Everything the units need. The engine supplies the queue; these come from `main.ts`. */
export interface WorkflowDependencies {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly couriers: CourierGateway;
  readonly rateShoppingRules: RateShoppingRulesClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
  /** The engine, so a unit can re-arm itself. Only the reconciliation unit uses it. */
  readonly queue: WorkflowQueue;
  /** When a reconciliation pass that just finished should next run. Owned by the scheduler. */
  readonly nextReconcileRunAt: (from: Date) => string;
  /** A reservation older than this is drift (ADR 0014). Owned by the operator, like the cadence. */
  readonly staleReservationMs: number;
  /** Bounds how many refs one drift detection or repair pass considers. */
  readonly maxRefsPerPass: number;
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

/**
 * A tracking write-back job (docs/adr/0020): one order's waybill, as the shipment produced it.
 *
 * Validated at the boundary like every other payload. A unit needs both the order and the waybill;
 * without either there is nothing to tell the channel, so the schema refuses it rather than sending
 * a call the marketplace would reject.
 */
const trackingWriteBackPayload = z
  .object({
    externalOrderId: z.string().min(1).max(128),
    trackingNumber: z.string().min(1).max(128),
    trackingUrl: z.string().url().max(1024).nullable().default(null)
  })
  .strict();

const emptyPayload = z.object({}).strict();

/**
 * A shipment-create job (docs/PLAN.md M7, docs/adr/0020).
 *
 * It carries everything the workflow needs to quote, choose and book without reading any tenant
 * order state: the tenant's own order id (what `recordShipment` addresses), the channel's external
 * order id (what the queued write-back addresses — the two ids are different systems), the lines to
 * ship (by SKU), and the courier-neutral shipment request. `couriers` narrows the fan-out; absent
 * means every registered courier. The channel is in the envelope, because the write-back this
 * triggers is a channel call.
 */
const shipmentCreatePayload = z
  .object({
    orderId: z.string().min(1).max(128),
    externalOrderId: z.string().min(1).max(128),
    items: z
      .array(z.object({ sku: z.string().min(1), quantity: z.number().int().positive() }))
      .min(1),
    shipment: z.object({
      destination: z.object({
        city: z.string().min(1).max(128),
        postalCode: z.string().min(1).max(16).nullable().default(null),
        address: z.string().min(1).max(512)
      }),
      weightGrams: z.number().int().positive(),
      declaredValue: z.object({ amount: z.number().int().nonnegative(), currency: z.literal("IDR") }),
      requiresInsurance: z.boolean().default(false),
      requiresCod: z.boolean().default(false)
    }),
    couriers: z.array(z.enum(COURIER_CODES)).max(16).optional()
  })
  .strict();

/**
 * A shipment-arrange job (docs/PLAN.md M7, docs/adr/0021).
 *
 * The primary fulfillment path: the channel arranges the shipment. It carries the tenant's order id
 * (what `recordShipment` addresses), the channel's external order id (what `arrangeShipment` and the
 * label read address), the lines to ship (by SKU), the seller's arrangement choice, and the courier
 * and service tier the choice named — recorded on the tenant-side shipment so the seller sees them.
 * `fetchLabel` asks for the printable document too, when the caller wants it.
 */
const shipmentArrangePayload = z
  .object({
    orderId: z.string().min(1).max(128),
    externalOrderId: z.string().min(1).max(128),
    items: z
      .array(z.object({ sku: z.string().min(1), quantity: z.number().int().positive() }))
      .min(1),
    arrangement: z
      .object({
        // Exactly one of the two is set: a channel-booked option, or the seller's own waybill
        // (docs/adr/0021). The channel decides which applies from its own arrangement parameters.
        channelOptionId: z.string().min(1).max(128).nullable().default(null),
        pickupAddressId: z.string().min(1).max(128).nullable().default(null),
        selfShipTrackingNumber: z.string().min(1).max(128).nullable().default(null)
      })
      .strict(),
    courier: z.string().min(1).max(128),
    serviceLevel: z.string().min(1).max(128),
    fetchLabel: z.boolean().default(false)
  })
  .strict();

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
  const {
    syncState,
    gateway,
    commerce,
    couriers,
    rateShoppingRules,
    events,
    logger,
    queue,
    nextReconcileRunAt,
    staleReservationMs,
    maxRefsPerPass
  } = dependencies;
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

    // Tracking write-back (docs/PLAN.md M7, docs/adr/0020). One order's waybill to the channel it
    // came from. Capability-gated inside the workflow, so a channel without the operation is a skip
    // rather than a failed job, and idempotent on the waybill so a retry cannot rewrite the audit.
    "shipment.write_back": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        const parsed = trackingWriteBackPayload.parse(job.payload);
        const outcome = await writeBackTrackingOnce(
          { syncState, gateway, events, logger },
          {
            tenantId: job.tenantId,
            channel,
            externalOrderId: parsed.externalOrderId,
            tracking: { trackingNumber: parsed.trackingNumber, trackingUrl: parsed.trackingUrl }
          }
        );
        logger.info("unit.shipment.write_back.completed", {
          tenantId: job.tenantId,
          channel,
          written: outcome.written,
          skipped: outcome.skipped,
          replayed: outcome.replayed
        });
      });
    },

    // Booking a courier shipment (docs/PLAN.md M7, docs/adr/0020). Quotes across couriers, applies
    // the tenant's stored rules with the pure `selectCourier`, books the chosen quote, records the
    // tenant-side Fulfillment, then *queues* the tracking write-back rather than calling it inline:
    // the channel write is a governed outbound marketplace call and belongs to its own unit, so a
    // throttle on it cannot roll back a booking that already happened. The write-back is only queued
    // when something was actually booked — nothing to tell the channel about otherwise.
    "shipment.create": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        const parsed = shipmentCreatePayload.parse(job.payload);
        const outcome = await createShipmentOnce(
          { syncState, couriers, rules: rateShoppingRules, commerce, events, logger },
          {
            tenantId: job.tenantId,
            channel,
            orderId: parsed.orderId,
            items: parsed.items,
            shipment: { orderId: parsed.orderId, ...parsed.shipment },
            ...(parsed.couriers === undefined ? {} : { couriers: parsed.couriers }),
            now
          }
        );

        if (outcome.shipment !== null) {
          await queue.enqueue("shipment.write_back", job.tenantId, channel, {
            externalOrderId: parsed.externalOrderId,
            trackingNumber: outcome.shipment.trackingNumber,
            trackingUrl: null
          }, { jobId: `shipment.write_back:${parsed.externalOrderId}:${outcome.shipment.trackingNumber}` });
        }

        logger.info("unit.shipment.create.completed", {
          tenantId: job.tenantId,
          orderId: parsed.orderId,
          courier: outcome.shipment?.courier ?? null,
          replayed: outcome.replayed,
          chosen: outcome.selection.chosen !== null
        });
      });
    },

    // Arranging a channel shipment (docs/PLAN.md M7, docs/adr/0021). This is the *primary* path for
    // Shopee and TikTok Shop/Tokopedia: the marketplace books the waybill, so there is no courier
    // fan-out and no `shipment.write_back` — the arrangement call is itself the write-back. The unit
    // records the tenant-side Fulfillment carrying the channel-issued waybill, and fetches the
    // printable label when asked and the channel exposes one.
    "shipment.arrange": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      return runUnit(job, logger, now, async () => {
        const parsed = shipmentArrangePayload.parse(job.payload);
        const outcome = await arrangeShipmentOnce(
          { syncState, gateway, commerce, events, logger },
          {
            tenantId: job.tenantId,
            channel,
            orderId: parsed.orderId,
            externalOrderId: parsed.externalOrderId,
            items: parsed.items,
            arrangement: {
              externalOrderId: parsed.externalOrderId,
              channelOptionId: parsed.arrangement.channelOptionId,
              pickupAddressId: parsed.arrangement.pickupAddressId,
              selfShipTrackingNumber: parsed.arrangement.selfShipTrackingNumber
            },
            courier: parsed.courier,
            serviceLevel: parsed.serviceLevel,
            fetchLabel: parsed.fetchLabel,
            now
          }
        );

        logger.info("unit.shipment.arrange.completed", {
          tenantId: job.tenantId,
          channel,
          externalOrderId: parsed.externalOrderId,
          trackingNumber: outcome.shipment?.trackingNumber ?? null,
          skipped: outcome.skipped,
          replayed: outcome.replayed,
          label: outcome.label !== null
        });
      });
    },

    // The delivery-status pull pass (docs/PLAN.md M7, docs/adr/0021). It reads the tenant's active
    // shipments, asks the channel or the courier for the newest event, and writes genuine advances
    // back. It re-arms itself on the reconciliation cadence, like the other passes, so a restart
    // resumes without a scheduler tick (ADR 0013).
    "shipment.track": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      const result = await runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await trackShipmentsOnce(
          { gateway, couriers, commerce, events, logger },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.shipment.track.completed", { tenantId: job.tenantId, channel, ...outcome });
      });

      if (result.kind === "completed") {
        const runAt = nextReconcileRunAt(now());
        await queue.schedule("shipment.track", job.tenantId, channel, {}, {
          jobId: reArmedJobId("shipment.track", { tenantId: job.tenantId, channel }, runAt),
          runAt
        });
      }
      return result;
    },

    // Scheduled convergence and drift repair (docs/PLAN.md M4). Deliberately the *same* function the
    // real-time unit calls — `importOrdersOnce` — so repair and real-time import cannot drift into
    // two behaviours (ADR 0002, ADR 0013). The only difference is `retryFailedRefs`, which the
    // scheduled pass sets so a ref a compensation marked `failed` is retried instead of skipped
    // forever (ADR 0014). A pull is idempotent through the order refs, so re-running it converges
    // rather than duplicating.
    "reconcile.orders": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      const result = await runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await repairDrift(
          { syncState, gateway, commerce, events, logger, staleReservationMs, maxRefsPerPass, now },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.reconcile.orders.completed", { tenantId: job.tenantId, channel, ...outcome });
      });

      // Re-arm only after a pass that ran to completion. A deferred pass is retried by the dispatcher
      // and will re-arm when it finally finishes, so re-arming here too would double the cadence.
      if (result.kind === "completed") {
        const runAt = nextReconcileRunAt(now());
        await queue.schedule("reconcile.orders", job.tenantId, channel, {}, {
          jobId: reArmedJobId("reconcile.orders", { tenantId: job.tenantId, channel }, runAt),
          runAt
        });
      }
      return result;
    },

    // Stock drift repair (docs/adr/0015). A different question from `reconcile.orders`: that unit
    // asks "is any order missing", this one asks "does the channel's stock agree with Medusa". It
    // shares the push the real-time path uses rather than reimplementing the write, and it walks its
    // own cursor, so the two passes cannot disturb each other.
    "reconcile.stock": async (job): Promise<WorkflowRunResult> => {
      const channel = requireChannel(job);
      const result = await runUnit(job, logger, now, async () => {
        emptyPayload.parse(job.payload);
        const outcome = await reconcileStockOnce(
          { syncState, gateway, commerce, events, logger, now },
          { tenantId: job.tenantId, channel }
        );
        logger.info("unit.reconcile.stock.completed", { tenantId: job.tenantId, channel, ...outcome });
      });

      if (result.kind === "completed") {
        const runAt = nextReconcileRunAt(now());
        await queue.schedule("reconcile.stock", job.tenantId, channel, {}, {
          jobId: reArmedJobId("reconcile.stock", { tenantId: job.tenantId, channel }, runAt),
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
  "shipment.create",
  "shipment.arrange",
  "shipment.write_back",
  "shipment.track",
  "reconcile.orders",
  "reconcile.stock"
];
