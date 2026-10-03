/**
 * Postgres sync-state store (docs/adr/0010).
 *
 * The durable implementation of the interface `@platform/sync-state` defines; the in-memory store
 * exists for tests and local runs. It lives in the control plane because that is the database which
 * owns platform bookkeeping, and because the boundary rules permit a SQL driver only here and in
 * `tenant-client` (AGENTS.md §2.3) — the worker reaches this store over HTTP, never by importing it.
 *
 * It holds platform bookkeeping only, never commerce data. Tables live in the shared `platform_ops`
 * schema beside the deletion schedule, so they are not tenant data and outlive a tenant re-provision
 * (ADR 0010's rejection of "store sync state in the tenant's schema").
 *
 * The behaviour mirrors `InMemorySyncStateStore` exactly, because the workflows must behave the same
 * whether they run against a test double or a database. Where a rule needs several statements to
 * hold (a commit is final; a claim is a stealable lease), the statements run in one transaction with
 * `select ... for update`, so two workers racing on the same key cannot both proceed.
 */

import { Pool } from "pg";
import type { PoolClient } from "pg";
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
import { leaseDeadline } from "@platform/sync-state";
import type { OrderRefReservation, ReserveOrderRefInput, SyncStateStore } from "@platform/sync-state";
import { assertSafePlatformSchema, DEFAULT_PLATFORM_SCHEMA } from "./platform-schema.ts";

