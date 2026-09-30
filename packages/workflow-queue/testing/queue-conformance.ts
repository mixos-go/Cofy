/**
 * The `WorkflowQueue` producer conformance suite (docs/adr/0013).
 *
 * Run against every adapter. These are the guarantees the reschedule path relies on: an enqueue is a
 * new job, a repeat enqueue while one is pending is absorbed, and ids that differ stay distinct. An
 * adapter that does not hold them would let a retried producer double-queue, or collapse two channels'
 * work into one.
 *
 * Consuming is not asserted here: it is engine-specific (a BullMQ `Worker` versus the in-memory
 * `take`), so each adapter proves its own delivery beside itself. The shared, engine-independent part
 * of consuming is `dispatchJob`, tested once in `runner.test.ts`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { WorkflowQueue } from "../src/queue.ts";

export function runWorkflowQueueConformance(
  label: string,
  makeQueue: () => Promise<WorkflowQueue>
): void {
  test(`${label}: an enqueue is a new job`, async () => {
    const queue = await makeQueue();
    const result = await queue.enqueue("order.import", "tnt-a", "shopee", { page: 1 }, { jobId: "j1" });
    assert.equal(result.deduped, false);
    assert.equal(result.jobId, "j1");
  });

  test(`${label}: a pending job absorbs a duplicate enqueue`, async () => {
    const queue = await makeQueue();
    const first = await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "j1" });
    const second = await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "j1" });
    assert.equal(first.deduped, false);
    assert.equal(second.deduped, true);
  });

  test(`${label}: a scheduled job absorbs a duplicate schedule too`, async () => {
    const queue = await makeQueue();
    await queue.schedule("order.import", "tnt-a", "shopee", {}, { jobId: "j1", runAt: "2026-09-26T00:05:00.000Z" });
    const again = await queue.schedule("order.import", "tnt-a", "shopee", {}, { jobId: "j1", runAt: "2026-09-26T00:06:00.000Z" });
    assert.equal(again.deduped, true);
  });

  test(`${label}: jobs with different ids are both new`, async () => {
    const queue = await makeQueue();
    const a = await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "shopee:1" });
    const b = await queue.enqueue("order.import", "tnt-a", "lazada", {}, { jobId: "lazada:1" });
    assert.equal(a.deduped, false);
    assert.equal(b.deduped, false);
  });

  test(`${label}: an in-flight job's derived retry id is accepted as new`, async () => {
    // The reschedule path enqueues a job whose id is derived from the original (`<id>@<runAt>`). That
    // id has never been pending, so it must be accepted. If an adapter keyed retries by the original
    // id it would drop them — the failure ADR 0013 exists to prevent.
    const queue = await makeQueue();
    await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "j1" });
    const retry = await queue.schedule("order.import", "tnt-a", "shopee", {}, {
      jobId: "j1@2026-09-26T00:10:00.000Z",
      runAt: "2026-09-26T00:10:00.000Z"
    });
    assert.equal(retry.deduped, false);
  });
}
