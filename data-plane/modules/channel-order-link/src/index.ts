import { Module } from "@medusajs/framework/utils";

import ChannelOrderLinkModuleService from "./services/channel-order-link.ts";

/**
 * The `channel-order-link` data-plane module.
 *
 * Registering it with `resolve` and `definition.isQueryable` is what makes the module link in
 * `src/links/` able to join it to the Order module. It holds one table, `channel_order_link`, and
 * never touches a core Medusa table (AGENTS.md §2.2).
 */
export default Module("channelOrderLink", {
  service: ChannelOrderLinkModuleService
});
