import { Module } from "@medusajs/framework/utils";

import WmsModuleService from "./services/wms.ts";

/**
 * The `wms` data-plane module: warehouse layout, the movement ledger, picking and stocktakes.
 *
 * Registered with `resolve` + `definition.isQueryable` in `medusa-config.ts` so its models can be
 * linked and queried. It owns six tables (`wms_warehouse`, `wms_bin`, `wms_stock_movement`,
 * `wms_pick_task`, `wms_pick_task_line`, `wms_stocktake`) and touches no core Medusa table
 * (AGENTS.md §2.2, docs/adr/0018).
 */
export default Module("wms", {
  service: WmsModuleService
});
