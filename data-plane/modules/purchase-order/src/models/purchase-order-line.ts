import { model } from "@medusajs/framework/utils";

/**
 * One line of a purchase order: a variant, how many were ordered, how many have arrived.
 *
 * `received_quantity` is the running total across every receipt against this line. It is stored
 * rather than derived from the movement ledger because receiving must answer "is this PO complete"
 * with one read, and the ledger is the audit trail behind it, not its index.
 */
const PurchaseOrderLine = model.define("purchase_order_line", {
  id: model.id().primaryKey(),
  purchase_order_id: model.text(),
  /** The platform SKU, which is how the warehouse thinks about the item. */
  sku: model.text(),
  title: model.text(),
  ordered_quantity: model.number(),
  received_quantity: model.number().default(0)
});

export default PurchaseOrderLine;
