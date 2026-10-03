/**
 * Unit table and governor-deferral tests (docs/PLAN.md M4).
 *
 * These prove the two claims M4 rests on at the dispatch boundary:
 *   1. A queued job actually reaches the M3 workflow function through the handler table — the wiring
 *      the milestone calls "wire the M3 workflow functions as queue units".
 *   2. A `CHANNEL_RATE_LIMITED` becomes a `reschedule` carrying the governor's `Retry-After`, and it
 *      does **not** leave the work recorded as failed. That second half is the whole point: M3's open
 *      item was that a throttled call was marked failed and never re-run.
 *
 * The marketplace and Medusa are fakes (external boundaries, AGENTS.md §6). The sync state is the
 * real in-memory store behind the thin adapter, so the claim/abandon/replay behaviour under test is
 * production code, not a stand-in.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { RateLimitedError, PLATFORM_EVENTS } from "@platform/contracts";
import type { ChannelOrder } from "@platform/contracts";
import { InMemoryWorkflowQueue, dispatchJob } from "@platform/workflow-queue";
import type { WorkflowJob } from "@platform/workflow-queue";
import { createWorkflowHandlers } from "../src/units.ts";
import { deferralFor, MIN_DEFERRAL_MS } from "../src/rate-limit.ts";
import { importListingsOnce } from "../src/listing-import.ts";
import {
  FakeChannelGateway,
  FakeCommerceClient,
  FakeCourierGateway,
  FakeRateShoppingRulesClient,
  syncStateClient
} from "./fakes.ts";
import { InMemoryEventPublisher } from "../src/events.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const NOW = new Date("2026-09-26T00:00:00.000Z");

/** Silent logger: these tests assert outcomes, not log lines. */
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

function harness() {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const commerce = new FakeCommerceClient();
  const couriers = new FakeCourierGateway();
  const rules = new FakeRateShoppingRulesClient();
  const events = new InMemoryEventPublisher();
  const queue = new InMemoryWorkflowQueue({ now: () => NOW.toISOString() });
  const handlers = createWorkflowHandlers({
    syncState: syncStateClient(store),
    gateway,
    commerce,
    couriers,
    rateShoppingRules: rules,
    events,
    logger: silent,
    queue,
    nextReconcileRunAt: (from) => new Date(from.getTime() + 60_000).toISOString(),
    staleReservationMs: 15 * 60 * 1000,
    maxRefsPerPass: 500,
    now: () => NOW
  });
  return { store, gateway, commerce, couriers, rules, events, queue, handlers };
}

function job(overrides: Partial<WorkflowJob> = {}): WorkflowJob {
  return {
    unit: "order.import",
    jobId: "j1",
    tenantId: TENANT,
    channel: CHANNEL,
    payload: {},
    ...overrides
  };
}

/** Map SKU-1 on the channel, so a stock push has an address to reach. */
async function mapSku(h: ReturnType<typeof harness>): Promise<void> {
  h.gateway.withListingPage("shopee:start", {
    items: [
      {
        channel: CHANNEL,
        externalProductId: "1001",
        title: "Kaos",
        status: "active",
        variants: [{ externalSkuId: "model-11", sku: "SKU-1", externalInventoryId: null }],
        updatedAt: null
      }
    ],
    nextCursor: null
  });
  await importListingsOnce(
    { syncState: syncStateClient(h.store), gateway: h.gateway, logger: silent },
    { tenantId: TENANT, channel: CHANNEL }
  );
}

test("a queued order.import job reaches the import workflow and creates the order", async () => {
  const h = harness();
  h.gateway.withOrderPage("shopee:start", { items: [order("ext-1")], nextCursor: null });
  h.commerce.withVariant("SKU-1", "var-1", 10);

  const outcome = await dispatchJob(job(), h.handlers, h.queue, silent);

  assert.equal(outcome.result, "completed");
  assert.equal(h.commerce.orders.length, 1, "the queued job created the order");
  assert.equal((await h.store.getOrderRef(TENANT, CHANNEL, "ext-1"))?.status, "committed");
});

