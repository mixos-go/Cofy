/**
 * Sync-state contracts (docs/adr/0010).
 *
 * This is platform-owned bookkeeping *about* a channel, not commerce data: the external-order
 * reference, the idempotency record for every outbound write (AGENTS.md §2.4), the SKU ↔
 * channel-variant mapping (ADR 0009), and the pull cursor. It lives in the control-plane registry
 * because it must be unique-constrained, cross-tenant queryable for ops, and must outlive a tenant
 * re-provision. It never holds product, order or stock values — those stay in the tenant data plane.
 */

import type { ChannelCode, ExternalOrderId, Instant, OrderId, TenantId } from "./ids.ts";

/** What a sync cursor is walking. One cursor per (tenant, channel, entity). */
export const SYNC_ENTITIES = ["orders", "listings", "stock"] as const;

export type SyncEntity = (typeof SYNC_ENTITIES)[number];

/**
 * The external-order reference. `(tenantId, channel, externalOrderId)` is unique, which is the
 * constraint ADR 0002 relies on to make a duplicate delivery a no-op.
 *
 * `reserved` is written before the Medusa order exists. `committed` is written after. A row stuck
 * in `reserved` is the signal reconciliation looks for (a partial commit between the two stores,
 * ADR 0010's accepted failure mode). `failed` records a known-bad import.
 */
export const CHANNEL_ORDER_REF_STATUSES = ["reserved", "committed", "failed"] as const;

export type ChannelOrderRefStatus = (typeof CHANNEL_ORDER_REF_STATUSES)[number];

