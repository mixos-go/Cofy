/**
 * The `WorkflowQueue` port (docs/adr/0013).
 *
 * The workflows stay plain functions over ports; the queue is just one more port they receive. It
 * is deliberately tiny: enqueue, schedule, and a way to take work off. Anything richer — retry
 * policy, backoff, rate limiting — is *not* here, because ADR 0013 puts the delay decision in the
 * governor. The queue carries a `runAt` it was handed; it never computes one.
 *
 * `enqueue` and `schedule` differ only in whether the job is due now or later. They are separate
 * methods so the "run this soon" and "run this at a specific time" call sites read differently,
 * while an adapter implements one with the other.
 */

import type { WorkflowJob, WorkflowUnit } from "./units.ts";

export interface EnqueueOptions {
  /**
   * Dedupe key. Enqueuing while a job with the same id is pending is a no-op, so a producer that
   * retries after a timeout cannot double-queue. A completed job id may be reused.
   *
   * An engine that dedupes on job id across *every* state (BullMQ does) also absorbs an id that is
   * active, delayed or completed, and reports `deduped: true`. The port allows that stricter
   * behaviour, which is why `dispatchJob` derives a fresh id for a reschedule instead of reusing the
   * original — see the note on `EnqueueResult.deduped`.
   */
  readonly jobId: string;
  /**
   * When the job becomes due, as an ISO instant. Absent means now. This is how a governor-refused
   * call is rescheduled: the caller derives the time, the queue stores it (ADR 0013).
   */
  readonly runAt?: string;
}

export interface EnqueueResult {
  readonly jobId: string;
  /**
   * True when a job with this id already existed and absorbed the enqueue.
   *
   * The two adapters are deliberately not identical here: the in-memory adapter only absorbs a
   * *pending* id, while BullMQ absorbs an id in any state. A caller must not read `deduped: false`
   * as "this call created the job" — it is safe to treat a job as enqueued at least once, which is
   * all the at-least-once contract needs.
   */
  readonly deduped: boolean;
}

/**
 * The producer side: how workflows add work.
 *
 * This is the surface ADR 0013 names (`enqueue`, `schedule`). It is deliberately the *only* part
 * the workflows see — a workflow that reschedules itself holds a `WorkflowQueue`, never a `Worker`.
 *
 * There is no consumer method on this port on purpose. Consuming is shaped differently per engine
 * (BullMQ pushes to a long-lived `Worker`; a test pulls against a fake clock), and forcing both
 * behind one call would either leak timers into the port or hide the pull a test needs. The shared,
 * engine-independent part of consuming is `dispatchJob` in `runner.ts`, which both call.
 */
export interface WorkflowQueue {
  enqueue(
    unit: WorkflowUnit,
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: EnqueueOptions
  ): Promise<EnqueueResult>;

  /** Convenience for `enqueue` with a `runAt`. */
  schedule(
    unit: WorkflowUnit,
    tenantId: string,
    channel: WorkflowJob["channel"],
    payload: WorkflowJob["payload"],
    options: EnqueueOptions & { readonly runAt: string }
  ): Promise<EnqueueResult>;
}

