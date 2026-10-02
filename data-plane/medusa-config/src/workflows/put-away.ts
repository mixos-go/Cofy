import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

import { relocateBetweenBinsStep } from "../steps/wms-movements.ts";

/**
 * Put away a received delivery: move units from the staging bin to their storage bin.
 *
 * This is the second half of the inbound flow. Receipt raised the Medusa level and put the units in
 * staging; put-away relocates them to where they are picked from. No inventory level moves, because
 * the units were already counted at the warehouse's location when they were received (docs/adr/0018).
 *
 * The bin kinds are asserted, not assumed: staging to storage is the only legal direction. Moving
 * storage to staging would hide sellable stock in a bin picks never read, and moving into a packing
 * bin would put stock in a place that is emptied when an order ships.
 */

interface WmsBinService {
  listBins(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; kind: string }[]>;
}

export interface PutAwayInput {
  readonly warehouseId: string;
  readonly fromBinId: string;
  readonly toBinId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly actor?: string | null;
}

export const putAwayWorkflowId = "wms-put-away";

const validatePutAwayStep = createStep(
  "validate-wms-put-away",
  async (input: PutAwayInput, { container }) => {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Put-away quantity must be a positive whole number, received ${input.quantity}.`
      );
    }

    const wms = container.resolve<WmsBinService>("wms");
    const bins = await wms.listBins({ id: [input.fromBinId, input.toBinId] });
    const from = bins.find((bin) => bin.id === input.fromBinId);
    const to = bins.find((bin) => bin.id === input.toBinId);

    if (!from || !to) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "The put-away source or destination bin was not found.");
    }
    if (from.warehouse_id !== input.warehouseId || to.warehouse_id !== input.warehouseId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Both bins must belong to the warehouse being put away into."
      );
    }
    if (from.kind !== "staging") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Put-away takes units from a staging bin; bin ${from.id} is a ${from.kind} bin.`
      );
    }
    if (to.kind !== "storage") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Put-away puts units into a storage bin; bin ${to.id} is a ${to.kind} bin.`
      );
    }

    return new StepResponse(input);
  }
);

export const putAwayWorkflow = createWorkflow(putAwayWorkflowId, (input: PutAwayInput) => {
  const validated = validatePutAwayStep(input);

  const relocation = transform({ validated }, ({ validated }) => ({
    warehouseId: validated.warehouseId,
    fromBinId: validated.fromBinId,
    toBinId: validated.toBinId,
    sku: validated.sku,
    quantity: validated.quantity,
    kind: "put_away",
    reason: `put-away ${validated.quantity} of ${validated.sku}`,
    actor: validated.actor ?? null
  }));
  const moved = relocateBetweenBinsStep(relocation);

  return new WorkflowResponse(
    transform({ validated, moved }, ({ validated, moved }) => ({
      warehouseId: validated.warehouseId,
      fromBinId: validated.fromBinId,
      toBinId: validated.toBinId,
      sku: validated.sku,
      quantity: validated.quantity,
      fromMovementId: moved.fromMovementId,
      toMovementId: moved.toMovementId
    }))
  );
});
