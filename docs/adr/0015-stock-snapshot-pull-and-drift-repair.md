# ADR 0015 — A stock snapshot read, and stock drift repaired through the ordinary push

- **Status:** Accepted (approved 2026-09-26 — extends a frozen shared interface)
- **Date:** 2026-09-26
- **Deciders:** Cofy platform engineering

> Approval note: accepted as-is. `fetchStockSnapshot` and `ChannelStockLevel` join the frozen
> interface alongside ADR 0009's `fetchListings`. A channel's `supportsStockSnapshotRead` flips to
> `true` only when the method is implemented and tested against recorded fixtures.

## Context

ADR 0009 gave us a stock *push*: once a listing import has mapped our SKU to a marketplace's own
variant handle, `pushStock` can address the right variant. ADR 0002 makes reconciliation the source
of truth, and M4's exit criterion names the other direction explicitly — "Injected drift (delete a
local order, **corrupt a stock level**) is detected and repaired".

Today we cannot detect a corrupted stock level at all. A push tells the marketplace a number; it
never asks what the marketplace currently thinks. So a stock level changed directly in a marketplace
seller centre — a common, real event — is invisible to us. We would only learn about it when a
seller complains, which is exactly the "drift discovered by customers, not by us" failure ADR 0002
was written to prevent. ADR 0014 recorded this as an open deliverable rather than approximating it,
because detecting it needs a channel stock snapshot the connectors did not expose.

The blocker is the same shape as ADR 0009's, and so is the resolution: neither marketplace will
report a variant's stock without being asked about the variant by an identifier *it* assigns, and
that identifier is obtained by walking listings. Both vendored SDKs already carry the read we need —
Shopee's `get_model_list` returns `stock_info_v2.summary_info.total_available_stock`, and TikTok's
product search returns per-SKU `inventory` entries — but nothing in our contract exposes them.

The alternative to extending the shared contract is a marketplace-specific stock method per connector
with the workflow branching on channel name. ADR 0003 and ADR 0005 already rejected that for
listings, and the reasoning does not change with the entity: it leaks marketplace knowledge into
workflows and makes every new channel an edit to the workflow.

## Decision

**We will add one method to `ChannelConnector` — `fetchStockSnapshot(cursor, credential)` returning
`Page<ChannelStockLevel>` — add the `ChannelStockLevel` contract type it returns, and repair a
mismatch through the ordinary `pushStock` path.**

Concretely:

- `contracts` gains `ChannelStockLevel { channel, externalSkuId, sku: string | null, available }`.
  `sku` is our seller SKU *as the channel reports it* — the join key back to our catalogue, and
  `null` when the channel has none, which is a real state and is never coerced to `""`.
  `externalSkuId` is the marketplace's own handle, carried for diagnostics only: the repair does not
  use it, because addressing a push is the stored mapping's job (ADR 0009, ADR 0010).
- `capabilities()` gains `supportsStockSnapshotRead`. It becomes `true` for a channel only when
  `fetchStockSnapshot` is implemented and tested against recorded fixtures, on ADR 0009's rule: a
  capability flip without the code is the "looks like a working feature" failure AGENTS.md §9 warns
  about.
- `fetchStockSnapshot` follows the same cursor discipline as the other reads: a cursor must be able
  to say "caught up", and the walk advances the persisted cursor only after the page's comparisons
  and any repairs have been applied, so a crash re-reads a page instead of skipping it.
- **Drift is classified by one shared pure function**, `classifyStockDrift` in `packages/contracts`,
  on ADR 0014's rule that the detector and any dashboard must not be able to disagree. It compares
  two numbers and returns `stock_mismatch` or null. A variant the channel reports without a SKU, or a
  SKU absent from the tenant's catalogue, is **not drift**: it is uncomparable, is counted separately,
  and is never repaired. Calling it drift would inflate the number an operator watches with a
  condition no push can clear.
- **Repair is the ordinary push.** A mismatch is repaired by calling the same `pushStockOnce` the
  real-time `stock.changed` path uses, with the *local* value — Medusa is authoritative for stock,
  the marketplace is a projection of it. There is no second write path to get idempotency wrong, and
  a re-read after a partial failure re-pushes under the payload-derived key, which the push's own
  idempotency record turns into a replay rather than a second call.
