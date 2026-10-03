/**
 * Shipment-create workflow (docs/PLAN.md M7, docs/adr/0020).
 *
 * This is the join the M7 exit names: it turns "this order should ship" into a booked courier
 * shipment, the tenant's own Fulfillment record, and a queued tracking write-back to the channel.
 * The pieces already existed separately (the plane's courier surface, the pure `selectCourier`
 * rule, `CommerceClient.recordShipment`, the `shipment.write_back` unit); this is the orchestration
 * that makes them one path.
 *
 * The order of the steps is the contract:
 *   1. **Quote, then select.** The quotes are collected from the plane and `selectCourier` picks
 *      one against the tenant's stored rules. The selection object is carried into the outcome, so
 *      the audit is the value this function returns rather than a log line reconstructed later.
 *   2. **Book exactly the chosen quote.** `createShipment` is addressed by the selection's own
 *      quote, so the service that ships is the service the audit explains (docs/adr/0020).
 *   3. **Record the tenant-side Fulfillment.** `recordShipment` consumes the order's reservation
 *      and carries the waybill; it is idempotent on the waybill, so a retry converges.
 *   4. **Queue the write-back.** After this returns a booked shipment, the caller enqueues
 *      `shipment.write_back` so the channel write is governed and retried like every other outbound
 *      marketplace call (AGENTS.md §4). The unit handler owns the queue, so this workflow stays a
 *      plain function over ports and does not reach for one.
 *
 * Idempotency (AGENTS.md §2.4): the claim is keyed on the order and the selected quote, and it is
 * taken *before* the courier books, so a crash after booking replays the recorded shipment rather
 * than booking a second waybill. That is weaker than an absolute stock set — no target courier
 * offers a native idempotency key — which is the accepted, operator-visible failure the ADR records.
 *
 * A selection that chose nothing is **not** a crash: it is the honest answer that no courier
 * qualified, and it is reported with `selectCourier`'s actionable reason so the seller sees why
 * rather than a blank failure.
 */

import { PlatformError, selectCourier } from "@platform/contracts";
import type {
  CourierCode,
  CourierSelection,
  OrderId,
  RateShoppingRules,
  Shipment,
  ShipmentQuote,
  ShipmentRequest,
  TenantId
} from "@platform/contracts";
import { PLATFORM_EVENTS } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type {
  CommerceClient,
  CourierGateway,
  RateShoppingRulesClient,
  SyncStateClient
} from "./ports.ts";
import type { EventPublisher } from "./order-import.ts";
import { isRateLimited, releaseDeferredClaim } from "./rate-limit.ts";

export interface ShipmentCreateContext {
  readonly syncState: SyncStateClient;
  readonly couriers: CourierGateway;
  readonly rules: RateShoppingRulesClient;
  readonly commerce: CommerceClient;
  readonly events: EventPublisher;
  readonly logger: Logger;
}

export interface ShipmentCreateInput {
  readonly tenantId: TenantId;
  /** The tenant's own order id, as the marketplace order became it (ADR 0010 point 3). */
  readonly orderId: OrderId;
  /** The lines to ship, by our SKU — the same vocabulary an order import and `recordShipment` use. */
  readonly items: readonly { readonly sku: string; readonly quantity: number }[];
  readonly shipment: ShipmentRequest;
  /** Couriers to price. Absent means every registered courier. */
  readonly couriers?: readonly CourierCode[];
  readonly now?: () => Date;
}

export interface ShipmentCreateOutcome {
  /** The booked shipment, or null when no quote qualified and nothing was booked. */
  readonly shipment: Shipment | null;
  /** The tenant-side Fulfillment id, or null when nothing was booked. */
  readonly fulfillmentId: string | null;
  /** True when an earlier attempt already booked this exact shipment. */
  readonly replayed: boolean;
  /** The rate-shopping audit: the chosen quote and every rejection, or null when nothing qualified. */
  readonly selection: CourierSelection;
}

