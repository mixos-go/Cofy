/**
 * Redis/BullMQ `WorkflowQueue` adapter (docs/adr/0013).
 *
 * BullMQ is the durable backing for the port: delayed jobs survive a restart, which is what M4 needs
 * and what the in-memory adapter cannot give. It is kept behind this file so no workflow imports it —
 * swapping Redis later is an adapter change, not a workflow rewrite.
 *
 * Two deliberate non-features:
 *
 * 1. **No `limiter`, no `backoff`.** ADR 0013 reserves the delay decision to the `RateLimitGovernor`,
 *    which holds a budget per app key shared across tenants. BullMQ's limiter is per-queue and
 *    per-process, so enabling it would enforce a second, inconsistent budget and hide the channel
 *    cooldown. A refused call is re-enqueued by `dispatchJob` with a concrete `runAt` instead.
 * 2. **No retry policy.** A failed unit is not retried by the queue; the workflow has already
 *    compensated and left state for reconciliation (ADR 0002), and only the governor may choose a
 *    delay (ADR 0013).
 *
 * Job ids are the producer's, so a duplicate enqueue collapses as it does in the in-memory adapter.
 * BullMQ dedupes on job id across *every* state, which is why `dispatchJob` derives a fresh id
 * (`<id>@<runAt>`) for a reschedule: reusing the id would silently drop the retry.
 */

import { Queue, Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import type { EnqueueResult, WorkflowQueue } from "./queue.ts";
import type { WorkflowHandlerTable, WorkflowJob, WorkflowLogger, WorkflowUnit } from "./units.ts";
import { dispatchJob } from "./runner.ts";

/** Default queue name. The governor is the splitter, not the queue name. */
export const WORKFLOW_QUEUE_NAME = "platform.workflows";

/**
 * Parse a Redis connection URL into the options BullMQ expects.
 *
 * Shared rather than copied into each caller (the worker's `main.ts` and the integration test), for
 * the same reason the conformance suite is shared: two parsers would drift, and a connection that
 * works in the test but not in the service is the failure mode that hides until deploy.
 *
 * `rediss://` enables TLS, because the queue carries job payloads that name tenants and orders and a
 * managed Redis in a different network must not be reached in the clear.
 */
export function connectionOptionsFromUrl(url: string): ConnectionOptions {
  const parsed = new URL(url);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    throw new Error(`Unsupported Redis URL scheme "${parsed.protocol}"; expected redis: or rediss:.`);
  }
  const db = parsed.pathname.replace("/", "");
  const password = parsed.password === "" ? undefined : decodeURIComponent(parsed.password);
  const username = parsed.username === "" ? undefined : decodeURIComponent(parsed.username);
  return {
    host: parsed.hostname,
    port: Number(parsed.port === "" ? 6379 : parsed.port),
    ...(db === "" ? {} : { db: Number(db) }),
    ...(username === undefined ? {} : { username }),
    ...(password === undefined ? {} : { password }),
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {})
  };
}

/** Where a queue reads and writes. `queueName` exists so an integration test can use its own queue. */
export interface BullMqQueueOptions {
  readonly connection: ConnectionOptions;
  readonly queueName?: string;
}

interface JobData {
  readonly unit: WorkflowUnit;
  readonly tenantId: string;
  readonly channel: WorkflowJob["channel"];
  readonly payload: WorkflowJob["payload"];
}

function fromBullJob(job: Job<JobData>): WorkflowJob {
  return {
    unit: job.data.unit,
    jobId: String(job.id),
    tenantId: job.data.tenantId,
    channel: job.data.channel,
    payload: job.data.payload
  };
}

/**
 * BullMQ job states in which the work is still outstanding: pending, delayed, or already running.
 *
 * A job in one of these absorbs a same-id enqueue, which is the dedupe the port promises. A job in a
 * *terminal* state (completed or failed) does not: BullMQ keeps terminal jobs in Redis indefinitely,
 * so treating their presence as "still pending" would make every re-enqueue a silent no-op.
 */
const NON_TERMINAL_STATES = new Set(["waiting", "waiting-children", "active", "delayed", "prioritized", "paused"]);

/** Whether an `add` returned a job that already existed rather than the one just submitted. */
function wasAbsorbed(stored: JobData, submitted: JobData): boolean {
  return (
    stored.unit !== submitted.unit ||
    stored.tenantId !== submitted.tenantId ||
    stored.channel !== submitted.channel ||
    JSON.stringify(stored.payload) !== JSON.stringify(submitted.payload)
  );
}

