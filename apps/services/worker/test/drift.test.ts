/**
 * Drift detection and repair tests (docs/PLAN.md M4, docs/adr/0014).
 *
 * These prove the two claims the drift deliverables rest on:
 *   1. Drift is detected and classified from the ref's own state — a `failed` ref is
 *      `failed_import`, a reservation past the stale cutoff is `stale_reservation`, and a fresh
 *      reservation is *not* drift (a healthy in-flight attempt must not be reclassified).
 *   2. Repair goes through the ordinary pull, not a second code path: a repair pass imports the
 *      order it reopened, and the re-count afterwards is zero. The count the dashboard reads and the
 *      count repair acts on come from the same classifier.
 *
 * The marketplace and Medusa are fakes (external boundaries, AGENTS.md §6). The sync state is the
 * real in-memory store, so reopen/ref semantics under test are production code.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import type { ChannelOrder } from "@platform/contracts";
import { detectDrift, driftSummary, repairDrift } from "../src/drift.ts";
import type { DriftContext } from "../src/drift.ts";
import { FakeChannelGateway, FakeCommerceClient, syncStateClient } from "./fakes.ts";
import { InMemoryEventPublisher } from "../src/events.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const NOW = new Date("2026-09-26T12:00:00.000Z");
const STALE_MS = 15 * 60 * 1000;

const silent: Logger = createLogger("error", {}, () => {});

function order(externalOrderId: string): ChannelOrder {
  return {
    channel: CHANNEL,
    externalOrderId,
    placedAt: "2026-09-26T09:00:00.000Z",
    buyerEmail: "buyer@example.test",
    currency: "IDR",
    lines: [
      {
        externalLineId: "l1",
        sku: "SKU-1",
        title: "Kaos",
        quantity: 1,
        unitPrice: { amount: 50_000, currency: "IDR" }
      }
    ],
    totals: {
      subtotal: { amount: 50_000, currency: "IDR" },
      shipping: { amount: 0, currency: "IDR" },
      discount: { amount: 0, currency: "IDR" },
      grandTotal: { amount: 50_000, currency: "IDR" }
    }
  };
}

function harness(): {
  store: InMemorySyncStateStore;
  gateway: FakeChannelGateway;
  commerce: FakeCommerceClient;
  context: DriftContext;
} {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const commerce = new FakeCommerceClient();
  commerce.withVariant("SKU-1", "var-1", 10);
  const context: DriftContext = {
    syncState: syncStateClient(store),
    gateway,
    commerce,
    events: new InMemoryEventPublisher(),
    logger: silent,
    staleReservationMs: STALE_MS,
    maxRefsPerPass: 500,
    now: () => NOW
  };
  return { store, gateway, commerce, context };
}

/** A ref reserved long ago and never committed — a partial commit between the two stores. */
async function staleReservation(store: InMemorySyncStateStore, externalOrderId: string): Promise<void> {
  const longAgo = new Date(NOW.getTime() - STALE_MS - 60_000).toISOString();
  await store.reserveOrderRef({ tenantId: TENANT, channel: CHANNEL, externalOrderId, now: longAgo });
}

