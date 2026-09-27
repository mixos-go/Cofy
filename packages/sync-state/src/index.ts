/**
 * Platform-owned channel sync state (docs/adr/0010).
 *
 * A shared package rather than control-plane-internal code, because the worker and the control
 * plane's registry HTTP API both need the same operations and must not drift. It holds no commerce
 * data and never reaches a tenant database.
 */

export * from "./store.ts";
