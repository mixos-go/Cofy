import {
  createOrderWorkflow,
  createRemoteLinkStep,
  reserveInventoryStep
} from "@medusajs/medusa/core-flows";
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse
} from "@medusajs/framework/workflows-sdk";
import { MathBN, MedusaError, Modules, OrderStatus } from "@medusajs/framework/utils";

import { senToMedusaRupiah } from "../lib/money.ts";

/**
 * The platform's normalized order, as the worker sends it (packages/contracts `ChannelOrder`).
 * Amounts are in the platform's minor unit (sen) and are converted here, once.
 */
export interface ChannelOrderInput {
  readonly channel: string;
  readonly externalOrderId: string;
  readonly placedAt: string;
  readonly buyerEmail: string | null;
  readonly currency: string;
  readonly lines: readonly {
    readonly sku: string | null;
    readonly title: string;
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
  readonly totals: {
    readonly subtotal: number;
    readonly shipping: number;
    readonly discount: number;
    readonly grandTotal: number;
  };
}

export interface CreateChannelOrderInput {
  readonly order: ChannelOrderInput;
  readonly lines: readonly { readonly sku: string; readonly variantId: string; readonly quantity: number }[];
  readonly tenantId: string;
}

export const createChannelOrderWorkflowId = "create-channel-order";

interface VariantInventoryView {
  readonly id: string;
  readonly manage_inventory?: boolean;
  readonly allow_backorder?: boolean;
  readonly inventory_items?: readonly {
    readonly inventory_item_id: string;
    readonly required_quantity?: number | string;
    readonly inventory?: {
      readonly location_levels?: readonly {
        readonly location_id: string;
        readonly available_quantity?: number | string;
        readonly stocked_quantity?: number | string;
        readonly reserved_quantity?: number | string;
        readonly stock_locations?: readonly {
          readonly id: string;
          readonly sales_channels?: readonly { readonly id: string }[];
        }[];
      }[];
    } | null;
  }[];
}

/**
 * Chooses the stock location each line item's reservation is taken from.
 *
 * `createOrderWorkflow` validates availability but does not reserve (its own docs defer to
 * `createReservationsWorkflow`), so without this the imported order holds no stock and every channel
 * could sell the same unit. The location is read from the variant's inventory levels rather than
 * configured: a location the sales channel is not associated with would reserve stock the channel
 * cannot actually draw from. Availability is preferred, but a level-less or exhausted location is
 * still used so the reservation fails inside `reserveInventoryStep` with Medusa's own stock error
 * instead of silently succeeding here.
 */
const resolveReservationInputsStep = createStep(
  "resolve-channel-order-reservations",
  async (
    input: {
      readonly items: readonly { readonly id: string; readonly variant_id: string | null; readonly quantity: number }[];
      readonly salesChannelId: string | null;
    },
    { container }
  ) => {
    const variantIds = [...new Set(input.items.map((item) => item.variant_id).filter((id): id is string => !!id))];
    if (!variantIds.length) {
      return new StepResponse({ items: [] });
    }

    const query = container.resolve("query") as {
      graph(input: { entity: string; fields: string[]; filters: Record<string, unknown> }): Promise<{ data: VariantInventoryView[] }>;
    };
    const { data: variants } = await query.graph({
      entity: "variant",
      fields: [
        "id",
        "manage_inventory",
        "allow_backorder",
        "inventory_items.inventory_item_id",
        "inventory_items.required_quantity",
        "inventory_items.inventory.location_levels.location_id",
        "inventory_items.inventory.location_levels.available_quantity",
        "inventory_items.inventory.location_levels.stocked_quantity",
        "inventory_items.inventory.location_levels.reserved_quantity",
        "inventory_items.inventory.location_levels.stock_locations.id",
        "inventory_items.inventory.location_levels.stock_locations.sales_channels.id"
      ],
      filters: { id: variantIds }
    });
    const byVariant = new Map(variants.map((variant) => [variant.id, variant]));

    const items = input.items.flatMap((item) => {
      const variant = item.variant_id ? byVariant.get(item.variant_id) : undefined;
      if (!variant?.manage_inventory) {
        return [];
      }
      const links = variant.inventory_items ?? [];
      if (!links.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${variant.id} has no inventory item, so its stock cannot be reserved.`
        );
      }
      return links.map((link) => {
        const requiredQuantity = Number(MathBN.convert(link.required_quantity ?? 1));
        const levels = (link.inventory?.location_levels ?? []).filter((level) => {
          const locations = level.stock_locations ?? [];
          if (!locations.length) return false;
          if (!input.salesChannelId) return true;
          return locations.some((location) =>
            (location.sales_channels ?? []).some((channel) => channel.id === input.salesChannelId)
          );
        });
        const needed = MathBN.mult(MathBN.convert(requiredQuantity), item.quantity);
        const available = (level: { available_quantity?: number | string; stocked_quantity?: number | string; reserved_quantity?: number | string }) =>
          MathBN.convert(
            level.available_quantity ??
              MathBN.sub(level.stocked_quantity ?? 0, level.reserved_quantity ?? 0)
          );
        const chosen = levels.find((level) => MathBN.gte(available(level), needed)) ?? levels[0];
        if (!chosen) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Variant ${variant.id} is not stocked at any location available to sales channel ${input.salesChannelId ?? "(none)"}.`
          );
        }
        return {
          id: item.id,
          inventory_item_id: link.inventory_item_id,
          required_quantity: requiredQuantity,
          allow_backorder: !!variant.allow_backorder,
          quantity: item.quantity,
          location_ids: [chosen.location_id]
        };
      });
    });

    return new StepResponse({ items });
  }
);

