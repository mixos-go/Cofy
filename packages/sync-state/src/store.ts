/**
 * Sync-state store (docs/adr/0010).
 *
 * One interface with two implementations, like the tenant registry: the Postgres store is the real
 * one, the in-memory store is what unit tests and local development use. The interface is small
 * operations rather than a query builder, so the two cannot drift in behaviour.
 *
 * Three guarantees this store must provide, because the workflows rest on them:
 *   1. `(tenant, channel, external_order_id)` is unique — reserve either claims it or reports the
 *      existing row, so a redelivered order is a no-op rather than a second order (ADR 0002).
 *   2. An idempotency key with a captured fingerprint replays; the same key with a *different*
 *      fingerprint is rejected. A retry must never be silently mistaken for a new request.
 *   3. A cursor is advanced only after a commit. The store does not enforce that — the workflow
 *      does — so this file only has to store it faithfully.
 */

import { PlatformError } from "@platform/contracts";
import type {
  ChannelCode,
  ChannelOrderRef,
  ChannelOrderRefStatus,
  ChannelSkuMap,
  IdempotencyClaim,
  IdempotencyOutcome,
  IdempotencyRecord,
  Instant,
  OrderId,
  SyncCursorRecord,
  SyncEntity,
  TenantId
} from "@platform/contracts";

export interface ReserveOrderRefInput {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly externalOrderId: string;
  readonly now: Instant;
}

/** Outcome of reserving an external order reference. */
export type OrderRefReservation =
  | { readonly kind: "reserved"; readonly ref: ChannelOrderRef }
  /** The ref already exists. `status` says whether the earlier import finished. */
  | { readonly kind: "exists"; readonly ref: ChannelOrderRef };

export interface SyncStateStore {
  /**
   * Claim the external-order reference. A repeat for the same `(tenant, channel, externalOrderId)`
   * returns `exists` and never overwrites, so exactly one import can proceed.
   */
  reserveOrderRef(input: ReserveOrderRefInput): Promise<OrderRefReservation>;
  /** Attach our order id and mark the ref committed. Only valid from `reserved`. */
  commitOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    orderId: OrderId,
    now: Instant
  ): Promise<ChannelOrderRef>;
  /** Mark the ref failed, so reconciliation can find a permanently broken import. */
  failOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    now: Instant
  ): Promise<ChannelOrderRef>;
  getOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string
  ): Promise<ChannelOrderRef | null>;

  /**
   * Claim an idempotency key before an outbound write (AGENTS.md §2.4). Returns `replay` when the
   * operation already succeeded, `in_flight` when another attempt holds the key, and `claimed`
   * when this caller now owns it.
   *
   * A claim is a *lease*: if the holder dies, `expiresAt` passes and the next caller steals the
   * key and proceeds. Without that, one crash would make every later retry a skip and only
   * reconciliation could repair it.
   */
  claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
    readonly leaseTtlMs?: number;
    readonly now: Instant;
  }): Promise<IdempotencyClaim>;
  /**
   * Record the outcome of a claimed operation. The result is replayed to later claimants.
   *
   * Completing with an outcome equal to the record's current one is a no-op: a stolen lease can
   * leave two attempts finishing the same operation, and the second `succeeded` must not be an
   * error that the workflow would misread as a failed write.
   */
  completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: Exclude<IdempotencyOutcome, "in_progress">;
    readonly result: unknown;
    readonly now: Instant;
  }): Promise<IdempotencyRecord>;
  getIdempotency(tenantId: TenantId, key: string): Promise<IdempotencyRecord | null>;

  /**
   * Release an `in_progress` claim without recording an outcome, returning the key to unclaimed.
   *
   * This is the primitive a *deferred* attempt needs. When the governor refuses a marketplace call,
   * the workflow claimed the key but never sent anything, so the work is still valid and must run
   * later. Neither terminal outcome is honest: `failed` would tell reconciliation that a throttled
   * call is a broken operation and would make a replay return a result no attempt produced, while
   * leaving it `in_progress` would make the rescheduled retry a no-op until the lease expires.
   *
   * Only an `in_progress` claim can be abandoned. A `succeeded` record is a completed write and a
   * `failed` one is a signal reconciliation owns, so both are refused rather than deleted.
   *
   * Returns the abandoned record, or null when there was nothing to abandon (a retry is safe
   * either way, so this is not an error).
   */
  abandonIdempotency(tenantId: TenantId, key: string, now: Instant): Promise<IdempotencyRecord | null>;

  /** Upsert one SKU → channel variant mapping from a listing import (ADR 0009). */
  upsertSkuMap(entry: ChannelSkuMap): Promise<ChannelSkuMap>;
  getSkuMap(tenantId: TenantId, channel: ChannelCode, sku: string): Promise<ChannelSkuMap | null>;
  listSkuMaps(tenantId: TenantId, channel: ChannelCode): Promise<readonly ChannelSkuMap[]>;

  getCursor(tenantId: TenantId, channel: ChannelCode, entity: SyncEntity): Promise<SyncCursorRecord | null>;
  setCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
    readonly cursor: string | null;
    readonly now: Instant;
  }): Promise<SyncCursorRecord>;
}

