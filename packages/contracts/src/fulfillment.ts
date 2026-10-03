import type { ChannelCode, Instant, Money, OrderId } from "./ids.ts";

/**
 * Courier-neutral fulfillment shapes (docs/adr/0020).
 *
 * A courier provider maps its own API into these; nothing outside a provider may know a courier's
 * raw field names (AGENTS.md §4). They are deliberately separate from the marketplace types: a
 * shipment and an order are different external systems, and a channel's tracking write-back is a
 * projection of a shipment, not the shipment itself.
 */

/** A courier we can ship with. Additive; a new courier is a new member and a new provider. */
export const COURIER_CODES = ["jne", "jnt", "sicepat", "anteraja", "rajaongkir"] as const;

export type CourierCode = (typeof COURIER_CODES)[number];

/** Narrow an untrusted string to a `CourierCode`, or null. */
export function asCourierCode(value: string): CourierCode | null {
  return (COURIER_CODES as readonly string[]).includes(value) ? (value as CourierCode) : null;
}

/** How fast a service is. Couriers name these differently; this is the neutral vocabulary. */
export const SERVICE_LEVELS = ["regular", "express", "same_day", "cargo"] as const;

export type ServiceLevel = (typeof SERVICE_LEVELS)[number];

/**
 * A courier's price and transit time for one shipment, as a rate-shopping candidate.
 *
 * `providerQuoteId` is the courier's own handle for this quote, carried so a create can address the
 * exact service that was quoted. It is opaque to everything but the provider that issued it.
 */
export interface ShipmentQuote {
  readonly courier: CourierCode;
  readonly serviceLevel: ServiceLevel;
  readonly price: Money;
  /** Transit estimate in whole days, as a range. Couriers give a range, not a point. */
  readonly estimatedDays: { readonly min: number; readonly max: number };
  readonly supportsInsurance: boolean;
  readonly supportsCod: boolean;
  readonly providerQuoteId: string;
}

/** What we are shipping, in courier-neutral terms. */
export interface ShipmentRequest {
  readonly orderId: OrderId;
  /** Destination as the courier expects to receive it; the provider maps it to its own shape. */
  readonly destination: {
    readonly city: string;
    readonly postalCode: string | null;
    readonly address: string;
  };
  /** Total shipment weight in grams. Integer, because couriers bill on whole grams. */
  readonly weightGrams: number;
  /** Declared value, for insurance. */
  readonly declaredValue: Money;
  readonly requiresInsurance: boolean;
  readonly requiresCod: boolean;
}

/**
 * A shipment that exists at the courier.
 *
 * The tenant's Medusa Fulfillment record holds this (docs/adr/0020); this is the courier-facing half
 * of it, returned by a provider's `createShipment`.
 */
export interface Shipment {
  readonly courier: CourierCode;
  readonly serviceLevel: ServiceLevel;
  readonly trackingNumber: string;
  readonly status: ShipmentStatus;
  readonly createdAt: Instant;
}

/**
 * The tracking details a channel is told once a courier has issued them (docs/adr/0020).
 *
 * This is the projection of a `Shipment` that a marketplace wants: the waybill number, and the URL
 * its buyer can follow, when the courier provides one. It is deliberately not a `Shipment`: the
 * marketplace has no notion of our courier code, service level or shipment status, and handing it
 * one would leak our vocabulary across the boundary (AGENTS.md §4).
 */
export interface TrackingWriteBack {
  readonly trackingNumber: string;
  /** Trackable URL for the buyer. `null` when the courier returned none. */
  readonly trackingUrl: string | null;
}

export const SHIPMENT_STATUSES = [
  "created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
  "cancelled"
] as const;

export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/**
 * True when a shipment can no longer change on its own.
 *
 * A track pass stops walking a shipment once it is terminal; without this the pass would poll
 * delivered shipments forever and spend a courier's budget on work that cannot change.
 */
export function isTerminalShipmentStatus(status: ShipmentStatus): boolean {
  return status === "delivered" || status === "returned" || status === "cancelled";
}

