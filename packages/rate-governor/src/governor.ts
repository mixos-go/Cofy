/**
 * Central rate-limit governor (docs/adr/0002).
 *
 * Marketplace limits are enforced **per app key**, and our app keys are platform-owned
 * (docs/adr/0003), so the budget is global across every tenant on a channel. A per-seller limit
 * also exists: one tenant's burst must not starve the others even when the app budget has headroom.
 *
 * Two consequences shape this design:
 *
 * 1. **The governor decides *when*, it does not sleep.** It returns "not now, retry in N ms" and
 *    the workflow engine reschedules (AGENTS.md §2.5). Blocking a thread here would hold a worker
 *    slot hostage and, with one budget shared by all tenants, make one slow caller everyone's problem.
 * 2. **The clock is injected.** A budget that can only be tested in real time cannot be tested at
 *    all, and a governor whose burst behaviour is untested is exactly the component that fails at
 *    the worst moment. Tests advance a fake clock.
 *
 * State lives in memory per process. That is honest for M3 and wrong for production: with more
 * than one worker replica, each replica would allow the full budget and we would exceed the app
 * limit. The `GovernorState` seam below is where a Redis-backed implementation lands; callers do
 * not change.
 */

import type { ChannelCode, CourierCode, TenantId } from "@platform/contracts";

/**
 * Anything we call on a platform-owned app key that has a published rate limit.
 *
 * A courier is governed exactly like a channel (docs/adr/0020): one budget per app key, one per
 * seller, one shared cooldown. Naming it neutrally keeps the governor from having two copies of the
 * same accounting, which is how one copy silently drifts from the other.
 */
export type GovernedResource = ChannelCode | CourierCode;

/** A token bucket. `capacity` is the burst; `refillPerSecond` is the sustained rate. */
export interface RateLimitBudget {
  readonly capacity: number;
  readonly refillPerSecond: number;
}

export interface GovernorOptions {
  /** Budget per resource, because the limit is per app key and we own one app each. */
  readonly appBudgets: Readonly<Partial<Record<GovernedResource, RateLimitBudget>>>;
  /** Applied per (tenant, resource). Defaults to a cautious share of a typical app budget. */
  readonly sellerBudget?: RateLimitBudget;
  readonly now?: () => number;
}

export const DEFAULT_SELLER_BUDGET: RateLimitBudget = { capacity: 5, refillPerSecond: 1 };

export interface AcquireRequest {
  readonly tenantId: TenantId;
  readonly resource: GovernedResource;
  /** Tokens this call costs. A batched detail read costs more than a single list page. */
  readonly cost?: number;
}

export type RescheduleReason = "app_budget" | "seller_budget" | "resource_cooldown";

export type AcquireDecision =
  | { readonly kind: "allowed"; readonly remainingApp: number; readonly remainingSeller: number }
  | { readonly kind: "reschedule"; readonly retryAfterMs: number; readonly reason: RescheduleReason };

class TokenBucket {
  #tokens: number;
  #updatedAt: number;
  readonly #budget: RateLimitBudget;

  constructor(budget: RateLimitBudget, nowMs: number) {
    this.#budget = budget;
    this.#tokens = budget.capacity;
    this.#updatedAt = nowMs;
  }

