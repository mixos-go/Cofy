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
  /**
   * Which channels can report stock (docs/adr/0015), asked of the integration plane at startup.
   *
   * A stock pass is only armed for a channel whose connector implements the snapshot read: arming it
   * for a channel that cannot report stock would spend the shared budget on a walk that can only
   * fail. Defaults to "no channel", so a caller that has not asked arms only order reconciliation.
   */
  readonly stockCapableChannels?: (channel: ChannelCode) => boolean;
  /**
   * Which channels can report delivery status for a shipment they arranged (docs/adr/0021), asked of
   * the plane at startup like the stock capability.
   *
   * A track pass walks the tenant's *active* shipments; for a self-arranged shipment the source is a
   * courier, not the channel, so a channel that cannot report tracking still has its courier-arranged
   * shipments tracked. The flag therefore gates only the channel-arranged half, and the unit skips a
   * channel-arranged shipment whose channel cannot report tracking rather than failing the pass.
   * Defaults to "no channel", so a caller that has not asked arms no track pass at all.
   */
  readonly trackingCapableChannels?: (channel: ChannelCode) => boolean;
}

/** The job id a target's initial order pass uses. Stable, so a restart's `arm()` collapses onto it. */
export function reconciliationJobId(target: ReconciliationTarget): string {
  return `reconcile.orders:${target.tenantId}:${target.channel}`;
}

/** The job id a target's initial stock pass uses (docs/adr/0015). */
export function stockReconciliationJobId(target: ReconciliationTarget): string {
  return `reconcile.stock:${target.tenantId}:${target.channel}`;
}

/** The job id a target's initial delivery-status pass uses (docs/adr/0021). */
export function shipmentTrackJobId(target: ReconciliationTarget): string {
  return `shipment.track:${target.tenantId}:${target.channel}`;
}

/** A cadenced unit: one that walks a tenant/channel and re-arms itself (docs/adr/0015, 0021). */
export type CadencedUnit = "reconcile.orders" | "reconcile.stock" | "shipment.track";

/** The base id for one unit's target. The unit is part of the id, so the passes never collide. */
export function reconcileJobIdFor(unit: CadencedUnit, target: ReconciliationTarget): string {
  switch (unit) {
    case "reconcile.orders":
      return reconciliationJobId(target);
    case "reconcile.stock":
      return stockReconciliationJobId(target);
    case "shipment.track":
      return shipmentTrackJobId(target);
  }
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
export function reArmedJobId(
  unit: CadencedUnit,
  target: ReconciliationTarget,
  runAt: string
): string {
  return `${reconcileJobIdFor(unit, target)}@${runAt}`;
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
    const stockCapable = this.#options.stockCapableChannels ?? ((): boolean => false);
    const trackingCapable = this.#options.trackingCapableChannels ?? ((): boolean => false);
    for (const target of this.#options.targets) {
      const orderResult = await this.#options.queue.enqueue(
        "reconcile.orders",
        target.tenantId,
        target.channel,
        {},
        { jobId: reconciliationJobId(target), runAt: now.toISOString() }
      );
      this.#options.logger.info("reconcile.armed", {
        tenantId: target.tenantId,
        channel: target.channel,
        unit: "reconcile.orders",
        deduped: orderResult.deduped
      });

      // Only a channel whose connector can report stock gets a stock pass. Arming one for a channel
      // that cannot would enqueue a walk whose first page throws on the capability check, which is
      // budget spent on a job that can never succeed (docs/adr/0015).
      if (stockCapable(target.channel)) {
        const stockResult = await this.#options.queue.enqueue(
          "reconcile.stock",
          target.tenantId,
          target.channel,
          {},
          { jobId: stockReconciliationJobId(target), runAt: now.toISOString() }
        );
        this.#options.logger.info("reconcile.armed", {
          tenantId: target.tenantId,
          channel: target.channel,
          unit: "reconcile.stock",
          deduped: stockResult.deduped
        });
      }

      // A track pass rides the same cadence (docs/adr/0021). It is only armed for a channel whose
      // connector reports channel tracking; a channel without it still has its self-arranged
      // shipments tracked by a courier, but arming here would be a walk with no channel source.
      if (trackingCapable(target.channel)) {
        const trackResult = await this.#options.queue.enqueue(
          "shipment.track",
          target.tenantId,
          target.channel,
          {},
          { jobId: shipmentTrackJobId(target), runAt: now.toISOString() }
        );
        this.#options.logger.info("reconcile.armed", {
          tenantId: target.tenantId,
          channel: target.channel,
          unit: "shipment.track",
          deduped: trackResult.deduped
        });
      }
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
