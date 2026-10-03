import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * The tenant's active shipments, for the delivery-status pull path (M7, docs/adr/0021).
 *
 * "Active" means a fulfillment the engine has stamped shipped but not delivered, returned or
 * cancelled: those are the only shipments whose status can still change. The track pass reads this
 * page, asks the channel or courier, and writes advances back through `.../status`. A shipment that
 * is terminal is absent, so a delivered order is never polled again.
 *
 * The arrangement and the handle to ask (`external_order_id` for a channel-arranged shipment, the
 * courier code for a self-arranged one) live on the fulfillment's `metadata`, written by
 * `recordShipmentWorkflow`. Reading them from the query graph keeps the pass from keeping a second
 * shipment list in the platform, which would be state to drift.
 *
 * Nothing here is seller-projected. The control plane proxies seller reads and applies the
 * projection, so a field added here cannot reach a seller by default (ADR 0016).
 */

interface FulfillmentReadView {
  readonly id: string;
  readonly metadata?: Record<string, unknown> | null;
  readonly updated_at?: string;
  readonly order?: { readonly id: string } | null;
  readonly labels?: readonly { readonly tracking_number: string }[];
}

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  }): Promise<{ data: FulfillmentReadView[] }>;
}

/** Terminal statuses, mirrored as literals because a data-plane file may not import `@platform/*`. */
const TERMINAL_STATUSES = new Set(["delivered", "returned", "cancelled"]);

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
  const requestedLimit = Number((req.validatedQuery as { limit?: number }).limit ?? DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  // Filtering on the metadata's status in the database would need a JSON operator the query graph
  // does not expose portably, so terminal shipment statuses are filtered here. The page is bounded,
  // so this is a bounded in-memory filter, and `delivered_at` narrows the common case at the source.
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "metadata", "updated_at", "order.id", "labels.tracking_number"],
    filters: { delivered_at: null },
    pagination: { take: limit, order: { updated_at: "ASC" } }
  });

  const shipments = data
    .map((fulfillment) => {
      const metadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
      const arrangement = metadata.arrangement === "channel" ? "channel" : "courier";
      const status = typeof metadata.shipment_status === "string" ? metadata.shipment_status : "created";
      const channel = typeof metadata.channel === "string" ? metadata.channel : null;
      const externalOrderId =
        typeof metadata.external_order_id === "string" ? metadata.external_order_id : null;
      const courier = typeof metadata.courier === "string" ? metadata.courier : null;
      const trackingNumber = fulfillment.labels?.[0]?.tracking_number ?? null;
      const orderId = fulfillment.order?.id ?? null;

      // A shipment missing the handle the pass would ask (no channel order for a channel-arranged
      // one, no courier for a courier-arranged one) cannot be tracked; report it as inactive rather
      // than handing the pass a call it can only fail. The channel itself is required either way:
      // it routes the job and picks the connector, so a shipment without one is not addressable.
      const trackable =
        trackingNumber !== null &&
        orderId !== null &&
        channel !== null &&
        (arrangement === "channel" ? externalOrderId !== null : courier !== null);

      return { fulfillment, arrangement, status, channel, externalOrderId, courier, trackingNumber, orderId, trackable };
    })
    .filter((entry) => entry.trackable && !TERMINAL_STATUSES.has(entry.status))
    .map((entry) => ({
      fulfillmentId: entry.fulfillment.id,
      orderId: entry.orderId,
      trackingNumber: entry.trackingNumber,
      // The channel is on every shipment: a courier-arranged one still came from a channel, and the
      // pass needs it to route the job and to pick the connector (docs/adr/0021).
      channel: entry.channel,
      status: entry.status,
      updatedAt: entry.fulfillment.updated_at ?? new Date().toISOString(),
      ...(entry.arrangement === "channel"
        ? { arrangement: "channel", externalOrderId: entry.externalOrderId }
        : { arrangement: "courier", courier: entry.courier })
    }));

  res.status(200).json({ shipments });
};
