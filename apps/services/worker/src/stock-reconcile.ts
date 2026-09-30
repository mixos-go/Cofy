/**
 * Stock reconciliation (docs/PLAN.md M4, docs/adr/0015).
 *
 * Order reconciliation converges orders by re-reading a cursor window; stock is different. A stock
 * level is not an entity we import, it is a number two systems each hold a copy of, so drift is not
 * a missing record — it is a disagreement between the channel's copy and Medusa's. Detecting it
 * needs a read neither system offers the other: the channel's own snapshot.
 *
 * Three rules shape the design, and they are ADR 0015's:
 *
 *   1. **Medusa is authoritative.** A mismatch is repaired by pushing the *local* value, never by
 *      writing the channel's value into Medusa. Two channels sharing one Medusa level would
 *      otherwise fight, and the last writer would win nondeterministically.
 *   2. **Repair is the ordinary push.** A mismatch calls the same `pushStockOnce` the real-time
 *      `stock.changed` path uses, so idempotency, mapping resolution and the governor are not
 *      reimplemented. An absolute set is naturally idempotent, so a repair that dies mid-way replays
 *      rather than re-pushing blindly.
 *   3. **Uncomparable is not drift.** A channel level with no seller SKU, or a SKU we do not sell,
 *      cannot be repaired by any push. Counting it as drift would produce a number that never
 *      returns to zero, so it is counted separately and never repaired.
 *
 * The cursor advances only after a page's comparisons and repairs have been applied, so a crash
 * re-reads a page instead of skipping the levels it contained.
 */

import { classifyStockDrift } from "@platform/contracts";
import type { ChannelCode, ChannelStockLevel, StockUpdate, TenantId } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, CommerceClient, SyncStateClient } from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { pushStockOnce } from "./stock-push.ts";

export interface StockReconcileContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
  /** Bounds how many pages one pass walks, like the other reconciliation units. */
  readonly maxPagesPerPass?: number;
  readonly now?: () => Date;
}

export interface StockReconcileOutcome {
  /** Levels compared against the tenant's catalogue. */
  readonly compared: number;
  /** Levels that disagreed. Each was a repair candidate. */
  readonly mismatched: number;
  /** Repairs the channel accepted. A rejected repair is counted in `unrepaired`. */
  readonly repaired: number;
  /** Mismatches whose repair the channel did not accept, for the next pass to retry. */
  readonly unrepaired: number;
  /** Levels reported without a SKU, or for a SKU we do not sell: not drift, not repairable. */
  readonly uncomparable: number;
  readonly pages: number;
  readonly caughtUp: boolean;
}

const DEFAULT_MAX_PAGES_PER_PASS = 100;

/**
 * Walk the channel's stock snapshot, compare each level to Medusa, and repair the mismatches.
 *
 * The comparison is per SKU, not per variant: the snapshot's `externalSkuId` is the marketplace's
 * handle and is carried for diagnostics only. A push is addressed by the *stored* listing mapping
 * (ADR 0009), so a level whose SKU we know but whose variant we never mapped is reported through the
 * push results as `unknown_sku` and costs no marketplace call.
 */
export async function reconcileStockOnce(
  context: StockReconcileContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode }
): Promise<StockReconcileOutcome> {
  const { syncState, gateway, logger } = context;
  const { tenantId, channel } = input;
  const maxPages = context.maxPagesPerPass ?? DEFAULT_MAX_PAGES_PER_PASS;

  let cursor = await syncState.getCursor({ tenantId, channel, entity: "stock" });
  let compared = 0;
  let mismatched = 0;
  let repaired = 0;
  let unrepaired = 0;
  let uncomparable = 0;
  let pages = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const batch = await gateway.fetchStockSnapshot({ tenantId, channel, cursor });
    pages += 1;

    const outcome = await compareAndRepairPage(context, { tenantId, channel, levels: batch.items });
    compared += outcome.compared;
    mismatched += outcome.mismatched;
    repaired += outcome.repaired;
    unrepaired += outcome.unrepaired;
    uncomparable += outcome.uncomparable;

    await syncState.setCursor({ tenantId, channel, entity: "stock", cursor: batch.nextCursor });
    cursor = batch.nextCursor;

    if (batch.nextCursor === null) {
      logger.info("stock.reconcile.completed", {
        tenantId,
        channel,
        compared,
        mismatched,
        repaired,
        unrepaired,
        uncomparable,
        pages,
        caughtUp: true
      });
      return { compared, mismatched, repaired, unrepaired, uncomparable, pages, caughtUp: true };
    }
  }

  logger.warn("stock.reconcile.page_cap", { tenantId, channel, pages, compared, mismatched });
  return { compared, mismatched, repaired, unrepaired, uncomparable, pages, caughtUp: false };
}

async function compareAndRepairPage(
  context: StockReconcileContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly levels: readonly ChannelStockLevel[];
  }
): Promise<{
  compared: number;
  mismatched: number;
  repaired: number;
  unrepaired: number;
  uncomparable: number;
}> {
  const { commerce, logger } = context;
  const { tenantId, channel, levels } = input;

  const withSku = levels.filter(
    (level): level is ChannelStockLevel & { sku: string } => level.sku !== null && level.sku !== ""
  );
  const missingSku = levels.length - withSku.length;

  // One read for the whole page's SKUs rather than one per level: the tenant-side read is a query
  // over the catalogue, and a page is the natural batch.
  const local = new Map<string, number>();
  if (withSku.length > 0) {
    const skus = [...new Set(withSku.map((level) => level.sku))];
    for (const level of await commerce.listStockLevels({ tenantId, skus })) {
      local.set(level.sku, level.available);
    }
  }

  let compared = 0;
  let uncomparable = missingSku;
  const repairs: StockUpdate[] = [];

  for (const level of withSku) {
    const localAvailable = local.get(level.sku);
    if (localAvailable === undefined) {
      // We do not sell this SKU, so there is no local value to compare against and nothing a push
      // could repair. Reported, not repaired (ADR 0015).
      uncomparable += 1;
      logger.debug("stock.reconcile.unknown_sku", { tenantId, channel, sku: level.sku });
      continue;
    }
    compared += 1;
    const kind = classifyStockDrift({ channelAvailable: level.available, localAvailable });
    if (kind === null) continue;
    repairs.push({ sku: level.sku, available: localAvailable });
  }

  if (repairs.length === 0) {
    return { compared, mismatched: 0, repaired: 0, unrepaired: 0, uncomparable };
  }

  logger.warn("stock.reconcile.mismatch", {
    tenantId,
    channel,
    mismatched: repairs.length,
    skus: repairs.map((item) => item.sku)
  });

  // The ordinary push, with the local value. A partial acceptance leaves the rest for the next pass:
  // the repaired SKUs now agree, so the re-read finds only the ones that did not.
  const push = await pushStockOnce(
    { syncState: context.syncState, gateway: context.gateway, events: context.events, logger: context.logger },
    { tenantId, channel, changes: repairs }
  );
  const accepted = new Set(push.results.filter((result) => result.accepted).map((result) => result.sku));
  const repaired = repairs.filter((item) => accepted.has(item.sku)).length;

  return {
    compared,
    mismatched: repairs.length,
    repaired,
    unrepaired: repairs.length - repaired,
    uncomparable
  };
}
