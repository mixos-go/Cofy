/**
 * Internal event names.
 *
 * These are published on the queue and consumed by other layers. Renaming or removing a member
 * is a breaking change across apps and requires an ADR (AGENTS.md §8).
 */
export const PLATFORM_EVENTS = {
  /** A marketplace order was imported into a tenant's data plane. */
  ORDER_IMPORTED: "order.imported",
  /** An order import failed and needs reconciliation attention. */
  ORDER_IMPORT_FAILED: "order.import_failed",
  /** Inventory changed and channels should be updated. */
  STOCK_CHANGED: "stock.changed",
  /** A stock push to a channel failed after exhausting retries. */
  STOCK_PUSH_FAILED: "stock.push_failed",
  /** A channel credential was revoked by the seller or by the marketplace. */
  CHANNEL_DISCONNECTED: "channel.disconnected",
  /** A tenant finished provisioning and is ready to serve. */
  TENANT_PROVISIONED: "tenant.provisioned",
  /** A tenant was terminated and its data is scheduled for deletion. */
  TENANT_TERMINATED: "tenant.terminated"
} as const;

export type PlatformEventName = (typeof PLATFORM_EVENTS)[keyof typeof PLATFORM_EVENTS];
