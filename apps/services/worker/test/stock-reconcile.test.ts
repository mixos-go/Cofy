/**
 * Stock snapshot pull and drift repair tests (docs/PLAN.md M4, docs/adr/0015).
 *
 * The M4 criterion this proves is "a corrupted stock level is detected and repaired back to the
 * local value, and unresolved drift returns to zero". The tests below pin the three properties that
 * make that true rather than approximately true: repair pushes the *local* value (never the
 * channel's), an unrepairable level is counted apart from drift (so the drift count can reach zero),
 * and a pass that dies before committing a page re-reads it instead of skipping it.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { ChannelStockLevel } from "@platform/contracts";
import { reconcileStockOnce } from "../src/stock-reconcile.ts";
import { importListingsOnce } from "../src/listing-import.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, FakeCommerceClient, syncStateClient } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const silent = createLogger("error", {}, () => {});

function level(overrides: Partial<ChannelStockLevel> & { externalSkuId: string }): ChannelStockLevel {
  return { channel: CHANNEL, sku: null, available: 0, ...overrides };
}

function harness(): {
  store: InMemorySyncStateStore;
  gateway: FakeChannelGateway;
  commerce: FakeCommerceClient;
  events: InMemoryEventPublisher;
} {
  return {
    store: new InMemorySyncStateStore(),
    gateway: new FakeChannelGateway(),
    commerce: new FakeCommerceClient(),
    events: new InMemoryEventPublisher()
  };
}

function context(h: ReturnType<typeof harness>) {
  return {
    syncState: syncStateClient(h.store),
    gateway: h.gateway,
    commerce: h.commerce,
    events: h.events,
    logger: silent
  };
}

/** Map SKU-1 on the channel, so a repair has an address to reach. */
async function mapSku(h: ReturnType<typeof harness>): Promise<void> {
  h.gateway.withListingPage("shopee:start", {
    items: [
      {
        channel: CHANNEL,
        externalProductId: "1001",
        title: "Kaos",
        status: "active",
        variants: [{ externalSkuId: "model-11", sku: "SKU-1", externalInventoryId: null }],
        updatedAt: null
      }
    ],
    nextCursor: null
  });
  await importListingsOnce(
    { syncState: syncStateClient(h.store), gateway: h.gateway, logger: silent },
    { tenantId: TENANT, channel: CHANNEL }
  );
}

test("a channel level that agrees with Medusa is not drift and pushes nothing", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 7);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 7 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.compared, 1);
  assert.equal(outcome.mismatched, 0);
  assert.equal(outcome.repaired, 0);
  assert.equal(h.gateway.pushCalls.length, 0);
});

test("a mismatch is repaired by pushing the local value, not the channel's", async () => {
  const h = harness();
  await mapSku(h);
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 3 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.mismatched, 1);
  assert.equal(outcome.repaired, 1);
  assert.equal(h.gateway.pushCalls.length, 1);
  // The channel said 3; the push must carry 5, because Medusa is authoritative (ADR 0015).
  assert.deepEqual(h.gateway.pushCalls[0]!.items.map((item) => [item.sku, item.available]), [["SKU-1", 5]]);
});

test("a channel level below the local one is drift in the same way as one above it", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 2);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 9 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.mismatched, 1);
  assert.equal(h.gateway.pushCalls[0]!.items[0]!.available, 2);
});

test("a level with no SKU is uncomparable, not drift, and is never pushed", async () => {
  const h = harness();
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: null, available: 4 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.compared, 0);
  assert.equal(outcome.mismatched, 0);
  assert.equal(outcome.uncomparable, 1);
  assert.equal(h.gateway.pushCalls.length, 0);
});

test("a SKU the tenant does not sell is uncomparable, not a mismatch we can clear", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 1);
  h.gateway.withStockPage("shopee:start", {
    items: [
      level({ externalSkuId: "m-1", sku: "SKU-1", available: 1 }),
      level({ externalSkuId: "m-2", sku: "SKU-UNKNOWN", available: 3 })
    ],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.compared, 1);
  assert.equal(outcome.uncomparable, 1);
  assert.equal(outcome.mismatched, 0);
  assert.equal(h.gateway.pushCalls.length, 0);
});

test("a mismatch whose SKU is unmapped on the channel is counted unrepaired, not repaired", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 5);
  // No listing mapping was imported, so the push cannot address the variant. The connector's fake
  // reports `unknown_sku`, which is the honest outcome.
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 3 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.mismatched, 1);
  assert.equal(outcome.repaired, 0);
  assert.equal(outcome.unrepaired, 1);
});

test("a repaired level stops being drift, so a second pass finds nothing to repair", async () => {
  const h = harness();
  await mapSku(h);
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 3 })],
    nextCursor: null
  });

  const first = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });
  assert.equal(first.repaired, 1);

  // The channel now agrees, because the repair set it to the local value. A converged system reads
  // zero drift, which is the exit criterion (docs/PLAN.md M4).
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 5 })],
    nextCursor: null
  });
  const second = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(second.mismatched, 0);
  assert.equal(second.repaired, 0);
  assert.equal(h.gateway.pushCalls.length, 1);
});

test("only the SKUs the channel accepted count as repaired", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 5);
  h.commerce.withVariant("SKU-2", "var-2", 6);
  h.gateway.pushResults = new Map([
    ["SKU-1", { sku: "SKU-1", accepted: true, reason: null }],
    ["SKU-2", { sku: "SKU-2", accepted: false, reason: "channel_error" }]
  ]);
  h.gateway.withStockPage("shopee:start", {
    items: [
      level({ externalSkuId: "m-1", sku: "SKU-1", available: 0 }),
      level({ externalSkuId: "m-2", sku: "SKU-2", available: 0 })
    ],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.mismatched, 2);
  assert.equal(outcome.repaired, 1);
  assert.equal(outcome.unrepaired, 1);
});

test("a pass walks every page and advances the stock cursor only after each page commits", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 1);
  h.commerce.withVariant("SKU-2", "var-2", 2);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 1 })],
    nextCursor: "page-2"
  });
  h.gateway.withStockPage("shopee:page-2", {
    items: [level({ externalSkuId: "m-2", sku: "SKU-2", available: 0 })],
    nextCursor: null
  });

  const outcome = await reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.pages, 2);
  assert.equal(outcome.caughtUp, true);
  assert.equal(outcome.mismatched, 1);
  assert.equal((await h.store.getCursor(TENANT, CHANNEL, "stock"))?.cursor ?? null, null);
});

test("a crash before a page commits leaves the cursor so the page is re-read, not skipped", async () => {
  const h = harness();
  h.commerce.withVariant("SKU-1", "var-1", 1);
  h.commerce.withVariant("SKU-2", "var-2", 2);
  h.gateway.withStockPage("shopee:start", {
    items: [level({ externalSkuId: "m-1", sku: "SKU-1", available: 1 })],
    nextCursor: "page-2"
  });
  h.gateway.withStockPage("shopee:page-2", {
    items: [level({ externalSkuId: "m-2", sku: "SKU-2", available: 0 })],
    nextCursor: null
  });
  // Page 1 agrees, so it commits and advances the cursor. The push for page 2 then dies, so that
  // page's comparison never commits.
  h.gateway.pushError = new Error("network died mid-pass");

  await assert.rejects(() => reconcileStockOnce(context(h), { tenantId: TENANT, channel: CHANNEL }));

  // Page 1 committed, so its cursor survived; a re-run resumes at page 2 rather than re-walking.
  assert.equal((await h.store.getCursor(TENANT, CHANNEL, "stock"))?.cursor, "page-2");
});
