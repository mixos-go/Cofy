# ADR 0020 — Courier fulfillment providers are connectors, and rate shopping is a pure auditable rule

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform engineering

> Approval note: the courier-neutral contracts, the pure rate-shopping rule, `packages/courier-sdk`
> and the integration plane's courier provider surface were additive and built first (the surface is
> proven with in-test providers in `apps/services/integration-plane/test/couriers.test.ts`; a real
> provider waits on a vendored courier SDK, ADR 0007). The approval-gated piece — the
> `ChannelConnector` tracking write-back that extends the interface frozen by ADR 0005/0009/0015 — was
> **approved and built** as M7 increment 2: `attachTrackingNumber` and `supportsTrackingWriteBack` on
> the contract, the plane route `/v1/channels/:channel/tracking`, and the worker `shipment.write_back`
> unit. The `connector:*` boundary allowance for `courier-sdk` is the one line in
> `tooling/boundaries/src/config.js` this ADR already records as accepted; it is applied.
>
> M7 increment 3 built the tenant-side half this ADR's decision names: `CommerceClient.recordShipment`
> and the data-plane route `/admin/shipments` run `recordShipmentWorkflow`, which turns a booked
> shipment into the engine's own Fulfillment (consuming the order's reservation) plus the shipment
> that carries the waybill. It is idempotent on the waybill — a retry converges on the first
> fulfillment rather than fulfilling the items twice — and is proven end to end against a real Medusa
> HTTP server (`apps/services/control-plane/test/integration/shipment-write-path.test.ts`).
>
> M7 increment 4 made the "with the control plane's tenant record" part of the decision real:
> `RateShoppingRulesStore` (in-memory and Postgres) stores a tenant's rules in the platform's own
> `platform_ops` schema as one `jsonb` document per tenant, the seller surface reads and writes them
> over `/v1/seller/rate-shopping-rules`, and termination clears them so a terminated tenant's
> shipping policy does not outlive it. The platform-schema name guard moved to one shared helper
> (`platform-schema.ts`) so this store and the sync-state store cannot disagree about what a safe
> schema name is.
>
> M7 increment 5 joined the pieces this ADR names into one path: the `shipment.create` workflow
> (`apps/services/worker/src/shipment-create.ts`) reads the tenant's stored rules over the control
> plane's service-token surface, fans quotes out through the courier surface, applies the pure
> `selectCourier`, books the *chosen* quote through `createShipment`, records the tenant-side
> Fulfillment through `CommerceClient.recordShipment`, and queues `shipment.write_back` instead of
> calling the channel inline — so the channel write stays capability-gated, governed and idempotent
> on its own, and a throttle on it cannot roll back a booking that already happened. The selection
> object is the workflow's return value, so the audit an operator reads is the decision that shipped.

## Context

M7 ships orders through Indonesian couriers (JNE, J&T, SiCepat, Anteraja, and/or an aggregator such
as RajaOngkir) without manual re-entry. Four deliverables — provider integration, rate shopping,
tracking write-back, delivery-status sync — and the exit criteria add that rate shopping must respect
tenant rules *and be auditable* (why this courier was chosen).

Nothing in the platform talks to a courier today. The question this ADR has to answer first is
**where a courier integration lives**, because that determines who holds the credentials, who spends
the rate-limit budget, and what an idempotency key means for a shipment.

Three placements are possible:

1. **Inside the tenant's Medusa as a Fulfillment provider.** Medusa v2 ships a Fulfillment module with
   a provider interface, so this looks native. It collides with two decisions we already made: the
   platform owns marketplace *and* courier app keys (ADR 0003), while a provider inside a tenant would
   need a per-tenant key or a shared key copied into every instance; and every outbound write must be
   idempotent and rate-limited centrally (AGENTS.md §2.4, ADR 0002), which the tenant instance does not
   do — the governor and the queue live in our services. A courier call made from inside the tenant is
   an outbound write with no idempotency record and no shared budget, which is the exact shape ADR 0002
   was written to prevent.
2. **A new service.** A `courier-plane` beside the integration plane. This adds a runtime, a deploy,
   a service-token surface and a second place that holds platform credentials, for work that is the
   same shape as talking to a marketplace: authenticate, call an external API, report rate limits.
   Rejected as unnecessary surface.
3. **A connector in the existing integration plane.** Couriers are outbound integrations exactly like
   marketplaces. The plane already holds platform app keys, enforces the governor before every call,
   and exposes a service-token surface the worker orchestrates over HTTP. A courier provider is a
   sibling of a channel connector: same shape, same rules, a different external system.

The tenant-side record is a separate question, and Medusa answers it: a shipment is the Fulfillment
module's job, and Medusa already models it. We write to it the way `createOrder` writes an order —
through a data-plane Admin route reached by the worker's `CommerceClient` port (ADR 0010), never by
adding a column to a core table (AGENTS.md §2.2).

## Decision

**We will build courier integration as connector-style providers in the integration plane, keep the
shipment itself in the tenant's Medusa Fulfillment module, and make rate shopping a pure function in
`packages/contracts` that returns an auditable decision.**

