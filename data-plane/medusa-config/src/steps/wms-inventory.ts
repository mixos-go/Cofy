import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError, Modules } from "@medusajs/framework/utils";

/**
 * Resolves platform SKUs to Medusa inventory items and makes sure each has a level at a location.
 *
 * Both the inbound receipt and the stocktake correction need the same three facts before they can
 * move stock: the inventory item behind a SKU, the stock location to move it at, and a level that
 * exists to move. The last one is not free: `adjustInventoryLevelsStep` adjusts an existing level
 * and throws when there is none, so a tenant that sells a SKU before it was ever stocked at this
 * warehouse would fail its first receipt. Creating the level at zero is what makes the first receipt
 * work, and the level is compensated away if the workflow rolls back.
 *
 * The SKU is matched through `product_variant.inventory_items`, which is Medusa's own link, rather
 * than through a column we add: the engine stays vanilla (AGENTS.md §2.1, docs/adr/0018).
 */

interface VariantInventoryView {
  readonly id: string;
  readonly sku: string | null;
  readonly inventory_items?: readonly {
    readonly inventory_item_id: string;
  }[];
}

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
    pagination?: Record<string, unknown>;
  }): Promise<{ data: VariantInventoryView[] }>;
}

interface InventoryModule {
  listInventoryLevels(
    filters: Record<string, unknown>
  ): Promise<{ id: string; inventory_item_id: string; location_id: string }[]>;
  createInventoryLevels(
    input: { inventory_item_id: string; location_id: string }[]
  ): Promise<{ id: string; inventory_item_id: string; location_id: string }[]>;
  deleteInventoryLevels(ids: string[]): Promise<void>;
}

export interface ResolvedInventoryItem {
  readonly sku: string;
  readonly variantId: string;
  readonly inventoryItemId: string;
  readonly locationId: string;
}

export const resolveInventoryItemsStepId = "resolve-wms-inventory-items";

export const resolveInventoryItemsStep = createStep(
  resolveInventoryItemsStepId,
  async (
    input: { readonly skus: readonly string[]; readonly locationId: string },
    { container }
  ) => {
    const skus = [...new Set(input.skus)];
    if (skus.length === 0) {
      return new StepResponse({ items: [] as ResolvedInventoryItem[], createdLevelIds: [] as string[] });
    }

    const query = container.resolve<QueryGraph>("query");
    const inventory = container.resolve<InventoryModule>(Modules.INVENTORY);

    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "inventory_items.inventory_item_id"],
      filters: { sku: skus },
      pagination: { take: skus.length }
    });

    const bySku = new Map<string, { variantId: string; inventoryItemId: string }>();
    for (const variant of data) {
      const link = variant.inventory_items?.[0];
      if (variant.sku && link?.inventory_item_id) {
        bySku.set(variant.sku, { variantId: variant.id, inventoryItemId: link.inventory_item_id });
      }
    }

    // A SKU the tenant does not sell cannot receive stock. Failing here names the SKU, where a
    // silent skip would report a successful receipt for goods that were never recorded.
    const missing = skus.filter((sku) => !bySku.has(sku));
    if (missing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `These SKUs are not in the catalogue, so their stock cannot be moved: ${missing.join(", ")}.`
      );
    }

    const resolved = skus.map((sku) => ({ sku, ...bySku.get(sku)! }));
    const existing = await inventory.listInventoryLevels({
      inventory_item_id: resolved.map((item) => item.inventoryItemId),
      location_id: input.locationId
    });
    const haveLevel = new Set(existing.map((level) => level.inventory_item_id));
    const needLevel = resolved.filter((item) => !haveLevel.has(item.inventoryItemId));

    const createdLevelIds: string[] = [];
    if (needLevel.length > 0) {
      const created = await inventory.createInventoryLevels(
        needLevel.map((item) => ({ inventory_item_id: item.inventoryItemId, location_id: input.locationId }))
      );
      createdLevelIds.push(...created.map((level) => level.id));
    }

    const items: ResolvedInventoryItem[] = resolved.map((item) => ({
      ...item,
      locationId: input.locationId
    }));

    return new StepResponse({ items, createdLevelIds }, { createdLevelIds });
  },
  async (compensation, { container }) => {
    if (!compensation || compensation.createdLevelIds.length === 0) {
      return;
    }
    const inventory = container.resolve<InventoryModule>(Modules.INVENTORY);
    await inventory.deleteInventoryLevels([...compensation.createdLevelIds]);
  }
);