function refKey(tenantId: TenantId, channel: ChannelCode, externalOrderId: string): string {
  return `${tenantId}\u0000${channel}\u0000${externalOrderId}`;
}

function cursorKey(tenantId: TenantId, channel: ChannelCode, entity: SyncEntity): string {
  return `${tenantId}\u0000${channel}\u0000${entity}`;
}

/**
 * How long a claim is held before another attempt may steal it.
 *
 * Long enough that a slow-but-alive marketplace call is not preempted (a stolen lease can mean a
 * second call), short enough that a crashed worker does not block that order for the rest of the
 * day. Five minutes is an order of magnitude above any single channel call we make.
 */
export const DEFAULT_IDEMPOTENCY_LEASE_MS = 5 * 60 * 1000;

/**
 * The instant a claim taken at `now` stops being exclusive.
 *
 * Exported so the Postgres store computes the same deadline from the same rule instead of keeping a
 * second copy of it: the two implementations must not drift on a value the safety of a retry depends
 * on. A non-positive TTL is rejected rather than stored as an already-expired lease.
 */
export function leaseDeadline(ttlMs: number | undefined, now: Instant): Instant {
  const ttl = ttlMs ?? DEFAULT_IDEMPOTENCY_LEASE_MS;
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw new RangeError("Idempotency lease TTL must be a positive number of milliseconds.");
  }
  return new Date(new Date(now).getTime() + ttl).toISOString();
}

/**
 * In-memory store. Not durable — its job is to make the workflow's idempotency and compensation
 * behaviour testable without a database, and to mirror the Postgres store's semantics exactly.
 */
export class InMemorySyncStateStore implements SyncStateStore {
  readonly #refs = new Map<string, ChannelOrderRef>();
  readonly #idempotency = new Map<string, IdempotencyRecord>();
  readonly #skuMaps = new Map<string, ChannelSkuMap>();
  readonly #cursors = new Map<string, SyncCursorRecord>();

  async reserveOrderRef(input: ReserveOrderRefInput): Promise<OrderRefReservation> {
    const key = refKey(input.tenantId, input.channel, input.externalOrderId);
    const existing = this.#refs.get(key);
    if (existing !== undefined) return { kind: "exists", ref: existing };

    const ref: ChannelOrderRef = {
      tenantId: input.tenantId,
      channel: input.channel,
      externalOrderId: input.externalOrderId,
      orderId: null,
      status: "reserved",
      createdAt: input.now,
      updatedAt: input.now
    };
    this.#refs.set(key, ref);
    return { kind: "reserved", ref };
  }

