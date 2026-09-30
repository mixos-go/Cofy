/**
 * The dispatch loop, engine-agnostic (docs/adr/0013).
 *
 * This is the one place a `WorkflowJob` becomes a call into a workflow and its outcome becomes a
 * queue decision. It lives beside the port rather than inside an adapter so the in-memory engine and
 * the BullMQ adapter share it: if the "reschedule means re-enqueue, failure means settle" rule were
 * reimplemented per adapter, the two engines would quietly diverge on the path M4 depends on.
 *
 * It knows nothing about BullMQ, Redis, or timers. Given a job, a handler table, and a producer
 * queue, it runs one unit and acts on what the unit reported.
 */

import type { WorkflowJob, WorkflowHandlerTable, WorkflowLogger, WorkflowRunResult } from "./units.ts";
import type { WorkflowQueue } from "./queue.ts";

export interface DispatchOutcome {
  readonly jobId: string;
  readonly unit: WorkflowJob["unit"];
  readonly result: WorkflowRunResult["kind"];
}

/**
 * The producer's id without any reschedule suffix this runner appended.
 *
 * `@` separates the base id from the `runAt` a reschedule derives, so the base is everything before
 * the first `@`. Only ids this runner produced contain one; a producer-chosen id must not, which is
 * what lets this stay a pure function of the id rather than of the queue's history.
 */
function baseJobId(jobId: string): string {
  const at = jobId.indexOf("@");
  return at === -1 ? jobId : jobId.slice(0, at);
}

/**
 * Run one job and act on its result.
 *
 * The three outcomes are deliberately asymmetric:
 *   - `completed` means the work is done; the caller settles the job and its id is free again.
 *   - `reschedule` re-enqueues at the `runAt` the workflow chose (the governor's decision, carried
 *     here, not computed here) and does not settle, so the id stays deduped until the retry runs.
 *   - `failed` does not re-enqueue: the workflow has already compensated and marked its own state
 *     failed for reconciliation. Retrying here would be a second repair code path (ADR 0002) and
 *     would need a delay the engine must not invent (ADR 0013). The caller settles it.
 *
 * A handler that throws is a bug, not a business failure: it is caught, logged, and reported as a
 * non-retryable failure, because the workflow functions already turn expected failures into
 * `failed` results and a throw is unexpected.
 */
export async function dispatchJob(
  job: WorkflowJob,
  handlers: WorkflowHandlerTable,
  queue: WorkflowQueue,
  logger: WorkflowLogger
): Promise<DispatchOutcome> {
  const handler = handlers[job.unit];
  if (handler === undefined) {
    // A job with no handler means the queue holds a unit this dispatcher does not know: a version
    // skew between enqueuer and consumer, or a unit added to the union without a table entry. It
    // can never succeed by retrying, so report failure and let the caller settle it.
    logger.error("workflow.no_handler", { jobId: job.jobId, unit: job.unit });
    return { jobId: job.jobId, unit: job.unit, result: "failed" };
  }

  let result: WorkflowRunResult;
  try {
    result = await handler(job);
  } catch (error) {
    logger.error("workflow.handler_threw", {
      jobId: job.jobId,
      unit: job.unit,
      tenantId: job.tenantId,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    return { jobId: job.jobId, unit: job.unit, result: "failed" };
  }

  if (result.kind === "reschedule") {
    // A derived id, not the original. The engine is asked to run this unit again at a new time while
    // the current job is still being processed; reusing the id would let a job-id-dedupe engine
    // (BullMQ dedupes across every state) silently drop the retry. Identity for correctness lives in
    // the workflow's idempotency lease, not the job id (ADR 0013).
    //
    // Derived from the *base* id, not the current one: a unit that reschedules repeatedly (a scan
    // that re-arms itself, or a job throttled several times in a row) would otherwise chain
    // `<id>@t1@t2@t3…` and grow without bound. Trimming to the base keeps ids finite and still
    // collapses two reschedules of one job to the same instant into one retry. This is why `@` is
    // reserved in a producer-chosen job id.
    await queue.schedule(job.unit, job.tenantId, job.channel, job.payload, {
      jobId: `${baseJobId(job.jobId)}@${result.runAt}`,
      runAt: result.runAt
    });
    logger.info("workflow.rescheduled", {
      jobId: job.jobId,
      unit: job.unit,
      tenantId: job.tenantId,
      runAt: result.runAt,
      reason: result.reason
    });
    return { jobId: job.jobId, unit: job.unit, result: "reschedule" };
  }

  if (result.kind === "failed") {
    logger.warn("workflow.failed", {
      jobId: job.jobId,
      unit: job.unit,
      tenantId: job.tenantId,
      retryable: result.retryable,
      errorMessage: result.errorMessage
    });
  }
  return { jobId: job.jobId, unit: job.unit, result: result.kind };
}