/**
 * Creates the `channel_order_link` row for an external order.
 *
 * Created as its own step so the unique `(tenant_id, channel, external_order_id)` index is the
 * idempotency gate: a second import of the same order fails here and rolls the transaction back,
 * rather than creating a second Medusa order. The compensation dismisses the row, so a rolled-back
 * attempt leaves the key free to retry.
 */
const createChannelOrderLinkStep = createStep(
  "create-channel-order-link",
  async (
    input: { readonly tenantId: string; readonly channel: string; readonly externalOrderId: string },
    { container }
  ) => {
    const service = container.resolve("channelOrderLink") as {
      createChannelOrderLinks(input: Record<string, unknown>): Promise<{ id: string }>;
    };
    const created = await service.createChannelOrderLinks({
      tenant_id: input.tenantId,
      channel: input.channel,
      external_order_id: input.externalOrderId
    });
    return new StepResponse(created);
  },
  async (created, { container }) => {
    if (!created) return;
    // `softDeleteChannelOrderLinks` is the name `MedusaService` generates from the model (pluralized
    // model name + `softDelete`). There is no `dismiss…` method: calling one throws, and because the
    // compensation's error is swallowed the link row survives a failed import. That leaves the
    // partial unique index occupied, so every retry of the same external order fails as a duplicate
    // and the marketplace order can never be imported.
    const service = container.resolve("channelOrderLink") as {
      softDeleteChannelOrderLinks(ids: string[]): Promise<void>;
    };
    await service.softDeleteChannelOrderLinks([created.id]);
  }
);

/**
 * Creates a Medusa order for a marketplace order and records the `channel-order-link` row that
 * makes the import idempotent and compensable (ADR 0010 point 3).
 *
 * Why this exists instead of calling `createOrderWorkflow` directly:
 *
 * - **`createOrderWorkflow` validates availability but does not reserve.** Its own documentation
 *   defers the reservation to `createReservationsWorkflow`. M3's oversell guard *is* the
 *   reservation, so a wrapper that only creates the order would import every order as unallocated
 *   stock — the exact failure this milestone tests against.
 * - **The link row is our durable idempotency record.** The worker claims its own ref before the
 *   call (ADR 0010), but a crash between the Medusa write and the worker's commit is only
 *   recoverable because this row exists in the tenant: compensation reads it to find the order.
 * - **Ordering is load-bearing.** Link row, then order, then the module link between them, all in
 *   one transaction. A failure at any step rolls the whole thing back, so there is never an order
 *   with no link or a link pointing at no order.
 *
 * The marketplace's `totals` are deliberately not forced onto the order: Medusa recomputes totals
 * from the line prices it is given, and the channel's shipping/discount are not Medusa adjustments
 * in this milestone. Overwriting the computed total would desync the order from its own line items.
 * Channel-vs-engine total drift is reconciliation's problem (M4).
 */
export const createChannelOrderWorkflow = createWorkflow(
  createChannelOrderWorkflowId,
  (input: CreateChannelOrderInput) => {
    // No runtime guard here: `createWorkflow`'s builder runs **once at module load** to compose the
    // graph, with `input` a proxy rather than a value. A currency assertion placed here would fire
    // during composition (and read a proxy), failing the whole Medusa boot rather than a bad
    // request. The check lives at the request edge in the route instead; the price conversion below
    // stays inside `transform`, whose callback only runs at execution.
    const link = createChannelOrderLinkStep({
      tenantId: input.tenantId,
      channel: input.order.channel,
      externalOrderId: input.order.externalOrderId
    });

    const orderItems = transform({ input }, ({ input }) => {
      const variantBySku = new Map(input.lines.map((line) => [line.sku, line.variantId]));
      return input.order.lines
        .filter((line) => line.sku !== null && variantBySku.has(line.sku))
        .map((line) => ({
          title: line.title,
          quantity: line.quantity,
          variant_id: variantBySku.get(line.sku!)!,
          // The one place platform sen becomes Medusa rupiah. See lib/money.ts.
          unit_price: senToMedusaRupiah(line.unitPrice)
        }));
    });

    const created = createOrderWorkflow.runAsStep({
      input: {
        items: orderItems,
        email: input.order.buyerEmail ?? undefined,
        currency_code: "idr",
        status: OrderStatus.PENDING,
        metadata: {
          channel: input.order.channel,
          external_order_id: input.order.externalOrderId,
          placed_at: input.order.placedAt
        }
      }
    });

    // The order is created, then the units it sold are reserved from the stock location chosen above.
    // Reversing the order is not an option: a reservation needs a line item to point at, and
    // `createOrderWorkflow` will not attach one. Reservations are read back by `line_item_id` on
    // release (the compensation route), which is exactly the id they are created with here.
    const reservationItems = transform({ created }, ({ created }) =>
      (created.items ?? []).map((item) => ({
        id: item.id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity
      }))
    );
    const reservationInput = resolveReservationInputsStep({
      items: reservationItems,
      salesChannelId: created.sales_channel_id ?? null
    });
    reserveInventoryStep(reservationInput);

    const linkData = transform({ link, created }, ({ link, created }) => [
      {
        [Modules.ORDER]: { order_id: created.id },
        channelOrderLink: { channel_order_link_id: link.id }
      }
    ]);
    createRemoteLinkStep(linkData);

    return new WorkflowResponse({ orderId: created.id });
  }
);
