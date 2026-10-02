/**
 * Rate-shopping tests (docs/PLAN.md M7, docs/adr/0020).
 *
 * The M7 criterion is not just "a courier is chosen" but "rate shopping respects tenant rules and is
 * auditable". These tests hold both halves: every hard constraint rejects exactly the quotes it
 * should, the strategy picks what it says, and the selection *is* the audit — the chosen quote and
 * the reason each other quote lost come from the same pure call, so they cannot disagree.
 *
 * The inputs are plain objects; `selectCourier` is pure, so there is no network and no fake here.
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { CourierCode, RateShoppingRules, ShipmentQuote } from "../src/index.ts";
import { selectCourier } from "../src/index.ts";

const DECIDED_AT = "2026-09-26T12:00:00.000Z";

function quote(overrides: Partial<ShipmentQuote> & { courier: CourierCode }): ShipmentQuote {
  return {
    serviceLevel: "regular",
    price: { amount: 20_000, currency: "IDR" },
    estimatedDays: { min: 2, max: 3 },
    supportsInsurance: true,
    supportsCod: true,
    providerQuoteId: `${overrides.courier}-regular`,
    ...overrides
  };
}

function rules(overrides: Partial<RateShoppingRules> = {}): RateShoppingRules {
  return {
    allowedCouriers: [],
    allowedServiceLevels: [],
    maxPrice: null,
    maxEstimatedDays: null,
    requiresInsurance: false,
    requiresCod: false,
    strategy: "cheapest",
    preferredCouriers: [],
    ...overrides
  };
}

test("the cheapest strategy chooses the lowest price regardless of courier", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", price: { amount: 30_000, currency: "IDR" } }),
      quote({ courier: "jnt", price: { amount: 18_000, currency: "IDR" } }),
      quote({ courier: "sicepat", price: { amount: 25_000, currency: "IDR" } })
    ],
    rules({ strategy: "cheapest" }),
    DECIDED_AT
  );

  assert.equal(selection.chosen?.courier, "jnt");
  assert.equal(selection.chosen?.price.amount, 18_000);
  assert.equal(selection.reason, null);
});

test("the fastest strategy chooses the shortest worst-case transit", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", estimatedDays: { min: 2, max: 4 } }),
      quote({ courier: "jnt", estimatedDays: { min: 1, max: 2 } }),
      quote({ courier: "sicepat", estimatedDays: { min: 1, max: 3 } })
    ],
    rules({ strategy: "fastest" }),
    DECIDED_AT
  );

  assert.equal(selection.chosen?.courier, "jnt");
});

test("the preferred strategy ranks the tenant's order above price", () => {
  const selection = selectCourier(
    [
      quote({ courier: "sicepat", price: { amount: 10_000, currency: "IDR" } }),
      quote({ courier: "anteraja", price: { amount: 22_000, currency: "IDR" } }),
      quote({ courier: "jne", price: { amount: 15_000, currency: "IDR" } })
    ],
    rules({ strategy: "preferred", preferredCouriers: ["anteraja", "jne", "sicepat"] }),
    DECIDED_AT
  );

  // `anteraja` is most preferred and wins even though it is not the cheapest.
  assert.equal(selection.chosen?.courier, "anteraja");
});

test("a hard constraint rejects only the quotes that violate it, and the rest still compete", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", price: { amount: 10_000, currency: "IDR" } }),
      quote({ courier: "jnt", price: { amount: 12_000, currency: "IDR" } })
    ],
    rules({ allowedCouriers: ["jnt"] }),
    DECIDED_AT
  );

  assert.equal(selection.chosen?.courier, "jnt");
  assert.deepEqual(
    selection.rejected.map((r) => ({ courier: r.quote.courier, reason: r.reason })),
    [{ courier: "jne", reason: "courier_not_allowed" }]
  );
});

test("every hard constraint has a reason that names it", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", serviceLevel: "cargo" }),
      quote({ courier: "jnt", price: { amount: 99_000, currency: "IDR" } }),
      quote({ courier: "sicepat", estimatedDays: { min: 5, max: 9 } }),
      quote({ courier: "anteraja", supportsInsurance: false }),
      quote({ courier: "rajaongkir", supportsCod: false })
    ],
    rules({
      allowedServiceLevels: ["regular"],
      maxPrice: { amount: 50_000, currency: "IDR" },
      maxEstimatedDays: 4,
      requiresInsurance: true,
      requiresCod: true
    }),
    DECIDED_AT
  );

  assert.equal(selection.chosen, null);
  const reasons = selection.rejected.map((r) => r.reason).sort();
  assert.deepEqual(reasons, [
    "cod_unsupported",
    "insurance_unsupported",
    "price_above_cap",
    "service_level_not_allowed",
    "transit_time_above_cap"
  ]);
});

test("the same quotes and rules always choose the same quote, whatever their input order", () => {
  const quotes = [
    quote({ courier: "jne", price: { amount: 20_000, currency: "IDR" } }),
    quote({ courier: "jnt", price: { amount: 20_000, currency: "IDR" } }),
    quote({ courier: "sicepat", price: { amount: 20_000, currency: "IDR" } })
  ];
  const rule = rules({ strategy: "cheapest" });

  const forward = selectCourier(quotes, rule, DECIDED_AT).chosen?.courier;
  const reversed = selectCourier([...quotes].reverse(), rule, DECIDED_AT).chosen?.courier;

  // All three are equal on price and transit, so the tie-break decides — and it must not depend on
  // the order the caller happened to collect quotes in.
  assert.equal(forward, reversed);
  assert.equal(forward, "jne");
});

test("no quotes is an honest empty answer with a reason, not an error", () => {
  const selection = selectCourier([], rules(), DECIDED_AT);

  assert.equal(selection.chosen, null);
  assert.equal(selection.rejected.length, 0);
  assert.match(selection.reason ?? "", /No courier returned a quote/);
});

test("when nothing qualifies the reason names each distinct rejection", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", price: { amount: 90_000, currency: "IDR" } }),
      quote({ courier: "jnt", price: { amount: 95_000, currency: "IDR" } }),
      quote({ courier: "sicepat", estimatedDays: { min: 6, max: 8 } })
    ],
    rules({ maxPrice: { amount: 50_000, currency: "IDR" }, maxEstimatedDays: 4 }),
    DECIDED_AT
  );

  assert.equal(selection.chosen, null);
  // Two price rejections collapse into one counted phrase; the transit one is distinct.
  assert.match(selection.reason ?? "", /2 rejected because the price is above the cap/);
  assert.match(selection.reason ?? "", /1 rejected because the transit time is above the cap/);
});

test("a cap is inclusive at its boundary, so a quote exactly at the cap qualifies", () => {
  const selection = selectCourier(
    [
      quote({ courier: "jne", price: { amount: 50_000, currency: "IDR" }, estimatedDays: { min: 1, max: 4 } })
    ],
    rules({ maxPrice: { amount: 50_000, currency: "IDR" }, maxEstimatedDays: 4 }),
    DECIDED_AT
  );

  assert.equal(selection.chosen?.courier, "jne");
});
