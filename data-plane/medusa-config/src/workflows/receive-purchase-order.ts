import { adjustInventoryLevelsStep } from "@medusajs/medusa/core-flows";
import { createStep, createWorkflow, StepResponse, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

import { resolveInventoryItemsStep } from "../steps/wms-inventory.ts";

/**
 * Receive a purchase order: post the delivered units into the warehouse's staging bin and raise the
 * Medusa inventory level at the warehouse's stock location, in one workflow.
 *
 * This is the M6 exit criterion "a received PO increases available stock at a specific bin", and the
 * two halves are deliberately in the same transaction:
 *
 *   - the **WMS ledger** records where the units are (a `receipt` movement into the staging bin);
 *   - the **Medusa inventory level** is adjusted by the same quantity, through the engine's own
 *     `adjustInventoryLevelsStep`, so availability — and therefore the stock the M4 push sends to a
 *     channel — reflects the delivery.
 *
 * If either half fails the whole thing rolls back, so there is never a bin holding units the engine
 * cannot sell or an engine holding units no bin can find. Nothing here writes a core table and
 * nothing is forked (AGENTS.md §2.1–2.2, docs/adr/0018).
 *
 * The units land in a **staging** bin, not a storage bin: a delivery is not sellable stock until
 * someone shelves it, and put-away is the separate step that relocates it. Put-away moves units bin
 * to bin and touches no inventory level, because the level already moved here.
 */

interface PurchaseOrderService {
  listPurchaseOrders(
    filters: Record<string, unknown>
  ): Promise<{ id: string; warehouse_id: string; status: string; tenant_id: string }[]>;
  listPurchaseOrderLines(
    filters: Record<string, unknown>
  ): Promise<{ id: string; sku: string; ordered_quantity: number; received_quantity: number }[]>;
  updatePurchaseOrderLines(input: { id: string; received_quantity: number }[]): Promise<unknown>;
  refreshStatus(purchaseOrderId: string): Promise<string>;
}

interface WmsService {
  listWarehouses(filters: Record<string, unknown>): Promise<{ id: string; stock_location_id: string | null }[]>;
  listBins(filters: Record<string, unknown>): Promise<{ id: string; code: string }[]>;
  recordMovement(input: {
    warehouseId: string;
    binId: string;
    sku: string;
    kind: string;
    delta: number;
    reason?: string | null;
    actor?: string | null;
  }): Promise<{ id: string; delta: number }>;
}

export interface ReceivePurchaseOrderInput {
  readonly purchaseOrderId: string;
  readonly lines: readonly { readonly sku: string; readonly quantity: number }[];
  readonly actor?: string | null;
}

export const receivePurchaseOrderWorkflowId = "receive-purchase-order";

interface ReceiptLine {
  readonly lineId: string;
  readonly sku: string;
  readonly quantity: number;
}

/**
 * Reads the PO, its outstanding lines and the staging bin the delivery lands in.
 *
 * The over-receipt check is here rather than in the route because it needs the line's current
 * `received_quantity`, which only exists in the tenant. Rejecting it names the SKU and the two
 * numbers, so a receiving clerk can see whether they scanned the wrong line or the PO is wrong.
 */
const resolveReceiptStep = createStep(
  "resolve-wms-receipt",
  async (input: ReceivePurchaseOrderInput, { container }) => {
    const purchaseOrders = container.resolve<PurchaseOrderService>("purchaseOrder");
    const wms = container.resolve<WmsService>("wms");

    const [purchaseOrder] = await purchaseOrders.listPurchaseOrders({ id: input.purchaseOrderId });
    if (!purchaseOrder) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Purchase order ${input.purchaseOrderId} was not found.`
      );
    }
    if (purchaseOrder.status === "canceled") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Purchase order ${input.purchaseOrderId} is canceled and cannot receive stock.`
      );
    }

    const [warehouse] = await wms.listWarehouses({ id: purchaseOrder.warehouse_id });
    if (!warehouse?.stock_location_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Warehouse ${purchaseOrder.warehouse_id} has no stock location, so received stock has nowhere to land.`
      );
    }

    const stagingBins = await wms.listBins({ warehouse_id: warehouse.id, kind: "staging" });
    const stagingBin = stagingBins[0];
    if (!stagingBin) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Warehouse ${warehouse.id} has no staging bin to receive into.`
      );
    }

    const orderLines = await purchaseOrders.listPurchaseOrderLines({ purchase_order_id: purchaseOrder.id });
    const lineBySku = new Map(orderLines.map((line) => [line.sku, line]));

    const lines: ReceiptLine[] = input.lines.map((received) => {
      const line = lineBySku.get(received.sku);
      if (!line) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Purchase order ${purchaseOrder.id} has no line for SKU ${received.sku}.`
        );
      }
      const outstanding = line.ordered_quantity - line.received_quantity;
      if (received.quantity > outstanding) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SKU ${received.sku} has ${outstanding} outstanding on this order; ${received.quantity} cannot be received.`
        );
      }
      return { lineId: line.id, sku: line.sku, quantity: received.quantity };
    });

    return new StepResponse({
      purchaseOrderId: purchaseOrder.id,
      warehouseId: warehouse.id,
      locationId: warehouse.stock_location_id,
      stagingBinId: stagingBin.id,
      lines
    });
  }
);

