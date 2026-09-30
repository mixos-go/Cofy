/**
 * Drift reads for the control plane (docs/PLAN.md M4, docs/adr/0014).
 *
 * The control plane owns the durable sync state, so the dashboard read belongs here rather than in
 * the worker: an operator must be able to ask "what is drifting right now" without starting a
 * reconciliation pass. The classification itself is shared (`@platform/contracts`), so this read and
 * the worker's repair pass cannot disagree about what counts as drift.
 */

import { orderRefsToDrift, summarizeDrift } from "@platform/contracts";
import type { ChannelCode, DriftItem, DriftKind, DriftSummary, TenantId } from "@platform/contracts";
import type { SyncStateStore } from "@platform/sync-state";

export interface DriftRead {
  readonly summary: DriftSummary;
  readonly items: readonly DriftItem[];
}

/**
 * Read the drifting refs for one target, with the summary derived from the same items.
 *
 * The two are returned together rather than read twice so a dashboard's count and its list can
 * never disagree — a second pass over the store could see a repair land in between and show a total
 * that does not match the rows beneath it.
 */
export async function driftFor(
  store: SyncStateStore,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly staleReservationMs: number;
    readonly maxRefsPerPass: number;
    readonly now?: () => Date;
  }
): Promise<DriftRead> {
  const observedAt = (input.now ?? ((): Date => new Date()))().toISOString();
  const failed = await store.listOrderRefs({
    tenantId: input.tenantId,
    channel: input.channel,
    status: "failed",
    limit: input.maxRefsPerPass
  });
  const reserved = await store.listOrderRefs({
    tenantId: input.tenantId,
    channel: input.channel,
    status: "reserved",
    limit: input.maxRefsPerPass
  });
  const items = orderRefsToDrift([...failed, ...reserved], {
    now: observedAt,
    staleReservationMs: input.staleReservationMs
  });
  return {
    summary: summarizeDrift({ tenantId: input.tenantId, channel: input.channel, items, observedAt }),
    items
  };
}

/** The counts alone, for callers that do not show the rows. */
export async function driftSummaryFor(
  store: SyncStateStore,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly staleReservationMs: number;
    readonly maxRefsPerPass: number;
    readonly now?: () => Date;
  }
): Promise<DriftSummary> {
  return (await driftFor(store, input)).summary;
}

/**
 * What a seller should read when an order is drifting.
 *
 * One function, not copy per screen: the seller app and the ops console must not describe the same
 * failure differently. The text names the action and talks about the *class* of failure, because the
 * ref records only its own status — a stored cause would be a second source of truth that drifts
 * from the status, which is exactly what ADR 0014 avoids by deriving drift instead of storing it.
 */
export function explainDrift(kind: DriftKind): string {
  return kind === "failed_import"
    ? "This order could not be imported. The most common cause is an order whose SKUs are not in your catalogue; reconciliation retries automatically, so fixing the SKU mapping is usually enough."
    : "An import was interrupted before it finished, so this order may be missing or incomplete. Reconciliation completes or releases it automatically.";
}
