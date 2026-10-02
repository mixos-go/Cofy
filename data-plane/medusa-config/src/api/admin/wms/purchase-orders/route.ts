import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import type { CreatePurchaseOrderBody } from "../validators.ts";

interface PurchaseOrderService {
  createPurchaseOrders(input: Record<string, unknown>): Promise<{ id: string }>;
  createPurchaseOrderLines(input: Record<string, unknown>[]): Promise<{ id: string }[]>;
  listPurchaseOrders(
    filters: Record<string, unknown>
  ): Promise<{ id: string; warehouse_id: string; supplier_reference: string | null; status: string; received_at: Date | null }[]>;
}

interface WmsWarehouseService {
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string }[]>;
}

/**
 * Create a purchase order and its lines, or list the tenant's purchase orders.
 *
 * A PO starts `ordered` and its lines start with `received_quantity` 0; receiving is what advances
 * them, and the status is derived from the lines rather than set here. The warehouse is checked to
 * exist because a PO that points at no warehouse has nowhere to receive into (docs/adr/0018).
 */
export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "TENANT_ID is not set on this tenant instance; refusing to create a purchase order."
    );
  }

  const purchaseOrders = req.scope.resolve<PurchaseOrderService>("purchaseOrder");
  const wms = req.scope.resolve<WmsWarehouseService>("wms");
  const body = req.validatedBody as unknown as CreatePurchaseOrderBody;

  const [warehouse] = await wms.listWarehouses({ id: body.warehouseId });
  if (!warehouse) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, `Warehouse ${body.warehouseId} was not found.`);
  }

  const purchaseOrder = await purchaseOrders.createPurchaseOrders({
    tenant_id: tenantId,
    warehouse_id: warehouse.id,
    supplier_reference: body.supplierReference ?? null,
    status: "ordered",
    expected_at: body.expectedAt ?? null
  });
  const lines = await purchaseOrders.createPurchaseOrderLines(
    body.lines.map((line) => ({
      purchase_order_id: purchaseOrder.id,
      sku: line.sku,
      title: line.title,
      ordered_quantity: line.orderedQuantity,
      received_quantity: 0
    }))
  );

  res.status(201).json({
    purchaseOrder: {
      id: purchaseOrder.id,
      warehouseId: warehouse.id,
      status: "ordered",
      lines: body.lines.map((line, index) => ({
        id: lines[index]!.id,
        sku: line.sku,
        orderedQuantity: line.orderedQuantity
      }))
    }
  });
};

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const purchaseOrders = req.scope.resolve<PurchaseOrderService>("purchaseOrder");
  const warehouseId = req.query.warehouseId as string | undefined;
  const orders = await purchaseOrders.listPurchaseOrders(warehouseId ? { warehouse_id: warehouseId } : {});

  res.status(200).json({
    purchaseOrders: orders.map((order) => ({
      id: order.id,
      warehouseId: order.warehouse_id,
      supplierReference: order.supplier_reference,
      status: order.status,
      receivedAt: order.received_at
    }))
  });
};
