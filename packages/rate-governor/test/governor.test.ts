/**
 * Rate-limit governor tests.
 *
 * The clock is fake in every test. A budget test that runs in real time can only assert
 * "eventually", which is the assertion that let the last oversell through; with a fake clock the
 * burst behaviour is exact and reproducible.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { RateLimitGovernor, DEFAULT_SELLER_BUDGET } from "../src/index.ts";

/** A clock the test advances by hand. */
function fakeClock(startMs = 1_000_000): { now: () => number; advance: (ms: number) => void } {
  let current = startMs;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    }
  };
}

function governor(clock: ReturnType<typeof fakeClock>, sellerCapacity = 100) {
  return new RateLimitGovernor({
    appBudgets: { tiktok_tokopedia: { capacity: 10, refillPerSecond: 2 } },
    sellerBudget: { capacity: sellerCapacity, refillPerSecond: 1 },
    now: clock.now
  });
}

test("a courier is governed like a channel, on its own budget (docs/adr/0020)", () => {
  const clock = fakeClock();
  const g = new RateLimitGovernor({
    appBudgets: {
      tiktok_tokopedia: { capacity: 10, refillPerSecond: 2 },
      jne: { capacity: 2, refillPerSecond: 1 }
    },
    sellerBudget: { capacity: 100, refillPerSecond: 1 },
    now: clock.now
  });

  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "jne" }).kind, "allowed");
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "jne" }).kind, "allowed");
  // The courier's own budget is spent; a channel's budget is a separate bucket and is untouched.
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "jne" }).kind, "reschedule");
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");

  // And the seller bucket is per resource too: the courier block above did not spend the channel's.
  assert.equal(g.snapshot("tnt-a", "jne").appRemaining, 0);
  assert.equal(g.snapshot("tnt-a", "tiktok_tokopedia").appRemaining, 9);
});

test("an unconfigured courier is denied, not treated as unlimited", () => {
  const clock = fakeClock();
  const g = governor(clock);

  const decision = g.acquire({ tenantId: "tnt-a", resource: "anteraja" });
  assert.equal(decision.kind, "reschedule");
  assert.equal(decision.kind === "reschedule" ? decision.reason : null, "app_budget");
});

test("a burst within the app budget is allowed and the budget is spent", () => {
  const clock = fakeClock();
  const g = governor(clock);

  for (let i = 0; i < 10; i += 1) {
    const decision = g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });
    assert.equal(decision.kind, "allowed");
  }

  const overflow = g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });
  assert.equal(overflow.kind, "reschedule");
  assert.equal(overflow.kind === "reschedule" ? overflow.reason : null, "app_budget");
});

test("the app budget refills at the configured rate", () => {
  const clock = fakeClock();
  const g = governor(clock);

  for (let i = 0; i < 10; i += 1) g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "reschedule");

  // 2 tokens/second: 500ms buys exactly one.
  clock.advance(500);
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "reschedule");
});

test("a denied call does not spend budget", () => {
  const clock = fakeClock();
  const g = governor(clock);

  for (let i = 0; i < 10; i += 1) g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });

  // Hammering while blocked must not leave the bucket negative, or the next refill would be
  // cancelled out by the debt.
  for (let i = 0; i < 50; i += 1) g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });

  clock.advance(500);
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
});

test("one tenant's burst does not starve another tenant on the same channel", () => {
  const clock = fakeClock();
  const g = governor(clock, 3);

  // Tenant A exhausts its own seller budget (3), not the app budget (10).
  for (let i = 0; i < 3; i += 1) {
    assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
  }

  const blocked = g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });
  assert.equal(blocked.kind === "reschedule" ? blocked.reason : null, "seller_budget");

  // Tenant B is untouched: this is the fairness the per-seller budget exists for.
  assert.equal(g.acquire({ tenantId: "tnt-b", resource: "tiktok_tokopedia" }).kind, "allowed");
});

