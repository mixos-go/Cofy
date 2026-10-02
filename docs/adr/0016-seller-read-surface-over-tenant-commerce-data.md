# ADR 0016 — The seller read surface proxies the tenant's own Medusa Admin API

- **Status:** Accepted
- **Date:** 2026-09-30 (amended: the seller read is now covered end to end by
  `test/integration/seller-read.test.ts`)
- **Deciders:** Cofy platform engineering

## Context

M5 needs the seller OMS to show orders. Nothing in the platform can read a tenant's commerce data
today: the worker *writes* orders and stock through the tenant's Medusa Admin API (ADR 0010), the
control plane owns sync state and identity, and `packages/tenant-client` exists but has no caller on
a read path. `apps/web/*` are empty. So the first M5 question is not UI — it is **where a seller read
of commerce data is served from**, and that is an architectural decision the docs do not cover.

Three candidate sources, and the constraints each collides with:

1. **`tenant-client` / SQL against the tenant's Medusa tables.** ADR 0001 says all access to tenant
   data goes through `tenant-client`, which reads as permission. But ADR 0001 also requires Medusa to
   stay *vanilla*, and reading its tables means encoding Medusa's internal schema (order status
   enums, totals columns, link tables) into our code. A Medusa upgrade that renames a column becomes
   our outage, and every read is a new chance to get Medusa's own semantics wrong — totals that Medusa
   computes through tax/promotion modules do not exist as a single column to select.
2. **A new project route inside the tenant instance** that returns a seller-shaped payload. This is
   the pattern the write path already uses (`data-plane/medusa-config/src/api/admin/*`), so it is
   consistent. But it means writing and testing route code that ships to every tenant, and it makes
   the seller *projection* — what fields a seller may see — a property of N deployed instances rather
   than one reviewable place.
3. **The control plane calling the tenant's existing Medusa Admin API.** The tenant is already
   resolvable to `{ baseUrl, secretKey }` (ADR 0012), the key already grants full admin authority
   within its own instance, and Medusa already ships the read routes. No new code inside the tenant.

