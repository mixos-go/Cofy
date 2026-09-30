import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

interface LocationLevel {
  readonly available_quantity?: number | string;
  readonly stocked_quantity?: number | string;
  readonly reserved_quantity?: number | string;
}

interface VariantStockView {
  readonly id: string;
  readonly sku: string | null;
  readonly manage_inventory?: boolean;
  readonly inventory_items?: readonly {
    readonly inventory?: { readonly location_levels?: readonly LocationLevel[] };
  }[];
}

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  }): Promise<{ data: VariantStockView[] }>;
}

function availableOf(level: LocationLevel): number {
  if (level.available_quantity !== undefined) return Number(level.available_quantity);
  return Number(level.stocked_quantity ?? 0) - Number(level.reserved_quantity ?? 0);
}

/**
 * Read the tenant's available stock per platform SKU (docs/adr/0015).
 *
 * This is the local half of the stock comparison the worker's reconciliation makes: the worker asks
 * what Medusa holds for a set of SKUs and compares it to what the channel reports. Summing across a
 * variant's location levels is deliberate — a channel's stock level is a single number, so the local
 * side must be too, or every multi-location tenant would read as permanent drift.
 *
 * Two absences are meaningful and are preserved rather than padded:
 *   - a SKU the tenant does not sell is absent from the response;
 *   - a variant that does not manage inventory is absent too, because "untracked" and "none left"
 *     are different states and only one of them is a real mismatch.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const query = req.scope.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
  const skus = req.validatedQuery.sku as unknown as string[];

  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "sku",
      "manage_inventory",
      "inventory_items.inventory.location_levels.available_quantity",
      "inventory_items.inventory.location_levels.stocked_quantity",
      "inventory_items.inventory.location_levels.reserved_quantity"
    ],
    filters: { sku: skus },
    pagination: { take: skus.length }
  });

  const levels = data
    .filter((variant) => variant.manage_inventory !== false)
    .map((variant) => {
      const items = variant.inventory_items ?? [];
      const available = items.reduce((total, link) => {
        const itemTotal = (link.inventory?.location_levels ?? []).reduce(
          (sum, level) => sum + availableOf(level),
          0
        );
        return total + itemTotal;
      }, 0);
      return { sku: variant.sku, available };
    })
    .filter((level): level is { sku: string; available: number } => level.sku !== null && level.sku !== "");

  res.status(200).json({ levels });
};
