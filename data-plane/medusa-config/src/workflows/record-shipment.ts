import {
  createOrderFulfillmentWorkflow,
  createShipmentWorkflow
} from "@medusajs/medusa/core-flows";
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

/**
 * Record a booked courier shipment against one of the tenant's orders (docs/adr/0020, docs/PLAN.md M7).
 *
 * The courier has already issued a waybill by the time the worker calls this: the shipment itself
 * happened in the integration plane, where the platform-owned courier key and the shared governor
 * live (ADR 0003, ADR 0020). This workflow is the tenant-side half — it turns "order X shipped with
 * waybill Y" into the engine's own Fulfillment record, so the shipment is visible to the seller and
 * the reserved stock is released.
 *
 * Two engine workflows, in this order, and the order is load-bearing:
 *
 *   1. `createOrderFulfillmentWorkflow` takes the reserved units out of stock and creates the
 *      fulfillment. It runs first because it is what consumes the inventory reservation the order
 *      created at import; a shipment for items that were never fulfilled has nothing to ship.
 *   2. `createShipmentWorkflow` stamps the fulfillment shipped and records the label. Splitting them
 *      is deliberate — an order can be packed before it is handed to a courier — but this workflow
 *      books air/resi at a courier, so the two happen together.
 *
 * The waybill arrives as a fulfillment label, Medusa's own field for it, so nothing is added to a
 * core table (AGENTS.md §2.2) and it survives where the engine and the seller UI already read
 * labels. The chosen courier is mirrored into the fulfillment's `metadata` for the seller to see.
 *
 * The one check this adds over the engine is that a fulfillment for this order and waybill is not
 * already recorded. Nothing else is re-implemented: which location the units come from and whether
 * the reservations exist are enforced by the engine's own steps.
 */

export interface RecordShipmentInput {
  readonly orderId: string;
  readonly items: readonly {
    readonly sku: string;
    readonly quantity: number;
  }[];
  /** The courier's waybill. */
  readonly trackingNumber: string;
  /** A buyer-followable URL. `null` when the courier returned none. */
  readonly trackingUrl: string | null;
  /** The stock location the units ship from. Optional; the engine resolves it from the shipping option. */
  readonly locationId?: string | null;
  /** The Medusa shipping option the order's shipping method names. Optional for the same reason. */
  readonly shippingOptionId?: string | null;
  /** The chosen courier, recorded on the fulfillment's metadata for the seller to see. */
  readonly courier: string;
  readonly serviceLevel: string;
}

export interface RecordShipmentResult {
  readonly fulfillmentId: string;
  readonly trackingNumber: string;
}

export const recordShipmentWorkflowId = "record-shipment";

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
  }): Promise<{
    data: {
      id: string;
      items?: readonly { id: string; quantity: number; variant?: { sku: string | null } | null }[];
      fulfillments?: readonly {
        id: string;
        labels?: readonly { tracking_number: string }[];
      }[];
    }[];
  }>;
}

/**
 * Reads the order once: its line items (to resolve our SKUs to Medusa line item ids) and its
 * fulfillments (to reuse a record the same waybill already produced).
 *
 * The worker knows a shipment as "these SKUs, this many units", the same shape it uses to create an
 * order; the line item ids are the engine's own and are resolved here rather than asked of the
 * worker, so the worker's contract does not grow an order-internals read.
 *
 * The reuse half prevents a *second* fulfillment on a retried worker. The engine has no idempotency
 * key on `createOrderFulfillmentWorkflow`, so without this a retry would fulfill the items twice and
 * consume the reservation twice. The waybill is the natural key — a corrected waybill is genuinely
 * a new label and does get its own record.
 *
 * A SKU the order does not contain is a hard failure, not a silent skip: shipping "one of two items"
 * without saying so would leave the order permanently part-shipped with no visible cause.
 */
const resolveShipmentStep = createStep(
  "resolve-shipment",
  async (input: RecordShipmentInput, { container }) => {
    const query = container.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "items.id",
        "items.quantity",
        "items.variant.sku",
        "fulfillments.id",
        "fulfillments.labels.tracking_number"
      ],
      filters: { id: input.orderId }
    });
    const order = data[0];
    if (order === undefined) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${input.orderId} was not found.`);
    }

    const fulfillments = order.fulfillments ?? [];
    const existing = fulfillments.find((fulfillment) =>
      (fulfillment.labels ?? []).some((label) => label.tracking_number === input.trackingNumber)
    );
    if (existing !== undefined) {
      return new StepResponse<ResolvedShipment>({
        existing: { fulfillmentId: existing.id, trackingNumber: input.trackingNumber },
        lineItems: []
      });
    }

    const lineItems = input.items.map((item) => {
      const matches = (order.items ?? []).filter((orderItem) => orderItem.variant?.sku === item.sku);
      if (matches.length !== 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Shipment SKU ${item.sku} matches ${matches.length} line items on order ${input.orderId}; exactly one is required.`
        );
      }
      const lineItem = matches[0]!;
      if (item.quantity > lineItem.quantity) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Shipment wants ${item.quantity} of ${item.sku} but the order has only ${lineItem.quantity}.`
        );
      }
      return { lineItemId: lineItem.id, quantity: item.quantity };
    });

    return new StepResponse<ResolvedShipment>({ existing: null, lineItems });
  }
);

interface ResolvedShipment {
  readonly existing: RecordShipmentResult | null;
  readonly lineItems: readonly { readonly lineItemId: string; readonly quantity: number }[];
}

const createShipmentRecordStep = createStep(
  "create-shipment-record",
  async (
    input: { readonly shipment: RecordShipmentInput; readonly resolved: ResolvedShipment },
    { container }
  ) => {
    // The order already has a fulfillment carrying this exact waybill: the shipment is recorded, so
    // report it rather than creating a second one.
    if (input.resolved.existing !== null) {
      return new StepResponse(input.resolved.existing);
    }

    const { shipment, resolved } = input;
    if (resolved.lineItems.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A shipment must name at least one order line item to fulfill."
      );
    }

    const fulfillment = (
      await createOrderFulfillmentWorkflow(container).run({
        input: {
          order_id: shipment.orderId,
          items: resolved.lineItems.map((item) => ({ id: item.lineItemId, quantity: item.quantity })),
          ...(shipment.locationId ? { location_id: shipment.locationId } : {}),
          ...(shipment.shippingOptionId ? { shipping_option_id: shipment.shippingOptionId } : {}),
          metadata: { courier: shipment.courier, service_level: shipment.serviceLevel }
        }
      })
    ).result;

    // The shipment stamps the fulfillment shipped and records the waybill. The label is set here and
    // not at fulfillment creation deliberately: `createFulfillmentWorkflow` asks the provider for the
    // labels and the manual provider answers with an empty list, which overwrites whatever was passed
    // in. Recording it on the shipment is the only path that persists it.
    await createShipmentWorkflow(container).run({
      input: {
        id: fulfillment.id,
        labels: [
          {
            tracking_number: shipment.trackingNumber,
            tracking_url: shipment.trackingUrl ?? "",
            label_url: ""
          }
        ]
      }
    });

    return new StepResponse<RecordShipmentResult>({
      fulfillmentId: fulfillment.id,
      trackingNumber: shipment.trackingNumber
    });
  }
);

export const recordShipmentWorkflow = createWorkflow(
  recordShipmentWorkflowId,
  (input: RecordShipmentInput) => {
    const resolved = resolveShipmentStep(input);
    const result = createShipmentRecordStep({ shipment: input, resolved });
    return new WorkflowResponse(result);
  }
);
