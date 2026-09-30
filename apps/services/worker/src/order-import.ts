/**
 * Order import workflow (docs/PLAN.md M3).
 *
 * Pull-only: walk the connector's cursor, and for each order resolve the tenant's channel
 * connection, claim a durable external-order reference, create the Medusa order idempotently, and
 * commit the reference. Webhooks are out of scope for M3 (the TikTok connector declares
 * `supportsWebhooks: false`), so this must be correct without them.
 *
 * Three invariants this file exists to hold:
 *   1. **A redelivered order imports once.** The `(tenant, channel, externalOrderId)` ref is
 *      claimed before any write; a committed ref short-circuits, and a `reserved` one resumes
 *      through the same idempotency key so the marketplace-to-Medusa step cannot double-create.
 *   2. **The cursor advances only after a committed page.** If the walk dies mid-page, the next
 *      run re-reads that page and the refs above make the re-read a no-op, rather than skipping
 *      orders that were never imported.
 *   3. **A failure leaves no orphan.** If the Medusa order was created but the ref could not be
 *      committed, the reservation is released and the ref is marked failed for reconciliation.
 */

import { PlatformError } from "@platform/contracts";
import type { ChannelCode, ChannelOrder, TenantId } from "@platform/contracts";
import { PLATFORM_EVENTS } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, CommerceClient, SyncStateClient } from "./ports.ts";

export interface EventPublisher {
  publish(event: string, payload: Readonly<Record<string, unknown>>): Promise<void>;
}

export interface WorkflowContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export interface OrderImportOutcome {
  /** Orders written to Medusa for the first time. */
  readonly imported: number;
  /** Orders already committed by an earlier run — the idempotency proof, visible in the result. */
  readonly skipped: number;
  /** Orders that could not be imported; each was marked failed for reconciliation. */
  readonly failed: number;
  /** Requests made to the channel, so a caller can see how much budget a walk spent. */
  readonly pages: number;
  /** True when the walk reached the end of the channel's history (`cursor = null`). */
  readonly caughtUp: boolean;
}

const MAX_PAGES_PER_RUN = 100;

export interface OrderImportInput {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  /**
   * Retry refs marked `failed` instead of treating them as terminal (ADR 0014).
   *
   * Off for the real-time path: a `failed` ref is a decision reconciliation owns, so a plain pull
   * must not silently re-attempt a known-bad order and spend budget on it. On for a repair pass,
   * which is the caller that *is* reconciliation — it retries the failure while it holds the order
   * from the channel, which is what makes the retry safe: the ref is only reopened if the order is
   * actually in the page, so a re-count after the pass can never read zero while the order is still
   * missing.
   */
  readonly retryFailedRefs?: boolean;
}

export async function importOrdersOnce(
  context: WorkflowContext,
  input: OrderImportInput
): Promise<OrderImportOutcome> {
  const { syncState, gateway, logger } = context;
  const tenantId = input.tenantId;
  const channel = input.channel;
  const retryFailedRefs = input.retryFailedRefs ?? false;

  let cursor = await syncState.getCursor({ tenantId, channel, entity: "orders" });
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let pages = 0;

  for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
    const batch = await gateway.fetchOrders({ tenantId, channel, cursor });
    pages += 1;

    for (const order of batch.items) {
      const result = await importOneOrder(context, { tenantId, channel, order, retryFailedRefs });
      if (result === "imported") imported += 1;
      else if (result === "skipped") skipped += 1;
      else failed += 1;
    }

    // Advance only now, after every order on this page was either committed or explicitly failed.
    // Advancing earlier would turn a crash into permanently missing orders.
    await syncState.setCursor({ tenantId, channel, entity: "orders", cursor: batch.nextCursor });
    cursor = batch.nextCursor;

    if (batch.nextCursor === null) {
      logger.info("order.import.caught_up", { tenantId, imported, skipped, failed });
      return { imported, skipped, failed, pages, caughtUp: true };
    }
  }

  // Hitting the cap means the channel had more history than one run should spend. The cursor is
  // persisted, so the next run resumes rather than restarting.
  logger.warn("order.import.page_cap", { tenantId, channel, pages });
  return { imported, skipped, failed, pages, caughtUp: false };
}

