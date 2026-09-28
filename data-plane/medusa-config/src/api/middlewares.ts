import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http";
import { defineMiddlewares } from "@medusajs/framework/http";

import {
  CreateOrderSchema,
  FindChannelOrderLinkSchema,
  ListVariantsSchema,
  ReleaseOrderSchema
} from "./admin/validators.ts";

/**
 * Validation for the tenant Admin API routes the worker calls.
 *
 * This file must live at the API root (`src/api/middlewares.ts`): Medusa's `MiddlewareFileLoader`
 * scans each source directory's top level only, not its subdirectories, so a copy under
 * `src/api/admin/` is never imported and the validators silently never run. The field is `methods`
 * (plural) — the loader reads `route.methods`, and a singular `method` is dropped without warning.
 *
 * Auth is deliberately **not** configured here. These routes live under `/admin`, so Medusa's own
 * admin authenticator already requires a credential; ADR 0012 verifies a secret API key
 * (`sk_...`) presented over HTTP Basic. Setting `AUTHENTICATE = false` on any of these would open
 * a tenant's order-creation and stock-release surface to anyone who can reach the instance.
 */
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/orders",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreateOrderSchema)]
    },
    {
      matcher: "/admin/orders/:id/release",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ReleaseOrderSchema)]
    },
    {
      matcher: "/admin/variants",
      methods: ["GET"],
      middlewares: [validateAndTransformQuery(ListVariantsSchema, {})]
    },
    {
      matcher: "/admin/channel-order-links",
      methods: ["GET"],
      middlewares: [validateAndTransformQuery(FindChannelOrderLinkSchema, {})]
    }
  ]
});
