import { receivePurchaseOrderWorkflow } from "../../../../../../workflows/receive-purchase-order.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { ReceivePurchaseOrderBody } from "../../../validators.ts";

/**
 * Receive a delivery against a purchase order.
 *
 * This is the M6 exit criterion's entry point: the workflow posts the units into the warehouse's
 * staging bin and raises the Medusa inventory level at the warehouse's stock location in one
 * transaction, so a received PO increases available stock at a specific bin. The over-receipt and
 * warehouse checks live in the workflow, where the PO's own lines are readable.
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as ReceivePurchaseOrderBody;
  const purchaseOrderId = req.params.id;
  if (!purchaseOrderId) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "A purchase order id is required in the path.");
  }

  const { result } = await receivePurchaseOrderWorkflow(req.scope).run({
    input: {
      purchaseOrderId,
      lines: body.lines.map((line) => ({ sku: line.sku, quantity: line.quantity })),
      actor: body.actor ?? null
    }
  });

  res.status(200).json({ receipt: result });
};
