/**
 * Workflow units and the job envelope (docs/adr/0013).
 *
 * A *unit* is one thing the engine can run: an existing M3 workflow function, or an M4
 * reconciliation unit. Naming them here — in one closed union with one list — is what makes adding
 * a unit a visible edit rather than a string that appears somewhere in the queue and nowhere in the
 * dispatcher.
 */

import type { ChannelCode, TenantId } from "@platform/contracts";

/** Every unit the engine can dispatch. Adding one is a change here and in the dispatcher table. */
export type WorkflowUnit =
  | "order.import"
  | "listing.import"
  | "stock.push"
  | "shipment.create"
  | "shipment.arrange"
  | "shipment.write_back"
  | "shipment.track"
  | "reconcile.orders"
  | "reconcile.stock";

export const WORKFLOW_UNITS: readonly WorkflowUnit[] = [
  "order.import",
  "listing.import",
  "stock.push",
  "shipment.create",
  "shipment.arrange",
  "shipment.write_back",
  "shipment.track",
  "reconcile.orders",
  "reconcile.stock"
];

/**
 * One unit of work, as the queue carries it.
 *
 * The envelope is deliberately dumb: the queue does not know what an order is, and the workflow
 * reads whatever it needs from `payload`. A `jobId` of our choosing (not a queue-generated one)
 * makes a duplicate enqueue collapse to one pending job, which is the queue-level counterpart of
 * the idempotency lease — a retried producer must not create a second job.
 */
export interface WorkflowJob {
  readonly unit: WorkflowUnit;
  /**
   * Producer-chosen dedupe key. Two enqueues with the same id while one is pending are one job.
   * It should encode what makes the work distinct (tenant, channel, entity), never a timestamp.
   */
  readonly jobId: string;
  readonly tenantId: TenantId;
  readonly channel: ChannelCode | null;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** What running one job produced. The runner decides what to do next from this, not from exceptions. */
export type WorkflowRunResult =
  | { readonly kind: "completed" }
  /**
   * The work is valid but must not run yet — the governor refused a marketplace call. `runAt` is
   * derived from the governor's decision; the queue only carries it (ADR 0013).
   */
  | { readonly kind: "reschedule"; readonly runAt: string; readonly reason: string }
  /**
   * The work cannot proceed. The workflow has already compensated and marked its state failed, so
   * the runner settles the job rather than retrying it: reconciliation owns repair (ADR 0002),
   * not the queue. The engine never invents a retry delay — only the governor does (ADR 0013).
   */
  | { readonly kind: "failed"; readonly retryable: boolean; readonly errorMessage?: string };

/** Runs one job to a terminal or reschedule outcome. */
export type WorkflowHandler = (job: WorkflowJob) => Promise<WorkflowRunResult>;

/** The unit-to-handler table. A missing unit is a wiring bug the runner must not swallow. */
export type WorkflowHandlerTable = Readonly<Partial<Record<WorkflowUnit, WorkflowHandler>>>;

/** Log fields, as structured JSON logging expects them (AGENTS.md §5). */
export type WorkflowLogFields = Readonly<Record<string, unknown>>;

/**
 * The minimal logger the dispatcher needs.
 *
 * Declared here rather than imported from `@platform/observability` because a package may only
 * import `@platform/contracts` (AGENTS.md §3), and the dispatcher genuinely needs just these three
 * methods. `Logger` from observability satisfies this structurally, so a service passes its own
 * logger with no adapter.
 */
export interface WorkflowLogger {
  info(event: string, fields?: WorkflowLogFields): void;
  warn(event: string, fields?: WorkflowLogFields): void;
  error(event: string, fields?: WorkflowLogFields): void;
}
