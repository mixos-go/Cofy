import { model } from "@medusajs/framework/utils";

/**
 * A bin: a physical address inside a warehouse, where units actually sit.
 *
 * `kind` separates the three roles a bin plays in a flow, because they must not be the same bin or
 * the put-away and pick assertions become meaningless:
 *   - `staging` receives a delivery before it is shelved;
 *   - `storage` is where sellable units live and picks are taken from;
 *   - `packing` collects the units of one order while it is packed.
 *
 * `kind` is `text` with values checked in the service, not `model.enum`: a Postgres enum type is
 * database-global and one tenant's type would break the next tenant's migration (docs/adr/0018).
 */
const Bin = model.define("wms_bin", {
  id: model.id().primaryKey(),
  warehouse_id: model.text(),
  /** The human/barcode code on the shelf label, unique within a warehouse. */
  code: model.text(),
  /** One of `BIN_KINDS`. */
  kind: model.text()
});

export default Bin;