A second, narrower question sits inside the first: an imported order's **channel attribution** (which
marketplace it came from, and the marketplace's own order id) is not a Medusa concept. Medusa holds
the order; the marketplace reference is platform-owned sync state (ADR 0010's `channel_order_ref`).
Which side answers "where did this order come from" has to be decided, not improvised.

## Decision

**We will serve seller commerce reads by proxying the tenant's own Medusa Admin API from the control
plane, and we will not read tenant commerce data over SQL.**

Concretely:

1. **The control plane reads the tenant's Medusa Admin API** with the platform-issued secret API key
   (ADR 0012), over the same TLS transport the worker uses. It calls Medusa's **existing** routes —
   `GET /admin/orders` and `GET /admin/orders/:id`, verified present and authenticated in
   `@medusajs/medusa@2.21.1` — and adds **no** route to the tenant instance. No seller read depends on
   a Medusa internal table, column or enum.
2. **`tenant-client` and SQL are explicitly not the read path.** ADR 0010 point 4 left them "for later
   read paths that genuinely need SQL". A seller order read does not: it needs Medusa's own view of an
   order, which is exactly what Medusa's API returns. This ADR closes that opening for this class of
   read rather than leaving it ambiguous.
3. **The seller-facing path never carries a tenant.** It lives under `/v1/seller/...` and takes the
   tenant from the session (`scope: "self"`), like `GET /v1/sync/health`. A seller cannot ask about
   another tenant by editing a URL, and a route that forgot its scope check would have no tenant to
   fall back to. The operator drift surface keeps naming its tenant explicitly, because an operator is
   cross-tenant by definition and that read is audited.
4. **Channel attribution is joined from platform-owned sync state, not from the tenant instance.** The
   order comes from Medusa; the marketplace it came from comes from `channel_order_ref` (ADR 0010),
   which already maps `orderId → (channel, externalOrderId)`. One source of truth: the same records the
   drift detector classifies (ADR 0014), so a seller's "which channel" and reconciliation's "what is
   stuck" cannot disagree. An order with no committed ref is returned with its channel `null` rather
   than guessed — it exists in Medusa but the platform has no marketplace reference for it, and
   inventing one would be worse than saying so. Only a `committed` ref attributes an order: a
   `reserved` one has no order yet and a `failed` one describes an import that did not land.
   `channel_order_ref`'s primary key is `(tenant_id, channel, external_order_id)`, which cannot serve a
   lookup that has an order id and no channel, so the durable store carries a partial index on
   `(tenant_id, order_id) where order_id is not null`; the in-memory store answers the same lookup
   directly. The reverse lookup is added to the shared `SyncStateStore` interface so both stores are
   held to it by one conformance suite rather than by convention.
5. **The response is a projection, not Medusa's body.** Fields are allowlisted in one place in the
   control plane. A new field Medusa adds cannot reach a seller by default, and the shape a seller
   sees is reviewable in our repo rather than in each tenant's deployment.
6. **The credential stays inside the request.** It is read from `MedusaAdminKeyStore`, used for one
   request, and never logged, echoed, or included in a response. The hop uses the same pinned-CA TLS
   transport the worker uses, now extracted to `packages/http-transport` so both callers share one
   implementation of the "never send a credential over plain HTTP" rule instead of each restating it
   (AGENTS.md §10 forbids duplicating a security rule; two copies would eventually disagree).
   `TENANT_NOT_FOUND`; an inactive tenant is `TENANT_NOT_ACTIVE`; an unreachable instance is
   `UPSTREAM_ERROR`. There is no fallback to a default target and no empty-list masking of a failure,
   because "no orders" and "we could not ask" must not look the same to a seller.
7. **The read requires `order:read`**, which `seller_viewer` already holds. The least-privileged
   seller role can see orders and still cannot act.

## Evidence

Verified in the pinned vendor source, `data-plane/medusa-config/node_modules/@medusajs/medusa/dist/api/admin/orders/`:

- `route.js` exports `GET` for the collection and `[id]/route.js` exports `GET` for one order.
- `validators.js` `AdminGetOrdersParams` accepts `id`, `status`, `q`, `created_at`/`updated_at`
  operator maps, `limit`, `offset` and `fields` — enough for a paged seller list and a status filter
  without a custom route.
- `middlewares.js` wires `validateAndTransformQuery` for these routes; the `/admin` authenticator
  (ADR 0012) is what requires the credential, so the platform key already opens them.

ADR 0012's live probe against a real vanilla Medusa 2.21.1 already established that a secret API key
presented over HTTP Basic authenticates to `/admin` routes and reports `actor_type: "api-key"`. This
ADR reuses that established mechanism rather than re-proving it.

**Verified end to end by an automated test** (amended, closing the gap this ADR first
recorded). `apps/services/control-plane/test/integration/seller-read.test.ts` boots a vanilla Medusa
2.21.1 HTTP server against a dedicated database: it migrates a tenant schema through the pinned CLI,
runs a fixture (`data-plane/medusa-config/src/scripts/seed-seller-read-order.ts`) that creates a sales
channel, an IDR region, a published product and one pending order through Medusa's own core workflows,
starts the server, and reads the order back through `SellerOrderReader` over HTTP Basic. It asserts
the fields the projection depends on actually come back — `display_id` as a **number** (not a string,
which would silently become `null`), `email`, `*items` for the count, `variant_sku` and `unit_price`
on the line — and that the money crosses from Medusa's whole rupiah to the platform's sen exactly.
The other tests of the read remain as they were: unit tests against a stubbed transport exercise the
authorization path, the tenant resolution, the money conversion and the channel join, and
`packages/http-transport`'s tests cover the credential-hop rule. The integration test runs only where
a database is available (`pnpm test:integration`), not in the default `pnpm test`.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Read the tenant's Medusa tables through `tenant-client` | Encodes Medusa's internal schema into the platform and breaks the "vanilla" half of ADR 0001. Medusa's totals and statuses are module-computed, not columns, so a correct read is a reimplementation of Medusa. A Medusa upgrade would become our outage. |
| A new `data-plane` project route returning a seller-shaped order | Consistent with the write path, but ships projection logic to every tenant instance, so the fields a seller may see become N deployments instead of one reviewable file. The projection is a platform concern; it belongs where it can be changed once. |
| Have the worker serve the read | The worker owns executing work over time, not serving requests, and it holds no session or capability model. Putting a seller read there would duplicate the control plane's authorization path. |
| Derive the channel from Medusa (sales channel, order metadata) | Medusa's sales channel is not a marketplace channel code, and metadata is untyped. The marketplace reference already exists as platform-owned sync state (ADR 0010) and is what reconciliation trusts; a second derivation could disagree with it. |
| Return Medusa's order body directly | Couples the seller API shape to Medusa's version and lets a new field reach a seller without review. A projection is one file and one test. |
| Cache orders in the control plane to avoid the hop | The control plane **never stores** commerce data (ARCHITECTURE.md §2). A cache is storage, and it would make the seller see something other than what Medusa holds, which is the opposite of the freshness a seller needs when chasing an order. |

## Consequences

### What becomes easier

- A seller read needs no new code inside any tenant, so it cannot drift per instance and cannot break
  on a Medusa upgrade that keeps its API stable.
- Authorization stays in one place: the same session → capability → tenant-scope path every route
  already uses, with the tenant from the session and not from input.
- Channel attribution reuses the sync state the rest of the platform already trusts, so the UI and
  reconciliation read the same facts.

### What becomes harder / technical debt we accept

- **The control plane now reads tenant commerce data, on behalf of a session.** This is a
  responsibility it did not have, and ARCHITECTURE.md §2 has been amended to say "never *stores*"
  rather than "never *reads*". It still stores none.
- **One extra hop and a dependency on the tenant instance being up.** A seller cannot list orders
  while their own Medusa is down. That is correct — Medusa is authoritative (ADR 0010) — but it means
  instance availability is now seller-visible, which raises the bar on tenant health monitoring.
- **Filtering and paging are bounded by what Medusa exposes.** A seller-facing filter Medusa cannot
  express becomes either a wider fetch plus a platform-side filter, or a new tenant route. The first
  is acceptable while result sets are small; the second is a real decision to make deliberately.
- **The read has no request timeout.** The shared transport (like the worker's hop it replaced) waits
  for the tenant's engine rather than bounding the wait, so a hung instance holds a seller request
  open instead of failing fast. This is pre-existing behaviour on the worker's path, not a new
  property of the read, but the read makes it seller-visible. A timeout belongs in the shared
  transport, where it would change both callers at once, and is deliberately not added here.
- **The read path is now end-to-end tested** (amended): a booted tenant instance is
  exercised in `test/integration/seller-read.test.ts`, so the projection is no longer only asserted
  against a stub. It still needs a database, so it runs in `pnpm test:integration`, not `pnpm test`.
- **The projection is now a security boundary.** Every field added to a seller response is a decision
  about what a seller may see, and the allowlist is the thing that must be reviewed when Medusa grows
  a field.

**How we would reverse this later:** if a seller read ever needs SQL (for example an aggregate Medusa's
API cannot express), that specific read can move to `tenant-client` with its own ADR justifying the
schema coupling. If Medusa ever ships a narrower, seller-scoped credential, only the credential the
proxy presents changes; the route and the projection stay as they are.
