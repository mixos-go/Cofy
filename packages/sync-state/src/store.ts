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
   */
  claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
    readonly now: Instant;
  }): Promise<IdempotencyClaim>;
  /** Record the outcome of a claimed operation. The result is replayed to later claimants. */
  completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: Exclude<IdempotencyOutcome, "in_progress">;
    readonly result: unknown;
    readonly now: Instant;
  }): Promise<IdempotencyRecord>;
  getIdempotency(tenantId: TenantId, key: string): Promise<IdempotencyRecord | null>;

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
      if (existing.outcome === "in_progress") return { kind: "in_flight", record: existing };
      return { kind: "replay", record: existing };
    }

    const claimed: IdempotencyRecord = {
      tenantId: input.tenantId,
      key: input.key,
      operation: input.operation,
      fingerprint: input.fingerprint,
      outcome: "in_progress",
      result: null,
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
    if (existing.outcome === "succeeded") {
      throw new PlatformError("CONFLICT", "This idempotency key already succeeded.", {
        details: { key: input.key }
      });
    }
    const updated: IdempotencyRecord = {
      ...existing,
      outcome: input.outcome,
      result: input.result,
      updatedAt: input.now
    };
    this.#idempotency.set(mapKey, updated);
    return updated;
  }

  async getIdempotency(tenantId: TenantId, key: string): Promise<IdempotencyRecord | null> {
    return this.#idempotency.get(`${tenantId}\u0000${key}`) ?? null;
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
