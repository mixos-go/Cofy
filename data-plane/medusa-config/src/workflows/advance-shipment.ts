import { updateFulfillmentWorkflow } from "@medusajs/medusa/core-flows";
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

/**
 * Advance a shipment's recorded delivery status (docs/adr/0021, docs/PLAN.md M7).
 *
 * The delivery-status pull path (`shipment.track`) walks the tenant's active shipments, asks the
 * channel or the courier for the newest event, and then has to write the advance into the tenant's
 * own engine. This is that write. It is deliberately the *only* thing it does: which event is newest
 * and whether it is an advance is the pass's decision, taken in the worker against the normalised
 * contract; the engine just records it where the seller UI already reads shipments.
 *
 * Where the record lives: on the fulfillment's own `metadata`, not in a new table. Medusa v2 forbids
 * a custom module adding a column to a core table (AGENTS.md §2.2), and the fulfillment *is* the
 * shipment record we created at booking time (`recordShipmentWorkflow`). The status and the
 * normalised events hang off the same row, so the seller reads one record and there is nothing to
 * keep in sync. A `delivered` advance additionally stamps the engine's own `delivered_at`, so the
 * order's fulfillment state agrees without a second write path.
 *
 * Idempotent on the status (AGENTS.md §2.4): a pass that re-reads a shipment and finds the same
 * newest status writes nothing. A retried call therefore converges rather than appending a duplicate
 * event, which is why the check is on the recorded status rather than on the event list.
 */

export interface AdvanceShipmentInput {
  readonly fulfillmentId: string;
  readonly status: string;
  readonly events: readonly {
    readonly status: string;
    readonly occurredAt: string;
    readonly description: string;
  }[];
}

/** Bound on stored events, so a long-lived shipment cannot grow its metadata without limit. */
const MAX_STORED_EVENTS = 50;

interface QueryGraph {
  graph(input: {
    entity: string;
    fields: string[];
    filters: Record<string, unknown>;
  }): Promise<{
    data: {
      id: string;
      metadata?: Record<string, unknown> | null;
    }[];
  }>;
}

interface FulfillmentRecord {
  readonly id: string;
  readonly currentStatus: string | null;
  readonly priorEvents: readonly unknown[];
}

const readFulfillmentStep = createStep(
  "read-shipment-status",
  async (input: AdvanceShipmentInput, { container }) => {
    const query = container.resolve<QueryGraph>(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "metadata"],
      filters: { id: input.fulfillmentId }
    });
    const fulfillment = data[0];
    if (fulfillment === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Fulfillment ${input.fulfillmentId} was not found.`
      );
    }
    const metadata = (fulfillment.metadata ?? {}) as Record<string, unknown>;
    const priorEvents = Array.isArray(metadata.shipment_events) ? metadata.shipment_events : [];
    return new StepResponse<FulfillmentRecord>({
      id: fulfillment.id,
      currentStatus: typeof metadata.shipment_status === "string" ? metadata.shipment_status : null,
      priorEvents
    });
  }
);

const writeStatusStep = createStep(
  "write-shipment-status",
  async (
    input: { readonly advance: AdvanceShipmentInput; readonly record: FulfillmentRecord },
    { container }
  ) => {
    const { advance, record } = input;

    // The recorded status already is this one: a re-read that found nothing new. Writing it again
    // would append a duplicate event, so the pass's convergence depends on this early return.
    if (record.currentStatus === advance.status) {
      return new StepResponse({ advanced: false, status: advance.status });
    }

    const previous = Array.isArray(record.priorEvents) ? record.priorEvents : [];
    const merged = [...previous, ...advance.events].slice(-MAX_STORED_EVENTS);

    await updateFulfillmentWorkflow(container).run({
      input: {
        id: advance.fulfillmentId,
        metadata: {
          shipment_status: advance.status,
          shipment_events: merged
        },
        // A delivered shipment stamps the engine's own date, so the order's fulfillment state is
        // consistent with the status the seller sees. Only forward-delivery does this; a failed or
        // returned shipment keeps its record and lets reconciliation/support decide the next step.
        ...(advance.status === "delivered" ? { delivered_at: new Date() } : {})
      }
    });

    return new StepResponse({ advanced: true, status: advance.status });
  }
);

export const advanceShipmentWorkflow = createWorkflow(
  "advance-shipment",
  (input: AdvanceShipmentInput) => {
    const record = readFulfillmentStep(input);
    const result = writeStatusStep({ advance: input, record });
    return new WorkflowResponse(result);
  }
);
