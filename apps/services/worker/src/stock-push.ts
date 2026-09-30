/**
 * Stock push workflow (docs/PLAN.md M3).
 *
 * Turns "stock changed for these SKUs" into marketplace calls, and nothing more: the quantities
 * come from the caller (a `stock.changed` event from the tenant's Medusa), the addresses come from
 * the stored listing mapping (ADR 0009), and the call goes through the integration plane so the
 * connector, the governor and retry stay uniform (AGENTS.md §4).
 *
 * Idempotency (AGENTS.md §2.4): an absolute stock set is naturally idempotent, but the record still
 * has to exist *before* the call, so a crash between the call and the bookkeeping replays rather
 * than re-pushing into a marketplace we cannot prove we already told. The key is derived from the
 * payload, so an unchanged re-push replays and a genuinely new value is a new operation — using one
 * fixed key per SKU would make every later change collide with the first (IDEMPOTENCY_CONFLICT).
 *
 * A SKU with no stored mapping is reported as `unknown_sku` and never pushed: the push would have
 * no address, and guessing one would move the wrong variant's stock.
 */

import { createHash } from "node:crypto";
import type { ChannelCode, StockResult, StockUpdate, TenantId } from "@platform/contracts";
import { PLATFORM_EVENTS } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, SyncStateClient } from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { isRateLimited, releaseDeferredClaim } from "./rate-limit.ts";

export interface StockPushContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly events: EventPublisher;
  readonly logger: Logger;
}

/** A stock level the caller wants reflected on the channel. */
export interface StockChange {
  readonly sku: string;
  readonly available: number;
}

export interface StockPushOutcome {
  /** Results as the connector reported them, one per item the caller asked about. */
  readonly results: readonly StockResult[];
  /** True when the whole batch was a recorded replay, so no marketplace call was made. */
  readonly replayed: boolean;
}

export async function pushStockOnce(
  context: StockPushContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly changes: readonly StockChange[];
  }
): Promise<StockPushOutcome> {
  const { syncState, gateway, events, logger } = context;
  const { tenantId, channel, changes } = input;

  if (changes.length === 0) return { results: [], replayed: false };

  const resolved = await resolveAddresses(context, { tenantId, channel, changes });
  const key = stockPushKey(channel, resolved);

  const claim = await syncState.claimIdempotency({
    tenantId,
    key,
    operation: "stock.push",
    fingerprint: key
  });
  if (claim.kind === "replay") {
    // The same batch already reached the channel. Report its recorded results rather than pushing
    // a second time.
    logger.info("stock.push.replayed", { tenantId, channel });
    return { results: readResults(claim.record.result), replayed: true };
  }
  if (claim.kind === "in_flight") {
    // Another attempt owns this batch; do not race it.
    logger.warn("stock.push.in_flight", { tenantId, channel });
    return { results: resolved.map((item) => ({ sku: item.sku, accepted: false, reason: "channel_error" })), replayed: false };
  }

  let results: readonly StockResult[];
  try {
    results = await gateway.pushStock({ tenantId, channel, items: resolved });
  } catch (error) {
    if (isRateLimited(error)) {
      // The governor refused the call, so nothing was pushed and the batch is still valid. Recording
      // it failed would tell reconciliation a healthy push is broken and would make the replay return
      // a result no attempt produced. Release the claim instead, so the rescheduled retry can take
      // it, and rethrow for the unit handler to turn into a deferral (ADR 0013).
      await releaseDeferredClaim(syncState, { tenantId, key, logger });
      logger.warn("stock.push.deferred", { tenantId, channel, reason: "rate_limited" });
      throw error;
    }
    await syncState.completeIdempotency({ tenantId, key, outcome: "failed", result: null });
    await events.publish(PLATFORM_EVENTS.STOCK_PUSH_FAILED, {
      tenantId,
      channel,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }

  const rejected = results.filter((result) => !result.accepted);
  // A batch is only "succeeded" if every item was accepted. Recording a partial batch as succeeded
  // would replay the failures as done on the next attempt.
  await syncState.completeIdempotency({
    tenantId,
    key,
    outcome: rejected.length === 0 ? "succeeded" : "failed",
    result: results
  });

  if (rejected.length > 0) {
    await events.publish(PLATFORM_EVENTS.STOCK_PUSH_FAILED, {
      tenantId,
      channel,
      rejected: rejected.map((result) => ({ sku: result.sku, reason: result.reason }))
    });
    logger.warn("stock.push.partial", { tenantId, channel, rejected: rejected.length });
  } else {
    logger.info("stock.push.succeeded", { tenantId, channel, items: results.length });
  }

  return { results, replayed: false };
}

/**
 * Fill in each item's marketplace address from the stored listing mapping. An unmapped SKU keeps
 * its address fields absent; the connector then reports `unknown_sku` without a network call, which
 * is the honest outcome and is visible in the results.
 */
async function resolveAddresses(
  context: StockPushContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly changes: readonly StockChange[];
  }
): Promise<readonly StockUpdate[]> {
  const items: StockUpdate[] = [];
  for (const change of input.changes) {
    const mapping = await context.syncState.getSkuMap({
      tenantId: input.tenantId,
      channel: input.channel,
      sku: change.sku
    });
    if (mapping === null) {
      context.logger.warn("stock.push.unmapped_sku", {
        tenantId: input.tenantId,
        channel: input.channel,
        sku: change.sku
      });
      items.push({ sku: change.sku, available: change.available });
      continue;
    }
    items.push({
      sku: change.sku,
      available: change.available,
      externalProductId: mapping.externalProductId,
      externalSkuId: mapping.externalSkuId,
      ...(mapping.externalInventoryId === null ? {} : { externalInventoryId: mapping.externalInventoryId })
    });
  }
  return items;
}

/**
 * Key and fingerprint are the same digest, because the payload *is* the identity of a stock push:
 * the same values to the same channel address the same state.
 */
function stockPushKey(channel: ChannelCode, items: readonly StockUpdate[]): string {
  const canonical = items
    .map((item) => `${item.sku}:${item.available}:${item.externalSkuId ?? ""}:${item.externalInventoryId ?? ""}`)
    .sort()
    .join("|");
  const digest = createHash("sha256").update(canonical).digest("hex").slice(0, 32);
  return `stock.push:${channel}:${digest}`;
}

function readResults(result: unknown): readonly StockResult[] {
  if (!Array.isArray(result)) return [];
  return result as readonly StockResult[];
}