  /** Milliseconds until `cost` tokens are available; 0 when they already are. */
  waitMs(cost: number, nowMs: number): number {
    this.#refill(nowMs);
    if (this.#tokens >= cost) return 0;
    const deficit = cost - this.#tokens;
    return Math.ceil((deficit / this.#budget.refillPerSecond) * 1000);
  }

  consume(cost: number, nowMs: number): void {
    this.#refill(nowMs);
    // Never negative: waitMs was checked, and a caller must not be able to push the bucket below 0.
    this.#tokens = Math.max(0, this.#tokens - cost);
  }

  get remaining(): number {
    return Math.floor(this.#tokens);
  }

  #refill(nowMs: number): void {
    const elapsedSeconds = (nowMs - this.#updatedAt) / 1000;
    if (elapsedSeconds <= 0) return;
    this.#tokens = Math.min(this.#budget.capacity, this.#tokens + elapsedSeconds * this.#budget.refillPerSecond);
    this.#updatedAt = nowMs;
  }
}

function appKey(resource: GovernedResource): string {
  return `app:${resource}`;
}

function sellerKey(tenantId: TenantId, resource: GovernedResource): string {
  return `seller:${tenantId}:${resource}`;
}

/**
 * Decides whether a marketplace call may proceed now, and when it may proceed if not.
 *
 * `acquire` is the only method that consumes budget, and it consumes nothing when it denies: a
 * denied call must not pay for permission it did not receive, or a burst of denied attempts would
 * drain the budget for the calls that could have succeeded.
 */
export class RateLimitGovernor {
  readonly #appBudgets: Readonly<Partial<Record<GovernedResource, RateLimitBudget>>>;
  readonly #sellerBudget: RateLimitBudget;
  readonly #now: () => number;
  readonly #buckets = new Map<string, TokenBucket>();
  /** Resource-wide pause, set from a `Retry-After` the external API sent. */
  readonly #cooldownUntil = new Map<string, number>();

  constructor(options: GovernorOptions) {
    this.#appBudgets = options.appBudgets;
    this.#sellerBudget = options.sellerBudget ?? DEFAULT_SELLER_BUDGET;
    this.#now = options.now ?? (() => Date.now());
  }

  acquire(request: AcquireRequest): AcquireDecision {
    const cost = request.cost ?? 1;
    if (!Number.isFinite(cost) || cost <= 0) {
      // A zero/negative cost would make the budget meaningless rather than fail loudly.
      throw new RangeError("Governor cost must be a positive number.");
    }

    const nowMs = this.#now();
    const resource = request.resource;
    const budget = this.#appBudgets[resource];
    if (budget === undefined) {
      // No configured budget is not "unlimited": that would silently make the platform the abuser.
      return { kind: "reschedule", retryAfterMs: 60_000, reason: "app_budget" };
    }

    const cooldown = this.#cooldownUntil.get(appKey(resource));
    if (cooldown !== undefined && cooldown > nowMs) {
      return { kind: "reschedule", retryAfterMs: cooldown - nowMs, reason: "resource_cooldown" };
    }

    const app = this.#bucket(appKey(resource), budget, nowMs);
    const seller = this.#bucket(sellerKey(request.tenantId, resource), this.#sellerBudget, nowMs);

    // Evaluate both before consuming either. Consuming the app bucket and then discovering the
    // seller is blocked would silently spend shared capacity on a call that never happens.
    const appWait = app.waitMs(cost, nowMs);
    if (appWait > 0) return { kind: "reschedule", retryAfterMs: appWait, reason: "app_budget" };

    const sellerWait = seller.waitMs(cost, nowMs);
    if (sellerWait > 0) return { kind: "reschedule", retryAfterMs: sellerWait, reason: "seller_budget" };

    app.consume(cost, nowMs);
    seller.consume(cost, nowMs);
    return { kind: "allowed", remainingApp: app.remaining, remainingSeller: seller.remaining };
  }

  /**
   * Record a rate-limit response that escaped the governor's own accounting.
   *
   * A `Retry-After` from the external API is authoritative: it knows its own state and we may be
   * sharing the app key with traffic the governor never saw. The resource is paused for that long so
   * every tenant waits, rather than each retrying into the same wall.
   */
  recordRateLimited(resource: GovernedResource, retryAfterSeconds: number | null): void {
    const seconds = retryAfterSeconds !== null && retryAfterSeconds > 0 ? retryAfterSeconds : 1;
    const nowMs = this.#now();
    const until = nowMs + seconds * 1000;
    const existing = this.#cooldownUntil.get(appKey(resource)) ?? 0;
    this.#cooldownUntil.set(appKey(resource), Math.max(existing, until));
  }

  /** Current remaining budget, for an ops readout and for tests. Does not consume. */
  snapshot(tenantId: TenantId, resource: GovernedResource): {
    appRemaining: number | null;
    sellerRemaining: number;
    cooldownMs: number;
  } {
    const nowMs = this.#now();
    const budget = this.#appBudgets[resource];
    const cooldown = this.#cooldownUntil.get(appKey(resource)) ?? 0;
    return {
      appRemaining: budget === undefined ? null : this.#bucket(appKey(resource), budget, nowMs).remaining,
      sellerRemaining: this.#bucket(sellerKey(tenantId, resource), this.#sellerBudget, nowMs).remaining,
      cooldownMs: Math.max(0, cooldown - nowMs)
    };
  }

  #bucket(key: string, budget: RateLimitBudget, nowMs: number): TokenBucket {
    const existing = this.#buckets.get(key);
    if (existing !== undefined) return existing;
    const bucket = new TokenBucket(budget, nowMs);
    this.#buckets.set(key, bucket);
    return bucket;
  }
}
