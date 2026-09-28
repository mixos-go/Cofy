import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";

import { createChannelOrderWorkflow } from "../../../workflows/create-channel-order.ts";
import { assertIdrCurrency } from "../../../lib/money.ts";
import type { CreateOrderBody } from "../validators.ts";

/**
 * Import one marketplace order into the tenant's Medusa (M3 write path).
 *
 * This is the tenant-side implementation of the worker's `commerce.createOrder` (ADR 0010: commerce
 * writes go through the tenant's Medusa; sync state stays in the control plane).
 *
 * Two things the contract requires and this route is responsible for:
 *
 * - **The idempotency key is honoured.** It arrives as the `idempotency-key` header (the worker's
 *   transport sends it there, not in the body) and is passed to the workflow engine as
 *   `context.transactionId`. Note what that does and does not buy: with the engine configured here
 *   (in-memory), a completed execution is not persisted, so a retry is **not** resumed from the
 *   recorded transaction — the flow re-runs. The durable guarantee is the `channel_order_link`
 *   unique index: the re-run fails at the link insert, rolls back, and the original order stands.
 *   Verified against a live instance: a repeated key returns the "already exists" error, it does
 *   not create a second order or a second reservation.
 * - **The tenant is the instance.** `tenantId` is read from the environment (the instance's own
 *   identity), never from the request. A caller cannot ask one tenant's engine to write another's
 *   rows.
 *
 * The route returns only the order id: the worker's `createOrder` port resolves to
 * `{ orderId }`, and returning more would invite the worker to depend on shapes the contract does
 * not name.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<CreateOrderBody>,
  res: MedusaResponse
): Promise<void> => {
  const tenantId = process.env.TENANT_ID;
  if (!tenantId) {
    // A misconfigured instance must fail loudly rather than write a link with an empty tenant.
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "TENANT_ID is not set on this tenant instance; refusing to import an order."
    );
  }

  const idempotencyKey = req.headers["idempotency-key"];
  if (typeof idempotencyKey !== "string" || idempotencyKey === "") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "The idempotency-key header is required; an order import without one cannot be retried safely."
    );
  }

  const { result } = await createChannelOrderWorkflow(req.scope).run({
    input: {
      order: assertIdrOrder(req.validatedBody.order),
      lines: req.validatedBody.lines,
      tenantId
    },
    context: {
      // Deterministic transaction id: same key, same transaction. This buys transaction identity,
      // not resume — the configured engine does not persist executions, so a retry re-runs the flow
      // and is stopped by the channel_order_link unique index (see this route's docstring).
      transactionId: idempotencyKey
    }
  });

  res.status(200).json({ orderId: result.orderId });
};

/**
 * Refuses a payload that is not IDR before it reaches the workflow.
 *
 * The currency check is a request-time concern: the workflow's composer runs at module load (see
 * `create-channel-order.ts`), so it cannot host a runtime guard. Relabelling another currency's
 * minor units as rupiah would price the order wrongly with no error anywhere, so it is a hard
 * failure here rather than a coercion.
 */
function assertIdrOrder(order: CreateOrderBody["order"]): CreateOrderBody["order"] {
  assertIdrCurrency(order.currency);
  return order;
}
