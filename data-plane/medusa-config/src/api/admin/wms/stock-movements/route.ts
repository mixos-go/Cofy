import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

interface WmsMovementService {
  listStockMovements(
    filters: Record<string, unknown>
  ): Promise<
    {
      id: string;
      warehouse_id: string;
      bin_id: string;
      sku: string;
      kind: string;
      delta: number;
      quantity_before: number;
      quantity_after: number;
      reason: string | null;
      actor: string | null;
      created_at: Date;
    }[]
  >;
}

/**
 * The movement ledger for one bin, newest last.
 *
 * This is what makes a stocktake variance auditable from a screen rather than only from the
 * database: the `stocktake` movement's `reason` carries the counted number and the two quantities
 * either side of it, so "who changed this, from what, and why" is answerable. The rows are
 * append-only and this route only reads them (docs/adr/0018).
 *
 * `binId` is required: the ledger is not meant to be dumped whole, and a per-bin read is the shape
 * the bin-contents screen needs.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsMovementService>("wms");
  const binId = req.query.binId as string | undefined;
  const sku = req.query.sku as string | undefined;

  const filters: Record<string, unknown> = {};
  if (binId) filters.bin_id = binId;
  if (sku) filters.sku = sku;

  const movements = await wms.listStockMovements(filters);

  res.status(200).json({
    movements: movements.map((movement) => ({
      id: movement.id,
      warehouseId: movement.warehouse_id,
      binId: movement.bin_id,
      sku: movement.sku,
      kind: movement.kind,
      delta: movement.delta,
      quantityBefore: movement.quantity_before,
      quantityAfter: movement.quantity_after,
      reason: movement.reason,
      actor: movement.actor,
      createdAt: movement.created_at
    }))
  });
};
