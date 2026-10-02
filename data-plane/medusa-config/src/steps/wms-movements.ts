import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

/**
 * Moves units between two bins in one warehouse, as two ledger movements.
 *
 * Put-away (staging to storage) and picking (storage to packing) are both a relocation, and both
 * deliberately touch **no** Medusa inventory level: the units were already counted at the
 * warehouse's stock location when they were received, so changing the level here would make the
 * total drift by the moved quantity (docs/adr/0018). The pair of movements keeps every bin's derived
 * quantity correct, and the sum across bins is unchanged, which is exactly what a relocation is.
 *
 * The outbound movement is written first, so the ledger's own negative-quantity guard rejects moving
 * units a bin does not hold before any inbound row exists to compensate.
 */
export interface RelocateInput {
  readonly warehouseId: string;
  readonly fromBinId: string;
  readonly toBinId: string;
  readonly sku: string;
  readonly quantity: number;
  readonly kind: string;
  readonly reason?: string | null;
  readonly actor?: string | null;
}

interface WmsMovementService {
  recordMovement(input: {
    warehouseId: string;
    binId: string;
    sku: string;
    kind: string;
    delta: number;
    reason?: string | null;
    actor?: string | null;
  }): Promise<{ id: string; delta: number }>;
}

export const relocateBetweenBinsStepId = "relocate-wms-between-bins";

export const relocateBetweenBinsStep = createStep(
  relocateBetweenBinsStepId,
  async (input: RelocateInput, { container }) => {
    const wms = container.resolve<WmsMovementService>("wms");

    const out = await wms.recordMovement({
      warehouseId: input.warehouseId,
      binId: input.fromBinId,
      sku: input.sku,
      kind: input.kind,
      delta: -input.quantity,
      reason: input.reason ?? null,
      actor: input.actor ?? null
    });
    const into = await wms.recordMovement({
      warehouseId: input.warehouseId,
      binId: input.toBinId,
      sku: input.sku,
      kind: input.kind,
      delta: input.quantity,
      reason: input.reason ?? null,
      actor: input.actor ?? null
    });

    return new StepResponse({ fromMovementId: out.id, toMovementId: into.id }, input);
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsMovementService>("wms");
    // Undo by appending the mirror pair, never by deleting: the ledger is append-only.
    await wms.recordMovement({
      warehouseId: compensation.warehouseId,
      binId: compensation.toBinId,
      sku: compensation.sku,
      kind: "adjustment",
      delta: -compensation.quantity,
      reason: "rollback:relocate"
    });
    await wms.recordMovement({
      warehouseId: compensation.warehouseId,
      binId: compensation.fromBinId,
      sku: compensation.sku,
      kind: "adjustment",
      delta: compensation.quantity,
      reason: "rollback:relocate"
    });
  }
);