test("a unit whose channel is missing is failed, not run against a guessed channel", async () => {
  const h = harness();
  const outcome = await dispatchJob(job({ channel: null }), h.handlers, h.queue, silent);
  assert.equal(outcome.result, "failed");
  assert.equal(h.commerce.orders.length, 0);
});

test("a shipment.create job books, records and queues the channel write-back", async () => {
  // This is the M7 join end to end at the dispatch boundary: one job books a courier shipment, the
  // tenant's engine records the Fulfillment, and a shipment.write_back job is queued (not called
  // inline) so the channel write is governed like every other outbound call.
  const h = harness();
  h.couriers.withQuotes("jne", [
    {
      courier: "jne",
      serviceLevel: "regular",
      price: { amount: 18_000, currency: "IDR" },
      estimatedDays: { min: 1, max: 3 },
      supportsInsurance: true,
      supportsCod: true,
      providerQuoteId: "jne-regular"
    }
  ]);
  h.commerce.withVariant("SKU-1", "var-1", 5);

  const outcome = await dispatchJob(
    job({
      unit: "shipment.create",
      payload: {
        orderId: "order-001",
        externalOrderId: "ext-1",
        items: [{ sku: "SKU-1", quantity: 1 }],
        shipment: {
          destination: { city: "Jakarta", postalCode: "10110", address: "Jl. Merdeka 1" },
          weightGrams: 1_000,
          declaredValue: { amount: 150_000, currency: "IDR" },
          requiresInsurance: false,
          requiresCod: false
        }
      }
    }),
    h.handlers,
    h.queue,
    silent
  );

  assert.equal(outcome.result, "completed");
  assert.equal(h.couriers.createCalls.length, 1, "the chosen quote was booked");
  assert.equal(h.commerce.shipments.length, 1, "the tenant's engine recorded the shipment");
  assert.equal(h.commerce.shipments[0]?.orderId, "order-001");

  // The write-back is queued, not performed by this unit.
  const queued = await h.queue.take(NOW.toISOString());
  assert.equal(queued?.unit, "shipment.write_back");
  assert.equal(queued?.payload.externalOrderId, "ext-1");
  assert.equal(queued?.payload.trackingNumber, "WAYBILL-0001");

  // Running the queued unit actually tells the channel.
  const writeBack = await dispatchJob(queued as WorkflowJob, h.handlers, h.queue, silent);
  assert.equal(writeBack.result, "completed");
  assert.equal(h.gateway.trackingWrites.length, 1);
  assert.equal(h.gateway.trackingWrites[0]?.externalOrderId, "ext-1");
});

test("a shipment.create that finds no qualifying quote queues no write-back", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [
    {
      courier: "jne",
      serviceLevel: "regular",
      price: { amount: 90_000, currency: "IDR" },
      estimatedDays: { min: 1, max: 3 },
      supportsInsurance: true,
      supportsCod: true,
      providerQuoteId: "jne-regular"
    }
  ]);
  h.rules.withRules(TENANT, {
    allowedCouriers: [],
    allowedServiceLevels: [],
    maxPrice: { amount: 25_000, currency: "IDR" },
    maxEstimatedDays: null,
    requiresInsurance: false,
    requiresCod: false,
    strategy: "cheapest",
    preferredCouriers: []
  });

  const outcome = await dispatchJob(
    job({
      unit: "shipment.create",
      payload: {
        orderId: "order-001",
        externalOrderId: "ext-1",
        items: [{ sku: "SKU-1", quantity: 1 }],
        shipment: {
          destination: { city: "Jakarta", postalCode: "10110", address: "Jl. Merdeka 1" },
          weightGrams: 1_000,
          declaredValue: { amount: 150_000, currency: "IDR" },
          requiresInsurance: false,
          requiresCod: false
        }
      }
    }),
    h.handlers,
    h.queue,
    silent
  );

  assert.equal(outcome.result, "completed");
  assert.equal(h.commerce.shipments.length, 0);
  assert.equal(await h.queue.take(NOW.toISOString()), null, "nothing to write back when nothing shipped");
});

