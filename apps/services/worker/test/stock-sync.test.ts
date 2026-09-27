/**
 * Listing import and stock push tests (docs/PLAN.md M3 exit criteria).
 *
 * The stock-propagation criterion is proven end to end here: a listing import resolves the
 * channel variant ids, and a stock change for that SKU is pushed to the channel through the
 * mapping — and an unmapped SKU is refused rather than pushed to a guessed address.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import { PLATFORM_EVENTS } from "@platform/contracts";
import type { ChannelListing } from "@platform/contracts";
import { importListingsOnce } from "../src/listing-import.ts";
import { pushStockOnce } from "../src/stock-push.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, syncStateClient } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;

function listing(overrides: Partial<ChannelListing> & { externalProductId: string }): ChannelListing {
  return {
    channel: CHANNEL,
    title: "Kaos",
    status: "active",
    variants: [{ externalSkuId: "model-11", sku: "SKU-1", externalInventoryId: null }],
    updatedAt: null,
    ...overrides
  };
}

function harness(): {
  store: InMemorySyncStateStore;
  gateway: FakeChannelGateway;
  events: InMemoryEventPublisher;
} {
  return {
    store: new InMemorySyncStateStore(),
    gateway: new FakeChannelGateway(),
    events: new InMemoryEventPublisher()
  };
}

test("a listing import maps a seller SKU to the channel variant ids a stock push needs", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", { items: [listing({ externalProductId: "1001" })], nextCursor: null });

  const outcome = await importListingsOnce(
    { syncState: syncStateClient(h.store), gateway: h.gateway, logger: createLogger("error", {}, () => {}) },
    { tenantId: TENANT, channel: CHANNEL }
  );

  assert.equal(outcome.mapped, 1);
  const map = await h.store.getSkuMap(TENANT, CHANNEL, "SKU-1");
  assert.equal(map?.externalProductId, "1001");
  assert.equal(map?.externalSkuId, "model-11");
});

test("a variant with no seller SKU is counted as a gap, not mapped to a guessed key", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", {
    items: [listing({ externalProductId: "1001", variants: [{ externalSkuId: "model-11", sku: null, externalInventoryId: null }] })],
    nextCursor: null
  });

  const outcome = await importListingsOnce(
    { syncState: syncStateClient(h.store), gateway: h.gateway, logger: createLogger("error", {}, () => {}) },
    { tenantId: TENANT, channel: CHANNEL }
  );

  assert.equal(outcome.mapped, 0);
  assert.equal(outcome.unmapped, 1);
  assert.equal(await h.store.listSkuMaps(TENANT, CHANNEL).then((maps) => maps.length), 0);
});

test("a sale in Medusa propagates to the channel through the listing mapping", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", { items: [listing({ externalProductId: "1001" })], nextCursor: null });
  await importListingsOnce(
    { syncState: syncStateClient(h.store), gateway: h.gateway, logger: createLogger("error", {}, () => {}) },
    { tenantId: TENANT, channel: CHANNEL }
  );

  const push = await pushStockOnce(
    {
      syncState: syncStateClient(h.store),
      gateway: h.gateway,
      events: h.events,
      logger: createLogger("error", {}, () => {})
    },
    { tenantId: TENANT, channel: CHANNEL, changes: [{ sku: "SKU-1", available: 9 }] }
  );

  assert.deepEqual(push.results, [{ sku: "SKU-1", accepted: true, reason: null }]);
  // The push carried the channel address resolved from the mapping, not just the SKU.
  assert.equal(h.gateway.pushCalls[0]?.items[0]?.externalProductId, "1001");
  assert.equal(h.gateway.pushCalls[0]?.items[0]?.externalSkuId, "model-11");
});

test("a stock push for an unmapped SKU is refused without calling the channel", async () => {
  const h = harness();

  const push = await pushStockOnce(
    {
      syncState: syncStateClient(h.store),
      gateway: h.gateway,
      events: h.events,
      logger: createLogger("error", {}, () => {})
    },
    { tenantId: TENANT, channel: CHANNEL, changes: [{ sku: "SKU-UNKNOWN", available: 3 }] }
  );

  assert.equal(push.results[0]?.accepted, false);
  assert.equal(push.results[0]?.reason, "unknown_sku");
  assert.equal(h.gateway.pushCalls[0]?.items[0]?.externalSkuId, undefined);
});

test("re-pushing the same stock values replays the recorded result and makes no second call", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", { items: [listing({ externalProductId: "1001" })], nextCursor: null });
  const context = {
    syncState: syncStateClient(h.store),
    gateway: h.gateway,
    events: h.events,
    logger: createLogger("error", {}, () => {})
  };
  await importListingsOnce(context, { tenantId: TENANT, channel: CHANNEL });

  await pushStockOnce(context, { tenantId: TENANT, channel: CHANNEL, changes: [{ sku: "SKU-1", available: 9 }] });
  const second = await pushStockOnce(context, {
    tenantId: TENANT,
    channel: CHANNEL,
    changes: [{ sku: "SKU-1", available: 9 }]
  });

  assert.equal(second.replayed, true);
  assert.equal(h.gateway.pushCalls.length, 1, "the marketplace was told once");
});

test("a genuinely new stock value is a new operation, not blocked by the previous key", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", { items: [listing({ externalProductId: "1001" })], nextCursor: null });
  const context = {
    syncState: syncStateClient(h.store),
    gateway: h.gateway,
    events: h.events,
    logger: createLogger("error", {}, () => {})
  };
  await importListingsOnce(context, { tenantId: TENANT, channel: CHANNEL });

  await pushStockOnce(context, { tenantId: TENANT, channel: CHANNEL, changes: [{ sku: "SKU-1", available: 9 }] });
  const second = await pushStockOnce(context, {
    tenantId: TENANT,
    channel: CHANNEL,
    changes: [{ sku: "SKU-1", available: 8 }]
  });

  assert.equal(second.replayed, false);
  assert.equal(h.gateway.pushCalls.length, 2, "the new value reaches the channel");
});

test("a channel failure marks the push failed and tells reconciliation", async () => {
  const h = harness();
  h.gateway.withListingPage("shopee:start", { items: [listing({ externalProductId: "1001" })], nextCursor: null });
  const context = {
    syncState: syncStateClient(h.store),
    gateway: h.gateway,
    events: h.events,
    logger: createLogger("error", {}, () => {})
  };
  await importListingsOnce(context, { tenantId: TENANT, channel: CHANNEL });
  h.gateway.pushError = new Error("marketplace down");

  await assert.rejects(
    () => pushStockOnce(context, { tenantId: TENANT, channel: CHANNEL, changes: [{ sku: "SKU-1", available: 9 }] }),
    /marketplace down/
  );
  assert.ok(h.events.published.some((entry) => entry.event === PLATFORM_EVENTS.STOCK_PUSH_FAILED));
});
