/**
 * Money-boundary tests.
 *
 * The conversion is the only lossy step in the import path and the failure it guards against is
 * silent: a missed 100x is not an error anywhere, it is an order priced 100x wrong. So the cases
 * here are the ones where a plausible implementation (truncate, or treat sen as rupiah) differs
 * from the correct one, not just a single happy-path pair.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { assertIdrCurrency, senToMedusaRupiah } from "../src/lib/money.ts";

test("a whole-rupiah platform amount converts 100:1", () => {
  // Rp 48.000,00 on the platform is 4800000 sen; Medusa IDR has no minor unit, so it stores 48000.
  assert.equal(senToMedusaRupiah(4_800_000), 48_000);
  assert.equal(senToMedusaRupiah(48_000), 480);
});

test("zero and small amounts stay exact", () => {
  assert.equal(senToMedusaRupiah(0), 0);
  assert.equal(senToMedusaRupiah(100), 1);
});

test("a sub-rupiah amount rounds half away from zero, not toward zero", () => {
  // Truncating would make every line cheaper than the marketplace reported, which reads as
  // reconciliation drift rather than a rounding choice. 150 sen is Rp 1,50 -> Rp 2.
  assert.equal(senToMedusaRupiah(150), 2);
  assert.equal(senToMedusaRupiah(149), 1);
  assert.equal(senToMedusaRupiah(50), 1);
  assert.equal(senToMedusaRupiah(49), 0);
});

test("negative amounts round away from zero too, so a refund mirrors its charge", () => {
  assert.equal(senToMedusaRupiah(-150), -2);
  assert.equal(senToMedusaRupiah(-4_800_000), -48_000);
});

test("a non-finite amount is refused rather than silently becoming NaN or Infinity", () => {
  // A NaN price that reached Medusa would create an order whose totals are NaN, which no
  // downstream check treats as an error.
  assert.throws(() => senToMedusaRupiah(Number.NaN));
  assert.throws(() => senToMedusaRupiah(Number.POSITIVE_INFINITY));
});

test("a currency that is not IDR is refused", () => {
  assert.doesNotThrow(() => assertIdrCurrency("IDR"));
  // Relabelling another currency's minor units as rupiah would price the order wrongly with no
  // error anywhere, so the guard is a hard failure, not a coercion.
  assert.throws(() => assertIdrCurrency("USD"));
  assert.throws(() => assertIdrCurrency("idr"));
});
