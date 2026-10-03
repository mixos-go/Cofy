/**
 * Channel-sync SLO assertion (docs/PLAN.md M6, docs/adr/0002).
 *
 * M6's open criterion is "WMS operations reflect in channel stock within the sync SLO". The two
 * halves are proven in two places, deliberately, because neither can prove the other:
 *
 *   - The *engine* half is proven against a real Medusa: `wms-stock-write-path.test.ts` walks
 *     receipt → put-away → pick → stocktake and reads `inventory_level.stocked_quantity` back, and
 *     then reads it again through `GET /admin/stock-levels` — the exact route the M4 push compares
 *     against — so the number a channel would be pushed is the number the warehouse moved.
 *   - The *channel* half is proven here: once the local level has moved (which WMS receipt does),
 *     the push that follows carries that value, and the reconciliation cadence that bounds how long
 *     the change can sit unpushed is within the declared SLO.
 *
 * The marketplace and Medusa are fakes (external boundaries, AGENTS.md §6). The point of this file is
 * the *time bound*: the pull path is the source of truth (ADR 0002), so freshness is the cadence, and
 * a cadence longer than the SLO promises something the system cannot deliver. `cadenceMeetsSyncSlo`
 * is what the worker checks at startup, and these tests pin both the accepting and the refusing side.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySyncStateStore } from "@platform/sync-state";
import { createLogger } from "@platform/observability";
import type { Logger } from "@platform/observability";
import { CHANNEL_SYNC_SLO_SECONDS, cadenceMeetsSyncSlo } from "@platform/contracts";
import { InMemoryWorkflowQueue, dispatchJob } from "@platform/workflow-queue";
import type { WorkflowJob } from "@platform/workflow-queue";
import { createWorkflowHandlers } from "../src/units.ts";
import { importListingsOnce } from "../src/listing-import.ts";
import {
  FakeChannelGateway,
  FakeCommerceClient,
  FakeCourierGateway,
  FakeRateShoppingRulesClient,
  syncStateClient
} from "./fakes.ts";
import { InMemoryEventPublisher } from "../src/events.ts";

const TENANT = "tnt-a";
const CHANNEL = "shopee" as const;
/** A cadence at the SLO boundary: the longest interval that may still claim to meet it. */
const CADENCE_AT_SLO = CHANNEL_SYNC_SLO_SECONDS;
const NOW = new Date("2026-09-26T00:00:00.000Z");
const silent: Logger = createLogger("error", {}, () => {});

function harness(intervalSeconds = CADENCE_AT_SLO) {
  const store = new InMemorySyncStateStore();
  const gateway = new FakeChannelGateway();
  const commerce = new FakeCommerceClient();
  const events = new InMemoryEventPublisher();
  const queue = new InMemoryWorkflowQueue({ now: () => NOW.toISOString() });
  const handlers = createWorkflowHandlers({
    syncState: syncStateClient(store),
    gateway,
    commerce,
    couriers: new FakeCourierGateway(),
    rateShoppingRules: new FakeRateShoppingRulesClient(),
    events,
    logger: silent,
    queue,
    nextReconcileRunAt: (from) => new Date(from.getTime() + intervalSeconds * 1_000).toISOString(),
    staleReservationMs: 15 * 60 * 1000,
    maxRefsPerPass: 500,
    now: () => NOW
  });
  return { store, gateway, commerce, events, queue, handlers };
}

function job(overrides: Partial<WorkflowJob> = {}): WorkflowJob {
  return {
    unit: "reconcile.stock",
    jobId: "reconcile.stock:tnt-a:shopee",
    tenantId: TENANT,
    channel: CHANNEL,
    payload: {},
    ...overrides
  };
}

/** Map SKU-1 on the channel, so a stock push has an address to reach. */
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

test("a cadence longer than the sync SLO is refused, and one at or inside it is accepted", () => {
  assert.equal(cadenceMeetsSyncSlo(CHANNEL_SYNC_SLO_SECONDS), true, "the SLO is the longest allowed cadence");
  assert.equal(cadenceMeetsSyncSlo(60), true);
  assert.equal(cadenceMeetsSyncSlo(CHANNEL_SYNC_SLO_SECONDS + 1), false, "exceeding the cadence breaks the promise");
  assert.equal(cadenceMeetsSyncSlo(0), false);
  assert.equal(cadenceMeetsSyncSlo(Number.NaN), false);
});

test(
  "a stock change the warehouse made reaches the channel within the sync SLO",
  async () => {
    const h = harness();
    await mapSku(h);

    // The local level after the WMS receipt. `wms-stock-write-path.test.ts` proves the receipt
    // actually moves Medusa's number to this value; here it is the starting state of the push half.
    h.commerce.withVariant("SKU-1", "var-1", 9);
    // The channel still reports the pre-receipt level, so the change has not propagated yet. This is
    // exactly the state the pull path must close inside the SLO.
    h.gateway.withStockPage("shopee:start", {
      items: [{ channel: CHANNEL, externalSkuId: "model-11", sku: "SKU-1", available: 2 }],
      nextCursor: null
    });

    const outcome = await dispatchJob(job(), h.handlers, h.queue, silent);

    assert.equal(outcome.result, "completed", "the pass converged rather than failing");
    assert.equal(h.gateway.pushCalls.length, 1, "the change reached the channel in one pass");
    assert.deepEqual(
      h.gateway.pushCalls[0]?.items.map((item) => ({ sku: item.sku, available: item.available })),
      [{ sku: "SKU-1", available: 9 }],
      "the channel was pushed the warehouse's number, not its own stale one"
    );

    // The bound: the pass just ran, and it re-armed its next run one cadence later. The cadence is
    // what bounds freshness, so its value being inside the SLO is what makes the SLO a fact rather
    // than a hope. `reconcile.orders` is armed separately, so only the stock re-arm is read here.
    const next = new Date(NOW.getTime() + CADENCE_AT_SLO * 1_000).toISOString();
    const runAt = h.queue.runAtOf(`reconcile.stock:${TENANT}:${CHANNEL}@${next}`);
    assert.equal(runAt, next, "the stock pass re-armed on a cadence inside the SLO");
    const elapsedSeconds = (Date.parse(runAt) - NOW.getTime()) / 1_000;
    assert.ok(
      cadenceMeetsSyncSlo(elapsedSeconds),
      `the next pass is ${elapsedSeconds}s away, which must be within the ${CHANNEL_SYNC_SLO_SECONDS}s SLO`
    );
  }
);
