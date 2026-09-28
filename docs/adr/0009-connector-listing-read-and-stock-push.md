# ADR 0009 — The connector contract gains a listing read, and stock push becomes real

- **Status:** Accepted (approved 2026-09-26 — extends a frozen shared interface)
- **Date:** 2026-09-26
- **Deciders:** Platform engineering

> Approval note: accepted as-is. The `fetchListings` addition and the `ChannelListing` contract are
> now part of the frozen interface; a channel's `supportsStockPush` flips to `true` only when both
> `fetchListings` and `pushStock` are implemented and tested against fixtures (see Decision).

## Context

ADR 0005 froze `ChannelConnector` and said anything beyond it "should live inside that connector,
not in the shared contract". M3 tests that boundary and it does not hold.

Stock push cannot be implemented without a **listing read**, and this is the blocker
`docs/PLAN.md` records as having moved stock push out of M2. Both target marketplaces address a
variant by an identifier they assign, not by our SKU:

- TikTok Shop's `updateInventory` takes a platform `product_id` and a `sku_id`
  (`UpdateInventoryRequest.product_id`; the SKU list in `UpdateInventoryBody`).
- Shopee's `update_stock` takes `item_id`/`model_id`.

Neither identifier appears in an order in a form we can push against, and neither is derivable
from our SKU. We obtain them only by reading listings. Both connectors currently declare
`supportsStockPush: false` and return `channel_error` for every item — honest, but it means the
product promise ("stock propagates back") does not exist yet.

The alternative to extending the shared contract is to let each connector expose a
marketplace-specific listing method and have the workflow branch on channel name. That is exactly
the marketplace-knowledge-leak ADR 0003 and ADR 0005 rejected, so it is not a real option.

## Decision

**We will add one method to `ChannelConnector` — `fetchListings(cursor, credential)` returning
`Page<ChannelListing>` — and add the `ChannelListing` contract type it returns. Stock push is then
implemented against the mapping this provides.**

Concretely:

- `contracts` gains `ChannelListing { channel, externalProductId, variants: ChannelListingVariant[] }`
  and `ChannelListingVariant { externalSkuId, sku: string | null, externalInventoryId: string | null }`.
  `sku` is *our* seller SKU as the marketplace reports it; `externalSkuId`/`externalInventoryId`
  are the marketplace's own handles.
- The **mapping from our SKU to a channel variant is stored by the platform**, not held in memory:
  a listing import writes it so a stock push is possible in a later process. Where it is stored is
  ADR 0010's decision.
- `fetchOrders` is unchanged. `fetchListings` follows the same cursor discipline (a cursor must be
  able to say "caught up"; AGENTS.md §9).
- `pushStock` implementations stop returning `channel_error` for a known mapping and start
  addressing the marketplace's real identifiers; an unmapped SKU returns `unknown_sku`, which is
  already in the `StockRejectionReason` vocabulary.
- `capabilities().supportsStockPush` becomes `true` for a channel only when `fetchListings` and
  `pushStock` are both implemented and tested against recorded fixtures. Until then it stays
  `false`. A capability flip without the code is the "looks like a working feature" failure
  AGENTS.md §9 warns about.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Per-connector listing method, workflow branches on channel | Leaks marketplace shape into workflows (ADR 0003, ADR 0005 rejected this). Every new channel edits the workflow. |
| Push stock by SKU and let the marketplace resolve it | Neither marketplace offers that. `unknown_sku` for 100% of items is not a feature. |
| Derive `sku_id` from the order's line item | The order line does not carry it, and inventing one would send a wrong push that silently does nothing. |
| Put listing state in the tenant's Medusa data plane | A stock push is a control/integration concern; Medusa is a black box we do not fork, and this mapping is ours, not commerce data. See ADR 0010. |

## Consequences

**What becomes easier:**

- The product promise becomes implementable: stock can propagate once a listing import has run.
- The mapping is written once by the connector and consumed by the workflow, so a new channel is
  a new connector, not a workflow change.

**What becomes harder / technical debt we accept:**

- `channel-sdk` and `contracts` gain surface, which every connector now carries — the cost ADR
  0005 already named. It is worth it because two independent channels need the same method.
- Listing read is a second cursor per channel, so reconciliation (M4) has two walks per channel.
- A stale mapping sends stock to the wrong variant. Mitigated by re-importing listings on a
  schedule and by treating a push rejection as a signal to re-import.

**How we would reverse this later:** if a future channel can be addressed by our SKU directly, it
implements `fetchListings` trivially (one variant per product) rather than us adding a parallel
path. No reversal of the contract is expected.
