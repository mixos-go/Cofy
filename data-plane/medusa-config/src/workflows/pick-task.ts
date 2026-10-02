import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

import { relocateBetweenBinsStep } from "../steps/wms-movements.ts";

/**
 * Picking: create a task for one order, then complete it scan by scan.
 *
 * The M6 exit criterion is that completion "validates barcode scans and blocks wrong-item scans", so
 * the expected barcode is captured when the task is created and compared on every scan. A scan that
 * does not match is refused with both codes in the message — the picker sees what they scanned and
 * what the bin should hold — and the line is left untouched, so a wrong item is never silently
 * recorded as picked (docs/adr/0018).
 *
 * A pick relocates units from a storage bin into the task's packing bin and touches no inventory
 * level: the reservation taken at import already holds the units, and decrementing `stocked_quantity`
 * here would decrement them twice once fulfillment ships the order.
 *
 * There is no wave or batch optimisation, per the milestone's non-goals: a task is one order.
 */

interface WmsPickService {
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string; stock_location_id: string | null }[]>;
  listBins(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; code: string; kind: string }[]>;
  binContents(binId: string): Promise<{ sku: string; quantity: number }[]>;
  quantityAtBin(binId: string, sku: string): Promise<number>;
  createPickTasks(input: Record<string, unknown>): Promise<{ id: string }>;
  createPickTaskLines(input: Record<string, unknown>[]): Promise<{ id: string }[]>;
  listPickTasks(filters: Record<string, unknown>): Promise<{ id: string; warehouse_id: string; order_id: string; packing_bin_id: string | null; status: string }[]>;
  listPickTaskLines(filters: Record<string, unknown>): Promise<{
    id: string;
    pick_task_id: string;
    sku: string;
    quantity: number;
    bin_id: string | null;
    picked_bin_id: string | null;
    expected_barcode: string | null;
    scanned_barcode: string | null;
    picked_quantity: number;
  }[]>;
  updatePickTaskLines(input: Record<string, unknown>[]): Promise<unknown>;
  updatePickTasks(input: Record<string, unknown>): Promise<unknown>;
  refreshPickTaskStatus(pickTaskId: string): Promise<string>;
}

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  }): Promise<{ data: { id: string; sku: string | null; barcode: string | null }[] }>;
}

export interface CreatePickTaskInput {
  readonly warehouseId: string;
  readonly orderId: string;
  readonly packingBinId: string;
  readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
}

export const createPickTaskWorkflowId = "wms-create-pick-task";

/**
 * Resolves each line's expected barcode and the storage bin the units are picked from.
 *
 * The bin is chosen from the ledger, not configured: the storage bin that actually holds enough of
 * the SKU is the only correct source, and choosing one that does not would push the failure to scan
 * time when the picker is standing at the shelf. A SKU with no barcode on its variant still gets a
 * task; `expected_barcode` is null and the completion check then requires a scan that matches
 * nothing, which is the safe default rather than accepting any code.
 */
