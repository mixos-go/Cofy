/**
 * Fixture for the seller-read end-to-end test (ADR 0016).
 *
 * Run by `medusa exec` inside the tenant's own Medusa project, which is why it lives here and
 * imports `@medusajs/*` directly: `exec` resolves a relative path against its own cwd and the
 * script then runs with the data plane's module resolution, so nothing here is importable from a
 * `@platform/*` workspace (AGENTS.md §2.1).
 *
 * It creates the minimum a seller-visible order needs — a sales channel, an IDR region, a published
 * product with one priced variant, and one pending order — using Medusa's own core workflows rather
 * than hand-written SQL, so the test exercises the same engine paths the write path does. It also
 * mints the secret API key the read authenticates with (ADR 0012).
 *
 * It prints a single `SEED=` JSON line; the test parses that rather than reading a database.
 */

import type { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createOrderWorkflow
} from "@medusajs/medusa/core-flows";

export default async function seed({ container }: { container: MedusaContainer }): Promise<void> {
  // The fixture is shared by more than one test, so the buyer email and the variant SKU are read
  // from the environment. The seller-read test leaves them at the defaults; the two-tenant isolation
  // test sets a distinct pair per tenant, which is what lets it prove that the instance that
  // answered a read was the caller's own.
  const buyerEmail = process.env.SEED_ORDER_EMAIL ?? "buyer@example.com";
  const variantSku = process.env.SEED_VARIANT_SKU ?? "SKU-1";

  const salesChannel = first(
    (
      await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: "Default", description: "seller-read test" }] }
      })
    ).result
  );

  const region = first(
    (
      await createRegionsWorkflow(container).run({
        input: { regions: [{ name: "Indonesia", currency_code: "idr", countries: ["id"] }] }
      })
    ).result
  );

  const product = first(
    (
      await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Kaos",
              status: "published",
              sales_channels: [{ id: salesChannel.id }],
              options: [{ title: "Size", values: ["M"] }],
              variants: [
                {
                  title: "Kaos M",
                  sku: variantSku,
                  // The seller read proves the money boundary and the line projection; inventory
                  // reservation is the write path's concern (M3) and is exercised there.
                  manage_inventory: false,
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

  const order = (
    await createOrderWorkflow(container).run({
      input: {
        region_id: region.id,
        sales_channel_id: salesChannel.id,
        email: buyerEmail,
        currency_code: "idr",
        status: "pending",
        items: [{ title: "Kaos M", variant_id: variant.id, quantity: 2, unit_price: 20000 }]
      }
    })
  ).result;

  const apiKey = await container
    .resolve(Modules.API_KEY)
    .createApiKeys({ title: "seller-read-test", type: "secret", created_by: "platform-provisioner" });

  // One line, one parse. Anything else the loaders log stays on stdout/stderr but is ignored.
  process.stdout.write(
    `SEED=${JSON.stringify({ orderId: order.id, displayId: order.display_id, secretKey: apiKey.token })}\n`
  );
}

/**
 * The first element, asserted present.
 *
 * `noUncheckedIndexedAccess` types every index as possibly absent, and a fixture that silently
 * seeded nothing would fail later with a confusing error instead of here with an obvious one.
 */
function first<T>(values: readonly T[] | undefined): T {
  const value = values?.[0];
  if (value === undefined) {
    throw new Error("The fixture expected Medusa to create at least one record and it created none.");
  }
  return value;
}
