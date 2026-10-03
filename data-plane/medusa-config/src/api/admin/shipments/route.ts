import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { recordShipmentWorkflow } from "../../../workflows/record-shipment.ts";
import type { RecordShipmentBody } from "../validators.ts";

/**
 * Record a booked courier shipment against one of this tenant's orders (M7, docs/adr/0020).
 *
 * The tenant-side implementation of the worker's `commerce.recordShipment` (ADR 0010: commerce
 * writes go through the tenant's Medusa; sync state stays in the control plane). The courier call
 * has already happened in the integration plane, so this route only has to make the engine's own
 * records agree that the order shipped: the fulfillment that consumes the reservation, and the
 * shipment that carries the waybill.
 *
 * **The tenant is the instance.** `orderId` is in the body, but it is a Medusa id that resolves
 * only inside this instance's schema, so a caller cannot address another tenant's order by naming
 * it. A missing order is the engine's own 404.
 *
 * **Idempotent on the waybill.** The workflow refuses to create a second fulfillment for the same
 * order and tracking number, so a retried worker converges on the first record. The transaction
 * identity the order-import route uses is not set here: the guard that actually stops a duplicate
 * is the waybill match inside the workflow, which is durable in the tenant's own tables.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<RecordShipmentBody>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody;

  if (!body.orderId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A shipment must name the order it fulfills."
    );
  }

  const { result } = await recordShipmentWorkflow(req.scope).run({
    input: {
      orderId: body.orderId,
      items: body.items.map((item) => ({ sku: item.sku, quantity: item.quantity })),
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl,
      locationId: body.locationId ?? null,
      shippingOptionId: body.shippingOptionId ?? null,
      courier: body.courier,
      serviceLevel: body.serviceLevel
    }
  });

  res.status(200).json({
    fulfillmentId: result.fulfillmentId,
    trackingNumber: result.trackingNumber
  });
};
