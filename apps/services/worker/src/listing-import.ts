/**
 * Listing import workflow (docs/adr/0009).
 *
 * Stock push addresses a channel variant by an id the marketplace assigns, which never appears in
 * an order and cannot be derived from our SKU. So before we can push stock anywhere, we must read
 * the channel's listings and store the mapping `sku -> (externalProductId, externalSkuId,
 * externalInventoryId)`. That mapping is platform-owned sync state (ADR 0010), keyed per tenant and
 * channel, and it lives in the registry so the push workflow can read it without touching Medusa.
 *
 * Same cursor discipline as order import: advance only after the page's mappings are persisted, so
 * a crash re-reads a page instead of skipping the SKUs it contained.
 */

import type { ChannelCode, ChannelListingVariant, TenantId } from "@platform/contracts";
import type { Logger } from "@platform/observability";
import type { ChannelGateway, SyncStateClient } from "./ports.ts";

export interface ListingImportContext {
  readonly syncState: SyncStateClient;
  readonly gateway: ChannelGateway;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export interface ListingImportOutcome {
  /** SKU mappings written or refreshed. */
  readonly mapped: number;
  /**
   * Variants a channel reported without a seller SKU. They are recorded as a gap, not guessed:
   * a mapping we invented would push stock to the wrong variant.
   */
  readonly unmapped: number;
  readonly pages: number;
  readonly caughtUp: boolean;
}

const MAX_PAGES_PER_RUN = 100;

export async function importListingsOnce(
  context: ListingImportContext,
  input: { readonly tenantId: TenantId; readonly channel: ChannelCode }
): Promise<ListingImportOutcome> {
  const { syncState, gateway, logger } = context;
  const { tenantId, channel } = input;

  let cursor = await syncState.getCursor({ tenantId, channel, entity: "listings" });
  let mapped = 0;
  let unmapped = 0;
  let pages = 0;

  for (let page = 0; page < MAX_PAGES_PER_RUN; page += 1) {
    const batch = await gateway.fetchListings({ tenantId, channel, cursor });
    pages += 1;

    for (const listing of batch.items) {
      for (const variant of listing.variants) {
        const written = await storeVariantMapping(context, { tenantId, channel, listing, variant });
        if (written) mapped += 1;
        else unmapped += 1;
      }
    }

    await syncState.setCursor({ tenantId, channel, entity: "listings", cursor: batch.nextCursor });
    cursor = batch.nextCursor;

    if (batch.nextCursor === null) {
      logger.info("listing.import.caught_up", { tenantId, channel, mapped, unmapped });
      return { mapped, unmapped, pages, caughtUp: true };
    }
  }

  logger.warn("listing.import.page_cap", { tenantId, channel, pages });
  return { mapped, unmapped, pages, caughtUp: false };
}

async function storeVariantMapping(
  context: ListingImportContext,
  input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly listing: { readonly externalProductId: string };
    readonly variant: ChannelListingVariant;
  }
): Promise<boolean> {
  const { syncState, logger, now } = context;
  // A variant with no seller SKU has no join key back to our catalogue. Recording nothing is the
  // honest outcome; inventing a key would make stock push address the wrong variant.
  if (input.variant.sku === null || input.variant.sku === "") return false;

  await syncState.upsertSkuMap({
    tenantId: input.tenantId,
    channel: input.channel,
    sku: input.variant.sku,
    externalProductId: input.listing.externalProductId,
    externalSkuId: input.variant.externalSkuId,
    externalInventoryId: input.variant.externalInventoryId,
    updatedAt: (now ?? (() => new Date()))().toISOString()
  });
  logger.debug("listing.mapped", { tenantId: input.tenantId, channel: input.channel, sku: input.variant.sku });
  return true;
}
