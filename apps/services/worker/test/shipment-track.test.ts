/**
 * Shipment track pass tests (docs/PLAN.md M7, docs/adr/0021).
 *
 * The path this proves is the delivery-status pull: the pass reads the tenant's active shipments and
 * advances them from the right source — the channel for a channel-arranged shipment, the courier for
 * a self-arranged one — writing only forward moves and leaving a terminal or unchanged shipment
 * alone. The interesting cases are the ones that are not a plain advance: an out-of-order event that
 * must not move a shipment backwards, a channel that cannot report tracking, a source failure
 * contained to one shipment, and a governor refusal that reschedules the whole pass.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { PlatformError, RateLimitedError, PLATFORM_EVENTS } from "@platform/contracts";
import type { ActiveShipment, TrackingEvent } from "@platform/contracts";
import { trackShipmentsOnce } from "../src/shipment-track.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, FakeCommerceClient, FakeCourierGateway } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
const silent: Logger = createLogger("error", {}, () => {});

function channelShipment(overrides: Partial<Extract<ActiveShipment, { arrangement: "channel" }>> = {}): ActiveShipment {
  return {
    fulfillmentId: "ful-1",
    orderId: "order-001",
    trackingNumber: "CHANNEL-1",
    channel: CHANNEL,
    status: "created",
    updatedAt: "2026-09-26T00:00:00.000Z",
    arrangement: "channel",
    externalOrderId: "ext-1",
    ...overrides
  } as ActiveShipment;
}

function courierShipment(overrides: Partial<Extract<ActiveShipment, { arrangement: "courier" }>> = {}): ActiveShipment {
  return {
    fulfillmentId: "ful-2",
    orderId: "order-002",
    trackingNumber: "WAYBILL-0001",
    channel: CHANNEL,
    status: "picked_up",
    updatedAt: "2026-09-26T01:00:00.000Z",
    arrangement: "courier",
    courier: "jne",
    ...overrides
  } as ActiveShipment;
}

function event(status: TrackingEvent["status"], occurredAt: string): TrackingEvent {
  return { status, occurredAt, description: status };
}

function harness() {
  const gateway = new FakeChannelGateway();
  const couriers = new FakeCourierGateway();
  const commerce = new FakeCommerceClient();
  const events = new InMemoryEventPublisher();
  return {
    gateway,
    couriers,
    commerce,
    events,
    context: { gateway, couriers, commerce, events, logger: silent }
  };
}

test("a channel-arranged shipment is advanced from the channel's tracking", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment()];
  h.gateway.channelTrackingEvents = [event("in_transit", "2026-09-26T02:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.considered, 1);
  assert.equal(outcome.advanced, 1);
  assert.equal(h.gateway.channelTrackingCalls.length, 1);
  assert.equal(h.commerce.advances.length, 1);
  assert.equal(h.commerce.advances[0]?.status, "in_transit");
  assert.equal(h.commerce.advances[0]?.fulfillmentId, "ful-1");

  const changed = h.events.published.filter((entry) => entry.event === PLATFORM_EVENTS.SHIPMENT_STATUS_CHANGED);
  assert.equal(changed.length, 1);
  assert.equal(changed[0]?.payload.from, "created");
  assert.equal(changed[0]?.payload.to, "in_transit");
});

test("a self-arranged shipment is advanced from the courier's tracking", async () => {
  const h = harness();
  h.commerce.activeShipments = [courierShipment()];
  h.couriers.trackEvents = [event("out_for_delivery", "2026-09-26T03:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.advanced, 1);
  assert.equal(h.couriers.trackingCalls.length, 1);
  assert.equal(h.couriers.trackingCalls[0]?.courier, "jne");
  assert.equal(h.commerce.advances[0]?.status, "out_for_delivery");
  // The channel was not asked about a shipment it did not arrange.
  assert.equal(h.gateway.channelTrackingCalls.length, 0);
});

test("the newest event by time decides the status, not array order", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment()];
  // Out of order in the array: "picked_up" is older than "in_transit".
  h.gateway.channelTrackingEvents = [
    event("in_transit", "2026-09-26T05:00:00.000Z"),
    event("picked_up", "2026-09-26T02:00:00.000Z")
  ];

  await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(h.commerce.advances[0]?.status, "in_transit");
});

test("an out-of-order event does not move a shipment backwards", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment({ status: "in_transit" })];
  // The only event is an older status; the pass must not regress the shipment.
  h.gateway.channelTrackingEvents = [event("picked_up", "2026-09-26T01:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.unchanged, 1);
  assert.equal(outcome.advanced, 0);
  assert.equal(h.commerce.advances.length, 0);
});

test("a re-read that found nothing new writes nothing", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment({ status: "in_transit" })];
  h.gateway.channelTrackingEvents = [event("in_transit", "2026-09-26T02:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.unchanged, 1);
  assert.equal(h.commerce.advances.length, 0);
});

test("a delivered event advances and is terminal for the next pass", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment({ status: "out_for_delivery" })];
  h.gateway.channelTrackingEvents = [event("delivered", "2026-09-26T06:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.advanced, 1);
  assert.equal(h.commerce.advances[0]?.status, "delivered");
});

test("a channel that cannot report tracking is skipped, not failed", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment()];
  h.gateway.capabilitiesFor = () => ({
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: true,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: false,
    supportsListingRead: true,
    supportsStockSnapshotRead: true,
    supportsTrackingWriteBack: false,
    supportsShippingArrangement: true,
    supportsShippingLabel: true,
    supportsChannelTracking: false
  });

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.skipped, 1);
  assert.equal(outcome.advanced, 0);
  assert.equal(h.gateway.channelTrackingCalls.length, 0);
});

test("one source failure does not sink the pass; the others still advance", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment(), courierShipment()];
  // The channel fails for the channel-arranged shipment; the courier still answers.
  h.gateway.fetchChannelTracking = async () => {
    throw new PlatformError("UPSTREAM_ERROR", "channel 500");
  };
  h.couriers.trackEvents = [event("out_for_delivery", "2026-09-26T03:00:00.000Z")];

  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });

  assert.equal(outcome.considered, 2);
  assert.equal(outcome.failed, 1);
  assert.equal(outcome.advanced, 1);
  assert.equal(h.commerce.advances[0]?.fulfillmentId, "ful-2");
});

test("a governor refusal propagates so the whole pass reschedules", async () => {
  const h = harness();
  h.commerce.activeShipments = [channelShipment()];
  h.gateway.fetchChannelTracking = async () => {
    throw new RateLimitedError("governor refused", 30);
  };

  await assert.rejects(
    trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL }),
    (error: unknown) => error instanceof RateLimitedError
  );
  assert.equal(h.commerce.advances.length, 0);
});

test("an empty active set is a completed pass with nothing to do", async () => {
  const h = harness();
  const outcome = await trackShipmentsOnce(h.context, { tenantId: TENANT, channel: CHANNEL });
  assert.equal(outcome.considered, 0);
  assert.equal(outcome.advanced, 0);
  assert.equal(h.commerce.advances.length, 0);
});
