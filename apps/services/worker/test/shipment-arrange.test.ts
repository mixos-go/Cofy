/**
 * Shipment-arrange workflow tests (docs/PLAN.md M7, docs/adr/0021).
 *
 * The path this proves is the *primary* M7 fulfillment path: the marketplace arranges the shipment,
 * the tenant's engine records the Fulfillment carrying the channel-issued waybill, and the write-back
 * is the arrangement call itself — no track write follows. The interesting cases are the ones that
 * are not a plain success: a channel without the arrangement surface, an arrangement retried, a
 * governor refusal that must defer, and a label fetch that fails without undoing the arrangement.
 *
 * The channel and the tenant's Medusa are fakes (external boundaries, AGENTS.md §6); the sync state
 * is the real in-memory store behind the thin adapter, so the replay under test is production code.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { PlatformError, RateLimitedError, PLATFORM_EVENTS } from "@platform/contracts";
import { arrangeShipmentOnce } from "../src/shipment-arrange.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, FakeCommerceClient, syncStateClient } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const ORDER = "order-001";
const EXTERNAL = "ext-1";
const silent: Logger = createLogger("error", {}, () => {});

const ITEMS = [{ sku: "SKU-1", quantity: 1 }];

function harness() {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const commerce = new FakeCommerceClient();
  commerce.withVariant("SKU-1", "var-1", 5);
  const events = new InMemoryEventPublisher();
  return {
    store,
    gateway,
    commerce,
    events,
    context: {
      syncState: syncStateClient(store),
      gateway,
      commerce,
      events,
      logger: silent
    }
  };
}

function input(overrides: Partial<Parameters<typeof arrangeShipmentOnce>[1]> = {}) {
  return {
    tenantId: TENANT,
    channel: CHANNEL,
    orderId: ORDER,
    externalOrderId: EXTERNAL,
    items: ITEMS,
    arrangement: {
      externalOrderId: EXTERNAL,
      channelOptionId: "opt-1",
      pickupAddressId: null,
      selfShipTrackingNumber: null
    },
    courier: "J&T Express",
    serviceLevel: "standard",
    ...overrides
  };
}

test("an order is arranged by the channel, recorded, and emits shipment.created", async () => {
  const h = harness();

  const outcome = await arrangeShipmentOnce(h.context, input());

  assert.equal(outcome.skipped, false);
  assert.equal(outcome.shipment?.trackingNumber, "CHANNEL-ARRANGED-0001");
  assert.ok(outcome.fulfillmentId !== null);

  // The marketplace was asked to arrange exactly the option the seller chose.
  assert.equal(h.gateway.arrangeCalls.length, 1);
  assert.equal(h.gateway.arrangeCalls[0]?.arrangement.channelOptionId, "opt-1");

  // The tenant's engine recorded the channel-issued waybill as a channel-arranged shipment.
  assert.equal(h.commerce.shipments.length, 1);
  assert.equal(h.commerce.shipments[0]?.shipment.arrangement, "channel");
  assert.equal(h.commerce.shipments[0]?.shipment.externalOrderId, EXTERNAL);
  assert.equal(h.commerce.shipments[0]?.shipment.trackingNumber, "CHANNEL-ARRANGED-0001");

  const created = h.events.published.filter((event) => event.event === PLATFORM_EVENTS.SHIPMENT_CREATED);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.payload.arrangement, "channel");
});

test("the arrangement call is the write-back: no separate channel write is attempted", async () => {
  const h = harness();
  await arrangeShipmentOnce(h.context, input());
  // The marketplace that issued the waybill already knows it, so `attachTrackingNumber` is not used.
  assert.equal(h.gateway.trackingWrites.length, 0);
});

test("a channel without the arrangement surface is a skip, not a failure", async () => {
  const h = harness();
  h.gateway.capabilitiesFor = () => ({
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: true,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: false,
    supportsListingRead: true,
    supportsStockSnapshotRead: true,
    supportsTrackingWriteBack: false,
    supportsShippingArrangement: false,
    supportsShippingLabel: false,
    supportsChannelTracking: false
  });

  const outcome = await arrangeShipmentOnce(h.context, input());

  assert.equal(outcome.skipped, true);
  assert.equal(h.gateway.arrangeCalls.length, 0);
  assert.equal(h.commerce.shipments.length, 0);
});

test("re-running the same arrange replays: the channel is not asked to arrange twice", async () => {
  const h = harness();
  const first = await arrangeShipmentOnce(h.context, input());
  const second = await arrangeShipmentOnce(h.context, input());

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.equal(h.gateway.arrangeCalls.length, 1);
  assert.equal(second.shipment?.trackingNumber, first.shipment?.trackingNumber);
  // The tenant-side record is idempotent on the waybill, so it also converged.
  assert.equal(h.commerce.shipments.length, 1);
});

test("a governor refusal defers: nothing is arranged and the claim is released", async () => {
  const h = harness();
  h.gateway.arrangementError = new RateLimitedError("slow down", 30);

  await assert.rejects(
    arrangeShipmentOnce(h.context, input()),
    (error: unknown) => error instanceof RateLimitedError
  );
  assert.equal(h.gateway.arrangeCalls.length, 0);
  assert.equal(h.commerce.shipments.length, 0);

  // The retry must be able to take the claim: a deferred attempt owns no work.
  const retry = await arrangeShipmentOnce(h.context, input());
  assert.equal(retry.shipment?.trackingNumber, "CHANNEL-ARRANGED-0001");
  assert.equal(h.gateway.arrangeCalls.length, 1);
});

test("a label is fetched when asked and its url is carried to the tenant record", async () => {
  const h = harness();
  const outcome = await arrangeShipmentOnce(h.context, input({ fetchLabel: true }));

  assert.equal(outcome.label?.url, "https://label.example.test/label.pdf");
  assert.equal(h.gateway.labelCalls.length, 1);
  assert.equal(h.commerce.shipments[0]?.shipment.labelUrl, "https://label.example.test/label.pdf");
});

test("a label failure does not undo an arrangement that already exists", async () => {
  const h = harness();
  // Make the label read fail while the arrangement itself succeeds.
  h.gateway.fetchShippingLabel = async () => {
    throw new PlatformError("UPSTREAM_ERROR", "label service down");
  };

  const outcome = await arrangeShipmentOnce(h.context, input({ fetchLabel: true }));

  assert.equal(outcome.label, null);
  assert.equal(outcome.shipment?.trackingNumber, "CHANNEL-ARRANGED-0001");
  assert.equal(h.commerce.shipments.length, 1, "the shipment was still recorded");
});

test("an arrangement failure after the call is not recorded as a success", async () => {
  const h = harness();
  // The channel arranged the shipment, but recording it at the tenant fails.
  h.commerce.recordShipmentError = new PlatformError("UPSTREAM_ERROR", "engine down");

  await assert.rejects(
    arrangeShipmentOnce(h.context, input()),
    (error: unknown) => error instanceof PlatformError
  );

  const failed = h.events.published.filter((event) => event.event === PLATFORM_EVENTS.SHIPMENT_FAILED);
  assert.equal(failed.length, 1);
  assert.equal(h.gateway.arrangeCalls.length, 1);
});
