/**
 * Shipment-arrange workflow (docs/PLAN.md M7, docs/adr/0021).
 *
 * This is the *primary* M7 fulfillment path. For Shopee and TikTok Shop/Tokopedia the marketplace
 * is the logistics orchestrator: it offers the couriers an order may use, books the waybill, issues
 * the printable label and owns the buyer's tracking page. So the platform's job is not to book a
 * courier itself (that is `shipment.create`, the self-arranged path) but to ask the channel to
 * arrange the shipment, then record the marketplace-issued waybill against the tenant's own order.
 *
 * The order of the steps is the contract:
 *   1. **Have the channel arrange it.** `arrangeShipment` is the booking *and* the write-back in one
 *      call: the marketplace that issues the waybill already knows it, so there is nothing to tell it
 *      afterwards. That is why this path queues no `shipment.write_back` (docs/adr/0021).
 *   2. **Fetch the label, when one is asked for and the channel exposes it.** A label is a separate,
 *      separately-gated operation; a channel can arrange without producing a printable document.
 *   3. **Record the tenant-side Fulfillment.** `recordShipment` consumes the order's reservation and
 *      carries the channel-issued waybill, exactly like the self-arranged path — the tenant-side
 *      record is one Medusa Fulfillment either way (docs/adr/0021).
 *
 * Idempotency (AGENTS.md §2.4): the claim is keyed on the channel order, so a retry replays the
 * arrangement the first attempt recorded rather than asking the marketplace to arrange twice. The
 * marketplaces do not offer an idempotency key for `shipOrder`/`shipPackage`, which is ADR 0020's
 * accepted, operator-visible failure mode; the stored result is the guard.
 *
 * A governor refusal releases the claim and rethrows, so the rescheduled retry can take it — the
 * same deferral contract every marketplace call uses (ADR 0013).
 */

import { PlatformError, channelShipmentRecord, PLATFORM_EVENTS } from "@platform/contracts";
import type {
  ArrangedShipment,
  ChannelCode,
  OrderId,
  ShippingArrangementRequest,
  ShippingLabel,
  TenantId
} from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, CommerceClient, SyncStateClient } from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { isRateLimited, releaseDeferredClaim } from "./rate-limit.ts";

export interface ShipmentArrangeContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
}

export interface ShipmentArrangeInput {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  /** The tenant's own order id, as the marketplace order became it (ADR 0010 point 3). */
  readonly orderId: OrderId;
  /** The channel's own order id — how `arrangeShipment` and the label read address the order. */
  readonly externalOrderId: string;
  /** The lines shipped, by our SKU — the same vocabulary an order import and `recordShipment` use. */
  readonly items: readonly { readonly sku: string; readonly quantity: number }[];
  /** The seller's arrangement choice: a channel-booked option, or the seller's own waybill. */
  readonly arrangement: ShippingArrangementRequest;
  /** The channel courier's display name, from the chosen option, for the tenant record. */
  readonly courier: string;
  /** The channel's own service tier, from the chosen option, for the tenant record. */
  readonly serviceLevel: string;
  /** Ask the channel for the printable label too, when the caller wants it and the channel has it. */
  readonly fetchLabel?: boolean;
  readonly now?: () => Date;
}

export interface ShipmentArrangeOutcome {
  /** The arrangement the channel reported, or null when the channel offers no arrangement surface. */
  readonly shipment: ArrangedShipment | null;
  /** The tenant-side Fulfillment id, or null when nothing was arranged. */
  readonly fulfillmentId: string | null;
  /** The printable label, or null when none was requested, exposed, or produced. */
  readonly label: ShippingLabel | null;
  /** True when an earlier attempt already arranged this exact shipment. */
  readonly replayed: boolean;
  /** True when the channel cannot arrange shipments, so nothing was attempted. */
  readonly skipped: boolean;
}

