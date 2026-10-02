import { MedusaService } from "@medusajs/framework/utils";

import PurchaseOrder from "../models/purchase-order.ts";
import PurchaseOrderLine from "../models/purchase-order-line.ts";

/**
 * The allowed `purchase_order.status` values, in one place so the check is reviewable and testable.
 *
 * These are `text` in the database, not a Postgres enum, for the reason in docs/adr/0018: an enum
 * type is database-global and would break the second tenant's migration. The database will not
 * reject a bad status written by hand, so the service is the gate.
 */
export const PURCHASE_ORDER_STATUSES = ["draft", "ordered", "partially_received", "received", "canceled"] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export function isPurchaseOrderStatus(value: string): value is PurchaseOrderStatus {
  return (PURCHASE_ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * CRUD over purchase orders and their lines, plus the status transition receiving performs.
 *
 * `MedusaService` generates `createPurchaseOrders`, `listPurchaseOrderLines`, and so on from the two
 * models. The hand-written method is the status derivation, because "this PO is now complete" is a
 * rule about the sum of its lines and not a column the caller should be trusted to set.
 */
class PurchaseOrderModuleService extends MedusaService({ PurchaseOrder, PurchaseOrderLine }) {
  /**
   * Recomputes a PO's status from its lines after a receipt.
   *
   * Deriving it here rather than letting the receiving route pass a status keeps one definition of
   * "complete": a line is satisfied when `received_quantity >= ordered_quantity`, and the PO is
   * `received` only when every line is. Anything in between is `partially_received`, which is the
   * state a receiving screen must show rather than a half-open PO that looks finished.
   */
  async refreshStatus(purchaseOrderId: string): Promise<PurchaseOrderStatus> {
    const lines = await this.listPurchaseOrderLines({ purchase_order_id: purchaseOrderId });

    const complete = lines.length > 0 && lines.every((line) => line.received_quantity >= line.ordered_quantity);
    const status: PurchaseOrderStatus = complete ? "received" : "partially_received";

    // `received_at` is set with the status, not by the caller: it is the moment the order became
    // complete, and a caller-supplied timestamp could disagree with the status it accompanies.
    await this.updatePurchaseOrders({
      id: purchaseOrderId,
      status,
      received_at: complete ? new Date() : null
    });
    return status;
  }
}

export default PurchaseOrderModuleService;
