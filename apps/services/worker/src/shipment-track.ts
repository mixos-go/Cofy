/**
 * Shipment track pass (docs/PLAN.md M7, docs/adr/0021).
 *
 * The delivery-status pull path. Like stock reconciliation (ADR 0015) it is a *pull*, not a
 * subscription: the tenant's engine is the source of truth for what has shipped, so the pass reads
 * the active shipments from there, asks each one's source for its newest event, and writes an
 * advance back. There is no webhook for tracking in the target channels we trust, and a pull bounded
 * by the reconciliation cadence is the same mechanism M4/M6 already use (ADR 0002, ADR 0021).
 *
 * Which source is asked depends on who arranged the waybill, and the tenant record says so:
 *   - **channel** — the marketplace booked it, so its delivery status is the channel's own report
 *     (`fetchChannelTracking`).
 *   - **courier** — one of our providers booked it, so the status comes from the courier
 *     (`CourierGateway.track`).
 *
 * Three rules shape the writes:
 *
 *   1. **Only forward moves are written.** A courier can report out of order, so the pass compares
 *      the newest event's status against the shipment's recorded status with `isShipmentStatusAdvance`
 *      and writes only a genuine advance. A re-read that found nothing new writes nothing, which is
 *      what makes a retried pass idempotent (AGENTS.md §2.4).
 *   2. **A terminal shipment is not polled.** A delivered/returned/cancelled shipment is absent from
 *      the active read, so the pass stops spending a channel's budget on work that cannot change.
 *   3. **One shipment's failure does not sink the pass.** A channel or courier that fails for one
 *      shipment is logged and the pass continues; the shipment is simply retried on the next cadence.
 *      A governor refusal is the exception: it propagates so the whole pass reschedules rather than
 *      hammering a budget that is already exhausted (ADR 0013).
 *
 * Terminal statuses are handled by the advance rule rather than by a special case: `isTerminalShipmentStatus`
 * already excludes a terminal `from`, so a shipment that the active read wrongly returned a second
 * time still cannot be moved further by this pass.
 */

import {
  isShipmentStatusAdvance,
  latestShipmentStatus,
  PLATFORM_EVENTS
} from "@platform/contracts";
import type { ActiveShipment, ChannelCode, ShipmentStatus, TenantId, TrackingEvent } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, CommerceClient, CourierGateway } from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { isRateLimited } from "./rate-limit.ts";

export interface ShipmentTrackContext {
  readonly gateway: ChannelGateway;
  readonly couriers: CourierGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
}

export interface ShipmentTrackInput {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  /** Bounds how many shipments one pass considers, like the other reconciliation passes. */
  readonly maxShipmentsPerPass?: number;
  readonly now?: () => Date;
}

export interface ShipmentTrackOutcome {
  /** Active shipments the pass read and considered. */
  readonly considered: number;
  /** Shipments whose recorded status was advanced to a newer one. */
  readonly advanced: number;
  /** Shipments whose newest event equalled their recorded status: nothing to do. */
  readonly unchanged: number;
  /**
   * Shipments the pass could not advance this time — its source failed, or the channel has no
   * tracking surface. Retried on the next cadence.
   */
  readonly failed: number;
  /** Shipments skipped because their channel cannot report tracking (docs/adr/0021). */
  readonly skipped: number;
  readonly caughtUp: boolean;
}

const DEFAULT_MAX_SHIPMENTS_PER_PASS = 200;

/**
 * Walk the tenant's active shipments and advance those whose source reports a newer status.
 *
 * The active read is a snapshot, not a cursor: a shipment that is advanced leaves the active set by
 * becoming terminal, and one that is not stays for the next pass. There is no cursor to commit,
 * because re-reading a shipment that has not changed is the idempotent no-op rule 1 describes.
 */
