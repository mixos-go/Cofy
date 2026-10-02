import { scanPickLineWorkflow } from "../../../../../../workflows/pick-task.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { ScanPickLineBody } from "../../../validators.ts";

/**
 * Scan one item while picking.
 *
 * The barcode is the gate: the workflow compares it to the task line's expected barcode and refuses
 * a mismatch before any unit moves, so a wrong-item scan is blocked rather than recorded. The task
 * id is the path, not the body, so a scan cannot be pointed at a different task than the one the
 * picker is holding (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as ScanPickLineBody;
  const pickTaskId = req.params.id;
  if (!pickTaskId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A pick task id is required in the path.");
  }

  const { result } = await scanPickLineWorkflow(req.scope).run({
    input: {
      pickTaskId,
      sku: body.sku,
      barcode: body.barcode,
      quantity: body.quantity,
      actor: body.actor ?? null
    }
  });

  res.status(200).json({ scan: result });
};
