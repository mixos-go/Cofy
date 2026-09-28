import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  }): Promise<{ data: { id: string; sku: string | null }[] }>;
}

/**
 * Resolve platform SKUs to Medusa variant ids (M3 listing/import mapping).
 *
 * The worker sends `?sku=a&sku=b` and needs back only the SKUs the tenant actually sells: a SKU
 * absent from the response is "not in this tenant's catalogue", which the worker turns into a
 * dropped line or an `unknown_sku` push rejection. Returning a guessed variant instead would price
 * a real order wrongly, so absence must stay meaningful and is never padded.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
  const skus = req.validatedQuery.sku as unknown as string[];

  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku"],
    filters: { sku: skus },
    pagination: { take: skus.length }
  });

  res.status(200).json({
    variants: data.map((variant) => ({ variantId: variant.id, sku: variant.sku }))
  });
};
