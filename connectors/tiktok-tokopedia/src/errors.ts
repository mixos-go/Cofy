/**
 * Mapping from TikTok Shop failures to the platform error taxonomy.
 *
 * TikTok signals failures with a numeric top-level `code` in an HTTP 200 body: `0` means success,
 * and the 1xxxx-2xxxx ranges are actionable. The governor owns retry decisions (AGENTS.md §4), so
 * this file only has to classify.
 */

import { PlatformError, RateLimitedError } from "@platform/contracts";

import { TikTokError } from "./vendor/tiktok-shop-sdk.ts";

/**
 * TikTok's documented rate-limit / transient codes. Kept as an explicit set rather than a range
 * because guessing which codes are retryable would be worse than not retrying.
 */
const RATE_LIMIT_CODES = new Set([105004, 105005]);

/**
 * Token-endpoint failures observed live (2026-09-27):
 *   - `36004004` "invalid auth code": the authorization code was wrong, reused or expired.
 *   - `36004005` "can not find related auth record": the refresh token is unknown to TikTok.
 * Both mean the seller must authorize again, so they map to a non-retryable `CREDENTIAL_EXPIRED`
 * rather than an upstream error the governor would retry forever.
 */
const OAUTH_REAUTH_CODES = new Set([36004004, 36004005]);

/**
 * TikTok rejects requests from an IP that is not on the app's allowlist. In the token flow this
 * arrives with no useful dedicated code, so it is recognised by message. Retrying cannot fix it —
 * an operator must add the egress IP in Partner Center — so it must not look retryable.
 */
const IP_ALLOWLIST_MESSAGE = /IP (?:address )?is not in the IP allow ?list/i;

function classifyMessage(message: string, context: string, requestId: string | undefined): PlatformError | null {
  if (IP_ALLOWLIST_MESSAGE.test(message)) {
    return new PlatformError(
      "FORBIDDEN",
      `TikTok rejected this IP during ${context} (app IP allowlist): ${message}`,
      { details: { requestId } }
    );
  }
  return null;
}

function classifyCode(code: number, message: string, context: string, requestId: string | undefined): PlatformError {
  if (OAUTH_REAUTH_CODES.has(code)) {
    return new PlatformError(
      "CREDENTIAL_EXPIRED",
      `TikTok authorization must be redone during ${context} (code ${code}): ${message}`,
      { details: { code, requestId } }
    );
  }
  if (RATE_LIMIT_CODES.has(code)) {
    return new RateLimitedError(`TikTok rate limit during ${context} (code ${code}): ${message}`, null, { requestId });
  }
  const byMessage = classifyMessage(message, context, requestId);
  if (byMessage) return byMessage;
  return new PlatformError("UPSTREAM_ERROR", `TikTok error during ${context} (code ${code}): ${message}`, {
    details: { code, requestId }
  });
}

export function toPlatformError(error: unknown, context: string): PlatformError {
  if (error instanceof PlatformError) return error;

  if (error instanceof TikTokError) {
    // A transport-level 429 is the governor's signal even when the body carries no code (AGENTS.md §4).
    if (error.status === 429) {
      return new RateLimitedError(`TikTok rate limit during ${context}: ${error.message}`, null, {
        requestId: error.requestId
      });
    }
    const code = typeof error.code === "number" ? error.code : Number(error.code);
    if (!Number.isNaN(code)) {
      return classifyCode(code, error.message, context, error.requestId);
    }
    const byMessage = classifyMessage(error.message, context, error.requestId);
    if (byMessage) return byMessage;
    return new PlatformError("UPSTREAM_ERROR", `TikTok call failed during ${context}: ${error.message}`, {
      // No body code means a transport/5xx failure, which is worth a retry.
      retryable: true,
      details: { code: error.code, requestId: error.requestId }
    });
  }

  const message = error instanceof Error ? error.message : "unknown failure";
  const byMessage = classifyMessage(message, context, undefined);
  if (byMessage) return byMessage;
  return new PlatformError("UPSTREAM_ERROR", `TikTok call failed during ${context}: ${message}`, {
    retryable: true,
    cause: error
  });
}

/** The envelope every TikTok response carries. */
export interface TikTokEnvelope {
  readonly code?: number;
  readonly message?: string;
  readonly request_id?: string;
}

/**
 * TikTok returns HTTP 200 with a non-zero `code` on application errors. Left unmapped these would
 * read as empty successful responses, so every response passes through here.
 */
export function assertSuccess(body: TikTokEnvelope | undefined, context: string): void {
  const code = body?.code;
  if (code === undefined || code === 0) return;
  throw classifyCode(code, body?.message ?? `code ${code}`, context, body?.request_id);
}
