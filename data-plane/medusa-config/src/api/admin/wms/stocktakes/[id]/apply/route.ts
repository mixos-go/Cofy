import { applyStocktakeWorkflow } from "../../../../../../workflows/stocktake.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { ApplyStocktakeBody } from "../../../validators.ts";

/**
 * Apply a stocktake: record the counted number and correct the shelf.
 *
 * The correction is a signed `stocktake` movement whose reason carries the counted number, plus the
 * same delta against the Medusa inventory level — an auditable adjustment, never a silent overwrite.
 * Applying a count twice is refused, because the row already says what was done (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as ApplyStocktakeBody;
  const stocktakeId = req.params.id;
  if (!stocktakeId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A stocktake id is required in the path.");
  }

  const { result } = await applyStocktakeWorkflow(req.scope).run({
    input: {
      stocktakeId,
      countedQuantity: body.countedQuantity,
      countedBy: body.countedBy ?? null
    }
  });

  res.status(200).json({ stocktake: result });
};
