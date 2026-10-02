import { model } from "@medusajs/framework/utils";

/**
 * A warehouse: one physical place stock is held, mapped to exactly one Medusa stock location.
 *
 * Bins live under a warehouse, and the warehouse's `stock_location_id` is the location the engine
 * reserves against. One location per warehouse, not one per bin, so a channel's single stock number
 * stays a single location's number (docs/adr/0018).
 */
const Warehouse = model.define("wms_warehouse", {
  id: model.id().primaryKey(),
  /** The platform's tenant id. Each tenant has its own schema, but the id keeps rows attributable. */
  tenant_id: model.text(),
  name: model.text(),
  /**
   * The Medusa stock location this warehouse is. Nullable because a warehouse row can be created
   * before its location, and a bin must never be the thing that holds the engine's stock.
   */
  stock_location_id: model.text().nullable()
});

export default Warehouse;
