/**
 * Worker restart integration test (docs/PLAN.md M4).
 *
 * The M4 exit criterion is "kill the worker mid-reconciliation; on restart it resumes without
 * duplicating effects". The BullMQ adapter's own suite proves the *queue* holds a job across a
 * consumer restart; the worker's half is unproven there — that a pass interrupted after a page
 * committed resumes from the persisted cursor and does not re-import what already landed.
 *
 * So this drives the real unit table over a real Redis queue:
 *   1. a pass reads page one, commits it, then dies on page two (the gateway throws);
 *   2. the consumer is stopped — the process is gone;
 *   3. a fresh consumer starts and the pass is re-armed, exactly as `arm()` does on boot;
 *   4. the resumed pass reads from the committed cursor and imports only what was missing.
 *
 * What this does *not* prove: that the sync state survives the restart. The store here is the
 * in-memory one, because the worker reaches the durable store over HTTP and a unit test cannot stand
 * that up. Store durability is proven separately against real Postgres in
 * `apps/services/control-plane/test/integration/sync-state-store.test.ts`. The two together cover
 * the criterion; neither alone does.
 *
 * Skipped when `TEST_REDIS_URL` is absent, so `pnpm test` stays usable without Redis.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createConnection } from "node:net";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import type { ChannelOrder } from "@platform/contracts";
import {
  BullMqWorkflowConsumer,
  BullMqWorkflowQueue,
  connectionOptionsFromUrl
} from "@platform/workflow-queue/bullmq";
import { createWorkflowHandlers } from "../../src/units.ts";
import { InMemoryEventPublisher } from "../../src/events.ts";
import {
  FakeChannelGateway,
  FakeCommerceClient,
  FakeCourierGateway,
  FakeRateShoppingRulesClient,
  syncStateClient
} from "../fakes.ts";

const REDIS_URL = process.env.TEST_REDIS_URL;
/**
 * A queue name unique to this process, so a leftover job from an earlier run cannot be delivered
 * here. That is the whole reason the BullMQ suite has a `flush()`; a fresh name is the cheaper
 * equivalent when a file has one test. The cost is a few abandoned keys in a development Redis.
 */
const QUEUE_NAME = `platform.workflows.worker-restart.test.${process.pid}.${Date.now()}`;
const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const JOB_ID = `reconcile.orders:${TENANT}:${CHANNEL}`;

const silent: Logger = createLogger("error", {}, () => {});

/**
 * Probe Redis over TCP before BullMQ.
 *
 * BullMQ retries a dead connection for minutes by default, so without this a `TEST_REDIS_URL`
 * pointing at nothing turns the suite into a hang instead of a skip. A raw socket keeps this
 * dependency-free; BullMQ reports a non-Redis listener clearly on its own.
 */
function redisReachable(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const port = Number(parsed.port === "" ? 6379 : parsed.port);
  return new Promise((resolve) => {
    const socket = createConnection({ host: parsed.hostname, port });
    const settle = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
    socket.once("timeout", () => settle(false));
  });
}

const REACHABLE = REDIS_URL !== undefined && (await redisReachable(REDIS_URL));