- The new unit is `reconcile.stock`, alongside `reconcile.orders`. It is armed by the same
  `ReconciliationScheduler` and re-arms its own next run, so its cadence lives in the queue and not
  in a timer (AGENTS.md §2.5). The stock walk reads one cursor per `(tenant, channel, entity)` with
  `entity = "stock"`, so it cannot disturb the order or listing cursors.
- The tenant-side read is a Medusa Admin route (`GET /admin/stock-levels?sku=…`), reached through the
  worker's `CommerceClient` port like every other commerce read (ADR 0010). It sums a variant's
  available quantity across its inventory location levels. A variant that does not manage inventory
  is omitted rather than reported as zero, because "untracked" and "none left" are different states
  and only one of them is a mismatch.

**Out of scope, recorded rather than implied:** there is no control-plane dashboard for stock drift.
Order drift is stored (a ref has a status), so the control plane can count it without a marketplace
call; stock drift is computed from two live reads — the channel's snapshot and Medusa's current value
— so a dashboard would have to re-pull a marketplace from the control plane, which is the worker's
job, not the registry's. Stock drift is surfaced through the repair pass's structured log line
(`stock.reconcile.completed`, carrying `compared`, `mismatched`, `repaired`, `uncomparable`).

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Per-connector snapshot method, workflow branches on channel | Leaks marketplace shape into workflows (ADR 0003, ADR 0005, ADR 0009 all rejected this). |
| Reuse `fetchListings` and read stock from it | Conflates two reads with different cadences and different failure modes. A listing import runs to build a mapping; a snapshot runs every cadence to compare. Folding them means a snapshot's budget is spent re-writing mappings, and a mapping failure blocks drift detection. |
| Detect drift by comparing the last pushed value to Medusa | Compares our intent to our own record, not to the marketplace. A level changed in the seller centre would still be invisible, which is the whole failure being fixed. |
| Repair by overwriting the marketplace with a delta | A delta requires knowing the channel's current value *and* trusting it; an absolute set is naturally idempotent (already the push's design). |
| Push the *channel's* value into Medusa on mismatch | Makes the marketplace authoritative for stock. Two channels would then fight over one Medusa level, and the last writer would win nondeterministically. |
| Treat an unmapped or SKU-less variant as drift | Produces a count that no push can ever clear, so the metric would never return to zero and operators would learn to ignore it. |
| A control-plane stock-drift dashboard | Would require the registry to call a marketplace, which is the worker's job (ADR 0010); the honest surface is the pass's log line. |

## Consequences

**What becomes easier:**

- A stock level changed outside Cofy is now found by reconciliation rather than by a customer.
- The M4 exit criterion for corrupted stock becomes testable end to end, using the same push the
  real-time path uses.
- A new channel is still a new connector: it implements `fetchStockSnapshot`, flips its capability,
  and no workflow changes.

**What becomes harder / technical debt we accept:**

- `channel-sdk` and `contracts` gain surface a third time, the cost ADR 0005 named. It is accepted
  because two independent channels need the same read.
- A snapshot walk costs marketplace quota on every cadence, competing with real-time work. It is
  bounded by the same governor and the same page cap as the other walks.
- The comparison is only as fresh as the two reads. A channel's snapshot may lag a sale by seconds,
  so a mismatch found is a genuine disagreement at read time, not proof of a lost update; the repair
  re-pushes the local value, which is safe either way.
- A channel that reports stock per warehouse (TikTok) is compared on the single warehouse the listing
  import selected. A product stocked in several warehouses is not compared per location, which is
  recorded here rather than hidden.
- TikTok's per-SKU stock field is read from the same OAS-derived shape ADR 0009 already flagged as
  unconfirmed against a live Development Shop. The snapshot inherits that gap and does not widen it.

**How we would reverse this later:** if a channel offers a bulk inventory endpoint that returns a
whole catalogue's stock in one call, `fetchStockSnapshot` implements it behind the same contract and
no caller changes. If stock drift ever needs a dashboard, the summary type is already pure and shared;
only the read that feeds it would move.
