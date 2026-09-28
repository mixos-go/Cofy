import { deleteReservationsByLineItemsWorkflow } from "@medusajs/medusa/core-flows";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
  }): Promise<{ data: { id: string; items?: { id: string }[] }[] }>;
}

/**
 * Release the inventory reservations an order holds (M3 compensation).
 *
 * The worker calls this when a Medusa order was created but the import could not be committed
 * (`releaseOrder` in `apps/services/worker/src/ports.ts`). Releasing means deleting the reservations
 * the order's line items hold, which returns the units to available stock. It deliberately does
 * **not** cancel or delete the order: cancellation is a business action with its own refund
 * semantics, and compensation only needs the stock back. The worker's own ref, marked failed, is
 * what tells reconciliation the attempt did not complete.
 *
 * Idempotent by construction: deleting the reservations of an order that holds none is a no-op, so a
 * retried compensation does not fail.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const orderId = req.params.id;
  const query = req.scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);

  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "items.id"],
    filters: { id: orderId }
  });

  const order = data[0];
  if (!order) {
    // The worker treats a 404 as "nothing to release", which is correct for a compensation that
    // races a rolled-back create.
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found.`);
  }

  const lineItemIds = (order.items ?? []).map((item) => item.id);
  if (lineItemIds.length > 0) {
    await deleteReservationsByLineItemsWorkflow(req.scope).run({ input: { ids: lineItemIds } });
  }

  res.status(200).json({ orderId, released: lineItemIds.length });
};
