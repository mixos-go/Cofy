import { MedusaService } from "@medusajs/framework/utils";

import Bin from "../models/bin.ts";
import PickTask from "../models/pick-task.ts";
import PickTaskLine from "../models/pick-task-line.ts";
import StockMovement from "../models/stock-movement.ts";
import Stocktake from "../models/stocktake.ts";
import Warehouse from "../models/warehouse.ts";

/**
 * Allowed values for the `text` columns that would otherwise be Postgres enums.
 *
 * They live here, in one exported constant each, so the check is reviewable and a test can assert a
 * bad value is refused. `model.enum` is deliberately avoided: a Postgres enum type is
 * database-global, so one created in the first tenant's schema makes the second tenant's migration
 * skip its `CREATE TYPE` and then fail (docs/adr/0018).
 */
export const BIN_KINDS = ["staging", "storage", "packing"] as const;
export const STOCK_MOVEMENT_KINDS = ["receipt", "put_away", "pick", "stocktake", "adjustment"] as const;
export const PICK_TASK_STATUSES = ["open", "completed", "canceled"] as const;
export const STOCKTAKE_STATUSES = ["open", "applied", "canceled"] as const;

export type BinKind = (typeof BIN_KINDS)[number];
export type StockMovementKind = (typeof STOCK_MOVEMENT_KINDS)[number];
export type PickTaskStatus = (typeof PICK_TASK_STATUSES)[number];
export type StocktakeStatus = (typeof STOCKTAKE_STATUSES)[number];

function assertIn<T extends string>(allowed: readonly T[], value: string, label: string): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${label} must be one of ${allowed.join(", ")}, received "${value}".`);
  }
  return value as T;
}

export interface RecordMovementInput {
  readonly warehouseId: string;
  readonly binId: string;
  readonly sku: string;
  readonly kind: StockMovementKind;
  readonly delta: number;
  readonly reason?: string | null;
  readonly actor?: string | null;
}

/**
 * The warehouse's own tables: warehouses, bins, the movement ledger, pick tasks and stocktakes.
 *
 * The single most important method is `recordMovement`. A bin's quantity is **derived** from the
 * ledger (`SUM(delta)` over the movements that touched that bin and SKU) and is never a stored
 * counter, so a receipt and a pick racing on the same bin cannot lose each other's write: they
 * append two rows and the sum reflects both. `quantity_before`/`quantity_after` on the row are
 * recorded for the audit trail and are best-effort under a race; the authoritative quantity is
 * always the sum, which is why nothing reads the columns back as a current value.
 *
 * Nothing here writes a core Medusa table. Stock that the engine and the channels see is changed by
 * the caller through Medusa's own inventory workflow (docs/adr/0018).
 */
class WmsModuleService extends MedusaService({
  Warehouse,
  Bin,
  StockMovement,
  PickTask,
  PickTaskLine,
  Stocktake
}) {
  /** The quantity of one SKU in one bin, summed from the ledger. */
  async quantityAtBin(binId: string, sku: string): Promise<number> {
    const movements = await this.listStockMovements({ bin_id: binId, sku });
    return movements.reduce((total, movement) => total + movement.delta, 0);
  }

  /** Every SKU held in a bin, with its derived quantity. Bins with no movements are absent. */
  async binContents(binId: string): Promise<{ sku: string; quantity: number }[]> {
    const movements = await this.listStockMovements({ bin_id: binId });
    const bySku = new Map<string, number>();
    for (const movement of movements) {
      bySku.set(movement.sku, (bySku.get(movement.sku) ?? 0) + movement.delta);
    }
    return [...bySku].map(([sku, quantity]) => ({ sku, quantity }));
  }

  /**
   * Append one movement and return it.
   *
   * The delta is applied by insertion, so this is the only write a quantity change needs. A caller
   * that also changes the Medusa inventory level does so in the same workflow, so the ledger and the
   * engine move together (docs/adr/0018).
   */
  async recordMovement(input: RecordMovementInput): Promise<{
    id: string;
    bin_id: string;
    sku: string;
    delta: number;
    quantity_before: number;
    quantity_after: number;
  }> {
    const kind = assertIn(STOCK_MOVEMENT_KINDS, input.kind, "stock movement kind");
    if (!Number.isInteger(input.delta)) {
      throw new Error(`A stock movement delta must be a whole number, received ${input.delta}.`);
    }

    const before = await this.quantityAtBin(input.binId, input.sku);
    const after = before + input.delta;
    if (after < 0) {
      throw new Error(
        `Bin ${input.binId} holds ${before} of ${input.sku}; a delta of ${input.delta} would make it negative.`
      );
    }

    const [created] = await this.createStockMovements([
      {
        warehouse_id: input.warehouseId,
        bin_id: input.binId,
        sku: input.sku,
        kind,
        delta: input.delta,
        quantity_before: before,
        quantity_after: after,
        reason: input.reason ?? null,
        actor: input.actor ?? null
      }
    ]);

    return {
      id: created!.id,
      bin_id: input.binId,
      sku: input.sku,
      delta: input.delta,
      quantity_before: before,
      quantity_after: after
    };
  }

  /** Validate a bin kind and a warehouse's bins of that kind. */
  async binsOfKind(warehouseId: string, kind: BinKind) {
    const validated = assertIn(BIN_KINDS, kind, "bin kind");
    return this.listBins({ warehouse_id: warehouseId, kind: validated });
  }

  /** Recompute a pick task's status from its lines. */
  async refreshPickTaskStatus(pickTaskId: string): Promise<PickTaskStatus> {
    const lines = await this.listPickTaskLines({ pick_task_id: pickTaskId });
    const status: PickTaskStatus = lines.every((line) => line.picked_quantity >= line.quantity)
      ? "completed"
      : "open";

    await this.updatePickTasks({
      id: pickTaskId,
      status,
      completed_at: status === "completed" ? new Date() : null
    });
    return status;
  }
}

export default WmsModuleService;
