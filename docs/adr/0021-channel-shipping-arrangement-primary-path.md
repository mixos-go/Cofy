# ADR 0021 — Channel shipping arrangement is the primary fulfillment path; courier providers serve self-arranged shipping

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform engineering
- **Amends:** ADR 0020 (the fulfillment path M7 built assumes the wrong actor for the target channels)

## Context

ADR 0020 decided that M7 ships orders "through Indonesian couriers" with our own courier providers
in the integration plane: quote across JNE/J&T/SiCepat/Anteraja/RajaOngkir, rate-shop with
`selectCourier`, book the waybill, write the tracking number back to the channel. That decision is
correct about *where a courier integration lives* (a connector-style provider in the integration
plane, never inside a tenant's Medusa) and about rate shopping being a pure auditable rule. What it
got wrong is **who creates the shipment** for the channels we actually serve.

For Shopee and TikTok Shop/Tokopedia in Indonesia, the marketplace is the logistics orchestrator.
The seller picks (or the marketplace assigns) a courier when the listing or the order is set up; the
marketplace books the pickup, issues the waybill, produces the printable label and receives tracking
events. The seller's job is to print the label and hand the parcel over. Our platform cannot
re-issue a waybill the marketplace owns, cannot make the buyer's tracking page follow a number we
invented, and cannot produce the label format the warehouse prints — those are marketplace APIs.

We inspected the vendored SDKs (ADR 0007) rather than trusting the M7 note, and both expose the
whole arrangement surface:

| Concern | Shopee (`Logistics`) | TikTok Shop (`Fulfillment`) |
|---|---|---|
| What the courier needs for this order | `getShippingParameter` (`info_needed.pickup`/`dropoff`) | `getEligibleShippingService` |
| Book the shipment / mark shipped | `shipOrder`, `massShipOrder` | `shipPackage`, `markPackageAsShipped`, `createPackages` |
| The waybill the marketplace issued | `getTrackingNumber`, `getMassTrackingNumber` | `getTracking` |
| The printable label | `createShippingDocument`, `downloadShippingDocument`, `downloadToLabel` | `getPackageShippingDocument` (`SHIPPING_LABEL`/`PACKING_SLIP`, `document_format: PDF`) |
| Delivery status | `getTrackingInfo` (`logistics_status` + events) | `getTracking` |

This also corrects a factual error in M7's known limits: Shopee's `ship_order` **is** expressible
through the vendored SDK. `ShopeeLogisticsApi.shipOrder` exists
(`vendor/shopee-sdk/dist/generated/Logistics/index.d.ts:1685`) and its body type
`ShipOrderRequest` (`:1242`) carries `pickup.tracking_number`, signed at
`:1660`/`:1665` by `massShipOrder`/`shipOrder`. The claim that the SDK's `ship_order` body lists
"only `order_sn`, `package_number`, `pickup`" was true of the field *names* but not of the
capability: `pickup.tracking_number` is the self-ship waybill, and `getShippingParameter` decides
whether a pickup or dropoff shape applies. Shopee's tracking write-back was therefore never
blocked; it was unimplemented.

There remains a genuine second path: a seller who ships with their own courier account rather than
the marketplace's arrangement. That is where our courier providers and `selectCourier` are the right
machinery — it is simply not the majority case for Shopee/TikTok Shop Indonesia, so it must not be
the critical path.

## Decision

**We will make channel shipping arrangement the primary M7 fulfillment path, expressed as a
capability-gated extension of `ChannelConnector`, and keep courier providers for self-arranged
shipping only.** Delivery status for a channel-arranged shipment is pulled from the channel, not
from a courier; for a self-arranged shipment it stays a courier pull.

Concretely:

- **`ChannelConnector` gains a shipping-arrangement surface**, additive and approval-gated the same
  way `attachTrackingNumber` was: `getShippingArrangementParameters(orderRef, credential)` returns
  the courier-neutral choices the channel offers (eligible couriers/service levels, pickup vs
  dropoff, and any required fields); `arrangeShipment(orderRef, arrangement, credential)` books the
  shipment and returns the marketplace-issued waybill plus the channel's shipping status;
  `fetchShippingLabel(orderRef, credential)` returns a printable document reference (URL + format);
  and `fetchChannelTracking(orderRef, credential)` returns normalised `TrackingEvent`s. Each is
  gated by a new capability so a channel that lacks one refuses loudly rather than no-op (ADR 0009's
  rule).
- **New capabilities in `packages/contracts`:** `supportsShippingArrangement`,
  `supportsShippingLabel`, `supportsChannelTracking`. A channel flips one to `true` only when the
  method is implemented and tested.
- **Shopee's tracking write-back is unblocked.** `ShopeeConnector` implements `getShippingParameter`
  and `shipOrder` with both shapes (`pickup.tracking_number` for self-arranged, the marketplace's
  own arrangement otherwise) and the `supportsTrackingWriteBack` capability flips to `true`. The
  M7 known-limit entry recording this as impossible is corrected.
- **The fulfillment path for a channel-arranged order is:** seller selects order(s) → channel
  arrangement parameters → arrange (channel books, issues waybill, returns label reference) →
  record the tenant-side Fulfillment carrying the waybill (the existing `recordShipmentWorkflow`,
  unchanged) → the waybill is already on the channel, so the write-back for the marketplace-arranged
  case is the arrangement call itself, not `attachTrackingNumber`. `attachTrackingNumber` remains
  the path for self-arranged shipments.
- **Rate shopping and courier providers are retained for self-arranged shipping.** `selectCourier`,
  `shipment.create` and `CourierProvider` stay as ADR 0020 built them; they are simply no longer the
  only path, and `shipment.create` is not a prerequisite for the primary path.
- **Delivery status is a pull path either way** (ADR 0020's reconciliation reasoning is unchanged):
  `shipment.track` walks active shipments, asks the channel (`fetchChannelTracking`) for
  channel-arranged ones and the courier (`CourierProvider.track`) for self-arranged ones, writes the
  advance to the tenant's Fulfillment record, and is bounded by the same cadence and SLO as stock.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Keep courier providers as the primary M7 path | The marketplace owns the waybill, label and buyer tracking for the channels we serve; a number we book ourselves cannot be written back as the marketplace's own arrangement without re-implementing the channel's logistics (ADR 0003: that logic is the connector's). |
| Build both paths before shipping either | The self-arranged path is the minority case. Sequencing it first (as M7 did) delayed the path that actually fulfils Indonesian marketplace orders. |
| Treat `ship_order` as a separate, missing API and keep Shopee write-back disabled | Factually wrong: `shipOrder`, `getShippingParameter`, `getTrackingNumber` and the label methods are all in the vendored SDK; the capability was unbuilt, not impossible. |
| Put the arrangement logic in the worker/workflow, branching on channel | Leaks marketplace shipping shape into orchestration — the same rejection ADR 0003/0005/0009/0015 made for orders, listings and stock. |

## Consequences

**What becomes easier:**

- The primary fulfillment path works for the channels we actually serve; the seller flow (select →
  book → print label) is realizable with marketplace APIs we already vendor.
- Label retrieval becomes a first-class, capability-gated operation, so the "print resi (PDF)"
  deliverable has a home (the Fulfillment label's `label_url`).
- Delivery status is one pull path over two sources (channel or courier), reusing the M6
  reconciliation cadence and SLO rather than inventing a second mechanism.

**What becomes harder / technical debt we accept:**

- **`ChannelConnector` grows again.** This is the second approval-gated extension in M7 (after
  `attachTrackingNumber`); the interface is no longer frozen by ADR 0005 alone and its full shape is
  the union of ADR 0005, 0009, 0015, 0020 and this one.
- **Verify against a live shop.** The methods exist in the vendored SDK, but the exact
  pickup-vs-dropoff selection and label format must be confirmed against a live Development Shop /
  TikTok Development Shop before the capabilities are trusted in production. Unit tests prove the
  request shape against the SDK, not the marketplace's acceptance.
- **Two fulfillment paths to keep coherent.** A shipment is either channel-arranged or
  self-arranged, and the record must not be written twice; the waybill idempotency in
  `recordShipmentWorkflow` is the guard, and the tenant-side record stays a single Medusa Fulfillment
  either way.

**How we would reverse this later:** if marketplace logistics APIs were withdrawn or a courier
became the arranger for a channel, the self-arranged path already exists behind the same
`CommerceClient.recordShipment` seam; only which method the worker calls to obtain the waybill
changes. The capability flags make the switch per-channel and visible rather than implicit.
