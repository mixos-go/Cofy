import { model } from "@medusajs/framework/utils";

/**
 * A pick task: one order's units to collect from storage bins into a packing bin.
 *
 * Per the milestone's non-goals there is no wave or batch optimisation, so a pick task is one order.
 * The state is `open` until every line is scanned, then `completed`; `canceled` is the terminal
 * state for an order that went away before anyone picked it.
 *
 * `status` is `text` checked in the service, not a Postgres enum (docs/adr/0018).
 */
const PickTask = model.define("wms_pick_task", {
  id: model.id().primaryKey(),
  warehouse_id: model.text(),
  /** The Medusa order this task fulfils, by id. Not a foreign key: core tables are never altered. */
  order_id: model.text(),
  /** The bin picked units are collected into while the order is packed. */
  packing_bin_id: model.text().nullable(),
  /** One of `PICK_TASK_STATUSES`. */
  status: model.text(),
  completed_at: model.dateTime().nullable()
});

export default PickTask;
