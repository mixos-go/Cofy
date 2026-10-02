import { z } from "@medusajs/framework/zod";

/**
 * Request validation for the tenant WMS Admin API (M6).
 *
 * These routes are called by the operator console and the seller's WMS screens, both of which reach
 * a tenant instance through the control plane with the platform's secret API key. `tenantId` is the
 * instance's own identity from the environment, never a request field — the same rule the M3 order
 * routes follow, so a caller cannot address another tenant by putting an id in a body.
 */

const positiveWholeNumber = z.number().int().positive();

export const CreateWarehouseSchema = z.object({
  name: z.string().min(1),
  /** The Medusa stock location this warehouse is; optional so a layout can be built before it. */
  stockLocationId: z.string().min(1).nullable().optional()
});

export const CreateBinSchema = z.object({
  warehouseId: z.string().min(1),
  code: z.string().min(1),
  kind: z.enum(["staging", "storage", "packing"])
});

export const CreatePurchaseOrderSchema = z.object({
  warehouseId: z.string().min(1),
  supplierReference: z.string().min(1).nullable().optional(),
  expectedAt: z.string().min(1).nullable().optional(),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        title: z.string().min(1),
        orderedQuantity: positiveWholeNumber
      })
    )
    .min(1)
});

export const ReceivePurchaseOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: positiveWholeNumber
      })
    )
    .min(1),
  actor: z.string().min(1).nullable().optional()
});

export const PutAwaySchema = z.object({
  warehouseId: z.string().min(1),
  fromBinId: z.string().min(1),
  toBinId: z.string().min(1),
  sku: z.string().min(1),
  quantity: positiveWholeNumber,
  actor: z.string().min(1).nullable().optional()
});

export const CreatePickTaskSchema = z.object({
  warehouseId: z.string().min(1),
  orderId: z.string().min(1),
  packingBinId: z.string().min(1),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: positiveWholeNumber
      })
    )
    .min(1)
});

export const ScanPickLineSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().min(1),
  quantity: positiveWholeNumber,
  actor: z.string().min(1).nullable().optional()
});

export const OpenStocktakeSchema = z.object({
  warehouseId: z.string().min(1),
  binId: z.string().min(1),
  sku: z.string().min(1)
});

export const ApplyStocktakeSchema = z.object({
  countedQuantity: z.number().int().min(0),
  countedBy: z.string().min(1).nullable().optional()
});

export const WarehouseParamsSchema = z.object({
  warehouseId: z.string().min(1)
});

export const BinParamsSchema = z.object({
  binId: z.string().min(1)
});

export type CreateWarehouseBody = z.infer<typeof CreateWarehouseSchema>;
export type CreateBinBody = z.infer<typeof CreateBinSchema>;
export type CreatePurchaseOrderBody = z.infer<typeof CreatePurchaseOrderSchema>;
export type ReceivePurchaseOrderBody = z.infer<typeof ReceivePurchaseOrderSchema>;
export type PutAwayBody = z.infer<typeof PutAwaySchema>;
export type CreatePickTaskBody = z.infer<typeof CreatePickTaskSchema>;
export type ScanPickLineBody = z.infer<typeof ScanPickLineSchema>;
export type OpenStocktakeBody = z.infer<typeof OpenStocktakeSchema>;
export type ApplyStocktakeBody = z.infer<typeof ApplyStocktakeSchema>;
