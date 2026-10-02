import type {
  CourierCode,
  ServiceLevel,
  Shipment,
  ShipmentQuote,
  ShipmentRequest,
  TrackingEvent
} from "@platform/contracts";

/**
 * The contract every courier provider implements (docs/adr/0020).
 *
 * A provider is the only place that knows a courier's raw API shapes. Everything downstream works
 * with the normalised types in `@platform/contracts`, exactly as `ChannelConnector` does for
 * marketplaces (ADR 0005).
 *
 * Rules:
 * - Never call a courier API from a workflow. Go through a provider, so retry, rate limiting and
 *   logging stay uniform.
 * - Declare `capabilities()` honestly; do not silently no-op.
 * - Rate limiting is the governor's job. Report it, do not sleep on it here.
 * - Providers are pure with respect to credentials: they receive a `CourierCredential` and never
 *   look one up. Secret storage stays in `packages/secrets`.
 */
export interface CourierProvider {
  readonly courier: CourierCode;

  /**
   * Price one shipment across the service levels this courier offers.
   *
   * Returns one `ShipmentQuote` per service level. It does **not** choose between them: rate
   * shopping is a pure rule applied to the quotes (`selectCourier` in `contracts`), so the choice is
   * auditable and the provider stays a dumb adapter (docs/adr/0020).
   */
  quote(request: ShipmentRequest, credential: CourierCredential): Promise<readonly ShipmentQuote[]>;

  /**
   * Book the exact service a quote described, returning the waybill.
   *
   * `providerQuoteId` addresses the quoted service. A retried create must be guarded by the caller's
   * idempotency key, not by this method: no target courier offers a native idempotency key today, so
   * a duplicate waybill is an accepted, operator-visible failure (docs/adr/0020).
   */
  createShipment(
    quote: ShipmentQuote,
    request: ShipmentRequest,
    credential: CourierCredential
  ): Promise<Shipment>;

  /** The tracking events for one shipment, oldest first. Used by the pull-based track pass. */
  track(trackingNumber: string, credential: CourierCredential): Promise<readonly TrackingEvent[]>;

  /** Cancel a shipment that has not yet been picked up. Idempotent where the courier allows it. */
  cancelShipment(trackingNumber: string, credential: CourierCredential): Promise<void>;

  /** What this courier actually supports. Never assume a capability. */
  capabilities(): CourierCapabilities;
}

/**
 * A courier credential.
 *
 * In-memory only. Persisted exclusively through `@platform/secrets` and never logged (AGENTS.md
 * §2.6). Couriers are platform-owned app keys (ADR 0003), so `context` carries the account
 * identifiers a provider needs to address a shipment, not a seller's own token.
 */
export interface CourierCredential {
  readonly courier: CourierCode;
  readonly apiKey: string;
  readonly context: Readonly<Record<string, string>>;
}

export interface CourierCapabilities {
  readonly supportsQuoting: boolean;
  readonly supportsTracking: boolean;
  readonly supportsCancellation: boolean;
  readonly supportsInsurance: boolean;
  readonly supportsCod: boolean;
  /** The service levels this courier offers. A level absent here is never quoted. */
  readonly serviceLevels: readonly ServiceLevel[];
}

/** Re-exported so a provider has one import site for the shapes it returns (AGENTS.md §3). */
export type {
  Shipment,
  ShipmentQuote,
  ShipmentRequest,
  ShipmentStatus,
  TrackingEvent,
  CourierCode,
  ServiceLevel,
  Instant
} from "@platform/contracts";
