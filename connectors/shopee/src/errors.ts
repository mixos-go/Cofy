/**
 * Mapping from Shopee failures to the platform error taxonomy.
 *
 * Connectors report; the governor decides when to retry (docs/adr/0002, AGENTS.md §4). So the
 * only thing that matters here is that a rate limit becomes `RateLimitedError` and everything
 * else becomes a `PlatformError` with an honest `retryable` flag.
 */

import { PlatformError, RateLimitedError } from "@platform/contracts";

import { ShopeeError } from "./vendor/shopee-sdk.ts";

/** Shopee error strings that mean "slow down" rather than "bad request". */
const RATE_LIMIT_MARKERS = [
  "rate limit",
  "rate_limit",
  "rate-limit",
  "too many request",
  "spam",
  "exceed"
];

function looksRateLimited(message: string): boolean {
  const lower = message.toLowerCase();
  return RATE_LIMIT_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * A `Retry-After` header is authoritative when the channel sends one; Shopee usually does not,
 * in which case the governor applies its own schedule.
 */
export function toPlatformError(error: unknown, context: string): PlatformError {
  if (error instanceof PlatformError) return error;

  if (error instanceof ShopeeError) {
    const status = error.status;
    const detail = error.error !== "" ? error.error : error.message;

    if (status === 429 || looksRateLimited(detail)) {
      return new RateLimitedError(`Shopee rate limit during ${context}: ${detail}`, null, {
        requestId: error.requestId
      });
    }

    // 401/403 mean the token or the app binding is wrong; retrying unchanged cannot help.
    if (status === 401 || status === 403) {
      return new PlatformError("UNAUTHENTICATED", `Shopee rejected credentials during ${context}: ${detail}`, {
        details: { requestId: error.requestId }
      });
    }

    // 5xx is the channel's problem and is worth retrying with backoff.
    const retryable = status !== undefined && status >= 500;
    return new PlatformError("UPSTREAM_ERROR", `Shopee call failed during ${context}: ${detail}`, {
      retryable,
      details: { requestId: error.requestId, status }
    });
  }

  // Network failures and timeouts arrive as unknown errors. They are worth a bounded retry; the
  // governor decides how many, so `retryable: true` here is a hint, not a loop.
  const message = error instanceof Error ? error.message : "unknown failure";
  return new PlatformError("UPSTREAM_ERROR", `Shopee call failed during ${context}: ${message}`, {
    retryable: true,
    cause: error
  });
}

/**
 * Shopee signals application errors in a 200 body as `{ error, message }`. Left unmapped these
 * would look like empty successful responses, so every response goes through this check.
 */
export function assertNoErrorBody(
  body: { error?: string; message?: string; request_id?: string } | undefined,
  context: string
): void {
  if (body === undefined || body.error === undefined || body.error === "") return;

  const message = body.message ?? body.error;
  if (looksRateLimited(body.error) || looksRateLimited(message)) {
    throw new RateLimitedError(`Shopee rate limit during ${context}: ${message}`, null, {
      requestId: body.request_id
    });
  }
  throw new PlatformError("UPSTREAM_ERROR", `Shopee error during ${context}: ${message}`, {
    details: { error: body.error, requestId: body.request_id }
  });
}
