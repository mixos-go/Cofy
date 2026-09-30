/**
 * Reconciliation scheduler tests (docs/PLAN.md M4).
 *
 * The scheduler's whole job is to put the *first* pass of each target into the queue and to keep the
 * cadence in the queue rather than in a timer. These tests pin the two properties that matter:
 * arming is idempotent (a restart does not multiply work), and a malformed target list stops startup
 * instead of quietly reconciling fewer tenants than the operator intended.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "@platform/observability";
import { InMemoryWorkflowQueue } from "@platform/workflow-queue";
import type { WorkflowLogger } from "@platform/workflow-queue";
import {
  parseReconciliationTargets,
  reconciliationJobId,
  reArmedJobId,
  ReconciliationScheduler
} from "../src/reconcile.ts";

const NOW = new Date("2026-09-26T00:00:00.000Z");
const silent: WorkflowLogger = createLogger("error", {}, () => {});

test("arm seeds one pass per target and is idempotent across a restart", async () => {
  const queue = new InMemoryWorkflowQueue({ now: () => NOW.toISOString() });
  const targets = [
    { tenantId: "tnt-a", channel: "shopee" as const },
    { tenantId: "tnt-a", channel: "lazada" as const }
  ];
  const scheduler = new ReconciliationScheduler({ queue, targets, intervalSeconds: 60, logger: silent, now: () => NOW });

  await scheduler.arm();
  assert.equal(queue.pendingCount(), 2);

  // A second boot must not add a third job: the pending pass absorbs the enqueue by job id.
  await scheduler.arm();
  assert.equal(queue.pendingCount(), 2);
  assert.equal(queue.runAtOf(reconciliationJobId(targets[0]!)), NOW.toISOString());
});

test("nextRunAt is the interval after the pass that finished", () => {
  const scheduler = new ReconciliationScheduler({
    queue: new InMemoryWorkflowQueue(),
    targets: [],
    intervalSeconds: 90,
    logger: silent
  });
  assert.equal(scheduler.nextRunAt(NOW), new Date(NOW.getTime() + 90_000).toISOString());
});

test("a non-positive interval is refused rather than becoming a busy loop", () => {
  assert.throws(
    () => new ReconciliationScheduler({ queue: new InMemoryWorkflowQueue(), targets: [], intervalSeconds: 0, logger: silent }),
    RangeError
  );
});

test("re-armed ids are fresh and finite, so the cadence is not absorbed by job-id dedupe", () => {
  const target = { tenantId: "tnt-a", channel: "shopee" as const };
  const first = reArmedJobId(target, "2026-09-26T00:01:00.000Z");
  const second = reArmedJobId(target, "2026-09-26T00:02:00.000Z");
  assert.notEqual(first, second, "a re-arm must not reuse the id of the pass doing the re-arming");
  // The base is recomputed from the target, not chained off the current id, so it stays finite.
  assert.ok(first.startsWith(reconciliationJobId(target)));
  assert.ok(second.startsWith(reconciliationJobId(target)));
  assert.equal(first.split("@").length, 2);
});

test("parseReconciliationTargets accepts a tenant:channel list", () => {
  assert.deepEqual(parseReconciliationTargets("tnt-a:shopee, tnt-b:tiktok_tokopedia"), [
    { tenantId: "tnt-a", channel: "shopee" },
    { tenantId: "tnt-b", channel: "tiktok_tokopedia" }
  ]);
  assert.deepEqual(parseReconciliationTargets(undefined), []);
  assert.deepEqual(parseReconciliationTargets(""), []);
});

test("parseReconciliationTargets refuses a malformed entry instead of skipping it", () => {
  assert.throws(() => parseReconciliationTargets("tnt-a:shopee:extra"), /invalid/);
  assert.throws(() => parseReconciliationTargets("tnt-a"), /invalid/);
  assert.throws(() => parseReconciliationTargets("tnt-a:blibli"), /unknown channel/);
});
