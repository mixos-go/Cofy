import { createPickTaskWorkflow } from "../../../../workflows/pick-task.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { CreatePickTaskBody } from "../validators.ts";

/**
 * Create a pick task for one order.
 *
 * The workflow resolves each line's expected barcode and the storage bin that holds the units, so a
 * task is never created for stock that is not there — the failure is at creation, not at the shelf.
 * There is no wave or batch optimisation, per the milestone's non-goals: one task is one order.
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as CreatePickTaskBody;

  const { result } = await createPickTaskWorkflow(req.scope).run({
    input: {
      warehouseId: body.warehouseId,
      orderId: body.orderId,
      packingBinId: body.packingBinId,
      lines: body.lines.map((line) => ({ sku: line.sku, quantity: line.quantity }))
    }
  });

  res.status(201).json({ pickTask: result });
};
