/**
 * In-memory workflow-queue tests.
 *
 * The shared producer conformance suite, plus the parts only the in-memory engine can express: the
 * fake-clock `take`, and the reschedule path through `dispatchJob` end to end.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryWorkflowQueue } from "../src/memory-queue.ts";
import { dispatchJob } from "../src/runner.ts";
import { runWorkflowQueueConformance } from "../testing/queue-conformance.ts";
import type { WorkflowJob } from "../src/units.ts";

const NOW = "2026-09-26T00:00:00.000Z";
const LATER = "2026-09-26T00:05:00.000Z";

/** A queue with a pinned clock, so "due" is a fact of the test and not of the wall clock. */
function makeQueue(): InMemoryWorkflowQueue {
  return new InMemoryWorkflowQueue({ now: () => NOW });
}

runWorkflowQueueConformance("in-memory", async () => makeQueue());

function job(overrides: Partial<WorkflowJob> = {}): WorkflowJob {
  return { unit: "order.import", jobId: "j1", tenantId: "tnt-a", channel: "shopee", payload: {}, ...overrides };
}

function logger() {
  // Only the dispatcher's three methods are used, so a no-op logger is enough here.
  return { info() {}, warn() {}, error() {} };
}

test("in-memory: a future job is not taken before it is due", async () => {
  const queue = makeQueue();
  await queue.schedule("order.import", "tnt-a", "shopee", {}, { jobId: "j1", runAt: LATER });
  assert.equal(await queue.take(NOW), null);
  assert.equal((await queue.take(LATER))?.jobId, "j1");
});

test("in-memory: the job envelope round-trips intact", async () => {
  const queue = makeQueue();
  await queue.enqueue("stock.push", "tnt-a", "tiktok_tokopedia", { skus: ["SKU-1"], quantity: 3 }, { jobId: "j1" });
  const taken = await queue.take(NOW);
  assert.equal(taken?.unit, "stock.push");
  assert.equal(taken?.tenantId, "tnt-a");
  assert.equal(taken?.channel, "tiktok_tokopedia");
  assert.deepEqual(taken?.payload, { skus: ["SKU-1"], quantity: 3 });
});

test("in-memory: taking a job removes it, so it is not delivered twice", async () => {
  const queue = makeQueue();
  await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "j1" });
  assert.equal((await queue.take(NOW))?.jobId, "j1");
  assert.equal(await queue.take(NOW), null);
});

test("dispatch: a completed unit runs the handler and does not re-enqueue", async () => {
  const queue = makeQueue();
  const outcome = await dispatchJob(job(), { "order.import": async () => ({ kind: "completed" }) }, queue, logger());
  assert.equal(outcome.result, "completed");
  assert.equal(queue.pendingCount(), 0);
});

test("dispatch: a reschedule re-enqueues at the workflow's runAt, under a derived id", async () => {
  const queue = makeQueue();
  const outcome = await dispatchJob(
    job(),
    { "order.import": async () => ({ kind: "reschedule", runAt: LATER, reason: "app_budget" }) },
    queue,
    logger()
  );

  assert.equal(outcome.result, "reschedule");
  // The original job ran; a retry must now be pending, due at the workflow's time.
  assert.equal(queue.runAtOf(`j1@${LATER}`), LATER);
  assert.equal(await queue.take(NOW), null);
  assert.equal((await queue.take(LATER))?.jobId, `j1@${LATER}`);
});

test("dispatch: two reschedules of one job to the same instant collapse to one retry", async () => {
  const queue = makeQueue();
  const handlers = {
    "order.import": async () => ({ kind: "reschedule" as const, runAt: LATER, reason: "seller_budget" })
  };
  await dispatchJob(job(), handlers, queue, logger());
  await dispatchJob(job(), handlers, queue, logger());
  assert.equal(queue.pendingCount(), 1);
});

test("dispatch: a failed unit is settled, not re-enqueued", async () => {
  const queue = makeQueue();
  const outcome = await dispatchJob(
    job(),
    { "order.import": async () => ({ kind: "failed", retryable: true, errorMessage: "boom" }) },
    queue,
    logger()
  );
  assert.equal(outcome.result, "failed");
  // Reconciliation owns repair (ADR 0002); the queue must not keep retrying on its own.
  assert.equal(queue.pendingCount(), 0);
});

test("dispatch: a handler that throws is a non-retryable failure, not a crash", async () => {
  const queue = makeQueue();
  const outcome = await dispatchJob(
    job(),
    {
      "order.import": async () => {
        throw new Error("bug in the handler");
      }
    },
    queue,
    logger()
  );
  assert.equal(outcome.result, "failed");
  assert.equal(queue.pendingCount(), 0);
});

test("dispatch: a job with no handler is failed, so it cannot spin forever", async () => {
  const queue = makeQueue();
  const outcome = await dispatchJob(job(), {}, queue, logger());
  assert.equal(outcome.result, "failed");
  assert.equal(queue.pendingCount(), 0);
});
