import { z } from "@medusajs/framework/zod";

/**
 * Request validation for the tenant Admin API the worker calls.
 *
 * These schemas are the tenant-side half of the worker's `CommerceClient` contract
 * (`apps/services/worker/src/ports.ts`). The worker's transport is plain JSON over the internal
 * network (ADR 0012), so nothing here is trusted from a header: `tenantId` is the instance's own
 * identity from the environment, never a request field.
 */

/** The platform's normalized order line, in platform minor units (sen). */
const channelOrderLine = z.object({
  externalLineId: z.string().min(1),
  sku: z.string().nullable(),
  title: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().int()
});

/** The platform's normalized order (`ChannelOrder` in packages/contracts). */
const channelOrder = z.object({
  channel: z.string().min(1),
  externalOrderId: z.string().min(1),
  placedAt: z.string().min(1),
  buyerEmail: z.string().nullable(),
  currency: z.literal("IDR"),
  lines: z.array(channelOrderLine),
  totals: z.object({
    subtotal: z.number().int(),
    shipping: z.number().int(),
    discount: z.number().int(),
    grandTotal: z.number().int()
  })
});

/** A line the worker already resolved to a Medusa variant. */
const resolvedLine = z.object({
  sku: z.string().min(1),
  variantId: z.string().min(1),
  quantity: z.number().int().positive()
});

export const CreateOrderSchema = z.object({
  order: channelOrder,
  lines: z.array(resolvedLine)
});

export type CreateOrderBody = z.infer<typeof CreateOrderSchema>;

export const ReleaseOrderSchema = z.object({
  reason: z.string().min(1)
});

/** `?sku=a&sku=b`; the worker always sends at least one. */
export const ListVariantsSchema = z.object({
  sku: z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value : [value]))
});

/** `?sku=a&sku=b` for the stock read; same shape as the variant lookup, same reason. */
export const ListStockLevelsSchema = z.object({
  sku: z.union([z.string(), z.array(z.string())]).transform((value) => (Array.isArray(value) ? value : [value]))
});

export const FindChannelOrderLinkSchema = z.object({
  channel: z.string().min(1),
  externalOrderId: z.string().min(1)
});