/**
 * The producer half. Owns one BullMQ `Queue`; safe to construct in any process that enqueues work.
 *
 * `close()` is separate from the port because only the owner of the connection should tear it down.
 */
export class BullMqWorkflowQueue implements WorkflowQueue {
  readonly #queue: Queue<JobData>;

  constructor(options: BullMqQueueOptions) {
    this.#queue = new Queue<JobData>(options.queueName ?? WORKFLOW_QUEUE_NAME, {
      connection: options.connection
    });
  }

  async enqueue(
    unit: WorkflowUnit,
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: { readonly jobId: string; readonly runAt?: string }
  ): Promise<EnqueueResult> {
    const existing = await this.#queue.getJob(options.jobId);
    if (existing !== undefined) {
      const state = await existing.getState();
      if (NON_TERMINAL_STATES.has(state)) {
        // Outstanding work with this id. Reusing the id would be a no-op that drops the new payload,
        // so report it as absorbed — the same answer the in-memory adapter gives for a pending id.
        return { jobId: options.jobId, deduped: true };
      }
      // Terminal. BullMQ retains completed/failed jobs, so its presence must not block this enqueue:
      // the in-memory adapter drops a job once taken, and the port's guarantee is about *pending*
      // work. Removing it is what lets a restart's `arm()` seed a fresh pass, and what lets a
      // re-armed pass run after the previous one completed. A removal that races another producer is
      // harmless — the loser's `add` below is then absorbed, which is the correct dedupe.
      await existing.remove().catch(() => {});
    }
    const data: JobData = { unit, tenantId, channel, payload };
    const delay = options.runAt === undefined ? 0 : Math.max(0, Date.parse(options.runAt) - Date.now());
    const added = await this.#queue.add(unit, data, { jobId: options.jobId, delay });
    return { jobId: options.jobId, deduped: wasAbsorbed(added.data, data) };
  }

  async schedule(
    unit: WorkflowUnit,
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: { readonly jobId: string; readonly runAt: string }
  ): Promise<EnqueueResult> {
    return this.enqueue(unit, tenantId, channel, payload, options);
  }

  /** Close the Redis connection this producer opened. */
  async close(): Promise<void> {
    await this.#queue.close();
  }
}

/**
 * The consumer half. Owns a BullMQ `Worker` and runs the shared `dispatchJob` for each delivered job.
 *
 * BullMQ *pushes* jobs, so there is no `take` here as on the in-memory adapter; what stays shared is
 * the decision — `dispatchJob` runs one unit and, for a `reschedule`, enqueues the retry through the
 * same `WorkflowQueue` port.
 */
export class BullMqWorkflowConsumer {
  readonly #connection: ConnectionOptions;
  readonly #queue: WorkflowQueue;
  readonly #handlers: WorkflowHandlerTable;
  readonly #logger: WorkflowLogger;
  readonly #concurrency: number;
  readonly #queueName: string;
  #worker: Worker<JobData> | undefined;

  constructor(options: {
    readonly connection: ConnectionOptions;
    readonly queue: WorkflowQueue;
    readonly handlers: WorkflowHandlerTable;
    readonly logger: WorkflowLogger;
    readonly concurrency?: number;
    readonly queueName?: string;
  }) {
    this.#connection = options.connection;
    this.#queueName = options.queueName ?? WORKFLOW_QUEUE_NAME;
    this.#queue = options.queue;
    this.#handlers = options.handlers;
    this.#logger = options.logger;
    this.#concurrency = options.concurrency ?? 1;
  }

  /** Start consuming. Idempotent: a second call is a no-op. */
  start(): void {
    if (this.#worker !== undefined) return;
    this.#worker = new Worker<JobData>(
      this.#queueName,
      async (job) => {
        await dispatchJob(fromBullJob(job), this.#handlers, this.#queue, this.#logger);
      },
      {
        connection: this.#connection,
        concurrency: this.#concurrency
        // No `limiter`/`backoff`/`attempts`: see the file header.
      }
    );
    this.#worker.on("failed", (job, error) => {
      // dispatchJob logged the unit outcome. This is only the case where BullMQ itself could not run
      // the job (e.g. a Redis hiccup), which is worth seeing because it is the queue, not a unit.
      this.#logger.error("workflow.worker_job_failed", { jobId: job?.id, errorMessage: error.message });
    });
  }

  /** Stop consuming and close the worker. Idempotent. */
  async stop(): Promise<void> {
    const worker = this.#worker;
    this.#worker = undefined;
    if (worker !== undefined) await worker.close();
  }
}
