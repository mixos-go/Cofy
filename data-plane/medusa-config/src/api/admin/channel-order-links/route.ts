import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
  }): Promise<{ data: { id: string; order?: { id: string } | null }[] }>;
}

/**
 * Look up the Medusa order an external order became (ADR 0010 point 3).
 *
 * The worker's `findOrderByExternalRef` uses this for compensation and for a resumed import: it is
 * how a run that crashed after the Medusa write learns whether the create actually landed, without
 * trusting the worker's own memory.
 *
 * The order id comes through the module link, not from a column on `channel_order_link` (Medusa v2
 * forbids a custom module adding a column to core `order`, AGENTS.md §2.2). The link's field alias
 * on the `channel_order_link` side is `order`, so the query graph resolves it in one read.
 *
 * A link whose order is gone (dismissed or deleted) reports `orderId: null`, which the worker reads
 * as "no order", exactly like a never-imported external ref.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
  const { channel, externalOrderId } = req.validatedQuery as unknown as {
    channel: string;
    externalOrderId: string;
  };

  const { data } = await query.graph({
    entity: "channel_order_link",
    fields: ["id", "order.id"],
    filters: { channel, external_order_id: externalOrderId }
  });

  const orderId = data[0]?.order?.id ?? null;
  res.status(200).json({ orderId });
};
