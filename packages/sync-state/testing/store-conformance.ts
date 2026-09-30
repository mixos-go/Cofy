/**
 * The sync-state store conformance suite.
 *
 * The rules here are what the import and push workflows rest on (ADR 0010), so both the in-memory
 * store and the Postgres store must satisfy exactly the same suite. Running one set of tests against
 * both is the only way to know they have not drifted: a behaviour only one implementation has is a
 * bug that would appear in production and not in tests, or the reverse.
 *
 * It lives on the `./testing` subpath rather than in the package's main `exports`, so `node:test`
 * never loads in a running service — the production entry point stays free of test imports.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import type { SyncStateStore } from "../src/store.ts";

const NOW = "2026-09-26T00:00:00.000Z";

function plus(base: string, ms: number): string {
  return new Date(new Date(base).getTime() + ms).toISOString();
}

/**
 * Register the suite. `makeStore` returns a store with no rows; `dispose` runs once at the end and
 * is how the Postgres test drops the schema it created.
 */
export function runSyncStateStoreConformance(
  label: string,
  makeStore: () => Promise<SyncStateStore>,
  dispose?: () => Promise<void>
): void {
  test(`${label}: reserving the same external order twice returns the existing ref`, async () => {
    const state = await makeStore();
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
    if (second.kind === "exists") assert.equal(second.ref.status, "reserved");
  });

  test(`${label}: the same external order on a different channel is a separate ref`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    const other = await state.reserveOrderRef({
      tenantId: "tnt-a",
      channel: "tiktok_tokopedia",
      externalOrderId: "ext-1",
      now: NOW
    });
    assert.equal(other.kind, "reserved");
  });

  test(`${label}: the same external order for a different tenant is a separate ref`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    const other = await state.reserveOrderRef({
      tenantId: "tnt-b",
      channel: "shopee",
      externalOrderId: "ext-1",
      now: NOW
    });
    assert.equal(other.kind, "reserved");
  });

  test(`${label}: committing a ref attaches the order id and makes it final`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    const committed = await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);
    assert.equal(committed.status, "committed");
    assert.equal(committed.orderId, "order-1");
  });

  test(`${label}: re-committing a ref with a different order id is rejected, not overwritten`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);

    await assert.rejects(
      () => state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-2", NOW),
      (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
    );
  });

  test(`${label}: a committed ref cannot be marked failed`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);

    await assert.rejects(
      () => state.failOrderRef("tnt-a", "shopee", "ext-1", NOW),
      (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
    );
  });

  test(`${label}: a reserved ref can be failed so reconciliation can find it`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    const failed = await state.failOrderRef("tnt-a", "shopee", "ext-1", NOW);
    assert.equal(failed.status, "failed");
    assert.equal(failed.orderId, null);
  });

  test(`${label}: refs are listed per target, newest change last, and filterable by status`, async () => {
    const state = await makeStore();
    const later = new Date(new Date(NOW).getTime() + 60_000).toISOString();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-2", now: NOW });
    await state.commitOrderRef("tnt-a", "shopee", "ext-2", "order-2", later);
    await state.failOrderRef("tnt-a", "shopee", "ext-1", later);
    // A second tenant's ref must never appear in the first tenant's list.
    await state.reserveOrderRef({ tenantId: "tnt-b", channel: "shopee", externalOrderId: "ext-1", now: NOW });

    const all = await state.listOrderRefs({ tenantId: "tnt-a", channel: "shopee" });
    assert.deepEqual(
      all.map((ref) => ref.externalOrderId).sort(),
      ["ext-1", "ext-2"]
    );
    // Oldest change first, so a bounded repair pass works through the backlog in a stable order.
    assert.deepEqual(all.map((ref) => ref.externalOrderId), ["ext-1", "ext-2"]);

    const failed = await state.listOrderRefs({ tenantId: "tnt-a", channel: "shopee", status: "failed" });
    assert.deepEqual(failed.map((ref) => ref.externalOrderId), ["ext-1"]);

    const capped = await state.listOrderRefs({ tenantId: "tnt-a", channel: "shopee", limit: 1 });
    assert.equal(capped.length, 1);
    assert.equal(capped[0]?.externalOrderId, "ext-1");
  });

  test(`${label}: a failed ref is reopened for repair, a committed one is final`, async () => {
    const state = await makeStore();
    await state.reserveOrderRef({ tenantId: "tnt-a", channel: "shopee", externalOrderId: "ext-1", now: NOW });
    await state.failOrderRef("tnt-a", "shopee", "ext-1", NOW);

    const reopened = await state.reopenOrderRef("tnt-a", "shopee", "ext-1", NOW);
    assert.equal(reopened.status, "reserved", "the import path can now retry the order");
    assert.equal(reopened.orderId, null);

    // Reopening an already-open ref is a no-op, so a redelivered repair pass does not error.
    const again = await state.reopenOrderRef("tnt-a", "shopee", "ext-1", NOW);
    assert.equal(again.status, "reserved");

    // A committed ref must not be reopened: that would let a second Medusa order be created.
    await state.commitOrderRef("tnt-a", "shopee", "ext-1", "order-1", NOW);
    await assert.rejects(
      () => state.reopenOrderRef("tnt-a", "shopee", "ext-1", NOW),
      (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
    );
  });

  test(`${label}: committing an unknown ref is not found`, async () => {
    const state = await makeStore();
    await assert.rejects(
      () => state.commitOrderRef("tnt-a", "shopee", "missing", "order-1", NOW),
      (error: unknown) => error instanceof PlatformError && error.code === "NOT_FOUND"
    );
  });

  test(`${label}: a fresh idempotency key is claimed rather than replayed`, async () => {
    const state = await makeStore();
    const claim = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "stock.push",
      fingerprint: "fp-1",
      now: NOW
    });
    assert.equal(claim.kind, "claimed");
  });

  test(`${label}: a second caller while the first is in flight sees in_flight`, async () => {
    const state = await makeStore();
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

  test(`${label}: a completed operation replays its recorded result`, async () => {
    const state = await makeStore();
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

  test(`${label}: reusing an idempotency key for different input is rejected`, async () => {
    const state = await makeStore();
    await assert.rejects(
      async () => {
        await state.claimIdempotency({
          tenantId: "tnt-a",
          key: "k1",
          operation: "stock.push",
          fingerprint: "fp-1",
          now: NOW
        });
        await state.claimIdempotency({
          tenantId: "tnt-a",
          key: "k1",
          operation: "order.create",
          fingerprint: "fp-2",
          now: NOW
        });
      },
      (error: unknown) => error instanceof PlatformError && error.code === "IDEMPOTENCY_CONFLICT"
    );
  });

  test(`${label}: a failed operation can be retried, but a succeeded one cannot be reopened`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
    await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "failed", result: null, now: NOW });

    // A failed record is not a completed write, so a later attempt must be able to take the key and
    // actually retry the operation. Reporting `replay` here would tell the caller the work is done
    // while its recorded result is the failure, which is how drift becomes unrepairable (ADR 0014).
    const retry = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "stock.push",
      fingerprint: "fp-1",
      now: NOW
    });
    assert.equal(retry.kind, "claimed");

    await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: null, now: NOW });
    await assert.rejects(
      () => state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "failed", result: null, now: NOW }),
      (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
    );
  });

  test(`${label}: an abandoned claim can be re-claimed, which is what a governor reschedule needs`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });

    const abandoned = await state.abandonIdempotency("tnt-a", "k1", NOW);
    assert.equal(abandoned?.outcome, "in_progress");
    assert.equal(await state.getIdempotency("tnt-a", "k1"), null, "the key is unclaimed again");

    // The rescheduled retry must be able to take the key. If the claim were left in place this
    // would be `in_flight` and the retry would silently do nothing.
    const retry = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "stock.push",
      fingerprint: "fp-1",
      now: NOW
    });
    assert.equal(retry.kind, "claimed");
  });

  test(`${label}: a succeeded or failed record cannot be abandoned`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "op", fingerprint: "fp", now: NOW });
    await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: null, now: NOW });

    // Erasing a completed write would let a later attempt repeat it under the same key.
    await assert.rejects(
      () => state.abandonIdempotency("tnt-a", "k1", NOW),
      (error: unknown) => error instanceof PlatformError && error.code === "CONFLICT"
    );
    assert.equal((await state.getIdempotency("tnt-a", "k1"))?.outcome, "succeeded");
  });

  test(`${label}: abandoning an unknown key is a no-op, not an error`, async () => {
    const state = await makeStore();
    assert.equal(await state.abandonIdempotency("tnt-a", "never-claimed", NOW), null);
  });

  test(`${label}: idempotency keys are scoped per tenant`, async () => {
    const state = await makeStore();
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

  test(`${label}: an expired in-flight claim is reclaimed`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "order.create",
      fingerprint: "fp-1",
      leaseTtlMs: 1000,
      now: NOW
    });
    const second = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "order.create",
      fingerprint: "fp-1",
      now: plus(NOW, 1001)
    });
    assert.equal(second.kind, "claimed");
  });

  test(`${label}: a claim whose lease has not expired still blocks a second attempt`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "order.create",
      fingerprint: "fp-1",
      leaseTtlMs: 5_000,
      now: NOW
    });
    const second = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "order.create",
      fingerprint: "fp-1",
      now: plus(NOW, 4_999)
    });
    assert.equal(second.kind, "in_flight");
  });

  test(`${label}: stealing an expired claim clears the previous attempt's partial result`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "stock.push",
      fingerprint: "fp-1",
      leaseTtlMs: 1000,
      now: NOW
    });
    const later = plus(NOW, 2000);
    await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "stock.push",
      fingerprint: "fp-1",
      now: later
    });

    const record = await state.getIdempotency("tnt-a", "k1");
    assert.equal(record?.outcome, "in_progress");
    assert.equal(record?.result, null);
    assert.ok(record?.expiresAt !== null && record.expiresAt > later);
  });

  test(`${label}: completing an already-succeeded claim with the same outcome is a no-op`, async () => {
    const state = await makeStore();
    await state.claimIdempotency({ tenantId: "tnt-a", key: "k1", operation: "stock.push", fingerprint: "fp-1", now: NOW });
    await state.completeIdempotency({ tenantId: "tnt-a", key: "k1", outcome: "succeeded", result: { pushed: 1 }, now: NOW });

    const again = await state.completeIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      outcome: "succeeded",
      result: { pushed: 1 },
      now: NOW
    });
    assert.equal(again.outcome, "succeeded");
    assert.deepEqual(again.result, { pushed: 1 });
  });

  test(`${label}: a terminal claim has no lease and cannot be stolen`, async () => {
    const state = await makeStore();
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

    const replay = await state.claimIdempotency({
      tenantId: "tnt-a",
      key: "k1",
      operation: "order.create",
      fingerprint: "fp-1",
      now: plus(NOW, 86_400_000)
    });
    assert.equal(replay.kind, "replay");
  });

  test(`${label}: a non-positive lease TTL is rejected`, async () => {
    const state = await makeStore();
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

  test(`${label}: only one of two concurrent claims for the same key wins`, async () => {
    const state = await makeStore();
    const attempt = (): Promise<string> =>
      state
        .claimIdempotency({ tenantId: "tnt-a", key: "concurrent", operation: "op", fingerprint: "fp", now: NOW })
        .then((claim) => claim.kind);

    const outcomes = await Promise.all([attempt(), attempt()]);
    assert.equal(outcomes.filter((kind) => kind === "claimed").length, 1);
  });

  test(`${label}: a SKU map upsert replaces the previous mapping for that SKU`, async () => {
    const state = await makeStore();
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

  test(`${label}: SKU maps are isolated per tenant and channel`, async () => {
    const state = await makeStore();
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

  test(`${label}: a cursor round-trips, including the null that means caught up`, async () => {
    const state = await makeStore();
    assert.equal(await state.getCursor("tnt-a", "shopee", "orders"), null);

    await state.setCursor({ tenantId: "tnt-a", channel: "shopee", entity: "orders", cursor: "tok-1", now: NOW });
    assert.equal((await state.getCursor("tnt-a", "shopee", "orders"))?.cursor, "tok-1");

    await state.setCursor({ tenantId: "tnt-a", channel: "shopee", entity: "orders", cursor: null, now: NOW });
    assert.equal((await state.getCursor("tnt-a", "shopee", "orders"))?.cursor, null);
  });

  if (dispose !== undefined) {
    test(`${label}: cleanup`, async () => {
      await dispose();
    });
  }
}