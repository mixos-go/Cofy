/**
 * Sync-state store tests.
 *
 * These assert the guarantees the import and push workflows rest on: a redelivered order is a
 * no-op, an idempotency key is bound to one request, a committed ref is final, and a cursor is
 * stored faithfully. They are not a test of the storage mechanism — they are a test of the rules
 * ADR 0010 promises the rest of the system.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import { InMemorySyncStateStore } from "../src/store.ts";

const NOW = "2026-09-26T00:00:00.000Z";

function store(): InMemorySyncStateStore {
  return new InMemorySyncStateStore();
}

test("reserving the same external order twice returns the existing ref, never a second one", async () => {
  const state = store();
  const first = await state.reserveOrderRef({
    tenantId: "tnt-a",
    channel: "shopee",
    externalOrderId: "ext-1",
    now: NOW
  });
  const second = await state.reserveOrderRef({
    tenantId: "tnt-a",
    channel: "shopee",
    externalOrderId: "ext-1",
    now: NOW
  });

  assert.equal(first.kind, "reserved");
  assert.equal(second.kind, "exists");
  // A duplicate delivery must be a no-op at the store, not a second reservable slot (ADR 0002).
  if (second.kind === "exists") assert.equal(second.ref.status, "reserved");
});

test("the same external order on a different channel is a separate ref", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  const other = await state.reserveOrderRef({
    tenantId: "tnt-a",
    channel: "tiktok_tokopedia",
    externalOrderId: "ext-1",
    now: NOW
  });

  assert.equal(other.kind, "reserved");
});

test("the same external order for a different tenant is a separate ref", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  const other = await state.reserveOrderRef({
    tenantId: "tnt-b",
    channel: "shopee",
    externalOrderId: "ext-1",
    now: NOW
  });

  assert.equal(other.kind, "reserved");
});

test("committing a ref attaches the order id and makes it final", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  const committed = await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);

  assert.equal(committed.status, "committed");
  assert.equal(committed.orderId, "order-1");
});

test("re-committing a ref with a different order id is rejected, not overwritten", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);

  // Two Medusa orders for one channel order is exactly the failure the ref exists to prevent.
  await assert.rejects(
    () => state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-2", NOW),
    (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
  );
});

test("a committed ref cannot be marked failed", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);

  await assert.rejects(
    () => state.failOrderRef("tnt-a", "shopee", "ext-1", NOW),
    (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
  );
});

test("a reserved ref can be failed so reconciliation can find it", async () => {
  const state = store();
  await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
  const failed = await state.failOrderRef("tnt-a", "shopee", "ext-1", NOW);

  assert.equal(failed.status, "failed");
  assert.equal(failed.orderId, null);
});

test("a fresh idempotency key is claimed rather than replayed", async () => {
  const state = store();
  const claim = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    now: NOW
  });

  assert.equal(claim.kind, "claimed");
});

test("a second caller while the first is in flight sees in_flight, not a second claim", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
  const second = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    now: NOW
  });

  assert.equal(second.kind, "in_flight");
});

test("a completed operation replays its recorded result instead of re-running", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
  await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: { pushed: 3 }, now: NOW });

  const replay = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    now: NOW
  });

  assert.equal(replay.kind, "replay");
  if (replay.kind === "replay") assert.deepEqual(replay.record.result, { pushed: 3 });
});

test("reusing an idempotency key for different input is rejected, not silently replayed", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });

  // Replaying the old result here would hide the caller's bug and apply the wrong operation.
  await assert.rejects(
    () =>
      state.claimIdempotency({
        tenantId: "tnt-a",
        key: "k1",
        operation: "order.create",
        fingerprint: "fp-2",
        now: NOW
      }),
    (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT"
  );
});

test("a failed operation can be retried, but a succeeded one cannot be reopened", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
  await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "failed", result: null, now: NOW });

  const retry = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    now: NOW
  });
  assert.equal(retry.kind, "replay");

  await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: null, now: NOW });
  await assert.rejects(
    () => state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "failed", result: null, now: NOW }),
    (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
  );
});

test("idempotency keys are scoped per tenant", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "op", fingerprint: "fp", now: NOW });
  const other = await state.claimIdempotency({
    tenantId: "tnt-b",
    key: "k1",
    operation: "op",
    fingerprint: "fp",
    now: NOW
  });

  assert.equal(other.kind, "claimed");
});

test("an expired in-flight claim is reclaimed, so a crashed attempt does not block the order forever", async () => {
  const state = store();
  // The holder is assumed dead: its lease has passed without it completing the operation.
  await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    leaseTtlMs: 1000,
    now: NOW
  });

  const later = new Date(new Date(NOW).getTime() + 1001).toISOString();
  const second = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    now: later
  });

  assert.equal(second.kind, "claimed");
});

test("a claim whose lease has not expired still blocks a second attempt", async () => {
  const state = store();
  await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    leaseTtlMs: 5_000,
    now: NOW
  });

  const soon = new Date(new Date(NOW).getTime() + 4_999).toISOString();
  const second = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    now: soon
  });

  assert.equal(second.kind, "in_flight");
});

test("stealing an expired claim clears the previous attempt's partial result", async () => {
  const state = store();
  await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    leaseTtlMs: 1000,
    now: NOW
  });

  const later = new Date(new Date(NOW).getTime() + 2000).toISOString();
  await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "stock.push",
    fingerprint: "fp-1",
    now: later
  });

  // A replay must never hand back a value no attempt completed; the stolen record must read as a
  // fresh in-progress claim with a new lease, not as the old holder's leftovers.
  const record = await state.getIdempotency("tnt-a", "k1");
  assert.equal(record?.outcome, "in_progress");
  assert.equal(record?.result, null);
  assert.ok(record?.expiresAt !== null && record.expiresAt > later);
});

test("completing an already-succeeded claim with the same outcome is a no-op, not a conflict", async () => {
  const state = store();
  await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
  await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: { pushed: 1 }, now: NOW });

  // A stolen lease can leave two attempts finishing the same idempotent write; the second success
  // must not be reported as an error the workflow would misread as a failed write.
  const again = await state.completeIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    outcome: "succeeded",
    result: { pushed: 1 },
    now: NOW
  });
  assert.equal(again.outcome, "succeeded");

  // The first result stands: a repeat success does not overwrite what was recorded.
  assert.deepEqual(again.result, { pushed: 1 });
});

test("a terminal claim has no lease and cannot be stolen", async () => {
  const state = store();
  await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    leaseTtlMs: 1000,
    now: NOW
  });
  await state.completeIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    outcome: "succeeded",
    result: { orderId: "order-1" },
    now: NOW
  });

  const record = await state.getIdempotency("tnt-a", "k1");
  assert.equal(record?.expiresAt, null);

  // Long after any lease would have lapsed, a replay still replays: a completed operation is final.
  const muchLater = new Date(new Date(NOW).getTime() + 86_400_000).toISOString();
  const replay = await state.claimIdempotency({
    tenantId: "tnt-a",
    key: "k1",
    operation: "order.create",
    fingerprint: "fp-1",
    now: muchLater
  });
  assert.equal(replay.kind, "replay");
});

test("a non-positive lease TTL is rejected rather than creating an instantly-stealable claim", async () => {
  const state = store();
  await assert.rejects(
    () =>
      state.claimIdempotency({
        tenantId: "tnt-a",
        key: "k1",
        operation: "op",
        fingerprint: "fp",
        leaseTtlMs: 0,
        now: NOW
      }),
    RangeError
  );
});

test("a SKU map upsert replaces the previous mapping for that SKU", async () => {
  const state = store();
  await state.upsertSkuMap({
    tenantId: "tnt-a",
    channel: "shopee",
    sku: "SKU-1",
    externalProductId: "1001",
    externalSkuId: "11",
    externalInventoryId: null,
    updatedAt: NOW
  });
  await state.upsertSkuMap({
    tenantId: "tnt-a",
    channel: "shopee",
    sku: "SKU-1",
    externalProductId: "1001",
    externalSkuId: "12",
    externalInventoryId: null,
    updatedAt: NOW
  });

  const found = await state.getSkuMap("tnt-a", "shopee", "SKU-1");
  assert.equal(found?.externalSkuId, "12");
});

test("SKU maps are isolated per tenant and channel", async () => {
  const state = store();
  await state.upsertSkuMap({
    tenantId: "tnt-a",
    channel: "shopee",
    sku: "SKU-1",
    externalProductId: "1001",
    externalSkuId: "11",
    externalInventoryId: null,
    updatedAt: NOW
  });

  assert.equal(await state.getSkuMap("tnt-b", "shopee", "SKU-1"), null);
  assert.equal(await state.getSkuMap("tnt-a", "tiktok_tokopedia", "SKU-1"), null);
});

test("a cursor round-trips, including the null that means caught up", async () => {
  const state = store();
  assert.equal(await state.getCursor("tnt-a", "shopee", "orders"), null);

  await state.setCursor({ tenantId: "tnt-a", channel: "shopee", entity: "orders", cursor: "tok-1", now: NOW });
  assert.equal((await state.getCursor("tnt-a", "shopee", "orders"))?.cursor, "tok-1");

  await state.setCursor({ tenantId: "tnt-a", channel: "shopee", entity: "orders", cursor: null, now: NOW });
  assert.equal((await state.getCursor("tnt-a", "shopee", "orders"))?.cursor, null);
});
