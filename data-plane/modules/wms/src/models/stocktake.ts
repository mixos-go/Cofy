import { model } from "@medusajs/framework/utils";

/**
 * A stocktake: a count of one bin at a moment, and the variance it found.
 *
 * The count is recorded against the bin, and the variance (`counted_quantity` minus what the ledger
 * said at the time) becomes a `stocktake` movement when the count is applied. Storing the variance
 * rather than only the counted number is what lets a stocktake be audited after the fact: the
 * correction is the delta that was applied, and the reason on the movement says which count caused
 * it.
 *
 * `status` is `text` checked in the service, not a Postgres enum (docs/adr/0018).
 */
const Stocktake = model.define("wms_stocktake", {
  id: model.id().primaryKey(),
  warehouse_id: model.text(),
  bin_id: model.text(),
  sku: model.text(),
  /** What the ledger said when the count was opened, so the variance is explainable. */
  system_quantity: model.number(),
  /** What a human counted. Nullable until the count is submitted. */
  counted_quantity: model.number().nullable(),
  /** `counted_quantity - system_quantity`, filled when the count is applied. */
  variance: model.number().nullable(),
  /** One of `STOCKTAKE_STATUSES`. */
  status: model.text(),
  counted_by: model.text().nullable(),
  applied_at: model.dateTime().nullable()
});

export default Stocktake;
