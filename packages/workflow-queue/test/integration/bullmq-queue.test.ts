/**
 * Redis/BullMQ workflow-queue integration test.
 *
 * The in-memory adapter proves the port's contract; this proves the adapter the platform actually runs
 * holds the same contract on Redis, and that the two things BullMQ adds — delayed delivery and restart
 * survival — are real. A behaviour that passes in memory and fails here is the class of bug this suite
 * exists to catch.
 *
 * Skipped when `TEST_REDIS_URL` is absent, so `pnpm test` works without Redis while
 * `pnpm test:integration` runs it for real. It drains the workflow queue afterwards, so it is safe
 * against a shared development Redis.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";
import {
  BullMqWorkflowConsumer,
  BullMqWorkflowQueue,
  connectionOptionsFromUrl
} from "@platform/workflow-queue/bullmq";
import { runWorkflowQueueConformance } from "@platform/workflow-queue/testing";

const REDIS_URL = process.env.TEST_REDIS_URL;

/**
 * Probe Redis before the suite runs.
 *
 * BullMQ retries a failed connection for a long time by default, so without this a `TEST_REDIS_URL`
 * pointing at a dead Redis turns the suite into a multi-minute hang instead of a clear skip.
 */
async function redisReachable(): Promise<boolean> {
  if (REDIS_URL === undefined) return false;
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null
  });
  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

const REACHABLE = await redisReachable();