export async function createShipmentOnce(
  context: ShipmentCreateContext,
  input: ShipmentCreateInput
): Promise<ShipmentCreateOutcome> {
  const { syncState, couriers, rules, commerce, events, logger } = context;
  const { tenantId, orderId, items, shipment } = input;
  const now = input.now ?? ((): Date => new Date());

  // The rules come from the control plane, not the tenant's engine: they are platform config about
  // how the seller ships (docs/adr/0020). They are read fresh each attempt, so a seller changing
  // policy is picked up on the next shipment rather than at worker start.
  const stored: RateShoppingRules = await rules.get({ tenantId });

  const fanOut = await couriers.quote({
    tenantId,
    shipment,
    ...(input.couriers === undefined ? {} : { couriers: input.couriers })
  });
  if (fanOut.failures.length > 0) {
    // A courier that could not quote does not sink the fan-out, but it must be visible: the seller
    // needs to know a courier was skipped for a reason and not because it lost on price.
    logger.warn("shipment.create.quote_failures", {
      tenantId,
      orderId,
      failures: fanOut.failures.map((failure) => `${failure.courier}:${failure.reason}`)
    });
  }

  const decidedAt = now().toISOString();
  const selection = selectCourier(fanOut.quotes, stored, decidedAt);

  if (selection.chosen === null) {
    // Nothing qualified. This is a business outcome, not a crash, and the reason names what went
    // wrong ("above the price cap" rather than "no courier"), so the seller can act on it.
    await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
      tenantId,
      orderId,
      reason: selection.reason,
      rejected: selection.rejected.map((entry) => ({
        courier: entry.quote.courier,
        serviceLevel: entry.quote.serviceLevel,
        reason: entry.reason
      }))
    });
    logger.warn("shipment.create.no_quote", { tenantId, orderId, reason: selection.reason });
    return { shipment: null, fulfillmentId: null, replayed: false, selection };
  }

  const chosen: ShipmentQuote = selection.chosen;
  const key = shipmentCreateKey(orderId, chosen);

  const claim = await syncState.claimIdempotency({
    tenantId,
    key,
    operation: "shipment.create",
    fingerprint: key
  });
  if (claim.kind === "in_flight") {
    // Another attempt owns this booking; do not race it into a second waybill.
    logger.warn("shipment.create.in_flight", { tenantId, orderId });
    return { shipment: null, fulfillmentId: null, replayed: false, selection };
  }

  let booked: Shipment;
  let replayed = false;
  if (claim.kind === "replay") {
    // The booking already happened at the courier. Re-read it from the recorded result rather than
    // calling the courier again, then re-run the idempotent tenant-side record so a crash between
    // booking and recording still converges.
    booked = readShipment(claim.record.result);
    replayed = true;
    logger.info("shipment.create.replayed", { tenantId, orderId, courier: booked.courier });
  } else {
    try {
      booked = (
        await couriers.createShipment({ tenantId, quote: chosen, shipment })
      ).shipment;
    } catch (error) {
      if (isRateLimited(error)) {
        // The governor refused the booking, so no waybill exists. Release the claim so the
        // rescheduled retry can take it (ADR 0013).
        await releaseDeferredClaim(syncState, { tenantId, key, logger });
        logger.warn("shipment.create.deferred", { tenantId, orderId, reason: "rate_limited" });
        throw error;
      }
      await syncState.completeIdempotency({ tenantId, key, outcome: "failed", result: null });
      await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
        tenantId,
        orderId,
        courier: chosen.courier,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      throw error;
    }
  }

  let fulfillmentId: string;
  try {
    const recorded = await commerce.recordShipment({
      tenantId,
      orderId,
      items,
      shipment: booked,
      trackingUrl: null
    });
    fulfillmentId = recorded.fulfillmentId;
  } catch (error) {
    // The waybill exists at the courier, so the booking must not happen again: record it as
    // succeeded and fail the attempt. A later retry replays the same shipment and re-runs the
    // idempotent record, which is the recovery path (docs/adr/0020's accepted failure mode).
    await syncState.completeIdempotency({ tenantId, key, outcome: "succeeded", result: booked });
    await events.publish(PLATFORM_EVENTS.SHIPMENT_FAILED, {
      tenantId,
      orderId,
      courier: booked.courier,
      trackingNumber: booked.trackingNumber,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
    throw error;
  }

  if (claim.kind === "claimed") {
    await syncState.completeIdempotency({ tenantId, key, outcome: "succeeded", result: booked });
  }

  await events.publish(PLATFORM_EVENTS.SHIPMENT_CREATED, {
    tenantId,
    orderId,
    courier: booked.courier,
    serviceLevel: booked.serviceLevel,
    trackingNumber: booked.trackingNumber,
    fulfillmentId,
    // The audit travels with the event, so an operator reading it sees the same decision the
    // workflow acted on.
    strategy: selection.strategy,
    rejected: selection.rejected.length
  });
  logger.info("shipment.create.succeeded", {
    tenantId,
    orderId,
    courier: booked.courier,
    serviceLevel: booked.serviceLevel,
    replayed
  });

  return { shipment: booked, fulfillmentId, replayed, selection };
}

/**
 * Key and fingerprint are one digest over the order and the chosen quote.
 *
 * The quote is in the key because a corrected selection (the seller changed the rules, or a courier
 * re-priced) is genuinely a new booking, not a replay. It matches ADR 0020's "derived from the order
 * and the chosen quote".
 */
function shipmentCreateKey(orderId: OrderId, quote: ShipmentQuote): string {
  return `shipment.create:${orderId}:${quote.courier}:${quote.serviceLevel}:${quote.providerQuoteId}`;
}

/** Read the shipment a prior attempt recorded, refusing a result that is not one. */
function readShipment(result: unknown): Shipment {
  const candidate = result as Shipment | null;
  if (
    candidate === null ||
    typeof candidate !== "object" ||
    typeof candidate.trackingNumber !== "string" ||
    candidate.trackingNumber === ""
  ) {
    throw new PlatformError("UPSTREAM_ERROR", "A recorded shipment is malformed; refusing to replay it.");
  }
  return candidate;
}
