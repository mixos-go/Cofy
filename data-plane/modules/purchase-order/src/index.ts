import { Module } from "@medusajs/framework/utils";

import PurchaseOrderModuleService from "./services/purchase-order.ts";

/**
 * The `purchase-order` data-plane module: inbound stock, held inside each tenant's Medusa instance.
 *
 * Registered with `resolve` + `definition.isQueryable` in `medusa-config.ts` so its models can be
 * linked and queried. It owns two tables, `purchase_order` and `purchase_order_line`, and touches no
 * core Medusa table (AGENTS.md §2.2, docs/adr/0018).
 */
export default Module("purchaseOrder", {
  service: PurchaseOrderModuleService
});
