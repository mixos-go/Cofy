import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

interface WmsContentsService {
  listBins(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; code: string; kind: string }[]>;
  binContents(binId: string): Promise<{ sku: string; quantity: number }[]>;
}

/**
 * What a bin actually holds, derived from the movement ledger.
 *
 * The quantity is summed from the deltas that touched the bin, never read from a stored counter, so
 * this read cannot disagree with the writes that produced it (docs/adr/0018). A bin nobody has moved
 * anything into reports an empty list rather than a zero, which keeps "never used" distinguishable
 * from "counted to zero".
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsContentsService>("wms");
  const binId = req.params.id;

  const [bin] = await wms.listBins({ id: binId });
  if (!bin) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Bin ${binId} was not found.`);
  }

  const contents = await wms.binContents(bin.id);
  res.status(200).json({ binId: bin.id, code: bin.code, kind: bin.kind, contents });
};
