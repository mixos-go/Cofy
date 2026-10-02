/**
 * Tracking write-back tests (docs/PLAN.md M7, docs/adr/0020).
 *
 * The path this proves is the M7 exit: a waybill a courier issued reaches the marketplace order it
 * belongs to, exactly once, and only for a channel that accepts it.
 *
 * The channel is the fake gateway (an external boundary, AGENTS.md §6); the sync state is the real
 * in-memory store behind the thin adapter, so the claim/replay behaviour under test is production
 * code. The interesting cases are the three outcomes that are *not* a plain send: a channel without
 * the capability, a replay, and a governor refusal that must defer rather than fail.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { PlatformError, RateLimitedError, PLATFORM_EVENTS } from "@platform/contracts";
import { writeBackTrackingOnce } from "../src/tracking-writeback.ts";
import { InMemoryEventPublisher } from "../src/events.ts";
import { FakeChannelGateway, syncStateClient } from "./fakes.ts";

const TENANT = "tnt-a";
const CHANNEL = "tiktok_tokopedia" as const;
const ORDER = "ext-1";
const WAYBILL = { trackingNumber: "JX1234567890", trackingUrl: "https://track.example.test/JX1234567890" };

const silent: Logger = createLogger("error", {}, () => {});

function harness() {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const events = new InMemoryEventPublisher();
  return {
    store,
    gateway,
    events,
    context: { syncState: syncStateClient(store), gateway, events, logger: silent }
  };
}

test("a waybill is written to the channel order once", async () => {
  const h = harness();

  const outcome = await writeBackTrackingOnce(h.context, {
    tenantId: TENANT,
    channel: CHANNEL,
    externalOrderId: ORDER,
    tracking: WAYBILL
  });

  assert.deepEqual(outcome, { written: true, skipped: false, replayed: false });
  assert.deepEqual(h.gateway.trackingWrites, [
    { tenantId: TENANT, channel: CHANNEL, externalOrderId: ORDER, tracking: WAYBILL }
  ]);
});

test("re-running the same write-back replays instead of writing twice", async () => {
  const h = harness();
  const input = { tenantId: TENANT, channel: CHANNEL, externalOrderId: ORDER, tracking: WAYBILL };

  await writeBackTrackingOnce(h.context, input);
  const second = await writeBackTrackingOnce(h.context, input);

  assert.deepEqual(second, { written: false, skipped: false, replayed: true });
  // The idempotency key held: the channel saw the waybill exactly once.
  assert.equal(h.gateway.trackingWrites.length, 1);
});

test("a corrected waybill is a new operation, not a replay of the old one", async () => {
  const h = harness();

  await writeBackTrackingOnce(h.context, {
    tenantId: TENANT,
    channel: CHANNEL,
    externalOrderId: ORDER,
    tracking: WAYBILL
  });
  const corrected = await writeBackTrackingOnce(h.context, {
    tenantId: TENANT,
    channel: CHANNEL,
    externalOrderId: ORDER,
    tracking: { trackingNumber: "JX-CORRECTED", trackingUrl: null }
  });

  assert.equal(corrected.written, true);
  assert.equal(h.gateway.trackingWrites.length, 2);
  assert.equal(h.gateway.trackingWrites[1]?.tracking.trackingNumber, "JX-CORRECTED");
});

test("a channel without write-back is skipped, not failed", async () => {
  const h = harness();
  h.gateway.capabilitiesFor = () => ({
    supportsOrderPull: true,
    supportsStockPush: true,
    supportsWebhooks: true,
    supportsOrderAcknowledgement: false,
    splitsOrderHistory: false,
    supportsListingRead: true,
    supportsStockSnapshotRead: true,
    supportsTrackingWriteBack: false
  });

  const outcome = await writeBackTrackingOnce(h.context, {
    tenantId: TENANT,
    channel: CHANNEL,
    externalOrderId: ORDER,
    tracking: WAYBILL
  });

  assert.deepEqual(outcome, { written: false, skipped: true, replayed: false });
  assert.equal(h.gateway.trackingWrites.length, 0);
});

test("a governor refusal defers: nothing is written, no failure is recorded, and the claim is released", async () => {
  const h = harness();
  h.gateway.trackingWriteError = new RateLimitedError("slow down", 30);

  await assert.rejects(
    writeBackTrackingOnce(h.context, {
      tenantId: TENANT,
      channel: CHANNEL,
      externalOrderId: ORDER,
      tracking: WAYBILL
    }),
    (error: unknown) => error instanceof RateLimitedError
  );

  assert.equal(h.gateway.trackingWrites.length, 0);
  // A deferral must not be recorded as a failure, or reconciliation chases healthy work (ADR 0013).
  assert.deepEqual(h.events.published, []);
  // The claim was released, so the rescheduled retry can take it rather than no-op.
  const retry = await writeBackTrackingOnce(h.context, {
    tenantId: TENANT,
    channel: CHANNEL,
    externalOrderId: ORDER,
    tracking: WAYBILL
  });
  assert.equal(retry.written, true);
});

test("a channel failure is recorded as failed and published as shipment.failed", async () => {
  const h = harness();
  h.gateway.trackingWriteError = new PlatformError("UPSTREAM_ERROR", "marketplace rejected the waybill");

  await assert.rejects(
    writeBackTrackingOnce(h.context, {
      tenantId: TENANT,
      channel: CHANNEL,
      externalOrderId: ORDER,
      tracking: WAYBILL
    }),
    (error: unknown) => error instanceof PlatformError
  );

  assert.equal(h.events.published.length, 1);
  assert.equal(h.events.published[0]?.event, PLATFORM_EVENTS.SHIPMENT_FAILED);
  assert.equal(h.events.published[0]?.payload.externalOrderId, ORDER);
});
