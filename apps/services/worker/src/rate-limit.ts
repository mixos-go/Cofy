/**
 * Turning a governor refusal into a reschedule (docs/adr/0013).
 *
 * A `CHANNEL_RATE_LIMITED` is not a failure: the work is valid and must run later. The delay comes
 * from the governor — the integration plane returns the decision as `retryAfterSeconds` in the error
 * body — and this module only reads it. The worker never computes a rate-limit delay of its own,
 * because the budget is shared per app key across every tenant and only the governor sees it.
 *
 * Two consequences the workflows depend on:
 *   - A deferral must **not** compensate. Marking a throttled order ref failed or completing its
 *     idempotency record as failed tells reconciliation that a healthy operation is broken.
 *   - The claim the deferred attempt took must be **released**, not left in place. A retry that
 *     found its own key `in_flight` would be a no-op until the lease expired, so the reschedule
 *     would silently do nothing.
 */

import { PlatformError } from "@platform/contracts";
import type { SyncStateClient } from "./ports.ts";
import type { WorkflowLogger } from "@platform/workflow-queue";

/**
 * Delay used only when a 429 arrives without a `retryAfterSeconds`.
 *
 * The plane normalises every rate-limit response to carry one, so reaching this means a protocol
 * bug rather than a policy choice. It matches the governor's own minimum cooldown, so a defensive
 * fallback never invents a *different* policy than the component that owns the decision.
 */
export const MIN_DEFERRAL_MS = 1_000;

export interface Deferral {
  /** When the unit may run again, as an ISO instant for the queue's `runAt`. */
  readonly runAt: string;
  /** Why it was deferred, for the log line and the queue's record. */
  readonly reason: string;
}

/** True when the error is the governor refusing a call, rather than a failed operation. */
export function isRateLimited(error: unknown): error is PlatformError {
  return error instanceof PlatformError && error.code === "CHANNEL_RATE_LIMITED";
}

function readRetryAfterSeconds(details: Readonly<Record<string, unknown>>): number | null {
  const value = details.retryAfterSeconds;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readReason(details: Readonly<Record<string, unknown>>): string {
  const value = details.reason;
  return typeof value === "string" && value !== "" ? value : "rate_limited";
}

/**
 * The reschedule this error calls for, or null when it is not a governor refusal.
 *
 * `now` is injected so the deferred instant is a fact of the test rather than the wall clock.
 */
export function deferralFor(error: unknown, now: Date): Deferral | null {
  if (!isRateLimited(error)) return null;
  const retryAfterSeconds = readRetryAfterSeconds(error.details);
  const delayMs = retryAfterSeconds === null ? MIN_DEFERRAL_MS : retryAfterSeconds * 1_000;
  return {
    runAt: new Date(now.getTime() + delayMs).toISOString(),
    reason: readReason(error.details)
  };
}

/**
 * Release the idempotency claim a deferred attempt took, so the retry can take it again.
 *
 * A failure here is logged and swallowed on purpose: the deferral is still correct, and throwing
 * would replace the rate-limit cause with a bookkeeping one. The lease is the backstop — a claim
 * that could not be released is reclaimed when it expires.
 */
export async function releaseDeferredClaim(
  syncState: SyncStateClient,
  input: { readonly tenantId: string; readonly key: string | null; readonly logger: WorkflowLogger }
): Promise<void> {
  if (input.key === null) return;
  try {
    await syncState.abandonIdempotency({ tenantId: input.tenantId, key: input.key });
  } catch (error) {
    input.logger.error("rate_limit.abandon_failed", {
      tenantId: input.tenantId,
      key: input.key,
      errorMessage: error instanceof Error ? error.message : "unknown"
    });
  }
}
