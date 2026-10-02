import { adjustInventoryLevelsStep } from "@medusajs/medusa/core-flows";
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

import { resolveInventoryItemsStep } from "../steps/wms-inventory.ts";

/**
 * Apply a stocktake: turn a physical count into an auditable adjustment.
 *
 * The M6 exit criterion is that a variance "produces an auditable adjustment, never a silent
 * overwrite", and this workflow is where that is true or false. Three things make it true:
 *
 *   1. the count is recorded against what the ledger said at the time (`system_quantity`), so the
 *      variance is explainable afterwards rather than inferred;
 *   2. the correction is applied as a **signed delta** movement of kind `stocktake`, with the
 *      counted number in the reason — not as an assignment of a new quantity;
 *   3. the same delta is applied to the Medusa inventory level, so the engine and the ledger agree
 *      after the count instead of drifting until reconciliation notices.
 *
 * The count is opened before it is submitted so `system_quantity` is a real reading and not a value
 * chosen after the fact. Applying an already-applied count is refused: a second application would
 * double the correction, and the row already says what was done.
 *
 * Nothing here writes a core table (AGENTS.md §2.2, docs/adr/0018).
 */

interface WmsStocktakeService {
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string; stock_location_id: string | null }[]>;
  listBins(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; kind: string }[]>;
  quantityAtBin(binId: string, sku: string): Promise<number>;
  createStocktakes(input: Record<string, unknown>): Promise<{ id: string }>;
  listStocktakes(filters: Record<string, unknown>): Promise<{
    id: string;
    warehouse_id: string;
    bin_id: string;
    sku: string;
    system_quantity: number;
    counted_quantity: number | null;
    status: string;
  }[]>;
  updateStocktakes(input: Record<string, unknown>): Promise<unknown>;
  recordMovement(input: {
    warehouseId: string;
    binId: string;
    sku: string;
    kind: string;
    delta: number;
    reason?: string | null;
    actor?: string | null;
  }): Promise<{ id: string; quantity_before: number; quantity_after: number }>;
}

export interface OpenStocktakeInput {
  readonly warehouseId: string;
  readonly binId: string;
  readonly sku: string;
}

export const openStocktakeWorkflowId = "wms-open-stocktake";

/**
 * Opens a count, freezing what the ledger says right now as `system_quantity`.
 *
 * Reading the quantity here rather than at submit time is the whole point: a count taken at 09:00
 * and submitted at 17:00 must be measured against 09:00, or a sale in between would be recorded as
 * a counting error.
 */
const openStocktakeStep = createStep(
  "open-wms-stocktake",
  async (input: OpenStocktakeInput, { container }) => {
    const wms = container.resolve<WmsStocktakeService>("wms");

    const [warehouse] = await wms.listWarehouses({ id: input.warehouseId });
    if (!warehouse) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Warehouse ${input.warehouseId} was not found.`);
    }
    const [bin] = await wms.listBins({ id: input.binId });
    if (!bin || bin.warehouse_id !== input.warehouseId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Bin ${input.binId} was not found in warehouse ${input.warehouseId}.`
      );
    }

    const systemQuantity = await wms.quantityAtBin(bin.id, input.sku);
    const stocktake = await wms.createStocktakes({
      warehouse_id: input.warehouseId,
      bin_id: bin.id,
      sku: input.sku,
      system_quantity: systemQuantity,
      status: "open"
    });

    return new StepResponse(
      { stocktakeId: stocktake.id, systemQuantity },
      { stocktakeId: stocktake.id }
    );
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsStocktakeService>("wms");
    await wms.updateStocktakes({ id: compensation.stocktakeId, status: "canceled" });
  }
);

export const openStocktakeWorkflow = createWorkflow(openStocktakeWorkflowId, (input: OpenStocktakeInput) => {
  const opened = openStocktakeStep(input);
  return new WorkflowResponse(
    transform({ opened }, ({ opened }) => ({
      stocktakeId: opened.stocktakeId,
      systemQuantity: opened.systemQuantity
    }))
  );
});

export interface ApplyStocktakeInput {
  readonly stocktakeId: string;
  readonly countedQuantity: number;
  readonly countedBy?: string | null;
}

export const applyStocktakeWorkflowId = "wms-apply-stocktake";

const resolveVarianceStep = createStep(
  "resolve-wms-stocktake-variance",
  async (input: ApplyStocktakeInput, { container }) => {
    const wms = container.resolve<WmsStocktakeService>("wms");

    const [stocktake] = await wms.listStocktakes({ id: input.stocktakeId });
    if (!stocktake) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Stocktake ${input.stocktakeId} was not found.`);
    }
    if (stocktake.status !== "open") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Stocktake ${input.stocktakeId} is ${stocktake.status} and cannot be applied again.`
      );
    }
    if (!Number.isInteger(input.countedQuantity) || input.countedQuantity < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A counted quantity must be a whole number of zero or more, received ${input.countedQuantity}.`
      );
    }

    const [warehouse] = await wms.listWarehouses({ id: stocktake.warehouse_id });
    if (!warehouse?.stock_location_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Warehouse ${stocktake.warehouse_id} has no stock location, so the variance has nowhere to land.`
      );
    }

    const variance = input.countedQuantity - stocktake.system_quantity;
    return new StepResponse({
      stocktakeId: stocktake.id,
      warehouseId: stocktake.warehouse_id,
      binId: stocktake.bin_id,
      sku: stocktake.sku,
      systemQuantity: stocktake.system_quantity,
      countedQuantity: input.countedQuantity,
      variance,
      locationId: warehouse.stock_location_id,
      countedBy: input.countedBy ?? null
    });
  }
);