interface ResolvedReceipt {
  readonly purchaseOrderId: string;
  readonly warehouseId: string;
  readonly locationId: string;
  readonly stagingBinId: string;
  readonly lines: readonly ReceiptLine[];
}

/**
 * Appends the `receipt` movements that put the units in the staging bin.
 *
 * One movement per line, all inserted. A bin's quantity is the sum of its deltas, so this cannot
 * overwrite a concurrent receipt (docs/adr/0018). The compensation appends the mirror movement
 * instead of deleting the row: the ledger is append-only, and a rollback that erased its own history
 * would make the audit trail lie.
 */
const recordReceiptMovementsStep = createStep(
  "record-wms-receipt-movements",
  async (input: ResolvedReceipt, { container }) => {
    const wms = container.resolve<WmsService>("wms");

    const movements = [];
    for (const line of input.lines) {
      movements.push(
        await wms.recordMovement({
          warehouseId: input.warehouseId,
          binId: input.stagingBinId,
          sku: line.sku,
          kind: "receipt",
          delta: line.quantity,
          reason: input.purchaseOrderId
        })
      );
    }

    return new StepResponse(
      { movements },
      { warehouseId: input.warehouseId, stagingBinId: input.stagingBinId, lines: input.lines }
    );
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const wms = container.resolve<WmsService>("wms");
    for (const line of compensation.lines) {
      await wms.recordMovement({
        warehouseId: compensation.warehouseId,
        binId: compensation.stagingBinId,
        sku: line.sku,
        kind: "adjustment",
        delta: -line.quantity,
        reason: "rollback:receive-purchase-order"
      });
    }
  }
);

interface PurchaseOrderLineService {
  listPurchaseOrderLines(filters: Record<string, unknown>): Promise<{ id: string; received_quantity: number }[]>;
  updatePurchaseOrderLines(input: { id: string; received_quantity: number }[]): Promise<unknown>;
  refreshStatus(purchaseOrderId: string): Promise<string>;
}

/**
 * Advances each line's `received_quantity` and recomputes the PO's status.
 *
 * The increment is read-then-write, and unlike the bin quantity it is a stored counter. That is
 * acceptable here because the status is derived from it and a lost increment is repaired by the next
 * receipt or a stocktake, not by a channel: the quantity channels see is the inventory level, which
 * `adjustInventoryLevelsStep` moves under its own lock. The compensation restores the previous value.
 */
const advancePurchaseOrderStep = createStep(
  "advance-wms-purchase-order",
  async (input: { purchaseOrderId: string; lines: readonly ReceiptLine[] }, { container }) => {
    const purchaseOrders = container.resolve<PurchaseOrderLineService>("purchaseOrder");
    const current = await purchaseOrders.listPurchaseOrderLines({
      id: input.lines.map((line) => line.lineId)
    });
    const receivedById = new Map(current.map((line) => [line.id, line.received_quantity]));

    const updates = input.lines.map((line) => ({
      id: line.lineId,
      received_quantity: (receivedById.get(line.lineId) ?? 0) + line.quantity
    }));
    await purchaseOrders.updatePurchaseOrderLines(updates);

    const status = await purchaseOrders.refreshStatus(input.purchaseOrderId);

    return new StepResponse({ status }, { previous: updates.map((update) => ({
      id: update.id,
      received_quantity: receivedById.get(update.id) ?? 0
    })) });
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const purchaseOrders = container.resolve<PurchaseOrderLineService>("purchaseOrder");
    await purchaseOrders.updatePurchaseOrderLines([...compensation.previous]);
  }
);

export const receivePurchaseOrderWorkflow = createWorkflow(
  receivePurchaseOrderWorkflowId,
  (input: ReceivePurchaseOrderInput) => {
    const receipt = resolveReceiptStep(input);

    const skus = transform({ receipt }, ({ receipt }) => receipt.lines.map((line) => line.sku));
    const locationId = transform({ receipt }, ({ receipt }) => receipt.locationId);
    const inventory = resolveInventoryItemsStep({ skus, locationId });

    const movementInput = transform({ receipt }, ({ receipt }): ResolvedReceipt => ({
      purchaseOrderId: receipt.purchaseOrderId,
      warehouseId: receipt.warehouseId,
      locationId: receipt.locationId,
      stagingBinId: receipt.stagingBinId,
      lines: receipt.lines
    }));
    recordReceiptMovementsStep(movementInput);

    // The engine's own adjustment, under its own lock. This is what makes the received units
    // available to sell and visible to the channel push, without touching a core table.
    const adjustments = transform(
      { receipt, inventory },
      ({ receipt, inventory }) =>
        inventory.items.map((item) => ({
          inventory_item_id: item.inventoryItemId,
          location_id: item.locationId,
          adjustment: receipt.lines.find((line) => line.sku === item.sku)?.quantity ?? 0
        }))
    );
    adjustInventoryLevelsStep(adjustments);

    const advanced = advancePurchaseOrderStep(
      transform({ receipt }, ({ receipt }) => ({
        purchaseOrderId: receipt.purchaseOrderId,
        lines: receipt.lines
      }))
    );

    return new WorkflowResponse(
      transform({ receipt, advanced }, ({ receipt, advanced }) => ({
        purchaseOrderId: receipt.purchaseOrderId,
        stagingBinId: receipt.stagingBinId,
        locationId: receipt.locationId,
        status: advanced.status,
        received: receipt.lines.map((line) => ({ sku: line.sku, quantity: line.quantity }))
      }))
    );
  }
);
