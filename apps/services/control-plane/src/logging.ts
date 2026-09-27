/**
 * Structured logging, re-exported from the shared package.
 *
 * The implementation lives in `packages/observability` so every service logs the same shape
 * (services cannot import each other; AGENTS.md §3). This module keeps the existing
 * `createLogger` / `Logger` imports inside the control plane working, and is the seam if the
 * control plane ever needs control-plane-only log fields.
 */

export { LOG_LEVELS, createLogger, redact } from "@platform/observability";
export type { LogFields, LogLevel, Logger } from "@platform/observability";
