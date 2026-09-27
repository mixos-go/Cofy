/**
 * Money handling for marketplace payloads.
 *
 * This is the single place where marketplace amounts become our `Money` (integer minor units,
 * sen for IDR, per packages/contracts/src/ids.ts). It is deliberately one function because a
 * wrong unit is a silent 100x error, and we want exactly one line to audit.
 *
 * Evidence for reading Shopee IDR amounts as whole rupiah:
 * - The Product API documents money fields as "int64 ... in cents (or smallest currency unit)",
 *   while the Order API documents the same fields as `float` with no unit at all. The two
 *   reference pages disagree, so the type alone cannot be trusted.
 * - Every IDR example in the Order API reference is a whole number of rupiah:
 *   `estimated_shipping_fee` 5000, `model_discounted_price` 48000, `estimated_shipping_fee`
 *   5000 in the sample response.
 * - IDR has no circulating sub-unit. Reading 48000 as sen would make a stocked item cost
 *   Rp 480, which is not a plausible order line.
 *
 * Residual risk: if a marketplace account ever returns true sen, every amount is 100x high (or
 * low). That is why the first sandbox order is compared against the seller's own dashboard as
 * part of the M2 exit criteria, and why this conversion lives here rather than inline.
 */

import { PlatformError } from "@platform/contracts";

import type { Money } from "@platform/contracts";

/** Whole rupiah as returned by Shopee, converted to sen for the platform. */
export function rupiahToMinor(amount: number): Money {
  if (!Number.isFinite(amount)) {
    throw new PlatformError("UPSTREAM_ERROR", `Non-finite amount received from channel: ${amount}`);
  }
  return { amount: Math.round(amount) * 100, currency: "IDR" };
}

/** Sum of several amounts, useful for deriving a subtotal from line items. */
export function sumRupiah(amounts: readonly number[]): Money {
  return rupiahToMinor(amounts.reduce((total, value) => total + value, 0));
}

/** Epoch seconds, as marketplaces send them, to our ISO-8601 UTC instant. */
export function epochSecondsToInstant(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

/**
 * Our `Money` and `ChannelOrder` are IDR-only today. Refusing anything else is better than
 * silently relabelling a foreign currency as rupiah.
 */
export function assertIdr(currency: string | undefined, context: string): void {
  if (currency !== undefined && currency !== "" && currency !== "IDR") {
    throw new PlatformError(
      "VALIDATION_FAILED",
      `Channel returned currency '${currency}' in ${context}; the platform only models IDR.`
    );
  }
}
