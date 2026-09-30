/**
 * In-memory `WorkflowQueue` (docs/adr/0013).
 *
 * What makes the workflows testable without Redis: the same unit functions, the same `dispatchJob`,
 * the same reschedule-on-rate-limit path, against a fake clock. Per AGENTS.md §10 it is *not* a
 * licence to ship in-memory state, but it must hold the same guarantees the runner depends on, so it
 * and the Redis adapter are held to one conformance suite (`../testing/queue-conformance.ts`).
 *
 * Time is never a timer. "Due" is a comparison against the `now` each call is given, so a test can
 * jump forward instantly and never sleeps.
 */

import type { EnqueueResult, WorkflowQueue } from "./queue.ts";
import type { WorkflowJob } from "./units.ts";

interface Pending {
  readonly job: WorkflowJob;
  runAt: string;
}

export class InMemoryWorkflowQueue implements WorkflowQueue {
  readonly #pending = new Map<string, Pending>();
  #now: () => string;

  constructor(options: { readonly now?: () => string } = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  async enqueue(
    unit: WorkflowJob["unit"],
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: { readonly jobId: string; readonly runAt?: string }
  ): Promise<EnqueueResult> {
    if (this.#pending.has(options.jobId)) {
      // A pending job with this id absorbs the enqueue, so a producer that retried after a timeout
      // cannot create a second job. A job already taken for processing is not pending, so a workflow
      // rescheduling its own job re-inserts it — that is the reschedule path, not a duplicate.
      return { jobId: options.jobId, deduped: true };
    }
    this.#pending.set(options.jobId, {
      job: { unit, jobId: options.jobId, tenantId, channel, payload },
      runAt: options.runAt ?? this.#now()
    });
    return { jobId: options.jobId, deduped: false };
  }

  async schedule(
    unit: WorkflowJob["unit"],
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: { readonly jobId: string; readonly runAt: string }
  ): Promise<EnqueueResult> {
    return this.enqueue(unit, tenantId, channel, payload, options);
  }

  /**
   * Take the next job due at `now`, or null.
   *
   * Not part of `WorkflowQueue`: taking is how a test drives the engine without a BullMQ worker. The
   * job is removed on take so two callers cannot both receive it; a reschedule re-inserts it.
   */
  async take(now: string): Promise<WorkflowJob | null> {
    const due = [...this.#pending.values()]
      .filter((entry) => entry.runAt <= now)
      .sort((a, b) => (a.runAt === b.runAt ? a.job.jobId.localeCompare(b.job.jobId) : a.runAt.localeCompare(b.runAt)));
    const next = due[0];
    if (next === undefined) return null;
    this.#pending.delete(next.job.jobId);
    return next.job;
  }

  /** Test-only view: how many jobs are pending. Not part of the port. */
  pendingCount(): number {
    return this.#pending.size;
  }

  /** Test-only: the runAt of a pending job, so a reschedule's timing can be asserted. */
  runAtOf(jobId: string): string | null {
    return this.#pending.get(jobId)?.runAt ?? null;
  }
}