test("a malformed payload is failed rather than silently ignored", async () => {
  const h = harness();
  const outcome = await dispatchJob(
    job({ unit: "stock.push", payload: { changes: [{ sku: "SKU-1", available: -5 }] } }),
    h.handlers,
    h.queue,
    silent
  );
  assert.equal(outcome.result, "failed");
  assert.equal(h.gateway.pushCalls.length, 0, "a negative stock level never reaches the channel");
});

test("a governor refusal on a stock push reschedules with the Retry-After, not a failure", async () => {
  const h = harness();
  await mapSku(h);
  h.gateway.pushError = new RateLimitedError("governor refused", 30, {
    reason: "app_budget",
    retryAfterSeconds: 30
  });

  const outcome = await dispatchJob(
    job({ unit: "stock.push", jobId: "stock-1", payload: { changes: [{ sku: "SKU-1", available: 9 }] } }),
    h.handlers,
    h.queue,
    silent
  );

  assert.equal(outcome.result, "reschedule");
  const expectedRunAt = new Date(NOW.getTime() + 30_000).toISOString();
  assert.equal(h.queue.runAtOf(`stock-1@${expectedRunAt}`), expectedRunAt);
  assert.ok(
    !h.events.published.some((entry) => entry.event === PLATFORM_EVENTS.STOCK_PUSH_FAILED),
    "a throttled push is not a failed push"
  );
});

test("a deferred stock push releases its claim, so the rescheduled retry can push", async () => {
  const h = harness();
  await mapSku(h);

  h.gateway.pushError = new RateLimitedError("governor refused", 30, { retryAfterSeconds: 30 });
  const first = await dispatchJob(
    job({ unit: "stock.push", jobId: "stock-1", payload: { changes: [{ sku: "SKU-1", available: 9 }] } }),
    h.handlers,
    h.queue,
    silent
  );
  assert.equal(first.result, "reschedule");
  assert.equal(h.gateway.pushCalls.length, 0, "nothing reached the channel while throttled");

  // Now let the push succeed and run the retry. Reaching the channel is what proves the claim was
  // released: a claim left `in_progress` would make the retry come back `in_flight` and push nothing.
  h.gateway.pushError = null;
  const retry = await dispatchJob(
    job({ unit: "stock.push", jobId: "stock-1@later", payload: { changes: [{ sku: "SKU-1", available: 9 }] } }),
    h.handlers,
    h.queue,
    silent
  );
  assert.equal(retry.result, "completed");
  assert.equal(h.gateway.pushCalls.length, 1, "the retry pushed after the deferral");
});

test("a deferred order import reschedules and does not record a failed ref", async () => {
  const h = harness();
  h.gateway.fetchOrdersError = new RateLimitedError("governor refused", 15, { retryAfterSeconds: 15 });

  const outcome = await dispatchJob(job(), h.handlers, h.queue, silent);

  assert.equal(outcome.result, "reschedule");
  const expectedRunAt = new Date(NOW.getTime() + 15_000).toISOString();
  assert.equal(h.queue.runAtOf(`j1@${expectedRunAt}`), expectedRunAt);
});

