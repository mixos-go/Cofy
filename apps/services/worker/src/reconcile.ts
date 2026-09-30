/**
 * The reconciliation scheduler (docs/PLAN.md M4).
 *
 * Reconciliation is the source of truth (ADR 0002), and M4 requires it to converge orders using the
 * pull path alone. That needs something to *start* a pull on a cadence, and ADR 0002 / AGENTS.md §2.5
 * forbid `setInterval` and in-process cron: a timer dies with the process, duplicates across
 * replicas, and is not durable. So the cadence lives in the queue as a scheduled job, and this class
 * only decides *which* pulls exist and *when* the next one is due.
 *
 * The unit re-arms itself rather than the scheduler ticking. After a successful pull the unit
 * schedules its own next run, which is what makes the cadence survive a restart: the pending retry
 * is in Redis, not in this process's memory. `arm()` is therefore only the bootstrap — it seeds the
 * first run of each target, and a restart seeds it again.
 *
 * A restart can therefore leave two pending passes for one target (the derived retry from before the
 * crash and the base id `arm()` just seeded). That is accepted, not hidden: a pull is idempotent
 * through the order refs, so a duplicated pass costs budget and nothing else, and spending budget on
 * an immediate pass after a restart is the behaviour we want anyway.
 */

import { asChannelCode } from "@platform/contracts";
import type { ChannelCode, TenantId } from "@platform/contracts";
import type { WorkflowLogger, WorkflowQueue } from "@platform/workflow-queue";

/** One tenant's connection to one channel: the unit of reconciliation work. */
export interface ReconciliationTarget {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
}

export interface ReconciliationSchedulerOptions {
  readonly queue: WorkflowQueue;
  readonly targets: readonly ReconciliationTarget[];
  /** Cadence between passes. Read from the environment; never a default invented here. */
  readonly intervalSeconds: number;
  readonly logger: WorkflowLogger;
  readonly now?: () => Date;
}

/** The job id a target's initial pass uses. Stable, so a restart's `arm()` collapses onto it. */
export function reconciliationJobId(target: ReconciliationTarget): string {
  return `reconcile.orders:${target.tenantId}:${target.channel}`;
}

/**
 * The job id a re-armed pass uses: the base id plus the instant, matching the derived-id scheme the
 * dispatcher uses for its own reschedules.
 *
 * The base id cannot be reused for the re-arm. An engine that dedupes on job id across every state
 * (BullMQ does) would see the base id still active — the pass doing the re-arming *is* that job — and
 * absorb the enqueue, so the cadence would stop after the first pass. Appending the instant makes each
 * pass a fresh id, and because the base is recomputed from the target rather than chained off the
 * current id, repeated re-arms stay finite.
 */
export function reArmedJobId(target: ReconciliationTarget, runAt: string): string {
  return `${reconciliationJobId(target)}@${runAt}`;
}

export class ReconciliationScheduler {
  readonly #options: ReconciliationSchedulerOptions;

  constructor(options: ReconciliationSchedulerOptions) {
    if (!Number.isFinite(options.intervalSeconds) || options.intervalSeconds <= 0) {
      // A zero interval would re-enqueue as fast as the queue drains, turning reconciliation into a
      // busy loop against a marketplace whose budget it shares with real-time work.
      throw new RangeError("Reconciliation interval must be a positive number of seconds.");
    }
    this.#options = options;
  }

  /** When a pass that just finished should next run. */
  nextRunAt(from: Date): string {
    return new Date(from.getTime() + this.#options.intervalSeconds * 1_000).toISOString();
  }

  /**
   * Seed the first pass for every target.
   *
   * Idempotent by job id: a pass already pending for a target absorbs this call, so calling it on
   * every boot does not multiply work. A completed pass has freed its id, so a restart also triggers
   * one immediate pass — deliberate, and the reason the duplicate described above is acceptable.
   */
  async arm(): Promise<void> {
    const now = (this.#options.now ?? ((): Date => new Date()))();
    for (const target of this.#options.targets) {
      const result = await this.#options.queue.enqueue(
        "reconcile.orders",
        target.tenantId,
        target.channel,
        {},
        { jobId: reconciliationJobId(target), runAt: now.toISOString() }
      );
      this.#options.logger.info("reconcile.armed", {
        tenantId: target.tenantId,
        channel: target.channel,
        deduped: result.deduped
      });
    }
  }
}

/**
 * Read reconciliation targets from `RECONCILIATION_TARGETS`, a comma-separated `tenant:channel` list.
 *
 * This is a bootstrap source, and its limit is real: the worker cannot yet enumerate the tenants and
 * connections that exist, because the control plane exposes that inventory only to a seller session,
 * not to a service token. Until a service-token inventory route exists, an operator declares the
 * targets. A malformed entry stops startup rather than being skipped — silently reconciling fewer
 * tenants than intended is the failure mode this whole milestone exists to prevent.
 */
export function parseReconciliationTargets(raw: string | undefined): readonly ReconciliationTarget[] {
  if (raw === undefined || raw.trim() === "") return [];

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const [tenantId, channel, ...rest] = entry.split(":");
      if (tenantId === undefined || channel === undefined || rest.length > 0) {
        throw new Error(
          `RECONCILIATION_TARGETS entry "${entry}" is invalid; expected "tenantId:channel".`
        );
      }
      const code = asChannelCode(channel);
      if (code === null) {
        throw new Error(`RECONCILIATION_TARGETS entry "${entry}" names an unknown channel.`);
      }
      return { tenantId, channel: code };
    });
}
