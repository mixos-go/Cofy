/**
 * Drift detection and repair (docs/PLAN.md M4, docs/adr/0014).
 *
 * Reconciliation converges orders because the pull path re-reads a cursor window and the order refs
 * make a re-read a no-op. That covers an order the platform *has not seen*. It does not cover an
 * order the platform saw and then broke: a ref marked `failed` by a compensation, or a ref left
 * `reserved` by an attempt that died between the two stores (ADR 0010's accepted partial commit).
 * Those are the two states a pull can never resolve on its own, because the ref itself is what stops
 * the re-import — so they are exactly the drift this module exists to find and clear.
 *
 * Two rules shape the design:
 *
 *   1. **Drift is derived, never stored.** A ref's status already says whether it is drifting, so a
 *      parallel drift table would be a second source of truth that could itself drift. Detection is
 *      therefore a read plus a classification, and the count cannot disagree with the refs.
 *   2. **Repair reuses the ordinary pull.** A `failed` ref is reopened and the *same*
 *      `importOrdersOnce` runs; there is no second repair code path to get idempotency wrong. The
 *      only new primitive is `reopenOrderRef`, which is the smallest possible change that lets the
 *      existing path retry.
 *
 * A stock-level drift (a channel quantity that disagrees with Medusa) is deliberately *not* here:
 * detecting it needs a channel stock snapshot the connectors do not expose yet, and inventing one
 * from an order stream would be a guess. It is recorded as an open deliverable in `docs/PLAN.md`
 * rather than approximated.
 */

import { orderRefsToDrift, summarizeDrift } from "@platform/contracts";
import type { ChannelCode, DriftItem, DriftSummary, TenantId } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, CommerceClient, SyncStateClient } from "./ports.ts";
import { importOrdersOnce } from "./order-import.ts";
import type { EventPublisher } from "./order-import.ts";

/** Everything drift detection and repair need, matching the other workflows' contexts. */
export interface DriftContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
  /**
   * A reservation older than this many milliseconds is drift. The caller supplies it from
   * configuration, like the reconciliation interval, so the policy is an operator's decision rather
   * than a constant buried here.
   */
  readonly staleReservationMs: number;
  /** Bounds how many refs one detection or repair pass considers. */
  readonly maxRefsPerPass: number;
  readonly now?: () => Date;
}

/**
 * The drifting refs for one target.
 *
 * Read as two filtered queries (`failed`, `reserved`) rather than one unfiltered page: a limit over
 * *all* refs would let a large tenant's committed history fill the window and hide a recent failure,
 * so the bound must apply to the drift candidates themselves. The age cutoff is applied here through
 * the shared classifier rather than in SQL, because it is a policy value the worker owns and putting
 * it in the store's query would put a second copy of the policy in the control plane.
 */
export async function detectDrift(
  context: DriftContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode }
): Promise<readonly DriftItem[]> {
  const { syncState, maxRefsPerPass } = context;
  const now = (context.now ?? ((): Date => new Date()))().toISOString();

  const failed = await syncState.listOrderRefs({
    tenantId: input.tenantId,
    channel: input.channel,
    status: "failed",
    limit: maxRefsPerPass
  });
  const reserved = await syncState.listOrderRefs({
    tenantId: input.tenantId,
    channel: input.channel,
    status: "reserved",
    limit: maxRefsPerPass
  });
  return orderRefsToDrift([...failed, ...reserved], {
    now,
    staleReservationMs: context.staleReservationMs
  });
}

/** The count a dashboard reads (docs/PLAN.md M4). Detection and the dashboard share this read. */
export async function driftSummary(
  context: DriftContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode }
): Promise<DriftSummary> {
  const observedAt = (context.now ?? ((): Date => new Date()))().toISOString();
  const items = await detectDrift(context, input);
  return summarizeDrift({ tenantId: input.tenantId, channel: input.channel, items, observedAt });
}

export interface DriftRepairOutcome {
  /** Drifting refs found before the pass. */
  readonly detected: number;
  /** Orders the pull imported during the pass — drift that is now resolved. */
  readonly repaired: number;
  /** Drift still present after the pass, as the dashboard would read it. */
  readonly remaining: number;
}

/**
 * Detect drift, repair it through the ordinary pull, then report what is left.
 *
 * The order is deliberate: repair first, re-count second. A dashboard that read the count before the
 * repair would show a stale non-zero number for one cadence after the system had already healed,
 * which is exactly the confusing signal the M4 exit criterion ("unresolved drift returning to zero
 * after repair") is written to avoid.
 *
 * Repair is one call and no new import code: the *same* `importOrdersOnce` the real-time path uses,
 * with `retryFailedRefs` set. The pull walks the channel from the persisted cursor; a `reserved` ref
 * is retried because it was never committed, and a `failed` one is reopened *when the order is in the
 * page*. Reopening inside the pull rather than in a loop here is what keeps the re-count honest: a
 * ref is only reopened for an order the pull actually has, so `remaining` can never read zero while
 * the order is still missing.
 *
 * A failure is not a `reschedule` unless the governor refused a call: an import that fails again
 * leaves its ref `failed`, which the next pass picks up. Retrying immediately would spend the shared
 * marketplace budget on the same broken order.
 */
export async function repairDrift(
  context: DriftContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode }
): Promise<DriftRepairOutcome> {
  const { syncState, logger } = context;
  const before = await detectDrift(context, input);

  const outcome = await importOrdersOnce(
    {
      syncState,
      gateway: context.gateway,
      commerce: context.commerce,
      events: context.events,
      logger,
      now: context.now
    },
    { tenantId: input.tenantId, channel: input.channel, retryFailedRefs: true }
  );

  const after = await detectDrift(context, input);
  const result: DriftRepairOutcome = {
    detected: before.length,
    repaired: outcome.imported,
    remaining: after.length
  };
  logger.info("drift.repair.completed", {
    tenantId: input.tenantId,
    channel: input.channel,
    detected: result.detected,
    repaired: result.repaired,
    remaining: result.remaining
  });
  return result;
}
