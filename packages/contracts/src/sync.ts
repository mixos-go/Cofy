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
export const SYNC_ENTITIES = ["orders", "listings"] as const;

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
