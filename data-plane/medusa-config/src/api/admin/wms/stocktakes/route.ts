import { openStocktakeWorkflow } from "../../../../workflows/stocktake.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { OpenStocktakeBody } from "../validators.ts";

/**
 * Open a stocktake on one bin and SKU.
 *
 * Opening freezes what the ledger says right now as `system_quantity`, which is what makes a count
 * taken in the morning and submitted in the afternoon measurable against the morning rather than
 * against whatever sales happened in between. Applying it is a separate call (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as OpenStocktakeBody;

  const { result } = await openStocktakeWorkflow(req.scope).run({
    input: { warehouseId: body.warehouseId, binId: body.binId, sku: body.sku }
  });

  res.status(201).json({ stocktake: result });
};