export async function trackShipmentsOnce(
  context: ShipmentTrackContext,
  input: ShipmentTrackInput
): Promise<ShipmentTrackOutcome> {
  const { commerce, logger } = context;
  const { tenantId, channel } = input;
  const maxShipments = input.maxShipmentsPerPass ?? DEFAULT_MAX_SHIPMENTS_PER_PASS;

  const active = await commerce.listActiveShipments({ tenantId, limit: maxShipments });
  let considered = 0;
  let advanced = 0;
  let unchanged = 0;
  let failed = 0;
  let skipped = 0;

  for (const shipment of active) {
    considered += 1;
    const outcome = await advanceOne(context, { tenantId, channel, shipment });
    switch (outcome) {
      case "advanced":
        advanced += 1;
        break;
      case "unchanged":
        unchanged += 1;
        break;
      case "failed":
        failed += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
    }
  }

  logger.info("shipment.track.completed", {
    tenantId,
    channel,
    considered,
    advanced,
    unchanged,
    failed,
    skipped,
    caughtUp: true
  });
  return { considered, advanced, unchanged, failed, skipped, caughtUp: true };
}

type OneOutcome = "advanced" | "unchanged" | "failed" | "skipped";

/**
 * Advance one shipment, or report why it was not.
 *
 * The source read happens here, so a failure is contained to this shipment. A governor refusal is
 * the one error that is not contained: it is rethrown so the pass reschedules as a whole, because
 * every remaining shipment would hit the same exhausted budget.
 */
async function advanceOne(
  context: ShipmentTrackContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode; readonly shipment: ActiveShipment }
): Promise<OneOutcome> {
  const { gateway, couriers, events, logger } = context;
  const { tenantId, channel, shipment } = input;

  let eventsFromSource: readonly TrackingEvent[];
  if (shipment.arrangement === "channel") {
    const capabilities = await gateway.capabilities({ channel });
    if (!capabilities.supportsChannelTracking) {
      // The channel arranged the shipment but cannot report its tracking. Not a failure: there is
      // simply no source to pull from, and reporting it as broken would send reconciliation after
      // work that can never succeed (docs/adr/0021).
      logger.debug("shipment.track.skipped", {
        tenantId,
        channel,
        fulfillmentId: shipment.fulfillmentId,
        reason: "unsupported"
      });
      return "skipped";
    }
    try {
      eventsFromSource = (
        await gateway.fetchChannelTracking({
          tenantId,
          channel,
          externalOrderId: shipment.externalOrderId
        })
      ).events;
    } catch (error) {
      if (isRateLimited(error)) throw error;
      logger.warn("shipment.track.source_failed", {
        tenantId,
        channel,
        fulfillmentId: shipment.fulfillmentId,
        source: "channel",
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      return "failed";
    }
  } else {
    try {
      eventsFromSource = (
        await couriers.track({
          tenantId,
          courier: shipment.courier,
          trackingNumber: shipment.trackingNumber
        })
      ).events;
    } catch (error) {
      if (isRateLimited(error)) throw error;
      logger.warn("shipment.track.source_failed", {
        tenantId,
        channel,
        fulfillmentId: shipment.fulfillmentId,
        source: "courier",
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      return "failed";
    }
  }

  const newest = latestShipmentStatus(eventsFromSource);
  if (newest === null || !isShipmentStatusAdvance(shipment.status, newest)) {
    // Nothing newer than what is recorded: a re-read, or an out-of-order event that must not move
    // the shipment backwards. Either way the pass writes nothing (rule 1).
    return "unchanged";
  }

  const written = await writeAdvance(context, { tenantId, channel, shipment, status: newest, eventsFromSource });
  if (!written) return "failed";

  await events.publish(PLATFORM_EVENTS.SHIPMENT_STATUS_CHANGED, {
    tenantId,
    channel,
    orderId: shipment.orderId,
    fulfillmentId: shipment.fulfillmentId,
    trackingNumber: shipment.trackingNumber,
    from: shipment.status,
    to: newest
  });
  return "advanced";
}

/** Write the advance to the tenant's engine. Returns false when the write failed (already logged). */
async function writeAdvance(
  context: ShipmentTrackContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly shipment: ActiveShipment;
    readonly status: ShipmentStatus;
    readonly eventsFromSource: readonly TrackingEvent[];
  }
): Promise<boolean> {
  const { commerce, logger } = context;
  const { tenantId, channel, shipment, status, eventsFromSource } = input;
  try {
    await commerce.advanceShipment({
      tenantId,
      fulfillmentId: shipment.fulfillmentId,
      status,
      events: eventsFromSource
    });
    return true;
  } catch (error) {
    if (isRateLimited(error)) throw error;
    logger.warn("shipment.track.write_failed", {
      tenantId,
      channel,
      fulfillmentId: shipment.fulfillmentId,
      status,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    return false;
  }
}
