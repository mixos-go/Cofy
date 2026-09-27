/**
 * Order import workflow tests (docs/PLAN.md M3 exit criteria).
 *
 * Each test names the invariant it proves: idempotent import, cursor safety, and compensation.
 * The marketplace and Medusa are fakes (external boundaries, AGENTS.md §6); the sync state is the
 * real in-memory store behind a thin adapter, so a duplicate ref and an idempotency replay are
 * exercised as production code, not simulated.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { ChannelOrder } from "@platform/contracts";
import { PLATFORM_EVENTS } from "@platform/contracts";
import { importOrdersOnce } from "../src/order-import.ts";
import type { WorkflowContext } from "../src/order-import.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, FakeCommerceClient, syncStateClient } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;

function order(overrides: Partial<ChannelOrder> & { externalOrderId: string }): ChannelOrder {
  return {
    channel: CHANNEL,
    placedAt: "2026-09-26T10:00:00.000Z",
    buyerEmail: "buyer@example.test",
    currency: "IDR",
    lines: [{ externalLineId: "l1", sku: "SKU-1", title: "Kaos", quantity: 1, unitPrice: { amount: 50_000, currency: "IDR" } }],
    totals: {
      subtotal: { amount: 50_000, currency: "IDR" },
      shipping: { amount: 0, currency: "IDR" },
      discount: { amount: 0, currency: "IDR" },
      grandTotal: { amount: 50_000, currency: "IDR" }
    },
    ...overrides
  };
}

function harness(): {
  context: WorkflowContext;
  gateway: FakeChannelGateway;
  commerce: FakeCommerceClient;
  store: InMemorySyncStateStore;
  events: InMemoryEventPublisher;
} {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const commerce = new FakeCommerceClient();
  const events = new InMemoryEventPublisher();
  const context: WorkflowContext = {
    syncState: syncStateClient(store),
    gateway,
    commerce,
    events,
    logger: createLogger("error", {}, () => {})
  };
  return { context, gateway, commerce, store, events };
}

test("an order placed on the channel lands in Medusa with its lines and a reservation", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });

  const outcome = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.imported, 1);
  assert.equal(h.commerce.orders.length, 1);
  assert.deepEqual(h.commerce.orders[0]?.lines, [{ sku: "SKU-1", variantId: "var-1", quantity: 1 }]);
  // The reservation is real: the ledger moved.
  assert.equal(h.commerce.stock.get("var-1"), 9);
});

test("re-running the import for the same order creates exactly one order", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });

  const first = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });
  // The channel redelivers the whole window; the cursor was reset to simulate a fresh pull.
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });
  const second = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(first.imported, 1);
  assert.equal(second.imported, 0);
  assert.equal(second.skipped, 1);
  assert.equal(h.commerce.orders.length, 1, "exactly one Medusa order for one channel order");
  assert.equal(h.commerce.stock.get("var-1"), 9, "stock is reserved once, not twice");
});

test("concurrent imports of the same order do not oversell or double-create", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.gateway.withOrderPage("shopee:start", {
    items: [order({ externalOrderId: "ext-1", lines: [{ externalLineId: "l1", sku: "SKU-1", title: "Kaos", quantity: 5, unitPrice: { amount: 50_000, currency: "IDR" } }] })],
    nextCursor: null
  });

  // Two attempts race the same order (a redelivery arriving while the first is still running).
  const [a, b] = await Promise.all([
    importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL }),
    importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL })
  ]);

  assert.equal(h.commerce.orders.length, 1, "one order, whichever attempt won");
  assert.equal(a.imported + b.imported, 1);
  assert.equal(h.commerce.stock.get("var-1"), 0, "five units reserved once, never negative");
});

test("an order that would oversell is refused, and the first order keeps its reservation", async () => {
  // Proves the oversell guard is in the commerce write, not in our counters: two orders of four
  // units against five on hand must leave exactly one unit, not minus three.
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.gateway.withOrderPage("shopee:start", {
    items: [
      order({ externalOrderId: "ext-1", lines: [{ externalLineId: "l1", sku: "SKU-1", title: "Kaos", quantity: 4, unitPrice: { amount: 50_000, currency: "IDR" } }] }),
      order({ externalOrderId: "ext-2", lines: [{ externalLineId: "l1", sku: "SKU-1", title: "Kaos", quantity: 4, unitPrice: { amount: 50_000, currency: "IDR" } }] })
    ],
    nextCursor: null
  });

  const outcome = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.imported, 1);
  assert.equal(outcome.failed, 1);
  assert.equal(h.commerce.orders.length, 1);
  assert.equal(h.commerce.stock.get("var-1"), 1, "never oversold");
});

test("the cursor advances only after a page is committed, so a resume re-reads safely", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: "tok-2" });
  h.gateway.withOrderPage("shopee:tok-2", { items: [order({ externalOrderId: "ext-2" })], nextCursor: null });

  const first = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(first.caughtUp, true);
  assert.equal(first.pages, 2);
  assert.equal(await h.context.syncState.getCursor({ tenantId: TENANT, channel: CHANNEL, entity: "orders" }), null);

  // A second run starts from the persisted (null) cursor and finds nothing new to import.
  const second = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(second.skipped, 2);
  assert.equal(h.commerce.orders.length, 2);
});

test("a failure after order creation releases the reservation and marks the ref failed", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });
  // The order is created (stock reserved), then the commit step fails.
  h.commerce.failAfterCreate = true;

  const outcome = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.failed, 1);
  assert.equal(h.commerce.released.length, 1, "the orphan order's reservation was released");
  assert.equal(h.commerce.stock.get("var-1"), 10, "the release gave the unit back");
  const ref = await h.store.getOrderRef(TENANT, CHANNEL, "ext-1");
  assert.equal(ref?.status, "failed");
  assert.ok(
    h.events.published.some((entry) => entry.event === PLATFORM_EVENTS.ORDER_IMPORT_FAILED),
    "reconciliation is told"
  );
});

test("an order whose every SKU is unknown fails without creating a Medusa order", async () => {
  const h = harness();
  // Nothing in the catalogue.
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });

  const outcome = await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.failed, 1);
  assert.equal(h.commerce.orders.length, 0);
  assert.equal(h.commerce.released.length, 0, "nothing was created, so nothing is released");
});

test("an import never runs without the ref being claimed first", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 10);
  h.gateway.withOrderPage("shopee:start", { items: [order({ externalOrderId: "ext-1" })], nextCursor: null });

  await importOrdersOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  const ref = await h.store.getOrderRef(TENANT, CHANNEL, "ext-1");
  assert.equal(ref?.status, "committed");
  assert.equal(ref?.orderId, h.commerce.orders[0]?.orderId);
});
