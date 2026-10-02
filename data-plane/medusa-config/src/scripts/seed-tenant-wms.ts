/**
 * Fixture for the M6 WMS end-to-end test (docs/adr/0018).
 *
 * Run by `medusa exec` inside the tenant's own Medusa project, so it imports `@medusajs/*` directly
 * and calls the tenant's Admin API over HTTP for our own routes: the routes, the workflows and the
 * middlewares are the thing under test, and calling them over HTTP is the only way to exercise the
 * whole chain the operator console uses.
 *
 * It sets up the minimum a receipt needs — a stock location, a sales channel, a published product
 * whose variant carries a barcode, and a warehouse whose bins cover all three kinds — then walks the
 * M6 flow: create a purchase order, receive it, put the units away, pick them against a barcode, and
 * count the bin. It prints one `SEED=` JSON line with the ids the test asserts against.
 *
 * The barcode matters: `scanPickLineWorkflow` refuses a scan that does not match the variant's
 * barcode, so the fixture has to give the variant one for a successful pick to be possible.
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import {
  createProductsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow
} from "@medusajs/medusa/core-flows";

interface AdminClient {
  post<T>(path: string, body: unknown): Promise<T>;
  get<T>(path: string): Promise<T>;
}

function adminClient(baseUrl: string, secretKey: string): AdminClient {
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  return {
    async post<T>(path: string, body: unknown): Promise<T> {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`POST ${path} failed (${response.status}): ${text.slice(0, 500)}`);
      }
      return JSON.parse(text) as T;
    },
    async get<T>(path: string): Promise<T> {
      const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: auth } });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`GET ${path} failed (${response.status}): ${text.slice(0, 500)}`);
      }
      return JSON.parse(text) as T;
    }
  };
}

export default async function seed({ container }: { container: MedusaContainer }): Promise<void> {
  const baseUrl = process.env.SEED_BASE_URL;
  const secretKey = process.env.SEED_SECRET_KEY;
  if (!baseUrl || !secretKey) {
    throw new Error("The fixture needs SEED_BASE_URL and SEED_SECRET_KEY to call the tenant Admin API.");
  }
  const api = adminClient(baseUrl, secretKey);

  const sku = process.env.SEED_VARIANT_SKU ?? "WMS-SKU-1";
  const barcode = process.env.SEED_VARIANT_BARCODE ?? "8991000000017";

  const salesChannel = first(
    (
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "Default", description: "wms test" }] }
      })
    ).result
  );

  const stockLocation = first(
    (
      await createStockLocationsWorkflow(container).run({
        input: { locations: [{ name: "Gudang Utama" }] }
      })
    ).result
  );

  const product = first(
    (
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Kaos WMS",
              status: "published",
              sales_channels: [{ id: salesChannel.id }],
              options: [{ title: "Size", values: ["M"] }],
              variants: [
                {
                  title: "Kaos WMS M",
                  sku,
                  barcode,
                  manage_inventory: true,
                  options: { Size: "M" },
                  prices: [{ amount: 20000, currency_code: "idr" }]
                }
              ]
            }
          ]
        }
      })
    ).result
  );
  const variant = first(product.variants);

  // The layout: one warehouse bound to the stock location, and one bin of each kind. Put-away
  // asserts staging → storage and picks collect into packing, so all three must exist.
  const warehouse = (
    await api.post<{ warehouse: { id: string } }>("/admin/wms/warehouses", {
      name: "Gudang Utama",
      stockLocationId: stockLocation.id
    })
  ).warehouse;
  const staging = (
    await api.post<{ bin: { id: string } }>("/admin/wms/bins", {
      warehouseId: warehouse.id,
      code: "STG-01",
      kind: "staging"
    })
  ).bin;
  const storage = (
    await api.post<{ bin: { id: string } }>("/admin/wms/bins", {
      warehouseId: warehouse.id,
      code: "A-01-01",
      kind: "storage"
    })
  ).bin;
  const packing = (
    await api.post<{ bin: { id: string } }>("/admin/wms/bins", {
      warehouseId: warehouse.id,
      code: "PACK-01",
      kind: "packing"
    })
  ).bin;

  const purchaseOrder = (
    await api.post<{ purchaseOrder: { id: string } }>("/admin/wms/purchase-orders", {
      warehouseId: warehouse.id,
      supplierReference: "PO-2026-001",
      lines: [{ sku, title: "Kaos WMS M", orderedQuantity: 10 }]
    })
  ).purchaseOrder;

  const receipt = await api.post<{
    receipt: { status: string; received: { sku: string; quantity: number }[] };
  }>(`/admin/wms/purchase-orders/${purchaseOrder.id}/receive`, {
    lines: [{ sku, quantity: 10 }],
    actor: "seed"
  });

  await api.post("/admin/wms/put-away", {
    warehouseId: warehouse.id,
    fromBinId: staging.id,
    toBinId: storage.id,
    sku,
    quantity: 10,
    actor: "seed"
  });

  const pickTask = (
    await api.post<{ pickTask: { pickTaskId: string; lines: { expectedBarcode: string | null }[] } }>(
      "/admin/wms/pick-tasks",
      {
        warehouseId: warehouse.id,
        orderId: "order_seed_wms",
        packingBinId: packing.id,
        lines: [{ sku, quantity: 4 }]
      }
    )
  ).pickTask;

  const scan = await api.post<{ scan: { status: string } }>(`/admin/wms/pick-tasks/${pickTask.pickTaskId}/scans`, {
    sku,
    barcode,
    quantity: 4,
    actor: "seed"
  });

  const stocktake = (
    await api.post<{ stocktake: { stocktakeId: string; systemQuantity: number } }>("/admin/wms/stocktakes", {
      warehouseId: warehouse.id,
      binId: storage.id,
      sku
    })
  ).stocktake;
  const applied = await api.post<{ stocktake: { variance: number; quantityAfter: number } }>(
    `/admin/wms/stocktakes/${stocktake.stocktakeId}/apply`,
    { countedQuantity: 5, countedBy: "seed" }
  );

  const storageContents = await api.get<{ contents: { sku: string; quantity: number }[] }>(
    `/admin/wms/bins/${storage.id}/contents`
  );
  const packingContents = await api.get<{ contents: { sku: string; quantity: number }[] }>(
    `/admin/wms/bins/${packing.id}/contents`
  );

  process.stdout.write(
    `SEED=${JSON.stringify({
      sku,
      barcode,
      variantId: variant.id,
      stockLocationId: stockLocation.id,
      warehouseId: warehouse.id,
      stagingBinId: staging.id,
      storageBinId: storage.id,
      packingBinId: packing.id,
      purchaseOrderId: purchaseOrder.id,
      receiptStatus: receipt.receipt.status,
      pickTaskId: pickTask.pickTaskId,
      expectedBarcode: pickTask.lines[0]?.expectedBarcode ?? null,
      pickStatus: scan.scan.status,
      stocktakeSystemQuantity: stocktake.systemQuantity,
      stocktakeVariance: applied.stocktake.variance,
      storageContents: storageContents.contents,
      packingContents: packingContents.contents
    })}\n`
  );
}

function first<T>(values: readonly T[] | undefined): T {
  const value = values?.[0];
  if (value === undefined) {
    throw new Error("The fixture expected Medusa to create at least one record and it created none.");
  }
  return value;
}
