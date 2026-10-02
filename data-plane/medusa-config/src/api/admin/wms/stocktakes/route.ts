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

interface WmsStocktakeReadService {
  listStocktakes(
    filters: Record<string, unknown>
  ): Promise<
    {
      id: string;
      warehouse_id: string;
      bin_id: string;
      sku: string;
      system_quantity: number;
      counted_quantity: number | null;
      variance: number | null;
      status: string;
      counted_by: string | null;
      applied_at: Date | null;
    }[]
  >;
}

/**
 * The stocktakes of this tenant, open and applied.
 *
 * The variance is on the row rather than recomputed here, because the whole point of recording
 * `system_quantity` when the count was opened is that the variance means something afterwards: a
 * count taken at 09:00 and read at 17:00 must still show the 09:00 baseline, not a difference
 * against whatever has sold since (docs/adr/0018).
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsStocktakeReadService>("wms");
  const warehouseId = req.query.warehouseId as string | undefined;
  const status = req.query.status as string | undefined;

  const filters: Record<string, unknown> = {};
  if (warehouseId) filters.warehouse_id = warehouseId;
  if (status) filters.status = status;

  const stocktakes = await wms.listStocktakes(filters);

  res.status(200).json({
    stocktakes: stocktakes.map((stocktake) => ({
      id: stocktake.id,
      warehouseId: stocktake.warehouse_id,
      binId: stocktake.bin_id,
      sku: stocktake.sku,
      systemQuantity: stocktake.system_quantity,
      countedQuantity: stocktake.counted_quantity,
      variance: stocktake.variance,
      status: stocktake.status,
      countedBy: stocktake.counted_by,
      appliedAt: stocktake.applied_at
    }))
  });
};