const resolvePickLinesStep = createStep(
  "resolve-wms-pick-lines",
  async (input: CreatePickTaskInput, { container }) => {
    const wms = container.resolve<WmsPickService>("wms");
    const query = container.resolve<QueryGraph>("query");

    const [warehouse] = await wms.listWarehouses({ id: input.warehouseId });
    if (!warehouse) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Warehouse ${input.warehouseId} was not found.`);
    }

    const bins = await wms.listBins({ warehouse_id: input.warehouseId });
    const packingBin = bins.find((bin) => bin.id === input.packingBinId);
    if (!packingBin) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Packing bin ${input.packingBinId} was not found in warehouse ${input.warehouseId}.`
      );
    }
    if (packingBin.kind !== "packing") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Pick task lines are collected into a packing bin; bin ${packingBin.id} is a ${packingBin.kind} bin.`
      );
    }
    const storageBins = bins.filter((bin) => bin.kind === "storage");

    const skus = [...new Set(input.lines.map((line) => line.sku))];
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "barcode"],
      filters: { sku: skus },
      pagination: { take: skus.length }
    });
    const barcodeBySku = new Map(
      variants.filter((variant) => variant.sku !== null).map((variant) => [variant.sku!, variant.barcode])
    );

    const contentsByBin = new Map<string, Map<string, number>>();
    for (const bin of storageBins) {
      const contents = await wms.binContents(bin.id);
      contentsByBin.set(bin.id, new Map(contents.map((entry) => [entry.sku, entry.quantity])));
    }

    const lines = input.lines.map((line) => {
      const sourceBin = storageBins.find((bin) => (contentsByBin.get(bin.id)?.get(line.sku) ?? 0) >= line.quantity);
      if (!sourceBin) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `No single storage bin holds ${line.quantity} of ${line.sku}; the pick cannot be sourced.`
        );
      }
      return {
        sku: line.sku,
        quantity: line.quantity,
        bin_id: sourceBin.id,
        expected_barcode: barcodeBySku.get(line.sku) ?? null
      };
    });

    return new StepResponse({
      warehouseId: input.warehouseId,
      orderId: input.orderId,
      packingBinId: packingBin.id,
      lines
    });
  }
);

const createPickTaskStep = createStep(
  "create-wms-pick-task",
  async (
    input: {
      readonly warehouseId: string;
      readonly orderId: string;
      readonly packingBinId: string;
      readonly lines: readonly { readonly sku: string; readonly quantity: number; readonly bin_id: string; readonly expected_barcode: string | null }[];
    },
    { container }
  ) => {
    const wms = container.resolve<WmsPickService>("wms");

    const task = await wms.createPickTasks({
      warehouse_id: input.warehouseId,
      order_id: input.orderId,
      packing_bin_id: input.packingBinId,
      status: "open"
    });
    const lines = await wms.createPickTaskLines(
      input.lines.map((line) => ({
        pick_task_id: task.id,
        sku: line.sku,
        quantity: line.quantity,
        bin_id: line.bin_id,
        expected_barcode: line.expected_barcode,
        picked_quantity: 0
      }))
    );

    return new StepResponse({ pickTaskId: task.id, lineIds: lines.map((line) => line.id) }, { pickTaskId: task.id });
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsPickService>("wms");
    await wms.updatePickTasks({ id: compensation.pickTaskId, status: "canceled" });
  }
);

export const createPickTaskWorkflow = createWorkflow(createPickTaskWorkflowId, (input: CreatePickTaskInput) => {
  const resolved = resolvePickLinesStep(input);
  const created = createPickTaskStep(resolved);

  return new WorkflowResponse(
    transform({ resolved, created }, ({ resolved, created }) => ({
      pickTaskId: created.pickTaskId,
      orderId: resolved.orderId,
      packingBinId: resolved.packingBinId,
      lines: resolved.lines.map((line) => ({
        sku: line.sku,
        quantity: line.quantity,
        binId: line.bin_id,
        expectedBarcode: line.expected_barcode
      }))
    }))
  );
});

export interface ScanPickLineInput {
  readonly pickTaskId: string;
  readonly sku: string;
  readonly barcode: string;
  readonly quantity: number;
  readonly actor?: string | null;
}

export const scanPickLineWorkflowId = "wms-scan-pick-line";

/**
 * Validates one scan against the task's expectation and, when it matches, moves the units.
 *
 * The barcode comparison is the gate the exit criterion names. It runs before anything moves, and a
 * mismatch throws with the scanned and expected codes, so a wrong-item scan is blocked and visible
 * rather than recorded. The remaining-quantity check is the second gate: scanning more than the task
 * asks for would move stock the order did not buy.
 */
const validatePickScanStep = createStep(
  "validate-wms-pick-scan",
  async (input: ScanPickLineInput, { container }) => {
    const wms = container.resolve<WmsPickService>("wms");

    const [task] = await wms.listPickTasks({ id: input.pickTaskId });
    if (!task) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Pick task ${input.pickTaskId} was not found.`);
    }
    if (task.status !== "open") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Pick task ${input.pickTaskId} is ${task.status} and cannot take more scans.`
      );
    }
    if (!task.packing_bin_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Pick task ${input.pickTaskId} has no packing bin to collect into.`
      );
    }

    const [line] = await wms.listPickTaskLines({ pick_task_id: input.pickTaskId, sku: input.sku });
    if (!line) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Pick task ${input.pickTaskId} has no line for SKU ${input.sku}.`
      );
    }
    if (!line.bin_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Line ${line.id} has no source bin to pick from.`
      );
    }
    if (line.expected_barcode === null || line.expected_barcode !== input.barcode) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Wrong item: scanned "${input.barcode}" but SKU ${input.sku} expects "${line.expected_barcode ?? "(no barcode)"}".`
      );
    }
    const remaining = line.quantity - line.picked_quantity;
    if (!Number.isInteger(input.quantity) || input.quantity <= 0 || input.quantity > remaining) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `SKU ${input.sku} has ${remaining} left to pick; ${input.quantity} cannot be scanned.`
      );
    }

    return new StepResponse({
      pickTaskId: task.id,
      warehouseId: task.warehouse_id,
      packingBinId: task.packing_bin_id,
      lineId: line.id,
      sku: line.sku,
      fromBinId: line.bin_id,
      quantity: input.quantity,
      barcode: input.barcode,
      actor: input.actor ?? null
    });
  }
);

const recordPickScanStep = createStep(
  "record-wms-pick-scan",
  async (
    input: {
      readonly pickTaskId: string;
      readonly lineId: string;
      readonly sku: string;
      readonly quantity: number;
      readonly barcode: string;
      readonly fromBinId: string;
      readonly packingBinId: string;
    },
    { container }
  ) => {
    const wms = container.resolve<WmsPickService>("wms");
    const [line] = await wms.listPickTaskLines({ id: input.lineId });
    const previousPicked = line?.picked_quantity ?? 0;

    await wms.updatePickTaskLines([
      {
        id: input.lineId,
        picked_quantity: previousPicked + input.quantity,
        picked_bin_id: input.fromBinId,
        scanned_barcode: input.barcode
      }
    ]);
    const status = await wms.refreshPickTaskStatus(input.pickTaskId);

    return new StepResponse(
      { status },
      { lineId: input.lineId, previousPicked }
    );
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsPickService>("wms");
    await wms.updatePickTaskLines([
      { id: compensation.lineId, picked_quantity: compensation.previousPicked, scanned_barcode: null, picked_bin_id: null }
    ]);
  }
);

export const scanPickLineWorkflow = createWorkflow(scanPickLineWorkflowId, (input: ScanPickLineInput) => {
  const validated = validatePickScanStep(input);

  const relocation = transform({ validated }, ({ validated }) => ({
    warehouseId: validated.warehouseId,
    fromBinId: validated.fromBinId,
    toBinId: validated.packingBinId,
    sku: validated.sku,
    quantity: validated.quantity,
    kind: "pick",
    reason: `pick ${validated.quantity} of ${validated.sku}`,
    actor: validated.actor
  }));
  const moved = relocateBetweenBinsStep(relocation);

  const recorded = recordPickScanStep(
    transform({ validated }, ({ validated }) => ({
      pickTaskId: validated.pickTaskId,
      lineId: validated.lineId,
      sku: validated.sku,
      quantity: validated.quantity,
      barcode: validated.barcode,
      fromBinId: validated.fromBinId,
      packingBinId: validated.packingBinId
    }))
  );

  return new WorkflowResponse(
    transform({ validated, moved, recorded }, ({ validated, moved, recorded }) => ({
      pickTaskId: validated.pickTaskId,
      sku: validated.sku,
      picked: validated.quantity,
      status: recorded.status,
      fromMovementId: moved.fromMovementId,
      toMovementId: moved.toMovementId
    }))
  );
});