/**
 * Where a non-terminal status sits in the forward delivery sequence.
 *
 * A courier can report events out of order, so a track pass that wrote whatever it read last could
 * move a shipment *backwards* ("picked up" after "in transit"). Ranking the non-terminal statuses
 * lets the pass treat a lower rank as stale rather than as an advance. The terminal statuses have no
 * rank: they are decided by `isTerminalShipmentStatus`, not by position.
 */
const SHIPMENT_STATUS_RANK: Readonly<Record<ShipmentStatus, number | null>> = {
  created: 0,
  picked_up: 1,
  in_transit: 2,
  out_for_delivery: 3,
  delivered: null,
  failed: null,
  returned: null,
  cancelled: null
};

/**
 * True when `to` is a genuine advance from `from`, so a track pass writes only forward moves.
 *
 * A terminal `from` never advances again (the shipment is done). The same status is not an advance
 * (the re-read found nothing new). A terminal `to` is always an advance from a non-terminal `from`
 * — a failure or return can arrive at any point in the sequence. Two non-terminal statuses advance
 * only when the target's rank is higher, which is what stops an out-of-order courier event from
 * moving the shipment backwards.
 */
export function isShipmentStatusAdvance(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (isTerminalShipmentStatus(from)) return false;
  if (from === to) return false;
  if (isTerminalShipmentStatus(to)) return true;
  const fromRank = SHIPMENT_STATUS_RANK[from];
  const toRank = SHIPMENT_STATUS_RANK[to];
  return fromRank !== null && toRank !== null && toRank > fromRank;
}

/** One tracking event, normalised. The newest by `occurredAt` is the shipment's current status. */
export interface TrackingEvent {
  readonly status: ShipmentStatus;
  readonly occurredAt: Instant;
  readonly description: string;
}

/**
 * The newest status among a set of tracking events, or null when there are none.
 *
 * "Newest by `occurredAt`", not by array position: couriers return events in inconsistent order, so
 * a track pass that trusted the order would move a shipment backwards. Terminal here means the pass
 * can stop polling it (`isTerminalShipmentStatus`).
 */
export function latestShipmentStatus(events: readonly TrackingEvent[]): ShipmentStatus | null {
  let latest: TrackingEvent | null = null;
  for (const event of events) {
    if (latest === null || Date.parse(event.occurredAt) > Date.parse(latest.occurredAt)) {
      latest = event;
    }
  }
  return latest?.status ?? null;
}

/**
 * Who arranged a shipment's waybill (docs/adr/0021).
 *
 * `channel` means the marketplace booked it (the primary path for Shopee and TikTok
 * Shop/Tokopedia), so its delivery status is pulled from the channel. `courier` means one of our
 * `CourierProvider`s booked it, so its status is pulled from the courier. The track pass branches
 * on this rather than guessing from the waybill's shape.
 */
export const SHIPMENT_ARRANGEMENTS = ["channel", "courier"] as const;

export type ShipmentArrangement = (typeof SHIPMENT_ARRANGEMENTS)[number];

/** Narrow an untrusted string to a `ShipmentArrangement`, or null. */
export function asShipmentArrangement(value: string): ShipmentArrangement | null {
  return (SHIPMENT_ARRANGEMENTS as readonly string[]).includes(value)
    ? (value as ShipmentArrangement)
    : null;
}

/**
 * One tenant shipment the track pass may still advance (docs/adr/0021).
 *
 * The tenant's engine is the source of truth for what has shipped, so the pass reads this from
 * there rather than keeping a second shipment list in the platform. It is a discriminated union on
 * `arrangement`, because the two paths pull from different systems and need different handles:
 *
 * - `channel` — the marketplace booked it, so the pass asks the channel and needs the channel code
 *   and the marketplace's own order id.
 * - `courier` — one of our providers booked it, so the pass asks the courier and needs its code.
 *
 * A shipment in a terminal status is not active and is not returned, so a delivered shipment is
 * never polled again.
 */
