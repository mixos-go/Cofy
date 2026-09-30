/**
 * Drift reads for the control plane (docs/PLAN.md M4, docs/adr/0014).
 *
 * The control plane owns the durable sync state, so the dashboard read belongs here rather than in
 * the worker: an operator must be able to ask "what is drifting right now" without starting a
 * reconciliation pass. The classification itself is shared (`@platform/contracts`), so this read and
 * the worker's repair pass cannot disagree about what counts as drift.
 */

import { orderRefsToDrift, summarizeDrift } from "@platform/contracts";
import type { ChannelCode, DriftSummary, TenantId } from "@platform/contracts";
import type { SyncStateStore } from "@platform/sync-state";

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
  return summarizeDrift({ tenantId: input.tenantId, channel: input.channel, items, observedAt });
}
