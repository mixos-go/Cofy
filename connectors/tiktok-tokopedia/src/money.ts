/**
 * Money handling for TikTok Shop / Tokopedia payloads.
 *
 * The two channels this connector serves (TikTok Shop and Tokopedia, see docs/adr/0003) send money
 * as decimal *strings*, not integers. The official OAS is explicit:
 *   - product `sale_price` example `"100.00"`, description "local display price ... up to 2 decimal places"
 *   - order `payment.total_amount` / `sub_total` / `shipping_fee` are `string`
 *   - `GetPriceDetail` documents `net_price_amount` as `"97.00"`
 * That is the opposite convention from Shopee, so this file must not be shared with it: one reader
 * per channel is the point (AGENTS.md §4).
 *
 * Parsing is done with string arithmetic rather than `Number(x) * 100`, because `100 * 1.1` style
 * float error is exactly the kind of silent one-sen discrepancy this platform cannot tolerate.
 */

import { PlatformError } from "@platform/contracts";

import type { Money } from "@platform/contracts";

/** Our modelled minor unit per currency. IDR sen is 2; the source strings are also 2-decimal. */
const MINOR_DIGITS = 2;

/**
 * Convert a decimal amount string to integer minor units (sen for IDR).
 *
 * `"100.00"` -> 10000, `"99.5"` -> 9950, `"7"` -> 700. Extra decimal places are truncated toward
 * zero rather than rounded, so we never report more money than the channel did.
 */
export function decimalToMinor(value: string | number, currency: string): Money {
  assertIdr(currency, "amount");
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new PlatformError("VALIDATION_FAILED", `Channel returned a non-decimal amount: '${text}'`);
  }

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const padded = (fraction + "0".repeat(MINOR_DIGITS)).slice(0, MINOR_DIGITS);
  const minor = Number(whole) * 10 ** MINOR_DIGITS + Number(padded);

  return { amount: negative ? -minor : minor, currency: "IDR" };
}

/** Sum of several decimal strings, kept in integer minor units throughout. */
export function sumDecimals(values: readonly (string | number | undefined)[], currency: string): Money {
  const total = values
    .filter((value): value is string | number => value !== undefined)
    .reduce<number>((sum, value) => sum + decimalToMinor(value, currency).amount, 0);
  return { amount: total, currency: "IDR" };
}

/** TikTok sends `create_time` as a Unix timestamp in seconds. */
export function epochSecondsToInstant(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

/**
 * The platform models IDR only today. Refusing anything else beats silently relabelling a foreign
 * currency as rupiah.
 */
export function assertIdr(currency: string | undefined, context: string): void {
  if (currency !== undefined && currency !== "" && currency !== "IDR") {
    throw new PlatformError(
      "VALIDATION_FAILED",
      `Channel returned currency '${currency}' in ${context}; the platform only models IDR.`
    );
  }
}