type OneOrderResult = "imported" | "skipped" | "failed";

async function importOneOrder(
  context: WorkflowContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly order: ChannelOrder;
    readonly retryFailedRefs: boolean;
  }
): Promise<OneOrderResult> {
  const { syncState, commerce, events, logger } = context;
  const { tenantId, channel, order } = input;

  const reservation = await syncState.reserveOrderRef({
    tenantId,
    channel,
    externalOrderId: order.externalOrderId
  });

  if (reservation.kind === "exists" && reservation.ref.status === "committed") {
    // The whole point of the ref: a duplicate delivery is a no-op, proven in the outcome counts.
    return "skipped";
  }
  if (reservation.kind === "exists" && reservation.ref.status === "failed") {
    if (!input.retryFailedRefs) {
      logger.warn("order.import.ref_failed", { tenantId, channel, externalOrderId: order.externalOrderId });
      return "failed";
    }
    // A repair pass retries the failure. The reopen happens here, while the order is in hand, so a
    // repair can never report drift resolved for an order it did not actually pull (ADR 0014).
    await syncState.reopenOrderRef({ tenantId, channel, externalOrderId: order.externalOrderId });
  }

  try {
    const resolved = await resolveLines(context, { tenantId, order });
    if (resolved.length === 0) {
      throw new PlatformError("VALIDATION_FAILED", "No importable line items: every SKU is unresolved.", {
        details: { externalOrderId: order.externalOrderId }
      });
    }

    const idempotencyKey = orderIdempotencyKey(channel, order.externalOrderId);
    const claim = await syncState.claimIdempotency({
      tenantId,
      key: idempotencyKey,
      operation: "order.create",
      fingerprint: orderFingerprint(order)
    });

    if (claim.kind === "replay") {
      // The write already succeeded in an earlier attempt that crashed before committing the ref.
      // Re-use its order id rather than creating a second order.
      const orderId = readOrderId(claim.record.result);
      if (orderId !== null) {
        await syncState.commitOrderRef({ tenantId, channel, externalOrderId: order.externalOrderId, orderId });
        return "imported";
      }
      throw new PlatformError("IDEMPOTENCY_CONFLICT", "A recorded order create has no order id.", {
        details: { externalOrderId: order.externalOrderId }
      });
    }
    if (claim.kind === "in_flight") {
      // Another attempt holds the key. Leaving the ref reserved lets that attempt finish; this run
      // must not race it into a second order.
      logger.warn("order.import.in_flight", { tenantId, channel, externalOrderId: order.externalOrderId });
      return "skipped";
    }

    const created = await commerce.createOrder({
      tenantId,
      order,
      lines: resolved,
      idempotencyKey
    });

    await syncState.completeIdempotency({
      tenantId,
      key: idempotencyKey,
      outcome: "succeeded",
      result: { orderId: created.orderId }
    });
    await syncState.commitOrderRef({
      tenantId,
      channel,
      externalOrderId: order.externalOrderId,
      orderId: created.orderId
    });

    await events.publish(PLATFORM_EVENTS.ORDER_IMPORTED, {
      tenantId,
      channel,
      externalOrderId: order.externalOrderId,
      orderId: created.orderId
    });
    logger.info("order.imported", { tenantId, channel, externalOrderId: order.externalOrderId });
    return "imported";
  } catch (error) {
    await compensate(context, { tenantId, channel, order, error });
    return "failed";
  }
}

/**
 * Resolve each ordered line to a Medusa variant. Lines whose SKU is missing or not in the tenant's
 * catalogue are dropped, not guessed: creating an order line with a made-up variant would price a
 * real order wrongly, which is worse than importing nothing and flagging it.
 */
