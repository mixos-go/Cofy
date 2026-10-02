import { putAwayWorkflow } from "../../../../workflows/put-away.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { PutAwayBody } from "../validators.ts";

/**
 * Put a received delivery away: staging bin to storage bin.
 *
 * The direction is asserted by the workflow (staging to storage only), so a caller cannot hide
 * sellable stock in staging or push it into a packing bin. No inventory level moves: the units were
 * counted at the warehouse's location when they were received (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as PutAwayBody;

  const { result } = await putAwayWorkflow(req.scope).run({
    input: {
      warehouseId: body.warehouseId,
      fromBinId: body.fromBinId,
      toBinId: body.toBinId,
      sku: body.sku,
      quantity: body.quantity,
      actor: body.actor ?? null
    }
  });

  res.status(200).json({ putAway: result });
};