test("a failed import is drift, and the summary counts it as failed_import", async () => {
  const { store, context } = harness();
  await store.reserveOrderRef({ tenantId: TENANT, channel: CHANNEL, externalOrderId: "ext-1", now: NOW.toISOString() });
  await store.failOrderRef(TENANT, CHANNEL, "ext-1", NOW.toISOString());

  const items = await detectDrift(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(items.length, 1);
  assert.equal(items[0]?.kind, "failed_import");

  const summary = await driftSummary(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(summary.failedImport, 1);
  assert.equal(summary.staleReservation, 0);
  assert.equal(summary.total, 1);
});

test("an old uncommitted reservation is drift, a fresh one is in-flight work", async () => {
  const { store, context } = harness();
  await staleReservation(store, "ext-old");
  // A reservation made just now is an attempt that may still be running, so it must not be counted.
  await store.reserveOrderRef({ tenantId: TENANT, channel: CHANNEL, externalOrderId: "ext-new", now: NOW.toISOString() });

  const items = await detectDrift(context, { tenantId: TENANT, channel: CHANNEL });
  assert.deepEqual(items.map((item) => item.externalOrderId), ["ext-old"]);
  assert.equal(items[0]?.kind, "stale_reservation");
});

test("a committed ref is never drift", async () => {
  const { store, context } = harness();
  await store.reserveOrderRef({ tenantId: TENANT, channel: CHANNEL, externalOrderId: "ext-1", now: NOW.toISOString() });
  await store.commitOrderRef(TENANT, CHANNEL, "ext-1", "order-1", NOW.toISOString());

  const summary = await driftSummary(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(summary.total, 0);
});

test("drift is scoped per tenant and channel, never counted across them", async () => {
  const { store, context } = harness();
  await store.reserveOrderRef({ tenantId: "tnt-b", channel: CHANNEL, externalOrderId: "ext-b", now: NOW.toISOString() });
  await store.failOrderRef("tnt-b", CHANNEL, "ext-b", NOW.toISOString());
  await store.reserveOrderRef({ tenantId: TENANT, channel: "tiktok_tokopedia", externalOrderId: "ext-t", now: NOW.toISOString() });
  await store.failOrderRef(TENANT, "tiktok_tokopedia", "ext-t", NOW.toISOString());

  const summary = await driftSummary(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(summary.total, 0, "another tenant's and another channel's drift is not this target's");
});

test("a repair pass re-imports a failed order through the ordinary pull and clears the drift", async () => {
  const { store, gateway, context } = harness();
  gateway.withOrderPage(`${CHANNEL}:start`, { items: [order("ext-1")], nextCursor: null });

  // The first import fails (no catalogue entry), leaving a `failed` ref — drift.
  const commerceWithoutSku = new FakeCommerceClient();
  const first = { ...context, commerce: commerceWithoutSku };
  const failed = await repairDrift(first, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(failed.repaired, 0);
  assert.equal((await store.getOrderRef(TENANT, CHANNEL, "ext-1"))?.status, "failed");

  // The catalogue is fixed; the same repair pass must now import the order and leave no drift.
  const repaired = await repairDrift(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(repaired.detected, 1);
  assert.equal(repaired.repaired, 1);
  assert.equal(repaired.remaining, 0, "unresolved drift returns to zero after repair");
  assert.equal((await store.getOrderRef(TENANT, CHANNEL, "ext-1"))?.status, "committed");
});

test("a repair pass re-imports a stale reservation and commits it", async () => {
  const { store, gateway, context } = harness();
  gateway.withOrderPage(`${CHANNEL}:start`, { items: [order("ext-1")], nextCursor: null });
  await staleReservation(store, "ext-1");

  const before = await driftSummary(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(before.total, 1);

  const outcome = await repairDrift(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(outcome.repaired, 1);
  assert.equal(outcome.remaining, 0);
  assert.equal((await store.getOrderRef(TENANT, CHANNEL, "ext-1"))?.status, "committed");
});

test("a repair that still fails leaves the drift visible rather than reporting zero", async () => {
  const { store, gateway, context } = harness();
  gateway.withOrderPage(`${CHANNEL}:start`, { items: [order("ext-1")], nextCursor: null });
  await staleReservation(store, "ext-1");

  // No catalogue entry for SKU-1, so the retry fails again.
  const commerceWithoutSku = new FakeCommerceClient();
  const outcome = await repairDrift({ ...context, commerce: commerceWithoutSku }, {
    tenantId: TENANT,
    channel: CHANNEL
  });
  assert.equal(outcome.repaired, 0);
  assert.equal(outcome.remaining, 1, "drift that could not be repaired must not read as resolved");
});

test("a repair does not reopen a failed ref for an order the channel no longer returns", async () => {
  const { store, context } = harness();
  // The ref is failed, but the channel's page does not contain the order (it aged out of the window).
  await store.reserveOrderRef({ tenantId: TENANT, channel: CHANNEL, externalOrderId: "ext-gone", now: NOW.toISOString() });
  await store.failOrderRef(TENANT, CHANNEL, "ext-gone", NOW.toISOString());

  const outcome = await repairDrift(context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(outcome.repaired, 0);
  assert.equal(outcome.remaining, 1);
  assert.equal(
    (await store.getOrderRef(TENANT, CHANNEL, "ext-gone"))?.status,
    "failed",
    "the ref is only reopened for an order the pull actually has"
  );
});