async function resolveLines(
  context: WorkflowContext,
  input: { readonly tenantId: TenantId; readonly order: ChannelOrder }
): Promise<readonly { readonly sku: string; readonly variantId: string; readonly quantity: number }[]> {
  const skus = input.order.lines
    .map((line) => line.sku)
    .filter((sku): sku is string => sku !== null && sku !== "");
  const variants = await context.commerce.resolveVariantsBySku({ tenantId: input.tenantId, skus });
  const bySku = new Map(variants.map((variant) => [variant.sku, variant.variantId]));

  const resolved: { sku: string; variantId: string; quantity: number }[] = [];
  for (const line of input.order.lines) {
    if (line.sku === null) continue;
    const variantId = bySku.get(line.sku);
    if (variantId === undefined) {
      context.logger.warn("order.import.unresolved_sku", {
        tenantId: input.tenantId,
        externalOrderId: input.order.externalOrderId,
        sku: line.sku
      });
      continue;
    }
    resolved.push({ sku: line.sku, variantId, quantity: line.quantity });
  }
  return resolved;
}

/**
 * Compensation (M3 exit criterion). A failure after the Medusa order exists must free its
 * reservation, and the ref must be marked failed so reconciliation sees it.
 *
 * The order is found through the `channel-order-link` module (ADR 0010 point 3), not from the
 * worker's memory: a crash before commit is exactly the case where memory is gone and the link is
 * the only durable record that a create landed. The idempotency claim is deliberately left
 * untouched — moving it to `failed` would let a later run re-create the order while this one's
 * release is still in flight, which is a double order.
 */
async function compensate(
  context: WorkflowContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly order: ChannelOrder;
    readonly error: unknown;
  }
): Promise<void> {
  const { syncState, commerce, events, logger } = context;
  const { tenantId, channel, order } = input;
  const message = input.error instanceof Error ? input.error.message : "unknown";

  let orderId: string | null = null;
  try {
    const link = await commerce.findOrderByExternalRef({
      tenantId,
      channel,
      externalOrderId: order.externalOrderId
    });
    orderId = link?.orderId ?? null;
  } catch (lookupError) {
    logger.error("order.import.link_lookup_failed", {
      tenantId,
      channel,
      externalOrderId: order.externalOrderId,
      errorMessage: lookupError instanceof Error ? lookupError.message : "unknown"
    });
  }

  if (orderId !== null) {
    try {
      await commerce.releaseOrder({ tenantId, orderId, reason: "order.import_failed" });
      logger.warn("order.import.released", { tenantId, channel, externalOrderId: order.externalOrderId });
    } catch (releaseError) {
      // Failing to release is itself an incident: the stock stays reserved until reconciliation
      // retries. Log it loudly rather than swallowing it.
      logger.error("order.import.release_failed", {
        tenantId,
        channel,
        externalOrderId: order.externalOrderId,
        errorMessage: releaseError instanceof Error ? releaseError.message : "unknown"
      });
    }
  }

  // A ref may still be `reserved` if the failure happened before commit; failing it is the signal
  // reconciliation reads. A ref that is somehow already committed is left alone by the store.
  try {
    await syncState.failOrderRef({ tenantId, channel, externalOrderId: order.externalOrderId });
  } catch (error) {
    logger.warn("order.import.ref_fail_skipped", {
      tenantId,
      channel,
      externalOrderId: order.externalOrderId,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
  }

  await events.publish(PLATFORM_EVENTS.ORDER_IMPORT_FAILED, {
    tenantId,
    channel,
    externalOrderId: order.externalOrderId,
    errorMessage: message
  });
  logger.error("order.import_failed", { tenantId, channel, externalOrderId: order.externalOrderId, errorMessage: message });
}

function readOrderId(result: unknown): string | null {
  if (result === null || typeof result !== "object") return null;
  const orderId = (result as { orderId?: unknown }).orderId;
  return typeof orderId === "string" ? orderId : null;
}

function orderIdempotencyKey(channel: ChannelCode, externalOrderId: string): string {
  return `order.create:${channel}:${externalOrderId}`;
}

/**
 * A stable digest of the order for the idempotency key. The same key with a different fingerprint
 * is a programming error, so this must cover everything that changes what gets written.
 */
function orderFingerprint(order: ChannelOrder): string {
  const lines = order.lines.map((line) => `${line.externalLineId}:${line.sku ?? ""}:${line.quantity}`).join(",");
  return `${order.channel}:${order.externalOrderId}:${order.placedAt}:${lines}`;
}
