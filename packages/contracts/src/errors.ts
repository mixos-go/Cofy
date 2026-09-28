/**
 * Error taxonomy.
 *
 * Predictable failures use these types rather than bare `Error` (AGENTS.md §5) so that retry
 * policy and HTTP status can be derived mechanically instead of guessed at each call site.
 */

export type PlatformErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_FAILED"
  | "TENANT_NOT_FOUND"
  | "TENANT_NOT_ACTIVE"
  | "TENANT_STATE_INVALID"
  | "PROVISIONING_FAILED"
  | "CHANNEL_DISCONNECTED"
  | "CHANNEL_RATE_LIMITED"
  | "CHANNEL_UNAVAILABLE"
  | "CREDENTIAL_EXPIRED"
  | "IDEMPOTENCY_CONFLICT"
  | "UPSTREAM_ERROR";

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  /** True when retrying the same operation may succeed without any change to input. */
  readonly retryable: boolean;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: PlatformErrorCode,
    message: string,
    options: { retryable?: boolean; details?: Record<string, unknown>; cause?: unknown } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "PlatformError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.details = options.details ?? {};
  }
}

/**
 * Raised when a channel tells us to slow down. The connector reports it; the shared governor in
 * the integration plane decides when to reschedule (AGENTS.md §4).
 */
export class RateLimitedError extends PlatformError {
  /** Seconds to wait before retrying, as instructed by the channel, when it told us. */
  readonly retryAfterSeconds: number | null;

  constructor(message: string, retryAfterSeconds: number | null = null, details?: Record<string, unknown>) {
    super("CHANNEL_RATE_LIMITED", message, { retryable: true, details });
    this.name = "RateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Codes that are worth retrying even when the HTTP status alone would not say so.
 *
 * The worker rebuilds an error from an HTTP response where it can only see a status code, and a
 * status is not enough: the shared governor answers a throttled call with `429` and
 * `CHANNEL_RATE_LIMITED`, which is retryable even though 429 is not a 5xx. Consulting the code
 * keeps that decision intact across the service boundary. Codes that already arrive as a 5xx do not
 * belong here — the status is trusted for those.
 */
const RETRYABLE_CODES: ReadonlySet<PlatformErrorCode> = new Set(["CHANNEL_RATE_LIMITED"]);

/**
 * Retryability for a code observed only as an HTTP status.
 *
 * `status >= 500` is the baseline the rest of the stack already uses; this adds the codes whose
 * retryability a status understates.
 */
export function isRetryable(status: number, code: PlatformErrorCode): boolean {
  return status >= 500 || RETRYABLE_CODES.has(code);
}

/** HTTP status for a platform error, so every route maps failures the same way. */
export function httpStatusFor(code: PlatformErrorCode): number {
  switch (code) {
    case "UNAUTHENTICATED":
    case "CREDENTIAL_EXPIRED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
    case "TENANT_NOT_FOUND":
      return 404;
    case "CONFLICT":
    case "IDEMPOTENCY_CONFLICT":
    case "TENANT_STATE_INVALID":
      return 409;
    case "VALIDATION_FAILED":
      return 422;
    case "TENANT_NOT_ACTIVE":
    case "PROVISIONING_FAILED":
      return 503;
    case "CHANNEL_RATE_LIMITED":
      return 429;
    case "CHANNEL_DISCONNECTED":
    case "CHANNEL_UNAVAILABLE":
    case "UPSTREAM_ERROR":
      return 502;
  }
}