test("the app budget is shared, so one tenant can exhaust capacity for a channel", () => {
  const clock = fakeClock();
  const g = governor(clock, 100);

  for (let i = 0; i < 10; i += 1) {
    assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
  }

  // The app key is the real limit and it is exhausted; a second tenant waits for it too.
  const forB = g.acquire({ tenantId: "tnt-b", resource: "tiktok_tokopedia" });
  assert.equal(forB.kind === "reschedule" ? forB.reason : null, "app_budget");
});

test("a resource-wide cooldown from Retry-After blocks every tenant, then lifts", () => {
  const clock = fakeClock();
  const g = governor(clock);

  g.recordRateLimited("tiktok_tokopedia", 30);
  const blocked = g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" });
  assert.equal(blocked.kind === "reschedule" ? blocked.reason : null, "resource_cooldown");
  assert.equal(blocked.kind === "reschedule" ? blocked.retryAfterMs : null, 30_000);

  clock.advance(30_000);
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
});

test("a Retry-After from a courier pauses that courier and not the channels", () => {
  const clock = fakeClock();
  const g = new RateLimitGovernor({
    appBudgets: {
      tiktok_tokopedia: { capacity: 10, refillPerSecond: 1 },
      jne: { capacity: 10, refillPerSecond: 1 }
    },
    sellerBudget: { capacity: 100, refillPerSecond: 1 },
    now: clock.now
  });

  g.recordRateLimited("jne", 30);

  const blocked = g.acquire({ tenantId: "tnt-a", resource: "jne" });
  assert.equal(blocked.kind === "reschedule" ? blocked.reason : null, "resource_cooldown");
  // The channel's own budget is a separate resource and is unaffected by the courier's pause.
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia" }).kind, "allowed");
});

test("a Retry-After longer than an existing cooldown wins, and a shorter one does not shorten it", () => {
  const clock = fakeClock();
  const g = governor(clock);

  g.recordRateLimited("tiktok_tokopedia", 30);
  clock.advance(1_000);
  g.recordRateLimited("tiktok_tokopedia", 10); // would end sooner; must not shorten the pause
  assert.equal(g.snapshot("tnt-a", "tiktok_tokopedia").cooldownMs, 29_000);

  g.recordRateLimited("tiktok_tokopedia", 120); // longer; must extend
  assert.equal(g.snapshot("tnt-a", "tiktok_tokopedia").cooldownMs, 120_000);
});

test("a Retry-After of null still pauses briefly rather than retrying immediately", () => {
  const clock = fakeClock();
  const g = governor(clock);

  g.recordRateLimited("tiktok_tokopedia", null);
  assert.equal(g.snapshot("tnt-a", "tiktok_tokopedia").cooldownMs, 1_000);
});

test("an unconfigured channel is denied, not treated as unlimited", () => {
  const clock = fakeClock();
  const g = governor(clock);

  const decision = g.acquire({ tenantId: "tnt-a", resource: "lazada" });
  assert.equal(decision.kind, "reschedule");
  assert.equal(g.snapshot("tnt-a", "lazada").appRemaining, null);
});

test("a larger-cost call consumes proportionally more budget", () => {
  const clock = fakeClock();
  const g = governor(clock);

  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia", cost: 5 }).kind, "allowed");
  // 5 of 10 left; a cost-6 call must wait rather than partially consume.
  const tooBig = g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia", cost: 6 });
  assert.equal(tooBig.kind, "reschedule");
  // The denial did not spend the remaining 5.
  assert.equal(g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia", cost: 5 }).kind, "allowed");
});

test("a non-positive cost is rejected rather than silently allowed", () => {
  const clock = fakeClock();
  const g = governor(clock);

  assert.throws(() => g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia", cost: 0 }), RangeError);
  assert.throws(() => g.acquire({ tenantId: "tnt-a", resource: "tiktok_tokopedia", cost: -1 }), RangeError);
});

test("the default seller budget is a small share, not the whole app budget", () => {
  // Guards against a future change defaulting the per-seller budget to the app budget, which
  // would make the per-seller limit dead code.
  assert.ok(DEFAULT_SELLER_BUDGET.capacity < 10);
});
