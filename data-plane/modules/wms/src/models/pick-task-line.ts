import { model } from "@medusajs/framework/utils";

/**
 * One line of a pick task: what to pick, from where, and whether it has been picked.
 *
 * `bin_id` is where the units were found when the task was created; `picked_bin_id` is where they
 * were actually taken from when scanned. Keeping both means a picker who found the stock in a
 * different bin does not have to edit the task, and the difference is visible afterwards.
 *
 * `scanned_barcode` is what the picker's scanner actually read. The completion check compares it to
 * the expected variant barcode and refuses a mismatch, so a wrong-item scan is recorded rather than
 * silently accepted (docs/adr/0018).
 */
const PickTaskLine = model.define("wms_pick_task_line", {
  id: model.id().primaryKey(),
  pick_task_id: model.text(),
  sku: model.text(),
  quantity: model.number(),
  bin_id: model.text().nullable(),
  picked_bin_id: model.text().nullable(),
  /** The Medusa variant barcode expected at scan time; the pick refuses a different one. */
  expected_barcode: model.text().nullable(),
  scanned_barcode: model.text().nullable(),
  picked_quantity: model.number().default(0)
});

export default PickTaskLine;
