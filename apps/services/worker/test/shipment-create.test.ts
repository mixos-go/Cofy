/**
 * Shipment-create workflow tests (docs/PLAN.md M7, docs/adr/0020).
 *
 * The path this proves is the M7 exit: an order becomes a booked courier shipment, the tenant's
 * engine records the Fulfillment, and the channel is queued to be told the waybill — with rate
 * shopping applying the tenant's own rules and the audit (the selection) being the value the
 * workflow returns.
 *
 * The courier and the tenant's Medusa are fakes (external boundaries, AGENTS.md §6); the sync state
 * is the real in-memory store behind the thin adapter, so the idempotency claim under test is
 * production code. The interesting cases are the ones that are *not* a plain success: no quote
 * qualifying, a booking retried, a courier failing while another survives, and a governor refusal
 * that must defer rather than fail.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { PlatformError, RateLimitedError, PLATFORM_EVENTS } from "@platform/contracts";
import type { ShipmentQuote, ShipmentRequest } from "@platform/contracts";
import { createShipmentOnce } from "../src/shipment-create.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import {
  FakeCommerceClient,
  FakeCourierGateway,
  FakeRateShoppingRulesClient,
  syncStateClient
} from "./fakes.ts";

const TENANT = "tnt-a";
const ORDER = "order-001";
const silent: Logger = createLogger("error", {}, () => {});

const REQUEST: ShipmentRequest = {
  orderId: ORDER,
  destination: { city: "Jakarta", postalCode: "10110", address: "Jl. Merdeka 1" },
  weightGrams: 1_000,
  declaredValue: { amount: 150_000, currency: "IDR" },
  requiresInsurance: false,
  requiresCod: false
};

function quote(
  courier: ShipmentQuote["courier"],
  overrides: Partial<ShipmentQuote> = {}
): ShipmentQuote {
  return {
    courier,
    serviceLevel: "regular",
    price: { amount: 20_000, currency: "IDR" },
    estimatedDays: { min: 1, max: 3 },
    supportsInsurance: true,
    supportsCod: true,
    providerQuoteId: `${courier}-regular`,
    ...overrides
  };
}

function harness() {
  const store = new InMemorySyncStateStore();
  const couriers = new FakeCourierGateway();
  const rules = new FakeRateShoppingRulesClient();
  const commerce = new FakeCommerceClient();
  commerce.withVariant("SKU-1", "var-1", 5);
  const events = new InMemoryEventPublisher();
  return {
    store,
    couriers,
    rules,
    commerce,
    events,
    context: {
      syncState: syncStateClient(store),
      couriers,
      rules,
      commerce,
      events,
      logger: silent
    }
  };
}

const ITEMS = [{ sku: "SKU-1", quantity: 1 }];

test("an order becomes a booked shipment, a fulfillment, and a shipment.created event", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne", { price: { amount: 18_000, currency: "IDR" } })]);
  h.couriers.withQuotes("sicepat", [quote("sicepat", { price: { amount: 22_000, currency: "IDR" } })]);

  const outcome = await createShipmentOnce(h.context, {
    tenantId: TENANT,
    orderId: ORDER,
    items: ITEMS,
    shipment: REQUEST
  });

  // Cheapest-first is the default rule, so the cheaper courier wins and the audit says why.
  assert.equal(outcome.selection.chosen?.courier, "jne");
  assert.equal(outcome.shipment?.courier, "jne");
  assert.ok(outcome.fulfillmentId !== null);

  // The exact chosen quote was booked, not merely a courier.
  assert.equal(h.couriers.createCalls.length, 1);
  assert.equal(h.couriers.createCalls[0]?.quote.providerQuoteId, "jne-regular");

  // The tenant's engine recorded the waybill against the order.
  assert.equal(h.commerce.shipments.length, 1);
  assert.equal(h.commerce.shipments[0]?.orderId, ORDER);
  assert.equal(h.commerce.shipments[0]?.shipment.trackingNumber, outcome.shipment?.trackingNumber);

  const created = h.events.published.filter((event) => event.event === PLATFORM_EVENTS.SHIPMENT_CREATED);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.payload.courier, "jne");
});

test("a tenant rule forbidding the cheapest courier changes what ships", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne", { price: { amount: 18_000, currency: "IDR" } })]);
  h.couriers.withQuotes("sicepat", [quote("sicepat", { price: { amount: 22_000, currency: "IDR" } })]);
  // The rule is a hard constraint, so the cheaper courier must be rejected, not merely deprioritised.
  h.rules.withRules(TENANT, {
    allowedCouriers: ["sicepat"],
    allowedServiceLevels: [],
    maxPrice: null,
    maxEstimatedDays: null,
    requiresInsurance: false,
    requiresCod: false,
    strategy: "cheapest",
    preferredCouriers: []
  });

  const outcome = await createShipmentOnce(h.context, {
    tenantId: TENANT,
    orderId: ORDER,
    items: ITEMS,
    shipment: REQUEST
  });

  assert.equal(outcome.selection.chosen?.courier, "sicepat");
  assert.equal(outcome.selection.rejected.length, 1);
  assert.equal(outcome.selection.rejected[0]?.reason, "courier_not_allowed");
  assert.equal(h.couriers.createCalls[0]?.quote.courier, "sicepat");
});

test("no qualifying quote books nothing and reports the actionable reason", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne", { price: { amount: 90_000, currency: "IDR" } })]);
  h.rules.withRules(TENANT, {
    allowedCouriers: [],
    allowedServiceLevels: [],
    maxPrice: { amount: 25_000, currency: "IDR" },
    maxEstimatedDays: null,
    requiresInsurance: false,
    requiresCod: false,
    strategy: "cheapest",
    preferredCouriers: []
  });

  const outcome = await createShipmentOnce(h.context, {
    tenantId: TENANT,
    orderId: ORDER,
    items: ITEMS,
    shipment: REQUEST
  });

  assert.equal(outcome.shipment, null);
  assert.equal(outcome.fulfillmentId, null);
  assert.equal(h.couriers.createCalls.length, 0);
  assert.equal(h.commerce.shipments.length, 0);
  assert.match(outcome.selection.reason ?? "", /price is above the cap/);
  const failed = h.events.published.filter((event) => event.event === PLATFORM_EVENTS.SHIPMENT_FAILED);
  assert.equal(failed.length, 1);
});

test("a courier that cannot quote does not sink the fan-out", async () => {
  const h = harness();
  h.couriers.withQuotes("sicepat", [quote("sicepat")]);
  // jne is simply absent from the fake's script, so it reports a failure; sicepat still books.

  const outcome = await createShipmentOnce(h.context, {
    tenantId: TENANT,
    orderId: ORDER,
    items: ITEMS,
    shipment: REQUEST,
    couriers: ["jne", "sicepat"]
  });

  assert.equal(outcome.shipment?.courier, "sicepat");
  assert.equal(h.couriers.createCalls.length, 1);
});

test("re-running the same create replays: the courier is not asked for a second waybill", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne")]);
  const input = { tenantId: TENANT, orderId: ORDER, items: ITEMS, shipment: REQUEST };

  const first = await createShipmentOnce(h.context, input);
  const second = await createShipmentOnce(h.context, input);

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  // The idempotency key held: the courier booked exactly once.
  assert.equal(h.couriers.createCalls.length, 1);
  assert.equal(second.shipment?.trackingNumber, first.shipment?.trackingNumber);
  // The tenant-side record is idempotent on the waybill, so it also converged.
  assert.equal(h.commerce.shipments.length, 1);
});

test("a governor refusal defers: nothing is booked and the claim is released for the retry", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne")]);
  h.couriers.createError = new RateLimitedError("slow down", 30);

  await assert.rejects(
    createShipmentOnce(h.context, {
      tenantId: TENANT,
      orderId: ORDER,
      items: ITEMS,
      shipment: REQUEST
    }),
    (error: unknown) => error instanceof RateLimitedError
  );

  assert.equal(h.commerce.shipments.length, 0);
  // The retry must be able to take the claim: a deferred attempt owns no work.
  const retry = await createShipmentOnce(h.context, {
    tenantId: TENANT,
    orderId: ORDER,
    items: ITEMS,
    shipment: REQUEST
  });
  assert.equal(retry.shipment?.courier, "jne");
  assert.equal(h.couriers.createCalls.length, 1);
});

test("a create failure after the quote records no success and publishes shipment.failed", async () => {
  const h = harness();
  h.couriers.withQuotes("jne", [quote("jne")]);
  h.couriers.createError = new PlatformError("UPSTREAM_ERROR", "courier 500");

  await assert.rejects(
    createShipmentOnce(h.context, {
      tenantId: TENANT,
      orderId: ORDER,
      items: ITEMS,
      shipment: REQUEST
    }),
    (error: unknown) => error instanceof PlatformError
  );

  const failed = h.events.published.filter((event) => event.event === PLATFORM_EVENTS.SHIPMENT_FAILED);
  assert.equal(failed.length, 1);
  assert.equal(h.commerce.shipments.length, 0);
});