interface OrderRefRow {
  readonly tenant_id: string;
  readonly channel: string;
  readonly external_order_id: string;
  readonly order_id: string | null;
  readonly status: string;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface IdempotencyRow {
  readonly tenant_id: string;
  readonly key: string;
  readonly operation: string;
  readonly fingerprint: string;
  readonly outcome: string;
  readonly result: unknown;
  readonly expires_at: Date | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}

interface SkuMapRow {
  readonly tenant_id: string;
  readonly channel: string;
  readonly sku: string;
  readonly external_product_id: string;
  readonly external_sku_id: string;
  readonly external_inventory_id: string | null;
  readonly updated_at: Date;
}

interface CursorRow {
  readonly tenant_id: string;
  readonly channel: string;
  readonly entity: string;
  readonly cursor: string | null;
  readonly updated_at: Date;
}

function instant(value: Date | string): Instant {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function orderRefFromRow(row: OrderRefRow): ChannelOrderRef {
  return {
    tenantId: row.tenant_id,
    channel: row.channel as ChannelCode,
    externalOrderId: row.external_order_id,
    orderId: row.order_id,
    status: row.status as ChannelOrderRef["status"],
    createdAt: instant(row.created_at),
    updatedAt: instant(row.updated_at)
  };
}

function idempotencyFromRow(row: IdempotencyRow): IdempotencyRecord {
  return {
    tenantId: row.tenant_id,
    key: row.key,
    operation: row.operation,
    fingerprint: row.fingerprint,
    outcome: row.outcome as IdempotencyOutcome,
    result: row.result,
    expiresAt: row.expires_at === null ? null : instant(row.expires_at),
    createdAt: instant(row.created_at),
    updatedAt: instant(row.updated_at)
  };
}

function skuMapFromRow(row: SkuMapRow): ChannelSkuMap {
  return {
    tenantId: row.tenant_id,
    channel: row.channel as ChannelCode,
    sku: row.sku,
    externalProductId: row.external_product_id,
    externalSkuId: row.external_sku_id,
    externalInventoryId: row.external_inventory_id,
    updatedAt: instant(row.updated_at)
  };
}

function cursorFromRow(row: CursorRow): SyncCursorRecord {
  return {
    tenantId: row.tenant_id,
    channel: row.channel as ChannelCode,
    entity: row.entity as SyncEntity,
    cursor: row.cursor,
    updatedAt: instant(row.updated_at)
  };
}

export interface PostgresSyncStateStoreOptions {
  /** Schema the platform bookkeeping tables live in. Defaults to `platform_ops`. */
  readonly schema?: string;
  /** Max pool size. Kept small: this store does short, indexed statements. */
  readonly maxConnections?: number;
}

export class PostgresSyncStateStore implements SyncStateStore {
  readonly #pool: Pool;
  readonly #schema: string;
  #schemaReady: Promise<void> | null = null;

  constructor(connectionString: string, options: PostgresSyncStateStoreOptions = {}) {
    const schema = options.schema ?? DEFAULT_PLATFORM_SCHEMA;
    // Rejects anything that is not a bare identifier before it reaches an interpolated DDL string.
    assertSafePlatformSchema(schema);
    this.#schema = schema;
    this.#pool = new Pool({ connectionString, max: options.maxConnections ?? 4 });
  }

  /**
   * Create the bookkeeping tables once per process.
   *
   * Memoized rather than run per statement (as the deletion-schedule store does): this store is on
   * the hot path of every import and push, so a DDL round trip per call would be pure overhead.
   * `create ... if not exists` keeps a restart a no-op and makes two processes starting together a
   * race that both win.
   */
  #ensureSchema(): Promise<void> {
    this.#schemaReady ??= (async () => {
      const s = this.#schema;
      await this.#pool.query(`create schema if not exists ${s}`);
      await this.#pool.query(
        `create table if not exists ${s}.channel_order_refs (
           tenant_id text not null,
           channel text not null,
           external_order_id text not null,
           order_id text,
           status text not null check (status in ('reserved', 'committed', 'failed')),
           created_at timestamptz not null,
           updated_at timestamptz not null,
           primary key (tenant_id, channel, external_order_id)
         )`
      );
      // The primary key is (tenant, channel, external_order_id), which cannot serve a lookup by
      // order id — the caller of `findOrderRefByOrderId` has an order and not a channel, so the
      // index has to lead with the columns it does have (ADR 0016). Partial on `order_id is not
      // null` because a `reserved` ref has no order yet and can never match.
      await this.#pool.query(
        `create index if not exists channel_order_refs_order_idx
           on ${s}.channel_order_refs (tenant_id, order_id)
           where order_id is not null`
      );
      await this.#pool.query(
        `create table if not exists ${s}.idempotency_records (
           tenant_id text not null,
           key text not null,
           operation text not null,
           fingerprint text not null,
           outcome text not null check (outcome in ('in_progress', 'succeeded', 'failed')),
           result jsonb,
           expires_at timestamptz,
           created_at timestamptz not null,
           updated_at timestamptz not null,
           primary key (tenant_id, key)
         )`
      );
      await this.#pool.query(
        `create table if not exists ${s}.channel_sku_maps (
           tenant_id text not null,
           channel text not null,
           sku text not null,
           external_product_id text not null,
           external_sku_id text not null,
           external_inventory_id text,
           updated_at timestamptz not null,
           primary key (tenant_id, channel, sku)
         )`
      );
      await this.#pool.query(
        `create table if not exists ${s}.sync_cursors (
           tenant_id text not null,
           channel text not null,
           entity text not null,
           cursor text,
           updated_at timestamptz not null,
           primary key (tenant_id, channel, entity)
         )`
      );
    })();
    return this.#schemaReady;
  }

  async #withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.#pool.connect();
    try {
      await client.query("begin");
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async reserveOrderRef(input: ReserveOrderRefInput): Promise<OrderRefReservation> {
    await this.#ensureSchema();
    // `on conflict do nothing returning` is the atomic form of "claim if free, otherwise read what
    // is there": two concurrent deliveries cannot both insert, so exactly one sees a reserved row.
    const inserted = await this.#pool.query<OrderRefRow>(
      `insert into ${this.#schema}.channel_order_refs
         (tenant_id, channel, external_order_id, order_id, status, created_at, updated_at)
       values ($1, $2, $3, null, 'reserved', $4, $4)
       on conflict (tenant_id, channel, external_order_id) do nothing
       returning *`,
      [input.tenantId, input.channel, input.externalOrderId, input.now]
    );
    const row = inserted.rows[0];
    if (row !== undefined) return { kind: "reserved", ref: orderRefFromRow(row) };

    const existing = await this.getOrderRef(input.tenantId, input.channel, input.externalOrderId);
    if (existing === null) {
      // Only reachable if the conflicting row was deleted between the insert and the read, which no
      // code path does. Fail loudly rather than invent a reservation.
      throw new PlatformError("CONFLICT", "Order ref vanished between reserve and read.", {
        details: { tenantId: input.tenantId, channel: input.channel, externalOrderId: input.externalOrderId }
      });
    }
    return { kind: "exists", ref: existing };
  }

  async commitOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    orderId: OrderId,
    now: Instant
  ): Promise<ChannelOrderRef> {
    await this.#ensureSchema();
    return this.#withTx(async (client) => {
      const current = await this.#lockedOrderRef(client, tenantId, channel, externalOrderId);
      if (current.status === "committed") {
        // A committed ref is final. Re-committing with a different order id would mean two Medusa
        // orders for one channel order, which is the failure this whole ref exists to prevent.
        if (current.orderId !== orderId) {
          throw new PlatformError("CONFLICT", "Order ref was already committed with a different order id.", {
            details: { tenantId, channel, externalOrderId, orderId }
          });
        }
        return current;
      }

      const updated = await client.query<OrderRefRow>(
        `update ${this.#schema}.channel_order_refs
           set order_id = $4, status = 'committed', updated_at = $5
         where tenant_id = $1 and channel = $2 and external_order_id = $3
         returning *`,
        [tenantId, channel, externalOrderId, orderId, now]
      );
      return orderRefFromRow(updated.rows[0]!);
    });
  }

  async failOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    now: Instant
  ): Promise<ChannelOrderRef> {
    await this.#ensureSchema();
    return this.#withTx(async (client) => {
      const current = await this.#lockedOrderRef(client, tenantId, channel, externalOrderId);
      if (current.status === "committed") {
        throw new PlatformError("CONFLICT", "A committed order ref cannot be marked failed.", {
          details: { tenantId, channel, externalOrderId }
        });
      }
      const updated = await client.query<OrderRefRow>(
        `update ${this.#schema}.channel_order_refs
           set status = 'failed', updated_at = $4
         where tenant_id = $1 and channel = $2 and external_order_id = $3
         returning *`,
        [tenantId, channel, externalOrderId, now]
      );
      return orderRefFromRow(updated.rows[0]!);
    });
  }

  async #lockedOrderRef(
    client: PoolClient,
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string
  ): Promise<ChannelOrderRef> {
    const result = await client.query<OrderRefRow>(
      `select * from ${this.#schema}.channel_order_refs
        where tenant_id = $1 and channel = $2 and external_order_id = $3
        for update`,
      [tenantId, channel, externalOrderId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new PlatformError("NOT_FOUND", "No reserved order ref to update.", {
        details: { tenantId, channel, externalOrderId }
      });
    }
    return orderRefFromRow(row);
  }

  async getOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string
  ): Promise<ChannelOrderRef | null> {
    await this.#ensureSchema();
    const result = await this.#pool.query<OrderRefRow>(
      `select * from ${this.#schema}.channel_order_refs
        where tenant_id = $1 and channel = $2 and external_order_id = $3`,
      [tenantId, channel, externalOrderId]
    );
    const row = result.rows[0];
    return row === undefined ? null : orderRefFromRow(row);
  }

  async listOrderRefs(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly status?: ChannelOrderRefStatus;
    readonly limit?: number;
  }): Promise<readonly ChannelOrderRef[]> {
    await this.#ensureSchema();
    // `$3 is null or status = $3` keeps one statement for both the filtered and unfiltered read, so
    // the two cannot drift. The order matches the in-memory store: oldest first, then by id, which
    // makes a bounded repair pass deterministic.
    const result = await this.#pool.query<OrderRefRow>(
      `select * from ${this.#schema}.channel_order_refs
        where tenant_id = $1 and channel = $2 and ($3::text is null or status = $3)
        order by updated_at asc, external_order_id asc
        limit $4`,
      [input.tenantId, input.channel, input.status ?? null, input.limit ?? null]
    );
    return result.rows.map(orderRefFromRow);
  }

  async findOrderRefByOrderId(tenantId: TenantId, orderId: OrderId): Promise<ChannelOrderRef | null> {
    await this.#ensureSchema();
    // `limit 1` rather than a full scan: one order belongs to one channel order in practice, so the
    // index lookup is exact. Ordering by `channel` makes the answer deterministic in the one case
    // where a merge did attach a second reference.
    const result = await this.#pool.query<OrderRefRow>(
      `select * from ${this.#schema}.channel_order_refs
        where tenant_id = $1 and order_id = $2
        order by channel asc
        limit 1`,
      [tenantId, orderId]
    );
    return result.rows[0] === undefined ? null : orderRefFromRow(result.rows[0]);
  }

  async reopenOrderRef(
    tenantId: TenantId,
    channel: ChannelCode,
    externalOrderId: string,
    now: Instant
  ): Promise<ChannelOrderRef> {
    await this.#ensureSchema();
    return this.#withTx(async (client) => {
      const current = await this.#lockedOrderRef(client, tenantId, channel, externalOrderId);
      if (current.status === "committed") {
        throw new PlatformError("CONFLICT", "A committed order ref cannot be reopened.", {
          details: { tenantId, channel, externalOrderId }
        });
      }
      if (current.status === "reserved") return current;

      const updated = await client.query<OrderRefRow>(
        `update ${this.#schema}.channel_order_refs
           set status = 'reserved', order_id = null, updated_at = $4
         where tenant_id = $1 and channel = $2 and external_order_id = $3
         returning *`,
        [tenantId, channel, externalOrderId, now]
      );
      return orderRefFromRow(updated.rows[0]!);
    });
  }

  async claimIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly operation: string;
    readonly fingerprint: string;
    readonly leaseTtlMs?: number;
    readonly now: Instant;
  }): Promise<IdempotencyClaim> {
    // Validate before touching the database, so a bad TTL is rejected identically to the in-memory
    // store instead of creating a row with an already-expired lease.
    const deadline = leaseDeadline(input.leaseTtlMs, input.now);
    await this.#ensureSchema();

    return this.#withTx(async (client) => {
      const existing = await this.#lockedIdempotency(client, input.tenantId, input.key);
      if (existing !== undefined) {
        return this.#claimFromExisting(client, existing, input.fingerprint, deadline, input.now);
      }

      const inserted = await client.query<IdempotencyRow>(
        `insert into ${this.#schema}.idempotency_records
           (tenant_id, key, operation, fingerprint, outcome, result, expires_at, created_at, updated_at)
         values ($1, $2, $3, $4, 'in_progress', null, $5, $6, $6)
         on conflict (tenant_id, key) do nothing
         returning *`,
        [input.tenantId, input.key, input.operation, input.fingerprint, deadline, input.now]
      );
      if (inserted.rowCount === 1) return { kind: "claimed" };

      // Another process inserted between our lock attempt and our insert. Re-read under the lock so
      // we resolve the winner's row rather than treating the conflict as a claim we own.
      const raced = await this.#lockedIdempotency(client, input.tenantId, input.key);
      if (raced === undefined) {
        throw new PlatformError("CONFLICT", "Idempotency row vanished during claim.", {
          details: { key: input.key }
        });
      }
      return this.#claimFromExisting(client, raced, input.fingerprint, deadline, input.now);
    });
  }

  async #claimFromExisting(
    client: PoolClient,
    existing: IdempotencyRecord,
    fingerprint: string,
    deadline: Instant,
    now: Instant
  ): Promise<IdempotencyClaim> {
    // A key is bound to one request forever. Reusing it for different input is a bug in the caller,
    // and replaying the old result would hide it (AGENTS.md §2.4).
    if (existing.fingerprint !== fingerprint) {
      throw new PlatformError("IDEMPOTENCY_CONFLICT", "This idempotency key was used for different input.", {
        details: { key: existing.key, operation: existing.operation }
      });
    }
    if (existing.outcome === "in_progress") {
      // A lease whose holder died must be stealable, or a single crash would freeze this key forever.
      if (existing.expiresAt !== null && existing.expiresAt <= now) {
        // Clear the result: the failed holder may have left a partial one, and a replay must never
        // hand a later caller a value nothing completed.
        await client.query(
          `update ${this.#schema}.idempotency_records
             set outcome = 'in_progress', result = null, expires_at = $4, updated_at = $3
           where tenant_id = $1 and key = $2`,
          [existing.tenantId, existing.key, now, deadline]
        );
        return { kind: "claimed" };
      }
      return { kind: "in_flight", record: existing };
    }
    if (existing.outcome === "failed") {
      // A failed attempt is retryable, and reconciliation's repair depends on it: a replay here
      // would report the operation as done while its recorded result is the failure, so the retry
      // could never happen. Only `succeeded` is terminal (see `completeIdempotency`).
      await client.query(
        `update ${this.#schema}.idempotency_records
           set outcome = 'in_progress', result = null, expires_at = $4, updated_at = $3
         where tenant_id = $1 and key = $2`,
        [existing.tenantId, existing.key, now, deadline]
      );
      return { kind: "claimed" };
    }
    return { kind: "replay", record: existing };
  }

  async completeIdempotency(input: {
    readonly tenantId: TenantId;
    readonly key: string;
    readonly outcome: Exclude<IdempotencyOutcome, "in_progress">;
    readonly result: unknown;
    readonly now: Instant;
  }): Promise<IdempotencyRecord> {
    await this.#ensureSchema();
    return this.#withTx(async (client) => {
      const existing = await this.#lockedIdempotency(client, input.tenantId, input.key);
      if (existing === undefined) {
        throw new PlatformError("NOT_FOUND", "No claimed idempotency key to complete.", {
          details: { key: input.key }
        });
      }
      // Two attempts can hold the same key when a lease was stolen from a slow (not dead) holder,
      // and both can then succeed against an idempotent upstream. The second `succeeded` is the same
      // fact restated, so it is accepted — not a conflict the workflow would misread as a failure.
      if (existing.outcome === "succeeded" && input.outcome === "succeeded") return existing;
      if (existing.outcome === "succeeded") {
        throw new PlatformError("CONFLICT", "This idempotency key already succeeded.", {
          details: { key: input.key }
        });
      }

      const updated = await client.query<IdempotencyRow>(
        `update ${this.#schema}.idempotency_records
           set outcome = $3, result = $4, expires_at = null, updated_at = $5
         where tenant_id = $1 and key = $2
         returning *`,
        [input.tenantId, input.key, input.outcome, input.result ?? null, input.now]
      );
      return idempotencyFromRow(updated.rows[0]!);
    });
  }

  async getIdempotency(tenantId: TenantId, key: string): Promise<IdempotencyRecord | null> {
    await this.#ensureSchema();
    const result = await this.#pool.query<IdempotencyRow>(
      `select * from ${this.#schema}.idempotency_records where tenant_id = $1 and key = $2`,
      [tenantId, key]
    );
    const row = result.rows[0];
    return row === undefined ? null : idempotencyFromRow(row);
  }

  async abandonIdempotency(tenantId: TenantId, key: string, now: Instant): Promise<IdempotencyRecord | null> {
    await this.#ensureSchema();
    return this.#withTx(async (client) => {
      const existing = await this.#lockedIdempotency(client, tenantId, key);
      if (existing === undefined) return null;
      if (existing.outcome !== "in_progress") {
        // `succeeded` is a completed write and `failed` is a signal reconciliation owns. Removing
        // either would erase a fact, so only a claim that never reached the channel may be released.
        throw new PlatformError("CONFLICT", "Only an in-progress idempotency claim can be abandoned.", {
          details: { key, outcome: existing.outcome }
        });
      }
      // Delete rather than mark: the key is unclaimed again, so the rescheduled retry claims it
      // fresh. Nothing was written under it, so there is no operation to bind a retry to.
      await client.query(
        `delete from ${this.#schema}.idempotency_records where tenant_id = $1 and key = $2`,
        [tenantId, key]
      );
      return { ...existing, updatedAt: now };
    });
  }

  async #lockedIdempotency(
    client: PoolClient,
    tenantId: TenantId,
    key: string
  ): Promise<IdempotencyRecord | undefined> {
    const result = await client.query<IdempotencyRow>(
      `select * from ${this.#schema}.idempotency_records
        where tenant_id = $1 and key = $2
        for update`,
      [tenantId, key]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : idempotencyFromRow(row);
  }

  async upsertSkuMap(entry: ChannelSkuMap): Promise<ChannelSkuMap> {
    await this.#ensureSchema();
    await this.#pool.query(
      `insert into ${this.#schema}.channel_sku_maps
         (tenant_id, channel, sku, external_product_id, external_sku_id, external_inventory_id, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (tenant_id, channel, sku) do update set
         external_product_id = excluded.external_product_id,
         external_sku_id = excluded.external_sku_id,
         external_inventory_id = excluded.external_inventory_id,
         updated_at = excluded.updated_at`,
      [
        entry.tenantId,
        entry.channel,
        entry.sku,
        entry.externalProductId,
        entry.externalSkuId,
        entry.externalInventoryId,
        entry.updatedAt
      ]
    );
    return entry;
  }

  async getSkuMap(tenantId: TenantId, channel: ChannelCode, sku: string): Promise<ChannelSkuMap | null> {
    await this.#ensureSchema();
    const result = await this.#pool.query<SkuMapRow>(
      `select * from ${this.#schema}.channel_sku_maps
        where tenant_id = $1 and channel = $2 and sku = $3`,
      [tenantId, channel, sku]
    );
    const row = result.rows[0];
    return row === undefined ? null : skuMapFromRow(row);
  }

  async listSkuMaps(tenantId: TenantId, channel: ChannelCode): Promise<readonly ChannelSkuMap[]> {
    await this.#ensureSchema();
    const result = await this.#pool.query<SkuMapRow>(
      `select * from ${this.#schema}.channel_sku_maps
        where tenant_id = $1 and channel = $2
        order by sku`,
      [tenantId, channel]
    );
    return result.rows.map(skuMapFromRow);
  }

  async getCursor(
    tenantId: TenantId,
    channel: ChannelCode,
    entity: SyncEntity
  ): Promise<SyncCursorRecord | null> {
    await this.#ensureSchema();
    const result = await this.#pool.query<CursorRow>(
      `select * from ${this.#schema}.sync_cursors
        where tenant_id = $1 and channel = $2 and entity = $3`,
      [tenantId, channel, entity]
    );
    const row = result.rows[0];
    return row === undefined ? null : cursorFromRow(row);
  }

  async setCursor(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly entity: SyncEntity;
    readonly cursor: string | null;
    readonly now: Instant;
  }): Promise<SyncCursorRecord> {
    await this.#ensureSchema();
    await this.#pool.query(
      `insert into ${this.#schema}.sync_cursors (tenant_id, channel, entity, cursor, updated_at)
       values ($1, $2, $3, $4, $5)
       on conflict (tenant_id, channel, entity) do update set
         cursor = excluded.cursor,
         updated_at = excluded.updated_at`,
      [input.tenantId, input.channel, input.entity, input.cursor, input.now]
    );
    return {
      tenantId: input.tenantId,
      channel: input.channel,
      entity: input.entity,
      cursor: input.cursor,
      updatedAt: input.now
    };
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}