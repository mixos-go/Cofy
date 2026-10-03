import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { advanceShipmentWorkflow } from "../../../../../workflows/advance-shipment.ts";
import type { AdvanceShipmentBody } from "../../../validators.ts";

/**
 * Advance a shipment's recorded delivery status (M7, docs/adr/0021).
 *
 * The delivery-status pull path's write. It carries the status the pass already decided is the
 * newest among the channel's or courier's events, plus the normalised events themselves, so the
 * seller UI can show a timeline. The pass owns the decision — which event is newest, and whether it
 * is an advance — because that needs the normalised contract; the engine only records it.
 *
 * **The fulfillment id is the whole address.** It is a Medusa id that resolves only inside this
 * tenant's schema, so a caller cannot advance another tenant's shipment by naming it. A missing
 * fulfillment is the engine's own 404.
 *
 * **Idempotent on the status.** A re-read that found nothing new sends the same status and the
 * workflow writes nothing, so a retried pass does not append a duplicate event.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdvanceShipmentBody>,
  res: MedusaResponse
): Promise<void> => {
  const body = req.validatedBody;
  const fulfillmentId = req.params.fulfillmentId;
  if (!fulfillmentId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A shipment status advance must name the fulfillment it advances."
    );
  }

  const { result } = await advanceShipmentWorkflow(req.scope).run({
    input: {
      fulfillmentId,
      status: body.status,
      events: body.events
    }
  });

  res.status(200).json(result);
};