function order(externalOrderId: string): ChannelOrder {
  return {
    channel: CHANNEL,
    externalOrderId,
    placedAt: "2026-09-26T09:00:00.000Z",
    buyerEmail: null,
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

if (REDIS_URL === undefined) {
  test("worker restart on real Redis", { skip: "TEST_REDIS_URL not set" }, () => {});
} else if (!REACHABLE) {
  test("worker restart on real Redis", { skip: "Redis at TEST_REDIS_URL is not reachable" }, () => {});
} else {
  const url = REDIS_URL;
  const connection = connectionOptionsFromUrl(url);

  /** Wait until `predicate` holds, or fail the test after a generous deadline. */
  async function until(predicate: () => boolean, message: string): Promise<void> {
    const deadline = Date.now() + 10_000;
    while (!predicate() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(predicate(), message);
  }

  test("a worker that dies mid-pass resumes from the committed cursor without duplicating", async () => {
    const store = new InMemorySyncStateStore();
    const gateway = new FakeChannelGateway();
    const commerce = new FakeCommerceClient();
    commerce.withVariant("SKU-1", "var-1", 10);
    // Two pages: the first commits, then the gateway throws on the second. That is a worker dying
    // mid-pass, after durable state was written but before the pass finished.
    gateway.withOrderPage(`${CHANNEL}:start`, { items: [order("ext-1")], nextCursor: "c1" });
    gateway.withOrderPage(`${CHANNEL}:c1`, { items: [order("ext-2")], nextCursor: null });
    gateway.fetchOrdersErrorAfterPages = 1;

    const producer = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const handlers = createWorkflowHandlers({
      syncState: syncStateClient(store),
      gateway,
      commerce,
      couriers: new FakeCourierGateway(),
      rateShoppingRules: new FakeRateShoppingRulesClient(),
      events: new InMemoryEventPublisher(silent),
      logger: silent,
      queue: producer,
      nextReconcileRunAt: (from) => new Date(from.getTime() + 60_000).toISOString(),
      staleReservationMs: 15 * 60 * 1000,
      maxRefsPerPass: 500
    });

    // --- Phase 1: the worker runs the pass and dies on page two. ---
    const first = new BullMqWorkflowConsumer({
      connection,
      queue: producer,
      handlers,
      logger: silent,
      queueName: QUEUE_NAME
    });
    first.start();
    await producer.enqueue("reconcile.orders", TENANT, CHANNEL, {}, { jobId: JOB_ID });

    // The crash is the *second* attempted read. Waiting on the attempt counter, not on the cursor or
    // the order count, is what makes "died mid-pass" deterministic rather than a race with the
    // consumer's stop.
    await until(
      () => gateway.orderFetchAttempts >= 2,
      "the pass must have attempted page two before dying"
    );
    await first.stop();

    assert.equal(commerce.orders.length, 1, "only the committed page landed before the crash");
    assert.equal(
      (await store.getCursor(TENANT, CHANNEL, "orders"))?.cursor,
      "c1",
      "the cursor advanced past the committed page, which is what makes the resume safe"
    );
    // Reads that succeeded before the restart; the crashing read was never recorded.
    const readsBeforeRestart = gateway.orderFetches.length;

    // --- Phase 2: a fresh worker starts and the pass is re-armed, as `arm()` does on boot. ---
    gateway.fetchOrdersErrorAfterPages = null;
    const second = new BullMqWorkflowConsumer({
      connection,
      queue: producer,
      handlers,
      logger: silent,
      queueName: QUEUE_NAME
    });
    second.start();
    try {
      // The re-arm reuses the base job id, whose job is now terminal in Redis. If the adapter
      // deduped on mere existence this enqueue would be absorbed and the worker would reconcile
      // nothing after a restart.
      const rearmed = await producer.enqueue("reconcile.orders", TENANT, CHANNEL, {}, { jobId: JOB_ID });
      assert.equal(rearmed.deduped, false, "a completed id must not absorb the re-arm");

      await until(() => commerce.orders.length === 2, "the resumed pass must import the missing order");

      // The resume check: the first read after the restart must be the committed cursor, not the
      // fresh start. Reading from `null` again would re-walk the whole window.
      const afterRestart = gateway.orderFetches.slice(readsBeforeRestart);
      assert.equal(afterRestart[0]?.cursor, "c1", "the resumed pass continued from the committed cursor");

      assert.equal(commerce.orders.length, 2, "the resumed pass imported only what was missing");
      assert.equal(
        (await store.getCursor(TENANT, CHANNEL, "orders"))?.cursor,
        null,
        "the resumed pass caught up"
      );
      // The duplicate-effect check: ext-1 was already committed, so the resumed pass must have
      // skipped it through its ref rather than creating a second Medusa order.
      const ref = await store.getOrderRef(TENANT, CHANNEL, "ext-1");
      assert.equal(ref?.status, "committed");
      assert.equal(ref?.orderId, commerce.orders[0]?.orderId);
    } finally {
      await second.stop();
      await producer.close();
    }
  });
}