test("reconcile.orders runs the same pull and re-arms itself on the cadence", async () => {
  const h = harness();
  h.gateway.withOrderPage("shopee:start", { items: [order("ext-1")], nextCursor: null });
  h.commerce.withVariant("SKU-1", "var-1", 10);

  const outcome = await dispatchJob(
    job({ unit: "reconcile.orders", jobId: "reconcile.orders:tnt-a:shopee" }),
    h.handlers,
    h.queue,
    silent
  );

  assert.equal(outcome.result, "completed");
  assert.equal(h.commerce.orders.length, 1, "reconciliation imported through the real-time pull path");
  const next = new Date(NOW.getTime() + 60_000).toISOString();
  assert.equal(
    h.queue.runAtOf(`reconcile.orders:tnt-a:shopee@${next}`),
    next,
    "the pass scheduled its own next run, which is what survives a restart"
  );
});

test("reconcile.stock repairs through the push path and re-arms on the cadence", async () => {
  const h = harness();
  await mapSku(h);
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.gateway.withStockPage("shopee:start", {
    items: [{ channel: CHANNEL, externalSkuId: "model-11", sku: "SKU-1", available: 2 }],
    nextCursor: null
  });

  const outcome = await dispatchJob(
    job({ unit: "reconcile.stock", jobId: "reconcile.stock:tnt-a:shopee" }),
    h.handlers,
    h.queue,
    silent
  );

  assert.equal(outcome.result, "completed");
  assert.equal(h.gateway.pushCalls.length, 1, "the mismatch was repaired through the ordinary push");
  assert.equal(h.gateway.pushCalls[0]!.items[0]!.available, 5, "the local value is what was pushed");
  const next = new Date(NOW.getTime() + 60_000).toISOString();
  assert.equal(
    h.queue.runAtOf(`reconcile.stock:tnt-a:shopee@${next}`),
    next,
    "the stock pass re-armed itself on the same cadence as order reconciliation"
  );
});

test("a crash mid-pass is a non-event: the resumed pass re-reads from the committed cursor", async () => {
  const h = harness();
  // Two pages. The first commits, then the gateway throws — the shape of a worker dying mid-pass.
  h.gateway.withOrderPage("shopee:start", { items: [order("ext-1")], nextCursor: "c1" });
  h.gateway.withOrderPage("shopee:c1", { items: [order("ext-2")], nextCursor: null });
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.fetchOrdersErrorAfterPages = 1;

  const crashed = await dispatchJob(job(), h.handlers, h.queue, silent);
  assert.equal(crashed.result, "failed", "an unexpected upstream failure is reported, not retried blind");
  assert.equal(h.commerce.orders.length, 1, "only the committed page landed before the crash");
  // The cursor advanced after the committed page, which is what makes the resume safe: the next pass
  // continues from `c1` rather than restarting, and the already-imported order is skipped by its ref.
  assert.equal((await h.store.getCursor(TENANT, CHANNEL, "orders"))?.cursor, "c1");

  const resumed = await dispatchJob(job({ jobId: "j1@retry" }), h.handlers, h.queue, silent);

  assert.equal(resumed.result, "completed");
  assert.equal(h.commerce.orders.length, 2, "the resumed pass imported only the missing order");
  assert.equal((await h.store.getCursor(TENANT, CHANNEL, "orders"))?.cursor, null, "the pass caught up");
});

test("deferralFor reads the governor's Retry-After and ignores a non-rate-limit error", () => {
  const deferral = deferralFor(
    new RateLimitedError("slow down", 45, { reason: "resource_cooldown", retryAfterSeconds: 45 }),
    NOW
  );
  assert.equal(deferral?.runAt, new Date(NOW.getTime() + 45_000).toISOString());
  assert.equal(deferral?.reason, "resource_cooldown");

  assert.equal(deferralFor(new Error("boom"), NOW), null);
});

test("a rate-limit error with no Retry-After still defers, at the governor's minimum cooldown", () => {
  // The plane normalises every 429 to carry a retry hint, so reaching the fallback means a protocol
  // bug — but it must still defer rather than fail, and must not invent a different policy.
  const deferral = deferralFor(new RateLimitedError("no hint", null, {}), NOW);
  assert.equal(deferral?.runAt, new Date(NOW.getTime() + MIN_DEFERRAL_MS).toISOString());
});
