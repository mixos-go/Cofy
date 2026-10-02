import { model } from "@medusajs/framework/utils";

/**
 * A purchase order: what we intend to receive from a supplier, and what actually arrived.
 *
 * Inbound is the first half of M6. A PO is created before goods exist, so its lines carry an
 * `ordered_quantity` and accumulate a `received_quantity` as deliveries land. The difference is
 * what is still outstanding, which is what a receiving screen shows.
 *
 * This table lives in the tenant's own schema and is linked to the WMS module by id, not by a
 * foreign key into a core Medusa table (AGENTS.md §2.2). `status` is `text` with its allowed values
 * checked in the service rather than `model.enum`: a Postgres enum type is database-global, so one
 * created in the first tenant's schema makes the second tenant's migration skip its own
 * `CREATE TYPE` and then fail (docs/adr/0018).
 */
const PurchaseOrder = model.define("purchase_order", {
  id: model.id().primaryKey(),
  /** The platform's tenant id, carried explicitly for the same reason `channel_order_link` carries it. */
  tenant_id: model.text(),
  /** The `wms_warehouse` this delivery is destined for. */
  warehouse_id: model.text(),
  supplier_reference: model.text().nullable(),
  /** One of `PURCHASE_ORDER_STATUSES`. */
  status: model.text(),
  expected_at: model.dateTime().nullable(),
  received_at: model.dateTime().nullable()
});

export default PurchaseOrder;
