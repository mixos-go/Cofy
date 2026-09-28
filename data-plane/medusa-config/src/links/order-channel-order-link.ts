import { defineLink } from "@medusajs/framework/utils";
import OrderModuleImport from "@medusajs/medusa/order";

import ChannelOrderLinkModule from "../../../modules/channel-order-link/src/index.ts";

// `@medusajs/medusa/order` is CommonJS. Under Node's native type stripping the default import is
// the CJS `module.exports`, whose own `default` holds the module wrapper; a tsc/esModuleInterop
// build would have unwrapped it already. Reading the wrapper explicitly keeps both runtimes equal.
// `defineLink`'s parameter type is a structural union that a CJS namespace does not satisfy, so the
// linkable is given the minimal structural type `defineLink` actually reads (`toJSON`, plus the
// arbitrary extra keys a combined source carries) instead of asserting the module's own type.
type OrderLinkable = Record<string, unknown> & {
  toJSON(): { serviceName: string; field: string; linkable: string; primaryKey: string };
};

const orderLinkable = (
  OrderModuleImport as unknown as { default: { linkable: { order: OrderLinkable } } }
).default.linkable.order;

/**
 * Attaches `channel_order_link` to the core Order module.
 *
 * This is a module link, not a foreign key: Medusa v2 does not let a custom module add a column
 * to `order` (AGENTS.md §2.2). `isList: true` because one Medusa order can in principle be linked
 * from more than one channel order during a merge or a re-import after a dismissal.
 *
 * Medusa discovers this file by convention from the project's `src/links` directory
 * (`@medusajs/medusa/dist/loaders/index.js` and `LinkLoader`); it is not discovered from the custom
 * module's own `links/` folder, so that duplicate was removed.
 */
export default defineLink(
  { linkable: orderLinkable },
  { linkable: ChannelOrderLinkModule.linkable.channelOrderLink, isList: true }
);
