/**
 * Fixture for the shipment write-path end-to-end test (M7, ADR 0020).
 *
 * Run by `medusa exec` inside the tenant's own Medusa project, so it imports `@medusajs/*`
 * directly and nothing here is importable from a `@platform/*` workspace (AGENTS.md §2.1).
 *
 * A shipment can only be recorded against an order that is genuinely shippable, so this fixture
 * builds the whole chain through Medusa's own core workflows rather than hand-written SQL: a stock
 * location with a fulfillment set and an enabled fulfillment provider, a service zone and a shipping
 * option, a stocked product, and one order that carries a shipping method and an inventory
 * reservation. Without the reservation, `createOrderFulfillmentWorkflow` refuses the managed
 * variant; without the shipping method, it cannot resolve the location the units ship from.
 *
 * It prints a single `SEED=` JSON line; the test parses that rather than reading a database.
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  batchLinksWorkflow,
  createLocationFulfillmentSetWorkflow,
  createOrderWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createReservationsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow
} from "@medusajs/medusa/core-flows";

function first<T>(values: readonly T[] | undefined): T {
  const value = values?.[0];
  if (value === undefined) {
    throw new Error("The fixture expected Medusa to create at least one record and it created none.");
  }
  return value;
}

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
  }): Promise<{ data: Record<string, unknown>[] }>;
}

export default async function seed({ container }: { container: MedusaContainer }): Promise<void> {
  const variantSku = process.env.SEED_VARIANT_SKU ?? "SHIP-SKU";

  const salesChannel = first(
    (await createSalesChannelsWorkflow(container).run({
      input: { salesChannelsData: [{ name: "Default", description: "shipment write-path test" }] }
    })).result
  );
  const region = first(
    (await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "Indonesia", currency_code: "idr", countries: ["id"] }] }
    })).result
  );
  const stockLocation = first(
    (await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: "Gudang" }] }
    })).result
  );
  const profile = first(
    (await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default", type: "default" }] }
    })).result
  );
  const product = first(
    (await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Kaos",
            status: "published",
            sales_channels: [{ id: salesChannel.id }],
            shipping_profile_id: profile.id,
            options: [{ title: "Size", values: ["M"] }],
            variants: [
              {
                title: "Kaos M",
                sku: variantSku,
                barcode: "8991000000017",
                manage_inventory: true,
                options: { Size: "M" },
                prices: [{ amount: 20000, currency_code: "idr" }]
              }
            ]
          }
        ]
      }
    })).result
  );
  const variantId = first(product.variants).id;

  // Stock the variant at the location, so the order's reservation has units to consume.
  const query = container.resolve<QueryGraph>("query");
  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "inventory_items.inventory_item_id", "inventory_items.required_quantity"],
    filters: { id: [variantId] }
  });
  const inventoryItemId = first(
    (variants[0]?.inventory_items as readonly { inventory_item_id: string }[] | undefined)
  ).inventory_item_id;
  const inventoryService = container.resolve("inventory") as {
    createInventoryLevels(
      input: { inventory_item_id: string; location_id: string; stocked_quantity: number }[]
    ): Promise<unknown>;
  };
  await inventoryService.createInventoryLevels([
    { inventory_item_id: inventoryItemId, location_id: stockLocation.id, stocked_quantity: 100 }
  ]);

  // `createLocationFulfillmentSetWorkflow` returns the stock location, not the set it created, so
  // the set's id is read back through the engine's own query link.
  await createLocationFulfillmentSetWorkflow(container).run({
    input: {
      location_id: stockLocation.id,
      fulfillment_set_data: { name: "Shipping", type: "shipping" }
    }
  });
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id"],
    filters: { id: [stockLocation.id] }
  });
  const fulfillmentSetId = first(
    (locations[0]?.fulfillment_sets as readonly { id: string }[] | undefined)
  ).id;

  // A shipping option's provider must be enabled for the service location, or the option is rejected.
  await batchLinksWorkflow(container).run({
    input: {
      create: [
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
          [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" }
        }
      ]
    }
  });

  const serviceZone = first(
    (await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Indonesia",
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: [{ country_code: "id", type: "country" }]
          }
        ]
      }
    })).result
  );
  const shippingOption = first(
    (await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Regular",
          service_zone_id: serviceZone.id,
          shipping_profile_id: profile.id,
          provider_id: "manual_manual",
          price_type: "flat",
          type: { label: "Regular", description: "Regular", code: "regular" },
          prices: [{ amount: 10000, currency_code: "idr" }]
        }
      ]
    })).result
  );

  const order = (
    await createOrderWorkflow(container).run({
      input: {
        region_id: region.id,
        sales_channel_id: salesChannel.id,
        email: "buyer@example.com",
        currency_code: "idr",
        status: "pending",
        items: [{ title: "Kaos M", variant_id: variantId, quantity: 2, unit_price: 20000 }],
        shipping_methods: [{ name: "Regular", amount: 10000, shipping_option_id: shippingOption.id }]
      }
    })
  ).result;
  const line = first(order.items);

  // `createOrderWorkflow` validates availability but does not reserve; the fulfillment workflow
  // requires the reservation to exist, so the fixture creates it here exactly as order import does.
  await createReservationsWorkflow(container).run({
    input: {
      reservations: [
        {
          inventory_item_id: inventoryItemId,
          location_id: stockLocation.id,
          quantity: 2,
          line_item_id: line.id
        }
      ]
    }
  });

  process.stdout.write(
    `SEED=${JSON.stringify({
      orderId: order.id,
      variantSku,
      quantity: 2,
      shippingOptionId: shippingOption.id,
      stockLocationId: stockLocation.id
    })}\n`
  );
}