  async commitOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    orderId: OrderId,
    now: Instant
  ): Promise<ChannelOrderRef> {
    const key = refKey(tenantId, channel, externalOrderId);
    const existing = this.#refs.get(key);
    if (existing === undefined) {
      throw new PlatformError("NOT_FOUND", "No reserved order ref to commit.", {
        details: { tenantId, channel, externalOrderId }
      });
    }
    if (existing.status === "committed") {
      // A committed ref is final. Re-committing with a different order id would mean two Medusa
      // orders exist for one channel order, which is the failure this whole ref exists to prevent.
      if (existing.orderId !== orderId) {
        throw new PlatformError("CONFLICT", "Order ref was already committed with a different order id.", {
          details: { tenantId, channel, externalOrderId, orderId }
        });
      }
      return existing;
    }

    const committed: ChannelOrderRef = { ...existing, orderId, status: "committed", updatedAt: now };
    this.#refs.set(key, committed);
    return committed;
  }

  async failOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    now: Instant
  ): Promise<ChannelOrderRef> {
    const key = refKey(tenantId, channel, externalOrderId);
    const existing = this.#refs.get(key);
    if (existing === undefined) {
      throw new PlatformError("NOT_FOUND", "No reserved order ref to fail.", {
        details: { tenantId, channel, externalOrderId }
      });
    }
    if (existing.status === "committed") {
      throw new PlatformError("CONFLICT", "A committed order ref cannot be marked failed.", {
        details: { tenantId, channel, externalOrderId }
      });
    }
    const failed: ChannelOrderRef = { ...existing, status: "failed", updatedAt: now };
    this.#refs.set(key, failed);
    return failed;
  }

  async getOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string
  ): Promise<ChannelOrderRef | null> {
    return this.#refs.get(refKey(tenantId, channel, externalOrderId)) ?? null;
  }

  async claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
    readonly leaseTtlMs?: number;
    readonly now: Instant;
  }): Promise<IdempotencyClaim> {
    const mapKey = `${input.tenantId}\u0000${input.key}`;
    const existing = this.#idempotency.get(mapKey);

    if (existing !== undefined) {
      // A key is bound to one request forever. Reusing it for different input is a bug in the
      // caller, and replaying the old result would hide it (AGENTS.md §2.4).
      if (existing.fingerprint !== input.fingerprint) {
        throw new PlatformError("IDEMPOTENCY_CONFLICT", "This idempotency key was used for different input.", {
          details: { key: input.key, operation: input.operation }
        });
      }
      if (existing.outcome === "in_progress") {
        // A lease whose holder died must be stealable, or a single crash would freeze this key
        // forever and turn every retry into a skip.
        if (existing.expiresAt !== null && existing.expiresAt <= input.now) {
          const stolen = this.#reclaim(existing, input.leaseTtlMs, input.now);
          this.#idempotency.set(mapKey, stolen);
          return { kind: "claimed" };
        }
        return { kind: "in_flight", record: existing };
      }
      return { kind: "replay", record: existing };
    }

    const claimed: IdempotencyRecord = {
      tenantId: input.tenantId,
      key: input.key,
      operation: input.operation,
      fingerprint: input.fingerprint,
      outcome: "in_progress",
      result: null,
      expiresAt: leaseDeadline(input.leaseTtlMs, input.now),
      createdAt: input.now,
      updatedAt: input.now
    };
    this.#idempotency.set(mapKey, claimed);
    return { kind: "claimed" };
  }

  async completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: Exclude<IdempotencyOutcome, "in_progress">;
    readonly result: unknown;
    readonly now: Instant;
  }): Promise<IdempotencyRecord> {
    const mapKey = `${input.tenantId}\u0000${input.key}`;
    const existing = this.#idempotency.get(mapKey);
    if (existing === undefined) {
      throw new PlatformError("NOT_FOUND", "No claimed idempotency key to complete.", {
        details: { key: input.key }
      });
    }
    // A failed attempt may be retried, so `failed` can be reopened by a later claim. Only a
    // succeeded record is terminal, and this guard is what stops a success being overwritten.
    if (existing.outcome === "succeeded" && input.outcome === "succeeded") {
      // Two attempts can hold the same key when a lease was stolen from a slow (not dead) holder,
      // and both can then succeed against an idempotent upstream. The second `succeeded` is the
      // same fact restated, so it is accepted rather than reported as a conflict the workflow
      // would misread as a failed write. A `failed` after a success is still rejected.
      return existing;
    }
    if (existing.outcome === "succeeded") {
      throw new PlatformError("CONFLICT", "This idempotency key already succeeded.", {
        details: { key: input.key }
      });
    }
    const updated: IdempotencyRecord = {
      ...existing,
      outcome: input.outcome,
      result: input.result,
      // A terminal record has no lease: there is nothing left to steal.
      expiresAt: null,
      updatedAt: input.now
    };
    this.#idempotency.set(mapKey, updated);
    return updated;
  }

  async getIdempotency(tenantId: TenantId, key: string): Promise<IdempotencyRecord | null> {
    return this.#idempotency.get(`${tenantId}\u0000${key}`) ?? null;
  }

  async abandonIdempotency(tenantId: TenantId, key: string, now: Instant): Promise<IdempotencyRecord | null> {
    const mapKey = `${tenantId}\u0000${key}`;
    const existing = this.#idempotency.get(mapKey);
    if (existing === undefined) return null;
    if (existing.outcome !== "in_progress") {
      // `succeeded` is a completed write and `failed` is a signal reconciliation owns. Removing
      // either would erase a fact, so only a claim that never reached the channel may be released.
      throw new PlatformError("CONFLICT", "Only an in-progress idempotency claim can be abandoned.", {
        details: { key, outcome: existing.outcome }
      });
    }
    // Delete rather than mark: the claim is gone, so the key is unclaimed again and the rescheduled
    // retry claims it fresh. The fingerprint binding goes with it, which is correct — nothing was
    // written under this key, so there is no operation to bind a retry to.
    this.#idempotency.delete(mapKey);
    return { ...existing, updatedAt: now };
  }

  /**
   * Take over an `in_progress` record whose lease has expired.
   *
   * The result is cleared because the failed holder may have left a partial one, and a replay must
   * never hand a later caller a value nothing completed.
   */
  #reclaim(existing: IdempotencyRecord, ttlMs: number | undefined, now: Instant): IdempotencyRecord {
    return {
      ...existing,
      outcome: "in_progress",
      result: null,
      expiresAt: leaseDeadline(ttlMs, now),
      updatedAt: now
    };
  }

  async upsertSkuMap(entry: ChannelSkuMap): Promise<ChannelSkuMap> {
    const key = `${entry.tenantId}\u0000${entry.channel}\u0000${entry.sku}`;
    this.#skuMaps.set(key, entry);
    return entry;
  }

  async getSkuMap(tenantId: TenantId, channel: ChannelCode, sku: string): Promise<ChannelSkuMap | null> {
    return this.#skuMaps.get(`${tenantId}\u0000${channel}\u0000${sku}`) ?? null;
  }

  async listSkuMaps(tenantId: TenantId, channel: ChannelCode): Promise<readonly ChannelSkuMap[]> {
    const prefix = `${tenantId}\u0000${channel}\u0000`;
    return [...this.#skuMaps.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, entry]) => entry);
  }

  async getCursor(
    tenantId: TenantId,
    channel: ChannelCode,
    entity: SyncEntity
  ): Promise<SyncCursorRecord | null> {
    return this.#cursors.get(cursorKey(tenantId, channel, entity)) ?? null;
  }

  async setCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
    readonly cursor: string | null;
    readonly now: Instant;
  }): Promise<SyncCursorRecord> {
    const record: SyncCursorRecord = {
      tenantId: input.tenantId,
      channel: input.channel,
      entity: input.entity,
      cursor: input.cursor,
      updatedAt: input.now
    };
    this.#cursors.set(cursorKey(input.tenantId, input.channel, input.entity), record);
    return record;
  }
}

/** Narrow an order-ref status without letting a typo compile. */
export function isOrderRefStatus(value: string): value is ChannelOrderRefStatus {
  return value === "reserved" || value === "committed" || value === "failed";
}
