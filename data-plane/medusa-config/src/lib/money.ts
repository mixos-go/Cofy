import { MedusaError } from "@medusajs/framework/utils";

/**
 * Converts between the platform's money unit and the tenant engine's.
 *
 * These are **not** the same unit, and the difference is a silent 100x error if it is missed:
 *
 * - The platform models IDR in **sen** (`packages/contracts`: integer minor units, 100 per rupiah).
 * - Medusa's own currency table declares `IDR.decimal_digits = 0`
 *   (`@medusajs/utils/dist/defaults/currencies.js`), so every amount Medusa stores and expects —
 *   `unit_price`, line totals, order totals — is a **whole rupiah**.
 *
 * So a platform `48000` (Rp 480,00) is a Medusa `480` (Rp 480), and a platform `4800000`
 * (Rp 48.000,00) is a Medusa `48000`. The worker sends platform units; this file is the one place
 * that crosses the boundary.
 *
 * Rounding: IDR has no circulating sub-unit, so a sen value that is not a multiple of 100 has no
 * exact rupiah. We round half away from zero rather than truncate, because truncating every line
 * would make the stored order consistently cheaper than the marketplace reported, which reads as a
 * reconciliation drift rather than a rounding choice. The conversion is the only lossy step in the
 * import path and is asserted directly in `test/money.test.ts`.
 */
const SEN_PER_RUPIAH = 100;

/** A platform amount in sen to the whole-rupiah amount Medusa expects for IDR. */
export function senToMedusaRupiah(sen: number): number {
  if (!Number.isFinite(sen)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, `Non-finite money amount: ${sen}`);
  }
  return Math.sign(sen) * Math.round(Math.abs(sen) / SEN_PER_RUPIAH);
}

/**
 * Refuses a payload that is not IDR.
 *
 * The platform and the tenant engine both model IDR only here; relabelling another currency's
 * minor units as rupiah would price the order wrongly with no error anywhere.
 */
export function assertIdrCurrency(currency: string): void {
  if (currency !== "IDR") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Tenant engine models IDR only, received currency '${currency}'.`
    );
  }
}
