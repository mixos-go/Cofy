import { createPickTaskWorkflow } from "../../../../workflows/pick-task.ts";
import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import type { CreatePickTaskBody } from "../validators.ts";

/**
 * Create a pick task for one order.
 *
 * The workflow resolves each line's expected barcode and the storage bin that holds the units, so a
 * task is never created for stock that is not there — the failure is at creation, not at the shelf.
 * There is no wave or batch optimisation, per the milestone's non-goals: one task is one order.
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.validatedBody as unknown as CreatePickTaskBody;

  const { result } = await createPickTaskWorkflow(req.scope).run({
    input: {
      warehouseId: body.warehouseId,
      orderId: body.orderId,
      packingBinId: body.packingBinId,
      lines: body.lines.map((line) => ({ sku: line.sku, quantity: line.quantity }))
    }
  });

  res.status(201).json({ pickTask: result });
};

interface WmsPickTaskReadService {
  listPickTasks(
    filters: Record<string, unknown>
  ): Promise<
    {
      id: string;
      warehouse_id: string;
      order_id: string;
      packing_bin_id: string | null;
      status: string;
      completed_at: Date | null;
    }[]
  >;
  listPickTaskLines(
    filters: Record<string, unknown>
  ): Promise<
    {
      id: string;
      pick_task_id: string;
      sku: string;
      quantity: number;
      bin_id: string | null;
      picked_bin_id: string | null;
      expected_barcode: string | null;
      scanned_barcode: string | null;
      picked_quantity: number;
    }[]
  >;
}

/**
 * The pick tasks of this tenant, with their lines.
 *
 * A pick task is created by POST and read here, because the screen that shows a picker what to
 * collect and what is left has to see the lines, not just the task. Lines are fetched for the page's
 * tasks in one query keyed by `pick_task_id`, rather than one query per task: a list of N tasks must
 * not be an N+1 against the tenant's own database (docs/adr/0018).
 *
 * Nothing here is seller-projected. The control plane proxies this route and applies the projection,
 * so a field added here cannot reach a seller by default (the same rule ADR 0016 states for orders).
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const wms = req.scope.resolve<WmsPickTaskReadService>("wms");
  const warehouseId = req.query.warehouseId as string | undefined;
  const status = req.query.status as string | undefined;

  const filters: Record<string, unknown> = {};
  if (warehouseId) filters.warehouse_id = warehouseId;
  if (status) filters.status = status;

  const tasks = await wms.listPickTasks(filters);
  const taskIds = tasks.map((task) => task.id);
  const lines = taskIds.length === 0 ? [] : await wms.listPickTaskLines({ pick_task_id: taskIds });

  const linesByTask = new Map<string, typeof lines>();
  for (const line of lines) {
    const existing = linesByTask.get(line.pick_task_id) ?? [];
    existing.push(line);
    linesByTask.set(line.pick_task_id, existing);
  }

  res.status(200).json({
    pickTasks: tasks.map((task) => ({
      id: task.id,
      warehouseId: task.warehouse_id,
      orderId: task.order_id,
      packingBinId: task.packing_bin_id,
      status: task.status,
      completedAt: task.completed_at,
      lines: (linesByTask.get(task.id) ?? []).map((line) => ({
        id: line.id,
        sku: line.sku,
        quantity: line.quantity,
        binId: line.bin_id,
        pickedBinId: line.picked_bin_id,
        expectedBarcode: line.expected_barcode,
        scannedBarcode: line.scanned_barcode,
        pickedQuantity: line.picked_quantity
      }))
    }))
  });
};