if (REDIS_URL === undefined) {
  test("bullmq workflow queue", { skip: "TEST_REDIS_URL not set" }, () => {});
} else if (!REACHABLE) {
  test("bullmq workflow queue", { skip: `Redis at TEST_REDIS_URL is not reachable` }, () => {});
} else {
  const url = REDIS_URL;
  // Its own queue, so draining it cannot touch work a running worker is consuming.
  const QUEUE_NAME = "platform.workflows.test";
  // Only the dispatcher's three methods are used, so a no-op logger is enough here.
  const logger = { info() {}, warn() {}, error() {} };

  /** The adapter's own URL parser, so the test exercises the same one the service boots with. */
  function connectionOptions(): ConnectionOptions {
    return connectionOptionsFromUrl(url);
  }

  async function flush(): Promise<void> {
    const connection = new Redis(url, { maxRetriesPerRequest: null });
    const queue = new Queue(QUEUE_NAME, { connection });
    await queue.obliterate({ force: true }).catch(() => {});
    await queue.close();
    await connection.quit();
  }

  await flush();

  // One producer for the whole file: a BullMQ `Queue` opens a Redis connection, so constructing one
  // per test would leak sockets. Redis is durable across tests, unlike the in-memory adapter's fresh
  // map, so each test drains the queue first — the equivalent of the in-memory suite getting a new
  // instance. Without it, one test's leftover jobs are delivered to the next test's consumer.
  const sharedQueue = new BullMqWorkflowQueue({ connection: connectionOptions(), queueName: QUEUE_NAME });
  runWorkflowQueueConformance("bullmq", async () => {
    await flush();
    return sharedQueue;
  });

  test("bullmq: a delayed job is not delivered before its runAt, then is", async () => {
    await flush();
    const connection = connectionOptions();
    const queue = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const seen: string[] = [];
    const consumer = new BullMqWorkflowConsumer({
      connection,
      queue,
      handlers: {
        "order.import": async (job) => {
          seen.push(job.jobId);
          return { kind: "completed" };
        }
      },
      logger,
      queueName: QUEUE_NAME
    });
    consumer.start();

    try {
      await queue.schedule("order.import", "tnt-a", "shopee", {}, {
        jobId: "delayed-1",
        runAt: new Date(Date.now() + 600).toISOString()
      });
      // Nothing should run yet: the job is not due.
      await new Promise((resolve) => setTimeout(resolve, 250));
      assert.equal(seen.length, 0);

      // Due within a second; poll rather than sleep a fixed time, so a slow CI is not a failure.
      const deadline = Date.now() + 5000;
      while (seen.length === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.deepEqual(seen, ["delayed-1"]);
    } finally {
      await consumer.stop();
      await queue.close();
    }
  });

  test("bullmq: a reschedule re-enqueues under a derived id and the retry actually runs", async () => {
    await flush();
    const connection = connectionOptions();
    const queue = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const seen: { jobId: string; at: number }[] = [];
    let runs = 0;
    const consumer = new BullMqWorkflowConsumer({
      connection,
      queue,
      handlers: {
        "order.import": async (job) => {
          runs += 1;
          seen.push({ jobId: job.jobId, at: Date.now() });
          if (runs === 1) {
            // The CHANNEL_RATE_LIMITED path: the governor chose the delay, the runner turns it into a
            // delayed enqueue. If the id were reused, BullMQ's cross-state dedupe would drop it.
            return { kind: "reschedule", runAt: new Date(Date.now() + 400).toISOString(), reason: "app_budget" };
          }
          return { kind: "completed" };
        }
      },
      logger,
      queueName: QUEUE_NAME
    });
    consumer.start();

    try {
      await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "retry-1" });
      const deadline = Date.now() + 5000;
      while (seen.length < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(seen.length, 2, "the rescheduled retry must actually run");
      assert.equal(seen[0]?.jobId, "retry-1");
      assert.equal(seen[1]?.jobId.startsWith("retry-1@"), true);
      assert.ok((seen[1]?.at ?? 0) - (seen[0]?.at ?? 0) >= 300, "the retry honoured the delay");
    } finally {
      await consumer.stop();
      await queue.close();
    }
  });

  test("bullmq: a job survives a consumer restart", async () => {
    // The M4 exit criterion in miniature: enqueue with no consumer running, then start one. The job
    // was never in this process's memory, so it can only run because Redis held it.
    await flush();
    const connection = connectionOptions();
    const queue = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const seen: string[] = [];

    try {
      await queue.enqueue("order.import", "tnt-a", "shopee", {}, { jobId: "survivor-1" });

      const consumer = new BullMqWorkflowConsumer({
        connection,
        queue,
        handlers: {
          "order.import": async (job) => {
            seen.push(job.jobId);
            return { kind: "completed" };
          }
        },
        logger,
        queueName: QUEUE_NAME
      });
      consumer.start();
      const deadline = Date.now() + 5000;
      while (seen.length === 0 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      await consumer.stop();
      assert.deepEqual(seen, ["survivor-1"]);
    } finally {
      await queue.close();
    }
  });

  test("bullmq: a completed job's id is free again, so arm() can seed a fresh pass", async () => {
    // BullMQ retains a completed job in Redis, so a naive "getJob found ⇒ dedupe" would make every
    // later enqueue under that id a silent no-op. The reconciliation scheduler relies on the opposite:
    // `arm()` reuses the base id on every boot, and it must actually seed a pass after the previous
    // one completed, or a restarted worker would reconcile nothing.
    await flush();
    const connection = connectionOptions();
    const queue = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const seen: string[] = [];
    const consumer = new BullMqWorkflowConsumer({
      connection,
      queue,
      handlers: {
        "reconcile.orders": async (job) => {
          seen.push(job.jobId);
          return { kind: "completed" };
        }
      },
      logger,
      queueName: QUEUE_NAME
    });
    consumer.start();

    try {
      const first = await queue.enqueue("reconcile.orders", "tnt-a", "shopee", {}, { jobId: "arm-1" });
      assert.equal(first.deduped, false);
      let deadline = Date.now() + 5000;
      while (seen.length < 1 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.deepEqual(seen, ["arm-1"]);

      // The restart path: same id, work already completed. This must enqueue and run, not dedupe.
      const second = await queue.enqueue("reconcile.orders", "tnt-a", "shopee", {}, { jobId: "arm-1" });
      assert.equal(second.deduped, false, "a completed id must not absorb the re-arm");
      deadline = Date.now() + 5000;
      while (seen.length < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.deepEqual(seen, ["arm-1", "arm-1"], "the re-armed pass actually ran");
    } finally {
      await consumer.stop();
      await queue.close();
    }
  });

  test("bullmq: reconciliation keeps its cadence across passes, re-arming under a fresh id", async () => {
    // The M4 cadence end to end: a completed pass schedules its own next run under `base@runAt`. Two
    // passes must run, which is what proves the cadence continues rather than stopping after one.
    await flush();
    const connection = connectionOptions();
    const queue = new BullMqWorkflowQueue({ connection, queueName: QUEUE_NAME });
    const runs: string[] = [];
    const consumer = new BullMqWorkflowConsumer({
      connection,
      queue,
      handlers: {
        "reconcile.orders": async (job) => {
          runs.push(job.jobId);
          if (runs.length < 2) {
            const runAt = new Date(Date.now() + 200).toISOString();
            await queue.schedule("reconcile.orders", job.tenantId, job.channel, {}, {
              jobId: `reconcile.orders:${job.tenantId}:${job.channel}@${runAt}`,
              runAt
            });
          }
          return { kind: "completed" };
        }
      },
      logger,
      queueName: QUEUE_NAME
    });
    consumer.start();

    try {
      await queue.enqueue("reconcile.orders", "tnt-a", "shopee", {}, { jobId: "reconcile.orders:tnt-a:shopee" });
      const deadline = Date.now() + 5000;
      while (runs.length < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      assert.equal(runs.length, 2, "the cadence must continue past the first pass");
      assert.equal(runs[0], "reconcile.orders:tnt-a:shopee");
      assert.equal(runs[1]?.startsWith("reconcile.orders:tnt-a:shopee@"), true);
    } finally {
      await consumer.stop();
      await queue.close();
    }
  });

  test("bullmq: cleanup", async () => {
    await sharedQueue.close();
    await flush();
  });
}