/**
 * Records the counted number and the variance on the stocktake row.
 *
 * Written before the movement so the row explains the movement that follows, and compensated back to
 * `open` if the movement or the engine adjustment fails.
 */
const recordVarianceStep = createStep(
  "record-wms-stocktake-variance",
  async (
    input: {
      readonly stocktakeId: string;
      readonly countedQuantity: number;
      readonly variance: number;
      readonly countedBy: string | null;
    },
    { container }
  ) => {
    const wms = container.resolve<WmsStocktakeService>("wms");
    await wms.updateStocktakes({
      id: input.stocktakeId,
      counted_quantity: input.countedQuantity,
      variance: input.variance,
      counted_by: input.countedBy
    });
    return new StepResponse({ recorded: true }, { stocktakeId: input.stocktakeId });
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsStocktakeService>("wms");
    await wms.updateStocktakes({
      id: compensation.stocktakeId,
      counted_quantity: null,
      variance: null,
      counted_by: null
    });
  }
);

/**
 * Applies the variance to the bin as a `stocktake` movement.
 *
 * The reason carries the counted number, which is what makes the correction readable a year later:
 * "-3 because a stocktake counted 7 where the system held 10". A zero variance still writes a row,
 * because "we counted and it matched" is a fact worth having, and it is what distinguishes a counted
 * bin from one nobody has looked at.
 */
const applyVarianceMovementStep = createStep(
  "apply-wms-stocktake-movement",
  async (
    input: {
      readonly warehouseId: string;
      readonly binId: string;
      readonly sku: string;
      readonly systemQuantity: number;
      readonly countedQuantity: number;
      readonly variance: number;
      readonly countedBy: string | null;
    },
    { container }
  ) => {
    const wms = container.resolve<WmsStocktakeService>("wms");
    const movement = await wms.recordMovement({
      warehouseId: input.warehouseId,
      binId: input.binId,
      sku: input.sku,
      kind: "stocktake",
      delta: input.variance,
      reason: `counted ${input.countedQuantity} against ${input.systemQuantity}`,
      actor: input.countedBy
    });
    return new StepResponse(movement, input);
  },
  async (compensation, { container }) => {
    if (!compensation || compensation.variance === 0) return;
    const wms = container.resolve<WmsStocktakeService>("wms");
    await wms.recordMovement({
      warehouseId: compensation.warehouseId,
      binId: compensation.binId,
      sku: compensation.sku,
      kind: "adjustment",
      delta: -compensation.variance,
      reason: "rollback:apply-stocktake"
    });
  }
);

const markAppliedStep = createStep(
  "mark-wms-stocktake-applied",
  async (input: { stocktakeId: string }, { container }) => {
    const wms = container.resolve<WmsStocktakeService>("wms");
    await wms.updateStocktakes({ id: input.stocktakeId, status: "applied", applied_at: new Date() });
    return new StepResponse({ applied: true });
  }
);

export const applyStocktakeWorkflow = createWorkflow(applyStocktakeWorkflowId, (input: ApplyStocktakeInput) => {
  const variance = resolveVarianceStep(input);

  const recorded = recordVarianceStep(
    transform({ variance }, ({ variance }) => ({
      stocktakeId: variance.stocktakeId,
      countedQuantity: variance.countedQuantity,
      variance: variance.variance,
      countedBy: variance.countedBy
    }))
  );

  const movement = applyVarianceMovementStep(
    transform({ variance }, ({ variance }) => ({
      warehouseId: variance.warehouseId,
      binId: variance.binId,
      sku: variance.sku,
      systemQuantity: variance.systemQuantity,
      countedQuantity: variance.countedQuantity,
      variance: variance.variance,
      countedBy: variance.countedBy
    }))
  );

  // The same delta against the engine's level, so availability matches the shelf after the count.
  // `resolveInventoryItemsStep` runs after the movement so a bad SKU fails the count before the
  // engine is touched, and its own compensation removes a level it had to create.
  const skus = transform({ variance }, ({ variance }) => [variance.sku]);
  const locationId = transform({ variance }, ({ variance }) => variance.locationId);
  const inventory = resolveInventoryItemsStep({ skus, locationId });

  const adjustments = transform({ variance, inventory }, ({ variance, inventory }) =>
    inventory.items.map((item) => ({
      inventory_item_id: item.inventoryItemId,
      location_id: item.locationId,
      adjustment: variance.variance
    }))
  );
  adjustInventoryLevelsStep(adjustments);

  const applied = markAppliedStep(
    transform({ variance }, ({ variance }) => ({ stocktakeId: variance.stocktakeId }))
  );

  return new WorkflowResponse(
    transform({ variance, movement, recorded, applied }, ({ variance, movement }) => ({
      stocktakeId: variance.stocktakeId,
      warehouseId: variance.warehouseId,
      sku: variance.sku,
      binId: variance.binId,
      systemQuantity: variance.systemQuantity,
      countedQuantity: variance.countedQuantity,
      variance: variance.variance,
      quantityAfter: movement.quantity_after
    }))
  );
});