export interface ChannelOrderRef {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly externalOrderId: ExternalOrderId;
  /** Our order id. Null only while `reserved`, before the Medusa order was created. */
  readonly orderId: OrderId | null;
  readonly status: ChannelOrderRefStatus;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/**
 * Idempotency record for an outbound write (AGENTS.md §2.4). Claimed *before* the call, completed
 * after, so a crash mid-write replays rather than double-writes.
 *
 * `fingerprint` is a digest of the request. The same key with a different fingerprint is a
 * programming error, not a retry, and is rejected rather than silently replayed.
 */
export const IDEMPOTENCY_OUTCOMES = ["in_progress", "succeeded", "failed"] as const;

export type IdempotencyOutcome = (typeof IDEMPOTENCY_OUTCOMES)[number];

export interface IdempotencyRecord {
  readonly tenantId: TenantId;
  readonly key: string;
  readonly operation: string;
  readonly fingerprint: string;
  readonly outcome: IdempotencyOutcome;
  /** Opaque JSON the operation returned, replayed to a caller that retries the same key. */
  readonly result: unknown;
  /**
   * Lease deadline while `in_progress`; null once the claim is terminal.
   *
   * A crashed attempt would otherwise hold the key forever and make every later retry a skip
   * rather than a repair. After this instant another attempt may take the key over, which is why
   * the value is part of the durable record rather than the holder's memory.
   */
  readonly expiresAt: Instant | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/** How a claim attempt resolved. */
export type IdempotencyClaim =
  | { readonly kind: "claimed" }
  | { readonly kind: "replay"; readonly record: IdempotencyRecord }
  | { readonly kind: "in_flight"; readonly record: IdempotencyRecord };

/**
 * The mapping ADR 0009 produces: one of our SKUs to the ids a channel needs to address it for a
 * stock push. `externalInventoryId` is null when the channel addresses inventory by variant alone.
 */
export interface ChannelSkuMap {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly sku: string;
  readonly externalProductId: string;
  readonly externalSkuId: string;
  readonly externalInventoryId: string | null;
  readonly updatedAt: Instant;
}

/**
 * Pull cursor. `cursor` is the opaque connector value from the last *committed* page; advancing it
 * only after a commit is what makes a re-run resume rather than skip. `null` means "caught up".
 */
export interface SyncCursorRecord {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly entity: SyncEntity;
  readonly cursor: string | null;
  readonly updatedAt: Instant;
}

/**
 * How an order ref is drifting from reality (docs/adr/0014).
 *
 * Both kinds are read straight off the ref's own state rather than stored in a second table: the
 * ref already records what happened, and a parallel drift row would be a second source of truth to
 * keep in step. Drift is therefore *derived* — which also means it cannot itself drift.
 *
 * - `failed_import` — the ref is `failed`: the import was attempted and gave up. A known-bad order
 *   that will never converge on its own.
 * - `stale_reservation` — the ref is `reserved` past the point where the attempt holding it could
 *   still be alive. This is ADR 0010's accepted "partial commit between the two stores": the
 *   reservation exists, the Medusa order may or may not.
 */
export const DRIFT_KINDS = ["failed_import", "stale_reservation"] as const;

export type DriftKind = (typeof DRIFT_KINDS)[number];

/** One drifting order ref, with enough to repair it and to time the repair. */
export interface DriftItem {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly externalOrderId: ExternalOrderId;
  readonly kind: DriftKind;
  /** When the ref last changed. Repair latency is measured from here. */
  readonly since: Instant;
}

/**
 * Unresolved drift for one target, as the dashboard shows it.
 *
 * `total` is the number the M4 exit criterion watches: it must return to zero after repair. It is
 * counted rather than inferred from the items so a dashboard read does not have to materialise a
 * tenant's whole backlog.
 */
export interface DriftSummary {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly failedImport: number;
  readonly staleReservation: number;
  readonly total: number;
  /** When the count was taken, so a dashboard can show staleness of the reading itself. */
  readonly observedAt: Instant;
}

/**
 * A reservation older than this is drift: no attempt is still holding it.
 *
 * Well above the idempotency lease (`DEFAULT_IDEMPOTENCY_LEASE_MS`, five minutes) because the lease
 * is what bounds a single attempt: once it has passed and the ref is still `reserved`, no live
 * attempt can be mid-import, so the reservation is a partial commit between the two stores rather
 * than work in progress. The gap above the lease leaves room for a slow-but-alive attempt.
 */
export const DEFAULT_STALE_RESERVATION_MS = 15 * 60 * 1000;

/**
 * How long a stock change may take to reach a channel: the platform's declared sync SLO.
 *
 * ADR 0002 accepts eventual consistency for stock but requires that we *state* the bound rather
 * than leave it implied, because that number is what a seller is promised and what an operator
 * sizes the reconciliation cadence against. The value is a product decision, not a tuning knob:
 * a seller corrects stock so a marketplace stops overselling, so the window is small; it is also
 * spend against a marketplace's shared app-key budget, so it cannot be arbitrarily tight.
 *
 * It is the *upper bound on the reconciliation cadence*, not on one pass: a pull-driven
 * convergence can only be as fresh as the interval between passes, so a cadence longer than this
 * cannot meet the promise (`cadenceMeetsSyncSlo` makes that checkable, and the worker refuses to
 * start on a cadence that fails it). The other half of the budget — how long one pass takes — is
 * bounded by the governor's per-call limits and is measured in production, not asserted here.
 */
export const CHANNEL_SYNC_SLO_SECONDS = 300;

/**
 * Whether a reconciliation cadence can meet the declared sync SLO.
 *
 * The pull path is the source of truth (ADR 0002), so a stock change is reflected at the next
 * pass. A cadence longer than the SLO therefore promises freshness the system cannot deliver,
 * which is the failure this predicate exists to make impossible to configure silently.
 */
export function cadenceMeetsSyncSlo(intervalSeconds: number): boolean {
  return Number.isFinite(intervalSeconds) && intervalSeconds > 0 && intervalSeconds <= CHANNEL_SYNC_SLO_SECONDS;
}

/**
 * Classify one order ref, or null when it is not drifting.
 *
 * Pure and shared so the worker's repair pass and the control plane's dashboard cannot disagree
 * about what counts as drift: both call this over the same refs, with the same threshold.
 */
export function classifyOrderRefDrift(
  ref: ChannelOrderRef,
  input: { readonly now: Instant; readonly staleReservationMs: number }
): DriftKind | null {
  if (ref.status === "failed") return "failed_import";
  if (ref.status === "committed") return null;
  const age = new Date(input.now).getTime() - new Date(ref.updatedAt).getTime();
  return age >= input.staleReservationMs ? "stale_reservation" : null;
}

/** Project refs into the drifting ones, preserving order. */
export function orderRefsToDrift(
  refs: readonly ChannelOrderRef[],
  input: { readonly now: Instant; readonly staleReservationMs: number }
): readonly DriftItem[] {
  const items: DriftItem[] = [];
  for (const ref of refs) {
    const kind = classifyOrderRefDrift(ref, input);
    if (kind === null) continue;
    items.push({
      tenantId: ref.tenantId,
      channel: ref.channel,
      externalOrderId: ref.externalOrderId,
      kind,
      since: ref.updatedAt
    });
  }
  return items;
}

/** Count drifting refs into the shape a dashboard reads. Pure, so both planes agree on the totals. */
export function summarizeDrift(input: {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly items: readonly DriftItem[];
  readonly observedAt: Instant;
}): DriftSummary {
  let failedImport = 0;
  let staleReservation = 0;
  for (const item of input.items) {
    if (item.kind === "failed_import") failedImport += 1;
    else staleReservation += 1;
  }
  return {
    tenantId: input.tenantId,
    channel: input.channel,
    failedImport,
    staleReservation,
    total: failedImport + staleReservation,
    observedAt: input.observedAt
  };
}