Concretely:

- **Courier-neutral contracts** land in `packages/contracts/src/fulfillment.ts`: `CourierCode`,
  `ShipmentQuote`, `ShipmentRequest`, `Shipment`, `TrackingEvent`, `SHIPMENT_STATUSES`, and the
  `RateShoppingRules` / `CourierSelection` / `RejectedQuote` audit shapes. No marketplace- or
  courier-specific field name crosses this boundary (AGENTS.md §4).
- **`packages/courier-sdk`** holds the `CourierProvider` interface — quote, create, track, cancel,
  capabilities — mirroring `packages/channel-sdk` (ADR 0005). A provider is pure with respect to
  credentials: it receives a `CourierCredential` and never looks one up.
- **Rate shopping is a pure function**, `selectCourier(quotes, rules, decidedAt)` in `contracts`, on
  ADR 0014/0015's rule that the decision and its audit must not be able to disagree. It applies the
  tenant's hard constraints (allowed couriers, allowed service levels, price cap, transit-time cap,
  insurance, COD), orders the survivors by the tenant's strategy (cheapest, fastest, preferred), and
  breaks ties deterministically so the same quotes and rules always choose the same quote. It returns
  the chosen quote, every rejected quote with the reason it was rejected, and — when nothing
  qualified — a reason naming the distinct rejections. That object *is* the audit record.
- **The shipment is a tenant-side Fulfillment record**, created by a data-plane route the worker
  calls through `CommerceClient`, with an idempotency key derived from the order and the chosen quote,
  the way stock and orders already work. The tracking number and status live there and are read back
  by the seller UI through the existing seller read surface (ADR 0016).
- **Tracking write-back extends the frozen connector contract** with one method,
  `attachTrackingNumber(externalOrderId, tracking, credential)`, plus a `supportsTrackingWriteBack`
  capability that flips `true` only when a channel implements and tests it (ADR 0009's rule). This was
  the approval-gated part; it was approved and built (see the approval note). The write-back is
  capability-gated at both the plane route and the worker unit, and idempotent on the waybill, so a
  retry replays and a corrected number is a new operation.
- **Delivery status is a pull path, reconciled like stock.** A `shipment.track` unit walks active
  shipments, asks the provider for their events, writes new events to the Fulfillment record, and
  advances the channel status. Webhooks are an optimization if a courier offers them; the pull path is
  the source of truth (ADR 0002), and its freshness is bounded by the same reconciliation cadence and
  SLO machinery M6 added.
- **`PLATFORM_EVENTS` gains `SHIPMENT_CREATED`, `SHIPMENT_STATUS_CHANGED`, `SHIPMENT_FAILED`.** Adding
  members is additive; the existing event format is unchanged, so this is not a breaking change.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Courier provider inside the tenant's Medusa | Puts a platform credential in every tenant and moves an outbound write outside the idempotency record and the shared governor (AGENTS.md §2.4, ADR 0002). |
| A separate courier service | A new runtime, deploy and credential store for the same call shape the integration plane already owns. |
| Per-courier method on the worker, branching on courier name | Leaks courier shape into workflows — the same rejection ADR 0003/0005/0009/0015 made for channels and listings. |
| Choose a courier in the workflow directly | The choice and its explanation would live in orchestration code, so the number an operator audits and the courier actually chosen could drift. A pure shared function makes the decision reproducible from its inputs. |
| Store rate-shopping rules in the tenant data plane | Rules are platform config about *how the seller ships*, like channel config, not commerce data. They belong with the control plane's tenant record. |

## Consequences

**What becomes easier:**

- A courier is added the way a channel is: a workspace under `connectors/` implementing
  `CourierProvider`, registered in `main.ts`, with no change to the plane's core.
- Rate shopping is testable without a network: it is a pure function over quotes and rules, and its
  audit is the function's return value rather than a log line reconstructed after the fact.
- Shipments are Medusa's own records, so the seller UI reads them through the surface it already uses
  and we do not grow a second fulfillment model.

**What becomes harder / technical debt we accept:**

- **One more external boundary to keep idempotent.** Creating a shipment is not as idempotent as an
  absolute stock set: a retried create can produce a second waybill at the courier. The idempotency
  key and the stored shipment are the guard, and a duplicate waybill is an operator-visible failure
  rather than a silent one — accepted until a courier offers a native idempotency key.
- **Tracking freshness is cadence-bound.** Status updates are as fresh as the track pass, like stock.
  The same SLO reasoning (ADR 0002, M6) applies and is reused rather than reinvented.
- **`connector:*` may import `courier-sdk`.** A marketplace connector could technically import the
  courier SDK. The allowance is one line in `tooling/boundaries/src/config.js`; the alternative (a new
  top-level `couriers/` zone) is more layout churn than the separation is worth today.

**How we would reverse this later:** if a courier offered a native idempotency key or a push webhook,
the pull path and the derived key are what a migration would replace; the contract types and the
provider interface are unchanged. If Medusa's Fulfillment provider interface ever fit our credential
ownership, a provider could move inside the tenant behind the same `CourierProvider` shape.
