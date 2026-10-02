import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { CreateBinBody } from "../validators.ts";

interface WmsBinService {
  createBins(input: Record<string, unknown>): Promise<{ id: string }>;
  listBins(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; code: string; kind: string }[]>;
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string }[]>;
}

/**
 * The bins of a warehouse, and creating one.
 *
 * The warehouse is checked to exist first, because a bin pointing at a warehouse that is not there
 * would be unreachable from every screen and every workflow. The bin kind is validated by the
 * request schema, so the module's own check is the second line of defence (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsBinService>("wms");
  const body = req.validatedBody as unknown as CreateBinBody;

  const [warehouse] = await wms.listWarehouses({ id: body.warehouseId });
  if (!warehouse) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Warehouse ${body.warehouseId} was not found.`);
  }

  const bin = await wms.createBins({
    warehouse_id: warehouse.id,
    code: body.code,
    kind: body.kind
  });

  res.status(201).json({ bin: { id: bin.id, warehouseId: warehouse.id, code: body.code, kind: body.kind } });
};

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsBinService>("wms");
  const warehouseId = req.query.warehouseId as string | undefined;
  const bins = await wms.listBins(warehouseId ? { warehouse_id: warehouseId } : {});

  res.status(200).json({
    bins: bins.map((bin) => ({ id: bin.id, warehouseId: bin.warehouse_id, code: bin.code, kind: bin.kind }))
  });
};
