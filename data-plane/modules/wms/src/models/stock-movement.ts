import { model } from "@medusajs/framework/utils";

/**
 * The append-only ledger of every quantity change in the warehouse.
 *
 * This is the source of truth for what is *where*, and it is append-only on purpose: a bin's
 * quantity is the sum of the deltas that touched it, never a stored number that a read-modify-write
 * could lose. Two concurrent receipts against the same bin append two rows; neither overwrites the
 * other, so no lock and no lost update (docs/adr/0018).
 *
 * `quantity_before` and `quantity_after` are recorded for the audit trail and for a stocktake's
 * "from what, to what" answer, but they are derived at write time and are not what the current
 * quantity is read from. `kind` and `reason` say *why* the units moved; a stocktake variance is the
 * `stocktake` kind with the counted number in `reason`, which is what makes a correction auditable
 * rather than a silent overwrite.
 *
 * Rows are never updated or deleted. `kind` is `text` checked in the service, not a Postgres enum
 * (docs/adr/0018).
 */
const StockMovement = model.define("wms_stock_movement", {
  id: model.id().primaryKey(),
  warehouse_id: model.text(),
  bin_id: model.text(),
  /** The platform SKU the units belong to. */
  sku: model.text(),
  /** One of `STOCK_MOVEMENT_KINDS`. */
  kind: model.text(),
  /** Signed: positive puts units in the bin, negative takes them out. */
  delta: model.number(),
  quantity_before: model.number(),
  quantity_after: model.number(),
  /** Free text: the counted quantity for a stocktake, the PO id for a receipt, and so on. */
  reason: model.text().nullable(),
  actor: model.text().nullable()
});

export default StockMovement;
