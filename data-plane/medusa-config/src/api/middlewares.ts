import { validateAndTransformBody, validateAndTransformQuery } from "@medusajs/framework/http";
import { defineMiddlewares } from "@medusajs/framework/http";

import {
  CreateOrderSchema,
  FindChannelOrderLinkSchema,
  ListStockLevelsSchema,
  ListVariantsSchema,
  RecordShipmentSchema,
  ReleaseOrderSchema
} from "./admin/validators.ts";
import {
  ApplyStocktakeSchema,
  CreateBinSchema,
  CreatePickTaskSchema,
  CreatePurchaseOrderSchema,
  CreateWarehouseSchema,
  OpenStocktakeSchema,
  PutAwaySchema,
  ReceivePurchaseOrderSchema,
  ScanPickLineSchema
} from "./admin/wms/validators.ts";

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
      matcher: "/admin/stock-levels",
      methods: ["GET"],
      middlewares: [validateAndTransformQuery(ListStockLevelsSchema, {})]
    },
    {
      matcher: "/admin/channel-order-links",
      methods: ["GET"],
      middlewares: [validateAndTransformQuery(FindChannelOrderLinkSchema, {})]
    },
    // M7. A booked courier shipment is recorded as the engine's own fulfillment + shipment, so the
    // body is validated before the workflow starts and a malformed waybill or unknown courier never
    // reaches the engine (AGENTS.md §5).
    {
      matcher: "/admin/shipments",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(RecordShipmentSchema)]
    },
    // M6 WMS. The body schemas reject a malformed quantity or an unknown bin kind before a workflow
    // starts, so a bad request cannot leave a half-received purchase order behind.
    {
      matcher: "/admin/wms/warehouses",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreateWarehouseSchema)]
    },
    {
      matcher: "/admin/wms/bins",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreateBinSchema)]
    },
    {
      matcher: "/admin/wms/purchase-orders",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreatePurchaseOrderSchema)]
    },
    {
      matcher: "/admin/wms/purchase-orders/:id/receive",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ReceivePurchaseOrderSchema)]
    },
    {
      matcher: "/admin/wms/put-away",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(PutAwaySchema)]
    },
    {
      matcher: "/admin/wms/pick-tasks",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(CreatePickTaskSchema)]
    },
    {
      matcher: "/admin/wms/pick-tasks/:id/scans",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ScanPickLineSchema)]
    },
    {
      matcher: "/admin/wms/stocktakes",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(OpenStocktakeSchema)]
    },
    {
      matcher: "/admin/wms/stocktakes/:id/apply",
      methods: ["POST"],
      middlewares: [validateAndTransformBody(ApplyStocktakeSchema)]
    }
  ]
});