export type ActiveShipment = {
  readonly fulfillmentId: string;
  readonly orderId: OrderId;
  readonly trackingNumber: string;
  /** The channel the order came from. A courier-arranged shipment still came from one channel. */
  readonly channel: ChannelCode;
  /** The last status the tenant recorded, so the pass can tell an advance from a re-read. */
  readonly status: ShipmentStatus;
  readonly updatedAt: Instant;
} & (
  | {
      readonly arrangement: "channel";
      readonly externalOrderId: string;
    }
  | {
      readonly arrangement: "courier";
      readonly courier: CourierCode;
    }
);

/**
 * How a tenant wants couriers chosen. Platform config about *how the seller ships*, not commerce
 * data, so it lives with the tenant record rather than in the data plane (docs/adr/0020).
 */
export interface RateShoppingRules {
  /** Empty means "any courier". A non-empty list is a hard constraint, not a preference. */
  readonly allowedCouriers: readonly CourierCode[];
  /** Empty means "any service level". */
  readonly allowedServiceLevels: readonly ServiceLevel[];
  /** Reject a quote above this price. `null` means no cap. */
  readonly maxPrice: Money | null;
  /** Reject a quote whose worst-case transit exceeds this many days. `null` means no cap. */
  readonly maxEstimatedDays: number | null;
  /** Reject a courier that cannot insure the declared value. */
  readonly requiresInsurance: boolean;
  /** Reject a courier that cannot collect cash on delivery. */
  readonly requiresCod: boolean;
  readonly strategy: RateShoppingStrategy;
  /** Order of preference, most preferred first. Only consulted by the `preferred` strategy. */
  readonly preferredCouriers: readonly CourierCode[];
}

export const RATE_SHOPPING_STRATEGIES = ["cheapest", "fastest", "preferred"] as const;

export type RateShoppingStrategy = (typeof RATE_SHOPPING_STRATEGIES)[number];

/**
 * Why one quote was not chosen.
 *
 * A reason is attached to a *quote*, never a bare courier name: the same courier can be rejected for
 * one service level and accepted for another, and a reason that named only the courier could not
 * express that.
 */
export const QUOTE_REJECTION_REASONS = [
  "courier_not_allowed",
  "service_level_not_allowed",
  "price_above_cap",
  "transit_time_above_cap",
  "insurance_unsupported",
  "cod_unsupported"
] as const;

export type QuoteRejectionReason = (typeof QUOTE_REJECTION_REASONS)[number];

export interface RejectedQuote {
  readonly quote: ShipmentQuote;
  readonly reason: QuoteRejectionReason;
}

/**
 * The outcome of rate shopping: what was chosen, and why everything else was not.
 *
 * This object *is* the audit record M7 requires ("rate shopping respects tenant rules and is
 * auditable — why this courier was chosen"). It is the return value of a pure function, so the
 * explanation cannot drift from the decision the way a log line reconstructed after the fact can
 * (docs/adr/0014, docs/adr/0015).
 *
 * `reason` is non-null exactly when `chosen` is null, and names the distinct rejections so a seller
 * sees an actionable cause ("above the price cap") rather than an empty result.
 */
export interface CourierSelection {
  readonly chosen: ShipmentQuote | null;
  readonly strategy: RateShoppingStrategy;
  readonly rejected: readonly RejectedQuote[];
  readonly decidedAt: Instant;
  readonly reason: string | null;
}

function rejects(quote: ShipmentQuote, rules: RateShoppingRules): QuoteRejectionReason | null {
  if (rules.allowedCouriers.length > 0 && !rules.allowedCouriers.includes(quote.courier)) {
    return "courier_not_allowed";
  }
  if (rules.allowedServiceLevels.length > 0 && !rules.allowedServiceLevels.includes(quote.serviceLevel)) {
    return "service_level_not_allowed";
  }
  if (rules.maxPrice !== null && quote.price.amount > rules.maxPrice.amount) {
    return "price_above_cap";
  }
  if (rules.maxEstimatedDays !== null && quote.estimatedDays.max > rules.maxEstimatedDays) {
    return "transit_time_above_cap";
  }
  if (rules.requiresInsurance && !quote.supportsInsurance) {
    return "insurance_unsupported";
  }
  if (rules.requiresCod && !quote.supportsCod) {
    return "cod_unsupported";
  }
  return null;
}

