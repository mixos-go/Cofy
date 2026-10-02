/**
 * Courier lookup.
 *
 * The sibling of `ChannelRegistry` (docs/adr/0020): a courier provider is registered the same way a
 * channel connector is, and "unknown courier" has exactly one behaviour everywhere.
 */

import type { CourierProvider, CourierCredential } from "@platform/courier-sdk";
import { PlatformError } from "@platform/contracts";
import type { CourierCode } from "@platform/contracts";
import type { RegisteredCourier } from "./types.ts";

export class CourierRegistry {
  readonly #byCourier = new Map<CourierCode, RegisteredCourier>();

  constructor(couriers: readonly RegisteredCourier[]) {
    for (const entry of couriers) {
      if (this.#byCourier.has(entry.courier)) {
        // Two providers claiming one courier would make behaviour depend on registration order.
        throw new PlatformError("CONFLICT", "Two providers are registered for the same courier.", {
          details: { courier: entry.courier }
        });
      }
      this.#byCourier.set(entry.courier, entry);
    }
  }

  /** The registration for a courier, or a non-retryable error when we do not serve it. */
  require(courier: CourierCode): RegisteredCourier {
    const entry = this.#byCourier.get(courier);
    if (entry === undefined) {
      throw new PlatformError("NOT_FOUND", "No provider is registered for this courier.", {
        details: { courier }
      });
    }
    return entry;
  }

  /** Every registered courier, in registration order. Rate shopping fans out across these. */
  all(): readonly RegisteredCourier[] {
    return [...this.#byCourier.values()];
  }

  /** The couriers this plane can serve, in registration order. */
  couriers(): readonly CourierCode[] {
    return [...this.#byCourier.keys()];
  }
}

export type { CourierProvider, CourierCredential };
