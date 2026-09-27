/**
 * Central rate-limit governor.
 *
 * A shared package rather than a service, because the worker, the integration plane and the
 * control plane all need to ask the same question ("may I call this channel now?") and a service
 * that answers it would sit on the hot path of every marketplace call.
 */

export * from "./governor.ts";