/**
 * The deterministic order two qualifying quotes compare in, so the same inputs always choose the
 * same quote.
 *
 * The strategy decides first; the trailing courier code and service level are tie-breakers that make
 * the result total. Without them two quotes equal on price and transit would be ordered by their
 * position in the input array, and a caller that collected quotes concurrently would get a different
 * courier run to run for identical rules — an audit that cannot be reproduced is not an audit.
 */
function comparatorFor(
  rules: RateShoppingRules
): (a: ShipmentQuote, b: ShipmentQuote) => number {
  const byPrice = (a: ShipmentQuote, b: ShipmentQuote): number => a.price.amount - b.price.amount;
  const byTransit = (a: ShipmentQuote, b: ShipmentQuote): number =>
    a.estimatedDays.max - b.estimatedDays.max;
  const byPreference = (a: ShipmentQuote, b: ShipmentQuote): number => {
    const rank = (quote: ShipmentQuote): number => {
      const index = rules.preferredCouriers.indexOf(quote.courier);
      // An unlisted courier ranks after every listed one, and among themselves keep their input order
      // only until the trailing tie-breakers run.
      return index === -1 ? rules.preferredCouriers.length : index;
    };
    return rank(a) - rank(b);
  };

  const primary =
    rules.strategy === "cheapest" ? byPrice : rules.strategy === "fastest" ? byTransit : byPreference;
  // Within a strategy, price is the secondary signal and transit the tertiary, so a preference
  // still picks the cheaper of two equally preferred services and never a slower one for the same
  // money.
  const secondary = rules.strategy === "fastest" ? byPrice : byTransit;

  return (a, b) => {
    const first = primary(a, b);
    if (first !== 0) return first;
    const second = secondary(a, b);
    if (second !== 0) return second;
    if (a.courier !== b.courier) return a.courier < b.courier ? -1 : 1;
    return a.serviceLevel < b.serviceLevel ? -1 : a.serviceLevel > b.serviceLevel ? 1 : 0;
  };
}

/** A short, seller-readable cause for a set of rejections, naming each distinct reason once. */
function explain(rejected: readonly RejectedQuote[]): string {
  if (rejected.length === 0) return "No courier returned a quote for this shipment.";

  const phrases: Record<QuoteRejectionReason, string> = {
    courier_not_allowed: "the courier is not allowed",
    service_level_not_allowed: "the service level is not allowed",
    price_above_cap: "the price is above the cap",
    transit_time_above_cap: "the transit time is above the cap",
    insurance_unsupported: "the courier cannot insure this value",
    cod_unsupported: "the courier cannot collect cash on delivery"
  };

  const counts = new Map<QuoteRejectionReason, number>();
  for (const entry of rejected) {
    counts.set(entry.reason, (counts.get(entry.reason) ?? 0) + 1);
  }
  const parts = [...counts.entries()].map(
    ([reason, count]) => `${count} rejected because ${phrases[reason]}`
  );
  return `No quote qualified: ${parts.join(", ")}.`;
}

/**
 * Choose one quote for a shipment, and record why every other quote was not chosen.
 *
 * Pure: the same quotes and rules always produce the same selection, which is what makes the audit
 * reproducible. Hard constraints are applied before the strategy, so a strategy never has to reason
 * about a quote the tenant forbade. An empty `quotes` input is not an error — it is the honest
 * answer that no courier priced this shipment, and it comes back with a `reason` saying so.
 */
export function selectCourier(
  quotes: readonly ShipmentQuote[],
  rules: RateShoppingRules,
  decidedAt: Instant
): CourierSelection {
  const rejected: RejectedQuote[] = [];
  const qualifying: ShipmentQuote[] = [];

  for (const quote of quotes) {
    const reason = rejects(quote, rules);
    if (reason === null) qualifying.push(quote);
    else rejected.push({ quote, reason });
  }

  if (qualifying.length === 0) {
    return { chosen: null, strategy: rules.strategy, rejected, decidedAt, reason: explain(rejected) };
  }

  const chosen = [...qualifying].sort(comparatorFor(rules))[0]!;
  return { chosen, strategy: rules.strategy, rejected, decidedAt, reason: null };
}
