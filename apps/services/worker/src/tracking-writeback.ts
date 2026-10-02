/**
 * Tracking write-back workflow (docs/PLAN.md M7, docs/adr/0020).
 *
 * Turns "this order shipped with this waybill" into one marketplace call, and nothing more: the
 * tracking number comes from the caller (the shipment a courier issued), and the call goes through
 * the integration plane so the connector, the governor and retry stay uniform (AGENTS.md §4).
 *
 * Two things make this a write-back path rather than a bare call:
 *
 * - **It is capability-gated.** Not every channel accepts a tracking number
 *   (`capabilities().supportsTrackingWriteBack`). A channel that cannot is an honest *skip*, not a
 *   failure: the shipment still exists at the courier, and reporting an unsupported operation as
 *   broken would send reconciliation after work that can never succeed. The integration plane
 *   enforces the same gate, so this check is the cheap first line rather than the only one.
 * - **It is idempotent (AGENTS.md §2.4).** The key is derived from the channel, order and waybill,
 *   so the same write-back replays and a corrected waybill is a genuinely new operation. Setting the
 *   same number twice is harmless at the channel, but the record has to exist *before* the call so
 *   our own audit of the outbound write is complete and a retry cannot duplicate the bookkeeping.
 *
 * A governor refusal releases the claim and rethrows, so the rescheduled retry can take it — the
 * same deferral contract the stock push uses (ADR 0013).
 */

import { createHash } from "node:crypto";
import type { ChannelCode, TenantId, TrackingWriteBack } from "@platform/contracts";
import { PLATFORM_EVENTS } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, SyncStateClient } from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { isRateLimited, releaseDeferredClaim } from "./rate-limit.ts";

export interface TrackingWriteBackContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly events: EventPublisher;
  readonly logger: Logger;
}

export interface TrackingWriteBackOutcome {
  /** True when the channel was told the waybill this attempt. */
  readonly written: boolean;
  /** True when the channel has no write-back operation, so nothing was attempted. */
  readonly skipped: boolean;
  /** True when an earlier attempt already wrote this exact waybill, so nothing was sent. */
  readonly replayed: boolean;
}

export async function writeBackTrackingOnce(
  context: TrackingWriteBackContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly externalOrderId: string;
    readonly tracking: TrackingWriteBack;
  }
): Promise<TrackingWriteBackOutcome> {
  const { syncState, gateway, events, logger } = context;
  const { tenantId, channel, externalOrderId, tracking } = input;

  const capabilities = await gateway.capabilities({ channel });
  if (!capabilities.supportsTrackingWriteBack) {
    // Not a failure: the channel simply has no such operation. See the file header.
    logger.info("shipment.write_back.skipped", { tenantId, channel, reason: "unsupported" });
    return { written: false, skipped: true, replayed: false };
  }

  const key = trackingWriteBackKey(channel, externalOrderId, tracking);
  const claim = await syncState.claimIdempotency({
    tenantId,
    key,
    operation: "shipment.write_back",
    fingerprint: key
  });
  if (claim.kind === "replay") {
    logger.info("shipment.write_back.replayed", { tenantId, channel, externalOrderId });
    return { written: false, skipped: false, replayed: true };
  }
  if (claim.kind === "in_flight") {
    // Another attempt owns this write-back; do not race it.
    logger.warn("shipment.write_back.in_flight", { tenantId, channel, externalOrderId });
    return { written: false, skipped: false, replayed: false };
  }

  try {
    await gateway.attachTrackingNumber({ tenantId, channel, externalOrderId, tracking });
  } catch (error) {
    if (isRateLimited(error)) {
      // The governor refused the call, so nothing was sent. Release the claim so the rescheduled
      // retry can take it, and rethrow for the unit handler to turn into a deferral (ADR 0013).
      await releaseDeferredClaim(syncState, { tenantId, key, logger });
      logger.warn("shipment.write_back.deferred", { tenantId, channel, reason: "rate_limited" });
      throw error;
    }
    await syncState.completeIdempotency({ tenantId, key, outcome: "failed", result: null });
    await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
      tenantId,
      channel,
      externalOrderId,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }

  await syncState.completeIdempotency({ tenantId, key, outcome: "succeeded", result: null });
  // No success event: `SHIPMENT_CREATED` means the shipment was created at the courier, which is a
  // different step (docs/adr/0020). A write-back is the channel being told about it, recorded here
  // by the idempotency outcome and the log line rather than by an event the vocabulary does not have.
  logger.info("shipment.write_back.succeeded", { tenantId, channel, externalOrderId });
  return { written: true, skipped: false, replayed: false };
}

/**
 * Key and fingerprint are the same digest, because the payload *is* the identity: the same waybill
 * for the same channel order addresses the same state. The waybill is part of the digest, so a
 * corrected number is a new operation rather than a replay that would silently drop it.
 */
function trackingWriteBackKey(
  channel: ChannelCode,
  externalOrderId: string,
  tracking: TrackingWriteBack
): string {
  const canonical = `${externalOrderId}:${tracking.trackingNumber}:${tracking.trackingUrl ?? ""}`;
  const digest = createHash("sha256").update(canonical).digest("hex").slice(0, 32);
  return `shipment.write_back:${channel}:${digest}`;
}