export async function arrangeShipmentOnce(
  context: ShipmentArrangeContext,
  input: ShipmentArrangeInput
): Promise<ShipmentArrangeOutcome> {
  const { syncState, gateway, commerce, events, logger } = context;
  const { tenantId, channel, orderId, externalOrderId, items } = input;

  const capabilities = await gateway.capabilities({ channel });
  if (!capabilities.supportsShippingArrangement) {
    // Not a failure: the channel simply has no arrangement surface. The self-arranged path
    // (`shipment.create` + `shipment.write_back`) is the one that applies (docs/adr/0021).
    logger.info("shipment.arrange.skipped", { tenantId, channel, reason: "unsupported" });
    return { shipment: null, fulfillmentId: null, label: null, replayed: false, skipped: true };
  }

  const key = arrangeKey(channel, externalOrderId);
  const claim = await syncState.claimIdempotency({
    tenantId,
    key,
    operation: "shipment.arrange",
    fingerprint: key
  });
  if (claim.kind === "in_flight") {
    logger.warn("shipment.arrange.in_flight", { tenantId, channel, externalOrderId });
    return { shipment: null, fulfillmentId: null, label: null, replayed: false, skipped: false };
  }

  let arranged: ArrangedShipment;
  let replayed = false;
  if (claim.kind === "replay") {
    // The arrangement already happened at the channel. Re-read it from the recorded result rather
    // than asking the marketplace again, then re-run the idempotent tenant-side record so a crash
    // between arranging and recording still converges.
    arranged = readArrangedShipment(claim.record.result);
    replayed = true;
    logger.info("shipment.arrange.replayed", {
      tenantId,
      channel,
      externalOrderId,
      trackingNumber: arranged.trackingNumber
    });
  } else {
    try {
      arranged = await gateway.arrangeShipment({ tenantId, channel, arrangement: input.arrangement });
    } catch (error) {
      if (isRateLimited(error)) {
        // The governor refused the call, so nothing was arranged. Release the claim so the
        // rescheduled retry can take it (ADR 0013).
        await releaseDeferredClaim(syncState, { tenantId, key, logger });
        logger.warn("shipment.arrange.deferred", { tenantId, channel, reason: "rate_limited" });
        throw error;
      }
      await syncState.completeIdempotency({ tenantId, key, outcome: "failed", result: null });
      await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
        tenantId,
        channel,
        orderId,
        externalOrderId,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      throw error;
    }
  }

  // The label is a separate, separately-gated operation. A failure to fetch it must not undo an
  // arrangement that already exists at the channel, so it is best-effort and reported by absence.
  let label: ShippingLabel | null = null;
  if (input.fetchLabel === true && capabilities.supportsShippingLabel) {
    try {
      label = await gateway.fetchShippingLabel({ tenantId, channel, externalOrderId });
    } catch (error) {
      if (isRateLimited(error)) {
        // The arrangement is recorded below regardless; a throttled label is fetched on a later
        // attempt, so rethrowing here would defer work that already succeeded. Logged, not retried.
        logger.warn("shipment.arrange.label_deferred", { tenantId, channel, externalOrderId });
      } else {
        logger.warn("shipment.arrange.label_failed", {
          tenantId,
          channel,
          externalOrderId,
          errorMessage: error instanceof Error ? error.message : "unknown"
        });
      }
    }
  }

  let fulfillmentId: string;
  try {
    const recorded = await commerce.recordShipment({
      tenantId,
      orderId,
      items,
      shipment: channelShipmentRecord({
        channel,
        externalOrderId,
        arranged,
        courier: input.courier,
        serviceLevel: input.serviceLevel,
        trackingUrl: label?.url ?? null,
        labelUrl: label?.url ?? null
      })
    });
    fulfillmentId = recorded.fulfillmentId;
  } catch (error) {
    // The waybill exists at the channel, so the arrangement must not happen again: record it as
    // succeeded and fail the attempt. A later retry replays the same arrangement and re-runs the
    // idempotent record, which is the recovery path (docs/adr/0020's accepted failure mode).
    await syncState.completeIdempotency({ tenantId, key, outcome: "succeeded", result: arranged });
    await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
      tenantId,
      channel,
      orderId,
      externalOrderId,
      trackingNumber: arranged.trackingNumber,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }

  if (claim.kind === "claimed") {
    await syncState.completeIdempotency({ tenantId, key, outcome: "succeeded", result: arranged });
  }

  await events.publish(PLATFORM_EVENTS.SHIPMENT_CREATED, {
    tenantId,
    channel,
    orderId,
    externalOrderId,
    arrangement: "channel",
    courier: input.courier,
    serviceLevel: input.serviceLevel,
    trackingNumber: arranged.trackingNumber,
    fulfillmentId,
    // No write-back follows: the channel that arranged the shipment already knows the waybill, so
    // the arrangement call *is* the write-back for this path (docs/adr/0021).
    label: label?.url ?? null
  });
  logger.info("shipment.arrange.succeeded", {
    tenantId,
    channel,
    externalOrderId,
    trackingNumber: arranged.trackingNumber,
    replayed
  });

  return { shipment: arranged, fulfillmentId, label, replayed, skipped: false };
}

/**
 * Key and fingerprint are one digest over the channel order.
 *
 * The channel option is *not* in the key: the marketplaces do not let an already-shipped order be
 * re-arranged, so a second arrangement for the same order is a replay to be avoided, not a new
 * booking. The channel order is the identity of the arrangement.
 */
function arrangeKey(channel: ChannelCode, externalOrderId: string): string {
  return `shipment.arrange:${channel}:${externalOrderId}`;
}

/** Read the arrangement a prior attempt recorded, refusing a result that is not one. */
function readArrangedShipment(result: unknown): ArrangedShipment {
  const candidate = result as ArrangedShipment | null;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    typeof candidate.trackingNumber !== "string" ||
    candidate.trackingNumber === ""
  ) {
    throw new PlatformError("UPSTREAM_ERROR", "A recorded arrangement is malformed; refusing to replay it.");
  }
  return candidate;
}
