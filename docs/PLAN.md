# Plan

Cofy is a multi-tenant omnichannel OMS/WMS for the Indonesian market.

Companion to `AGENTS.md` (working contract) and `docs/ARCHITECTURE.md` (layer map).
This file is the **single source of truth for what we are building next**.

## How to use this plan

- Work on **one milestone at a time**. Do not start M2 while M1 exit criteria are unmet.
- A milestone is done only when **every exit criterion is demonstrably met**. "Mostly working"
  is not done.
- Exit criteria use three markers: `[x]` met and demonstrated; `[ ]` not met; `[~]` **partially
  met** — the criterion holds at the boundary or on one side of the integration but not the other.
  `[~]` exists so a half-proven criterion is neither claimed as done nor shown as untouched. The
  evidence line always says which side is which.
- Every milestone has **explicit non-goals**. Building a non-goal is a defect, not initiative.
  If you believe a non-goal is required, stop and ask a human.
- Scope changes go through the **change control** section below, not through a quiet PR.

## Milestone status

| # | Milestone | Status | Depends on |
|---|---|---|---|
| M0 | Repo foundation & guardrails | Done (CI enforcement pending first PR) | — |
| M1 | Tenant provisioning (control plane) | Done | M0 |
| M2 | Channel connector: TikTok Shop + Tokopedia | Done | M1 |
| E0 | Integration plane prerequisites | Done, with one gap: fixed egress IP not chosen (see below) | M2 |
| M3 | Order import & stock sync (one channel, end-to-end) | In progress — write path live-verified against tenant Medusa; marketplace side still boundary-only; governor now wired into the integration plane | M2, E0 |
| M4 | Reconciliation & drift repair | In progress — engine wired; order and stock drift classification/repair done; restart resume proven on real Redis; retention remains | M3 |
| M5 | Seller OMS UI & operator console | Done — channel connection, seller screens, and the audited operator console are delivered | M3 |
| M6 | WMS core (inbound, pick, pack, stocktake) | Complete | M5 |
| M7 | Fulfillment providers (local couriers) | In progress — ADR 0020 (Accepted), courier boundary, auditable rate shopping (rule + tenant rules store), the courier provider surface, the channel tracking write-back, the tenant-side shipment write path, the shipment-create workflow and the delivery-status pull path are delivered, and the seller read now surfaces shipments and delivery status in the OMS; a real provider remains | M6 |
| M8 | Multi-channel expansion (Shopee, Lazada) | In progress (Shopee done early, ahead of M8) | M4 |

E0 is a prerequisite track (see below), not a milestone: the production egress decision and the
integration-plane skeleton that every later milestone writes into. **It gates a production
deployment, not development or boundary-level M3 work** — see the note on the OpenHands Cloud
development environment under E0.

---

## M0 — Repo foundation & guardrails

**Goal.** Make it structurally impossible for an agent (or a hurried human) to damage the
codebase, before any business logic exists.

**Deliverables**

- Monorepo with pnpm workspaces grouped per `docs/adr/0004`: `apps/services/*`, `apps/web/*`,
  `packages/*`, `connectors/*`, `data-plane/*`, `tooling/*`.
- TypeScript strict with a shared `tooling/tsconfig/base.json`. Cross-package imports use the
  workspace package `exports` map, not path aliases — aliases would let code deep-import internal
  files, which `AGENTS.md` §3 forbids.
- Workspaces with declared `exports`: `contracts` (types, errors, events), `channel-sdk` (the
  frozen `ChannelConnector` contract), `tenant-client` and `secrets` (boundaries only, no
  implementation yet). `connectors/tiktok-tokopedia`, `data-plane/modules/*`, and
  `apps/web/ops-console` exist as reserved boundaries and stay empty until their milestone.
- `pnpm boundaries` checker enforcing: dependency direction, no Medusa core imports outside the
  data plane, no direct DB access outside `control-plane`/`tenant-client`. It scans both source
  imports and `package.json` dependencies, and has its own test suite.
- CI running typecheck, lint, test and boundaries on every PR.
- `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/adr/0000-0005`.
- `.env.example` listing required variable names with no real values.
- `docker-compose.yml` for local Postgres + Redis.
- PR template that requires: milestone reference, `pnpm check` result, and dependency
  justification.

**Exit criteria**

- [x] `pnpm check` passes on a clean clone. *(verified locally: typecheck, lint, 15 checker tests,
      boundaries all green)*
- [x] `pnpm boundaries` fails when a deliberate violating import is added. *(verified: a throwaway
      file importing `pg`, `@medusajs/framework`, and a sibling service produced exactly three
      findings with correct file and line, then was deleted)*
- [ ] CI blocks a PR with a failing check. *The workflow is in place; enforcement can only be
      observed on a real PR, so this stays open until the first PR runs it.*
- [x] A new contributor can run the stack locally using only the README. *(verified:
      `docker compose up -d` brings both services to `(healthy)`; `psql select 1` and
      `redis-cli ping` both respond)*

**Non-goals**

- No business logic. No Medusa instance. No connector.

---

## M1 — Tenant provisioning (control plane)

**Goal.** Create, configure, and destroy isolated tenants programmatically.

**Deliverables**

- Tenant registry: lifecycle states (provisioning, active, suspended, terminated), plan, region.
- Our own identity layer: accounts, RBAC, sessions. **Not** Medusa auth.
- Provisioning orchestrator: create Postgres schema → run vanilla Medusa migrations → seed
  defaults → mark active. Must be idempotent and resumable after failure.
- Migration fan-out: apply a schema migration across N tenants with per-tenant status tracking.
- `packages/tenant-client`: resolve `tenant_id → connection`, with connection pooling.
- Per-tenant observability: tenant_id on every log line, per-tenant health endpoint.

**Exit criteria**

- [x] Provisioning a tenant is a single API call and completes end-to-end in a test. *(verified:
      `test/http.test.ts` creates a tenant over HTTP and asserts it reaches `active`; also verified
      against a running process — `POST /v1/tenants` returned a tenant that reached `active` with
      all five provisioning steps logged at attempt 1)*
- [x] Provisioning is resumable: a run interrupted by a failed step can be re-run to a correct end
      state without repeating work that already succeeded. *(verified: `test/provisioning.test.ts`
      asserts succeeded steps keep attempt 1 and are not re-executed, while the failed step is
      retried at attempt 2 and the migration runs exactly once)*
- [x] Migration fan-out reports per-tenant success/failure and can retry only the failures.
      *(verified: `test/migration-fanout.test.ts`, including the case where one tenant fails and the
      remaining tenants still run)*
- [x] Vanilla Medusa's own migrations put their core tables in the tenant schema, and a second
      tenant migrates in the same database. *(verified against the real CLI, Medusa 2.21.1:
      `test/integration/medusa-tenant-migrations.test.ts` runs `medusa db:migrate` twice in one
      database and asserts `public` holds 0 tables and each tenant schema holds the full set. This
      caught two defects fixed in ADR 0011: core tables landing in `public` without
      `databaseDriverOptions.searchPath`, and the second tenant failing on a database-global
      `pg_type` enum guard)*
- [x] Tenant isolation test suite passes: tenant A cannot read tenant B data through any endpoint.
      *(verified against a real Postgres: `test/integration/tenant-isolation.test.ts` proves
      unqualified table names resolve per schema and `search_path` stays pinned across pooled
      connections. HTTP-level scope checks are covered by `test/http.test.ts`)*
- [x] A tenant schema can be provisioned against a Postgres that requires TLS. *(verified against a
      local Postgres 17 with TLS required and `pg_hba` set to `hostssl` only: the real CLI migrates
      under both `sslmode=no-verify` and `sslmode=require&sslrootcert=...` once `sslmode` is
      translated into the driver's `connection.ssl`. Medusa's default is unencrypted and ignores the
      URL's `sslmode`, so the bare-URL case fails — the translation is what makes a managed instance
      work. See ADR 0011)*
- [x] Terminating a tenant revokes credentials and schedules data deletion. *(verified:
      `test/tenants.test.ts` asserts credentials are revoked before the state change, that the data
      is scheduled rather than dropped, and that a failure after revocation leaves no live
      credentials and a still-active tenant for retry)*
- [x] Provisioning seeds the tenant's defaults over its authenticated Admin API. *(verified:
      `HttpTenantSeeder` creates a default region and a stock location; `test/medusa-seeder.test.ts`
      covers the tenant region driving the currency, Basic auth, idempotent re-seed, and refusing a
      missing target or credential. `seed_defaults` runs **after** the admin key is minted, since
      the seed call needs it — `test/provisioning.test.ts` asserts that order. Verified against a
      live Medusa that re-seeding creates nothing new. Without this a tenant reaches `active` but
      its first order cannot be priced or reserved.)*

**Known limits carried into M2**

- A run interrupted by a *process kill* (rather than a step that throws) is recovered by the same
  resume path, but is not covered by an automated test: the in-memory store cannot simulate a
  store write that survives the process that made it. The integration suite is the right place for
  that once the store is Postgres-backed.
- Only one tenant's provisioning runs at a time per process. Concurrency across processes is not
  yet coordinated.
- **Medusa migrations are proven against a real CLI only up to two tenants in one database.**
  `test/integration/medusa-tenant-migrations.test.ts` proves core tables land in the tenant schema
  and that a second tenant migrates. The `pg_type` guard that broke tenant #2 is database-global,
  so a third tenant exercises the same path; a fleet-wide fan-out is still untested.
- **The guarded-enum list is version-pinned to `@medusajs/order` 2.21.1.** `MEDUSA_GUARDED_ENUMS`
  in `tenant-schema.ts` duplicates type definitions that live in Medusa's migrations and can drift
  on upgrade. The integration test catches a regression, but nothing detects a *new* guarded enum
  until a second tenant is provisioned on the new version.
- **Managed Postgres TLS is supported and locally verified.** `sslmode` in `DATABASE_URL` is
  translated into Medusa's driver-level `connection.ssl`; without that, Medusa's own default is
  unencrypted and a TLS-required server refuses the migration. Verified by running the real CLI
  against a local Postgres 17 with TLS required and `pg_hba` set to `hostssl` only, using both
  `sslmode=no-verify` and `sslmode=require&sslrootcert=...`. What remains unverified is a *specific*
  provider's certificate chain and any option rewriting it does; confirm against the chosen instance
  before onboarding tenants on it.

**Non-goals**

- No marketplace integration. No seller UI. No billing enforcement (metering only).

---

## M2 — Channel connector: TikTok Shop + Tokopedia

**Goal.** Prove the connector pattern against the hardest channel we have, so later connectors
are mechanical.

**Deliverables**

- `packages/channel-sdk` frozen: `ChannelConnector` interface, capability declarations, error
  taxonomy (including rate-limit errors), cursor types.
- `connectors/tiktok-tokopedia` implementing it, handling the two-API reality:
  - account and app binding between TikTok Shop Partner Center and Tokopedia Open Platform;
  - order/bill history read from Tokopedia, current operations via TikTok Shop APIs;
  - OAuth authorize + credential refresh.
- Contract tests against recorded fixtures, running without network.
- Capability declaration documenting exactly what this channel does and does not support.

**Exit criteria**

- [x] A seller can complete OAuth and we persist working credentials. *(Verified live 2026-09-28
      against Development Shop `7494816329028044768`: a real authorization code was exchanged and
      the connector returned both an access token and a `shop_cipher`. Reproduce with
      `scripts/verify-orders.mjs` and a fresh `TIKTOK_AUTH_CODE`. `scripts/probe:auth` checks the app
      credentials alone.)*
- [x] We can fetch orders against a sandbox account. *(Verified live 2026-09-28: the two-API read
      pulled a real order — search returned ids, detail filled 2 line items, `payment.sub_total`
      equalled the summed line totals and `total_amount` matched `grandTotal`. Reproduce with
      `scripts/verify-orders.mjs`.)*
- [~] Stock push was **blocked in M2** and moved to M3: TikTok's `updateInventory` addresses items by
      a platform `product_id`/`sku_id` that we only obtain once listing import exists, so the M2
      connector shipped `capabilities().supportsStockPush` as `false` rather than faking it. **M3
      then implemented it** — `pushStock` resolves the platform ids from the listing import and the
      capability is now `true`. What remains unproven is the live path: the push is exercised at the
      port boundary and against recorded fixtures, not against a real Development Shop. See M3's
      exit criteria, where listing import is the gate.
- [x] Contract tests pass offline and cover: token expiry, rate-limit response, partial failure,
      and a malformed response. *(30 tests, no network; `test/connector.test.ts`)*
- [x] `capabilities()` accurately reflects the two-API split (verified against real responses).
      *(`splitsOrderHistory: true`; the search endpoint genuinely returns id-only orders that the
      detail endpoint fills)*
- [x] No marketplace-specific type leaks outside the connector package. *(`src/index.ts` exports
      only the connector and its config; `pnpm boundaries` passes)*

**Known limits carried forward (recorded, not hidden)**

- **A line item is one unit.** Live order inspection (2026-09-28) showed TikTok sends one line item
  per unit and no quantity field: two identical line items summed to twice the unit price. The
  connector reads quantity via `lineQuantity()` (1 per line) rather than `0`, which would have made
  every imported order look empty. A chargeable `quantity` field is still honoured if it ever appears.
- **Twelve-digit floor values are integer minor units, not rupiah.** The sandbox uses inflated
  prices (e.g. `200000` for a `20000000`-minor subtotal) purely for readability, so do not "fix"
  scale against sandbox numbers; the conversion is validated by `payment.sub_total` matching the
  summed line totals.
- **Shop sandbox is the production host, not a separate sandbox host.** TikTok Shop's sandbox is a
  Development Shop authorized against the same app on `open-api.tiktokglobalshop.com`. The connector
  therefore needs no host switch; do not add one.
- **The app enforces an IP allowlist (a production-egress constraint).** A real authorization attempt
  from OpenHands Cloud reached the token endpoint and was refused with `Access denied. Your IP
  address is not in the IP allow list configured for this app`. *(Resolved 2026-09-28 for the
  sandbox by allowlisting the OpenHands Cloud egress IP; `probe:auth` then returned normal token
  errors instead of the refusal.)* A self-hosted server is not blocked — an unregistered IP is
  simply not on the list. What this does require is that the **production** integration plane's
  egress is a stable, registrable IP; do not work around it with a proxy. The refusal is classified
  as a non-retryable `FORBIDDEN` so the governor does not retry it.
- **TikTok webhook signature is unimplemented.** The scheme is not in the official OAS, the
  vendored SDK, or TikTok's reference tables. Rather than ship a guessed verifier that could fail
  open, `supportsWebhooks` is `false` and `webhookHandlers()` returns `{}`. Enabling it requires
  the documented algorithm, a `webhook.ts` with tests, and flipping the capability in one change.
- **The vendored TikTok SDK types are stale.** `GetOrderDetailResponse` lacks `orders[].id`,
  `create_time` and `line_items`, and the detail path has moved from `202309` to `202507`. A
  reviewed local schema (`src/order-schema.ts`) mirrors the official OAS instead of editing
  generated code (ADR 0007). Re-vendor from upstream when convenient; do not patch `dist/`.
- **`ShopeeConnector` landed early**, ahead of M8. That is a deliberate scope deviation and is
  flagged here rather than left implicit; it is not evidence M8 is underway.
- **The authorize URL's redirect parameter name is taken from the vendored SDK.** TikTok's public
  Seller Center flow uses `redirect_uri`; the SDK builds `path` (plus `timestamp`, `shop_type`).
  The host accepts our URL (verified live 2026-09-27: HTTP 200, real authorize page), but a full
  seller approval has not been run. If a live approval rejects `path`, `beginAuthorization` is a
  one-line change plus its test.
- **Token-endpoint error codes are classified from live observation, not documentation.**
  `36004004` (invalid auth code) and `36004005` (unknown refresh token) map to a non-retryable
  `CREDENTIAL_EXPIRED` so the seller is asked to reconnect instead of the governor retrying
  forever. The published code tables do not list them; treat the set as extendable.

**Non-goals**

- No Lazada connector. No listing/product upload to marketplace. No WMS. *(Shopee was built early
  and is tracked under M8; see the known limits above.)*

---

## E0 — Integration plane prerequisites (prerequisite track, not a milestone)

**Why this exists.** M2 proved the connector against a live shop, and that surfaced two facts that
must be settled before any marketplace write can run **in production**: the app enforces an **IP
allowlist**, and the integration plane that would make calls did not exist at the time. *The
integration plane now exists (`apps/services/integration-plane`, see the deliverables below); the
allowlist remains the one open item.*

**The allowlist is a production-egress concern, not a development blocker.** Development runs on
OpenHands Cloud, whose egress IP is not registered in Partner Center; that is what produced the
refusal in M2's records. A self-hosted or company server is **not** blocked — the allowlist is a
constraint on the IP the marketplace sees, and an unregistered server simply adds its own IP. So
the "our egress is refused" symptom is an artifact of *where we currently run*, not a defect in the
integration plane, and it must not be read as "M3 cannot proceed". What genuinely needs a human
call is only the **production** egress strategy (a stable IP that can be registered, and whether it
is shared or per-tenant), because that shapes the governor's budget. Nothing in M3's code or its
boundary-level tests depends on it.

**Deliverables**

- **Fixed egress IP**, registered in each marketplace app's allowlist. Without it every production
  call is refused with a non-retryable `FORBIDDEN`, exactly as the sandbox was before the IP was
  added. Decide and document the egress strategy (NAT/reserved IP) before M3 writes anything.
- `apps/services/integration-plane` skeleton: HTTP entrypoint for OAuth callbacks and webhook
  receipt, wired to `packages/secrets`, with a health endpoint. **No business logic yet** — it is
  the place M3 writes into. *(Done: `/health`, `/v1/channels/:channel/authorize`,
  `/v1/channels/:channel/callback`, `/v1/channels/:channel/probe`; service-token auth; connectors
  registered from app-key config.)*
- Channel-connection persistence: the control plane stores the `Credential` a connector returns
  (encrypted, per tenant, per channel) and can hand it back to the connector. M2 returns a
  credential object but nothing persists it outside the verification script. *(Done via
  `CredentialStore` in `packages/secrets`, keyed `(tenant, channel)` per ADR 0003; the callback
  stores it and the probe reads it back.)*
- A runnable local environment for the integration plane (compose service, env contract) so M3
  can be tested without hand-writing egress configuration. *(Env contract done in `.env.example`;
  the service boots and serves locally. A compose service is deferred until the egress decision
  fixes its network setup.)*

**Exit criteria**

- [ ] A live call from the integration plane reaches the business API without an allowlist refusal.
- [x] The integration plane starts, exposes health, and passes `pnpm boundaries`.
- [x] A credential produced by `completeAuthorization` is persisted, read back, and used to make a
      live call — no test token pasted into an environment variable. *(The probe reads the stored
      credential and hands exactly that to the connector; verified against a recording connector
      and by booting the service.)*
- [ ] The egress IP is recorded in `docs/PLAN.md` and in each marketplace app's allowlist.

**Non-goals**

- No order import, no stock push, no webhook processing. Those are M3 and depend on this.

**Open decisions (need a human call before M3 starts)**

- **Egress strategy (still open).** A NAT gateway with a static IP, or a reserved VM IP? One shared
  egress for all tenants, or per-tenant? This decides the rate-limit governor's budget shape
  (ADR 0002 wants a budget *per app key and per seller*) and whether one tenant can exhaust
  another's quota. **This is the one open E0 item; the governor in M3 was built to be correct
  either way — a shared egress needs the app-key budget, a per-tenant egress would add a
  per-tenant app budget alongside it.**
- **Medusa fork question.** Settled: **no fork** (ADR 0001). M3's write path is built to keep this
  literally true — see ADR 0010 for how the worker reaches Medusa without importing it.
- **Where the product catalogue lives.** Assumed to be Medusa's product module in the tenant data
  plane. ADR 0009 depends on this: the mapping from our SKU to a channel variant is keyed by our
  SKU, whichever store owns the catalogue.

---

## M3 — Order import & stock sync (one channel, end-to-end)

**Goal.** The core promise: an order from a marketplace lands in the tenant's Medusa correctly,
and stock propagates back without overselling.

**Progress**

- Rate-limit governor: **built and wired** — `packages/rate-governor` (12 tests with a fake clock:
  shared app-key budget, per-seller fairness, no spend on denial, Retry-After cooldown) is enforced
  by the integration plane, which is the only caller: every order page, listing page, stock push and
  probe goes through `governor.acquire` first, a denial becomes a `429` with `Retry-After`, and a
  `Retry-After` the marketplace returns pauses the channel for every tenant. See the known limits
  for what is still not covered (one process's memory; rescheduling into the workflow engine is M4).
- Connector listing read (required before stock push): **accepted** — ADR 0009 (approved
  2026-09-26). Connectors and the `ChannelConnector` interface implement it.
- Sync state location and commerce write path: **accepted** — ADR 0010 (approved 2026-09-26).
- `packages/sync-state` (ADR 0010 data shape): **done** — external-order refs, payload-keyed
  idempotency records (with an expiring lease, so a crashed attempt is reclaimable), SKU→channel
  maps, cursors; 22 tests. Control plane exposes it over HTTP behind a service token (7 route
  tests).
- Order import, listing import, stock push workflows: **done against the ADR 0010 design** —
  `apps/services/worker`, 20 tests. Each is a function over ports. The worker process wires the
  ports and starts, but **runs no workflow on a timer yet**: it exposes a health surface only, per
  AGENTS.md §2.5 (no sync work without the engine). The workflows are invoked directly in tests and
  in the live Medusa verification; the M4 engine is what will drive them in a running deployment.
- `data-plane/modules/channel-order-link`: **verified end-to-end against vanilla Medusa** — module,
  model, service, migration and the module link in `medusa-config/src/links/` all exist, and the
  real-CLI integration test proves the module table *and* the link table (`order_order_channelorderlink_...`,
  i.e. Medusa discovered the link by convention) are created in the tenant schema, that the
  partial unique index rejects a second link for the same `(tenant, channel, external_order_id)`,
  and that dismissing a link frees the key for re-import. The worker still reaches it over the
  tenant's Admin API (ADR 0010).
- Tenant Admin API surface the worker calls (`/admin/orders`, `/admin/orders/:id/release`,
  `/admin/variants`, `/admin/channel-order-links`): **built and exercised against a live Medusa
  2.21.1** — order import reserves inventory, an oversell is refused with `insufficient_inventory`,
  a retry succeeds, `release` restores the reservation, and an idempotent replay does not
  double-reserve. The outstanding gap is the marketplace side, not this surface.
- Per-tenant Medusa target resolution and credential (ADR 0012): **done** — the worker resolves a
  tenant to `{ baseUrl, secretKey }` through the control plane and presents the key over HTTP Basic
  on a TLS-verified hop; the control plane stores the target and mints the key during provisioning.
  Provisioning also seeds the tenant's default region and stock location over that authenticated
  Admin API (minted before seeding), so a fresh tenant can price and reserve its first order.

**Deliverables**

- Order import (pull path only): a worker workflow that walks the connector's cursor, and for each
  order resolves the tenant's channel connection, upserts an external reference, creates the Medusa
  order, and reserves inventory. Webhooks are **out of scope here** — the TikTok connector declares
  `supportsWebhooks: false` because the signature scheme is undocumented, so M3 must be correct
  without them (M4 then adds reconciliation on top; see ADR 0002, where pull already outranks push).
- Listing import (product ↔ channel SKU): `updateInventory` addresses items by a platform
  `product_id`/`sku_id` that we only obtain from listing import, so stock push cannot exist without
  it. This is the blocker that moved stock push out of M2.
- Stock push workflow: idempotency record → connector push → result handling, with rate-limit
  rescheduling via the governor. Depends on listing import mapping a local variant to the channel's
  `sku_id`.
- Rate-limit governor: global budget per app key and per seller.
- Medusa integration as a **data-plane module**, never a fork: implement `data-plane/modules/
  channel-order-link` and register it via a module link (ADR 0001). No core Medusa table gains a
  column; the tenant stays on a vanilla image. *(Done and verified against the real CLI; see
  Progress above.)*
- Mapping layer: marketplace stock location ↔ Medusa stock location, per tenant.
- Tenant-side Admin API routes so the worker's `CommerceClient` calls have an implementation:
  `/admin/variants` (SKU → variant), `/admin/orders` (create with reservations, idempotency-key
  honoured), `/admin/orders/:id/release` (compensation), `/admin/channel-order-links` (the
  external-ref lookup compensation depends on).

**Exit criteria**

Boundary note: the criteria below are proven at the **port boundary** — the workflows, the sync
state, and the invariants they hold are real code under test, while the marketplace is a fake
(AGENTS.md §6 permits this for external boundaries). The tenant Medusa is no longer a fake for the
write path: the Admin routes (`/admin/orders`, `/admin/orders/:id/release`, `/admin/variants`,
`/admin/channel-order-links`) were exercised against a live Medusa 2.21.1, and the reservation,
oversell guard, retry, release and idempotent-replay claims below carry that live evidence as well
as their boundary test. What is still unproven is the **marketplace** side against a live
Development Shop; the blocker there is environment and hosting, not an approval: ADR 0010 is
accepted, and the allowlist refusal is specific to OpenHands Cloud (a self-hosted server is not
blocked — see E0). The evidence line names the exact test; treat a checked box as "correct at the
boundary", not "shipped".

- [~] A real order placed on the channel appears in the tenant's Medusa with correct line items,
      totals and inventory reservation. *(Boundary evidence: `worker/test/order-import.test.ts` —
      "an order placed on the channel lands in Medusa with its lines and a reservation". Live
      evidence against tenant Medusa 2.21.1: a real order imported and reserved 2 units against 10
      on hand; the marketplace side is still a fake. Line items are one unit each; see M2's known
      limit.)*
- [~] Re-running the import for the same order (same pull window, twice) creates exactly one order.
      *(Boundary evidence: "re-running the import for the same order creates exactly one order" —
      verified. Live evidence: a replay of a committed order did not create a second order or a
      second reservation; the same-key retry returned the duplicate-link error instead. The durable
      barrier is the `channel_order_link` unique index, not workflow-transaction resume — the
      configured in-memory engine does not persist executions.)*
- [ ] A sale in Medusa propagates to the channel and reduces available stock there, via a listing
      import mapping that resolves the channel `sku_id`. *(Boundary evidence: "a sale in Medusa
      propagates to the channel through the listing mapping" — the push carries
      `externalProductId`/`externalSkuId` resolved from the stored map, not just the SKU. The
      marketplace call itself is still a fake in the worker tests, but the integration plane now
      rate-limits it; see the known limits below.)*
- [~] Concurrent orders across channels never oversell (prove with a concurrency test).
      *(Boundary evidence: "concurrent imports of the same order do not oversell or double-create" —
      two racing imports yield one order and five units reserved once; "an order that would oversell
      is refused, and the first order keeps its reservation" — four + four against five on hand
      leaves one. Live evidence against tenant Medusa 2.21.1: an oversell attempt (20 against 8
      available) was refused with `insufficient_inventory` and left no orphan link.)*
- [~] Compensation test: fail the workflow after order creation, assert reservation is released
      and no orphan order remains. *(Boundary evidence: "a failure after order creation releases the
      reservation and marks the ref failed" — the order is found via `channel-order-link`, released,
      and the ref is `failed` with `order.import_failed` published. Live evidence: `release` restored
      the reserved quantity back to the pre-import level.)*
- [x] Rate-limit governor holds under a simulated burst without exceeding the app budget.
      *(evidence: `pnpm --filter @platform/rate-governor test` — 12 tests, 0 failures, fake clock.
      `governor.test.ts`: "a burst within the app budget is allowed and the budget is spent",
      "the app budget is shared, so one tenant can exhaust capacity for a channel",
      "a denied call does not spend budget", "a channel-wide cooldown from Retry-After blocks
      every tenant, then lifts". Wiring evidence: `apps/services/integration-plane/test/http.test.ts`
      — "a call over the app budget is refused with a 429 and a Retry-After, and never reaches the
      connector" and "a rate-limit response from the channel pauses every tenant on that channel";
      `apps/services/worker/test/ports.test.ts` proves the 429 stays retryable across the boundary.)*

**Known limits (recorded, not hidden)**

- Governor state is in-memory per process. With more than one instance each process would allow the
  full app budget, so we would exceed the marketplace limit. Single process is correct for M3; the
  Redis-backed store lands behind the same interface before horizontal scaling.
- The governor gates the call, and rescheduling is now automatic: a refused call returns `429`
  `CHANNEL_RATE_LIMITED` with a `Retry-After`, the worker releases the idempotency claim and
  reschedules the unit at that time through the queue (M4, ADR 0013). The budget is enforced (no
  over-budget call leaves the plane) and the work requeues itself. What is still open is the
  *inventory* of what to reconcile: the worker takes its targets from `RECONCILIATION_TARGETS` because
  the control plane exposes tenants and connections only to a seller session, not to a service token.
- Sync state is durable when `DATABASE_URL` is configured: the control plane now selects
  `PostgresSyncStateStore` (ADR 0010), and the in-memory store remains only as the
  no-infrastructure local default. Both implementations are held to one shared conformance suite
  (`packages/sync-state/testing/store-conformance.ts`): 29 tests over the in-memory store, and the
  same suite plus a table-level uniqueness check over a real Postgres
  (`apps/services/control-plane/test/integration/sync-state-store.test.ts`). Durable sync state is
  the prerequisite for M4's "kill the worker mid-reconciliation; restart resumes without
  duplicating effects" — an engine that survives a restart over state that does not would be a
  false comfort.
- An idempotency claim is a lease with a fixed TTL (default 5 minutes). A crashed attempt is
  therefore reclaimable by a later retry after the lease passes; reconciliation is no longer the
  only repair path. The TTL is a guess, not a measurement: too short and a slow-but-alive call is
  preempted into a second call (safe only because the write is idempotent), too long and a crash
  blocks that order for the whole TTL. Measure against real call latencies before hardening it.
- Drift is defined for order refs only (ADR 0014): a `failed` ref is `failed_import` and a
  `reserved` ref past `STALE_RESERVATION_SECONDS` is `stale_reservation`. The cutoff must exceed the
  idempotency lease or a healthy in-flight attempt is reclassified as drift — a relationship the
  code documents but does not enforce, because both are deployment inputs. Detection reads at most
  `MAX_DRIFT_REFS_PER_PASS` refs per kind per pass, so a tenant with more drift than the bound
  converges over several passes. Stock drift is covered by ADR 0015: `reconcile.stock` compares each
  channel-reported level to Medusa's current value and repairs a mismatch by pushing the local value,
  while a level with no SKU or for a SKU the tenant does not sell is counted uncomparable rather than
  drift, so the count stays clearable.
- The stock-push idempotency key is a digest of the pushed payload. That makes an unchanged re-push
  a replay and a changed value a new operation (both tested), but it also means two *different*
  channels' pushes are separate keys by construction, and a partially-rejected batch is recorded as
  failed so a retry re-pushes the whole batch. Fine for M3's volumes; revisit with per-item records
  if a channel starts rejecting single items persistently.

**Non-goals**

- No returns/exchanges. No fulfillment. No multi-channel. No WMS picking. No marketplace webhooks
  (TikTok's signature scheme is undocumented; do not guess one).
- No listing **creation/upload** to the marketplace — import of listings we can already read is in
  scope, publishing new products to a channel is not.

---

## M4 — Reconciliation & drift repair

**Goal.** The system repairs itself. A dropped webhook or a crashed worker becomes a non-event.

**Status.** In progress. ADR 0013 is accepted (the workflows stay engine-agnostic behind a
`WorkflowQueue` port; the governor is the only component that decides delay), and ADR 0014 is
accepted (drift is classified by one shared pure function and repaired through the ordinary pull).
The durable sync-state store is done and verified against real Postgres, the `WorkflowQueue` port has
both adapters — in-memory and Redis/BullMQ — passing one conformance suite, and the worker now runs
the engine: the M3 workflow functions are registered as units, a `CHANNEL_RATE_LIMITED` is rescheduled
with the governor's `Retry-After` (closing M3's open item), and `reconcile.orders` converges through
the same pull path on a cadence that lives in the queue. Drift detection, classification and repair
are now wired (order refs), with the control-plane dashboard read, and the mid-pass restart resume is
proven over a real Redis queue; ADR 0015 adds the stock snapshot pull and stock drift repair, so both
entities now converge. What remains is the retention policy.

**Deliverables**

- **[x] Durable sync-state store behind the existing `SyncStateStore` interface (Postgres)**, so an
  engine that survives a restart has idempotency records that survive it too. *(Done and verified
  against a real Postgres 16: `PostgresSyncStateStore` in `apps/services/control-plane`, selected by
  `main.ts` when `DATABASE_URL` is set. Both stores run one shared conformance suite
  (`packages/sync-state/testing/store-conformance.ts`); the Postgres run adds a table-level
  uniqueness check. Evidence: `apps/services/control-plane/test/integration/sync-state-store.test.ts`
  — 26 pass, including "only one of two concurrent claims for the same key wins".)*
- **[x] `WorkflowQueue` port + adapters (ADR 0013)** — the producer port (`enqueue`/`schedule`), the
  shared `dispatchJob` loop, an in-memory adapter, and a Redis/BullMQ adapter. *(Done: both adapters
  run one conformance suite, `packages/workflow-queue/testing/queue-conformance.ts`; the BullMQ run
  adds delayed delivery and restart survival, and proves a reschedule re-enqueues under a derived id
  rather than being dropped by BullMQ's cross-state dedupe. Evidence:
  `packages/workflow-queue/test/integration/bullmq-queue.test.ts` — 9 pass.)*
- **[x] Wire the M3 workflow functions as queue units** — `createWorkflowHandlers` in
  `apps/services/worker/src/units.ts` is the one place a job becomes a call into a workflow, with the
  payload validated at the boundary. *(Done: `apps/services/worker/test/units.test.ts` proves a queued
  job reaches the import workflow and creates the order, and that a job without a channel or with a
  malformed payload is failed rather than guessed at.)*
- **[x] Reschedule on `CHANNEL_RATE_LIMITED` through the queue with the governor's `Retry-After`** —
  also closes M3's open item. *(Done: a deferral is not a failure. `pushStockOnce` releases its
  idempotency claim and rethrows, and the unit table turns the error into a `reschedule` carrying the
  governor's `Retry-After`; the delay is read, never computed, by the worker. Evidence:
  `apps/services/worker/test/units.test.ts` — the retry pushes after the deferral, and no
  `stock.push_failed` event is emitted for a throttled call.)*
- **[x] Cursor-based pull for orders, per tenant per channel, on a queue-owned cadence** —
  `ReconciliationScheduler` seeds the first pass and `reconcile.orders` re-arms its own next run, so
  the cadence survives a restart instead of living in a timer (AGENTS.md §2.5). *(Done: the unit calls
  the same `importOrdersOnce` as the real-time path — no second repair code path (ADR 0002). Evidence:
  `apps/services/worker/test/reconcile.test.ts` and the `reconcile.orders` case in `units.test.ts`.)*
- **[x] Stock snapshot pull and drift repair (ADR 0015).** *(Done: `fetchStockSnapshot` /
  `supportsStockSnapshotRead` join the connector contract (Shopee and TikTok implemented);
  `reconcile.stock` walks the channel's snapshot, compares each level to Medusa's `GET
  /admin/stock-levels`, and repairs a mismatch by pushing the *local* value through the same
  `pushStockOnce` the real-time path uses. A level with no seller SKU, or for a SKU the tenant does not
  sell, is counted as uncomparable and never repaired, so the drift count can return to zero. Evidence:
  `apps/services/worker/test/stock-reconcile.test.ts`, the `reconcile.stock` case in `units.test.ts`,
  and the connector snapshot cases in `connectors/*/test/connector.test.ts`.)*
- **[x] Drift detection: compare pulled state against local state, classify drift type.** *(Done:
  `classifyOrderRefDrift` / `orderRefsToDrift` in `packages/contracts` classify a ref as
  `failed_import` or `stale_reservation` from its own state, shared by the worker's pass and the
  control-plane dashboard so they cannot disagree (ADR 0014). The stale cutoff is an operator input.
  Evidence: `apps/services/worker/test/drift.test.ts` — a failed ref is drift, an old reservation is
  drift, a fresh one is not, and a committed ref never is.)*
- **[x] Repair via the same idempotent workflows used by real-time paths (no second code path).**
  *(Done: `repairDrift` calls the same `importOrdersOnce` the real-time unit calls, with
  `retryFailedRefs` set; a `failed` ref is reopened inside the pull while the order is in hand, so a
  repair can never report drift resolved for an order it did not pull. Evidence:
  `apps/services/worker/test/drift.test.ts` — a repair re-imports the order and the re-count is zero,
  a repair that fails again leaves the drift visible, and a ref is not reopened for an order the page
  no longer returns.)*
- **[x] Cursor advance only after successful commit; safe re-run.** *(Already held: the pull advances
  the cursor after the whole page committed and the ref/idempotency checks make a re-read a no-op —
  proven by the crash-mid-pass test in `apps/services/worker/test/integration/restart.test.ts`.)*
- **[x] Drift metrics and alerting: drift rate, repair latency, unresolved drift count.** *(Done for
  the M4 surface: the control plane exposes `GET /v1/sync/drift/:tenantId/:channel` returning the
  `DriftSummary` (unresolved count by kind), and the repair pass emits `drift.repair.completed` with
  `detected`/`repaired`/`remaining` through the platform's structured JSON logs. A dedicated metrics
  stack is deliberately not added (ADR 0014). Evidence: the drift-dashboard cases in
  `apps/services/control-plane/test/http.test.ts`.)*
- [ ] Retention policy for raw events and idempotency records.
- [x] A real-Redis integration test that kills the worker mid-pass and proves the restart resumes
      without duplicating effects. *(Done: `apps/services/worker/test/integration/restart.test.ts`
      drives the real unit table over a real Redis queue — page one commits, the pass dies on page
      two, the consumer is stopped, and a fresh consumer re-armed from the committed cursor imports
      only what was missing. The test is honest about its own limit: the sync-state store in it is the
      in-memory one, because the worker reaches the durable store over HTTP and a unit test cannot
      stand that up. Store durability is proven separately against real Postgres in
      `apps/services/control-plane/test/integration/sync-state-store.test.ts`; the two together cover
      the criterion, neither alone does. Skipped when `TEST_REDIS_URL` is unset, so `pnpm test` stays
      usable without Redis.)*
- **Only if a channel documents its webhook signature**: a webhook receiver (verify, persist raw,
  dedup, enqueue, return fast). Until then reconciliation is the whole story, which ADR 0002 already
  makes the source of truth.

**Exit criteria**

- [x] Reconciliation converges orders and stock within the SLO using the pull path alone (webhooks
      are not required, so this is the normal case today, not a degraded mode). *Orders converge
      through `reconcile.orders`; stock converges through `reconcile.stock`, which walks the channel's
      snapshot and pushes the local value back for any level that disagrees (ADR 0015).*
- [x] Injected drift (delete a local order, corrupt a stock level) is detected and repaired. *Order
      drift is covered end to end: a failed or stale ref is classified, repaired through the pull, and
      the re-count returns to zero (`apps/services/worker/test/drift.test.ts`). Stock drift is covered
      the same way: a channel level that disagrees with Medusa is detected, repaired through the
      ordinary push with the local value, and a second pass reads zero drift
      (`apps/services/worker/test/stock-reconcile.test.ts`).*
- [x] Reconciliation respects the rate-limit budget and never starves real-time operations. *(A
      refusal defers the unit with the governor's `Retry-After` instead of failing it, and the queue
      carries no second limiter, so there is one budget — ADR 0013.)*
- [x] Kill the worker mid-reconciliation; on restart it resumes without duplicating effects. *(Done:
      `apps/services/worker/test/integration/restart.test.ts` kills a pass after page one commits and
      proves a fresh consumer resumes from the committed cursor without re-importing what landed. It
      runs on the in-memory store by design; the durable store is proven separately against real
      Postgres. The two together cover the criterion.)*
- [x] Drift dashboard shows unresolved drift returning to zero after repair. *(The control plane's
      `GET /v1/sync/drift/:tenantId/:channel` reads the shared classifier over the durable store; the
      HTTP test takes a failed ref from one count to zero after the reopen-and-commit repair path
      (ADR 0014).)*

**Non-goals**

- No cross-tenant analytics. No historical backfill beyond the channel's API limits.

**Known limits (recorded, not hidden)**

- BullMQ retains a completed job in Redis until something removes it, and the re-arming cadence uses a
  fresh id per pass (`<base>@<runAt>`), so completed passes accumulate at a known rate (one per target
  per interval). That is bounded work but unbounded storage; the retention-policy deliverable above is
  what closes it. The adapter removes a terminal job only when its id is reused — the `arm()` bootstrap
  path — because inventing a keep-count in the adapter would put an operator's policy decision in code
  (the same reason `RECONCILIATION_INTERVAL_SECONDS` has no default).
- Reconciliation targets are declared in `RECONCILIATION_TARGETS` rather than discovered. The worker
  cannot enumerate tenants and connections yet: the control plane exposes that inventory only to a
  seller session, not to a service token. Until a service-token inventory route exists, an operator
  declares the targets, and a malformed entry stops startup instead of silently reconciling fewer
  tenants than intended.

---

## M5 — Seller OMS UI & operator console

**Goal.** Sellers can actually run their operations, and our own team can support them. Until now
everything was API-only.

**Status.** Done. The seller read surface is delivered and tested (ADR 0016), the channel connection
flow is delivered, the `oms-web` screens exist, and the operator console exists with audited,
time-boxed impersonation (ADR 0019). The read path is covered by unit tests against a stubbed
transport *and* end to end against a booted Medusa HTTP server (`test/integration/seller-read.test.ts`).

**Deliverables**

- `apps/web/oms-web`: Next.js app consuming our own APIs (not Medusa Admin).
  *(Shell delivered — ADR 0017: session-gated pages for login, order list, order detail, and sync
  health, reading only through the control plane. No component library yet; that is deliberate and
  revisitable. Manual actions are still absent because the write path is.)*
- Channel connection flow (the single-click OAuth promise) with clear connection health.
  *(Delivered: `GET /v1/seller/channels` lists every served channel with its connection state and
  credential expiry, and `POST /v1/seller/channels/:channel/connect|disconnect` begin and end a
  connection. The control plane holds the OAuth state and joins the integration plane's credential
  store (ADR 0008); no credential crosses to the UI. The screen is `/channels` in `oms-web`, with
  connect and disconnect as plain form posts so they work without JavaScript.)*
- **[x] Order list/detail with channel source and status.** *(Done for the API: `GET /v1/seller/orders`
  and `GET /v1/seller/orders/:orderId`, both session-scoped with `order:read` and the tenant taken
  from the session, never the URL (ADR 0016). The channel is joined from platform-owned
  `channel_order_ref`, so the UI and reconciliation read the same fact; an order with no committed ref
  reports `channel: null` rather than a guess. Money crosses back from Medusa's whole rupiah to the
  platform's sen in one place. Evidence: the seller-order cases in
  `apps/services/control-plane/test/http.test.ts`. Manual actions (accept, cancel, reship) are not
  built — they are writes and belong with the write path.)*
- Stock view per location, with sync status per channel.
- **[x] Sync health view: what is syncing, what failed, what reconciliation fixed.** *(Done for the
  API: `GET /v1/sync/health` reads the shared drift classifier over platform-owned sync state and
  returns every known channel with an actionable sentence per problem, so the UI never infers absence.
  Evidence: the sync-health cases in `apps/services/control-plane/test/http.test.ts`.)*
- Tenant-scoped auth and RBAC enforced at the API layer, not just hidden in the UI. *(Holds for the
  seller reads: the tenant comes from the session, and the tests assert an operator is refused and a
  service token is refused.)*
- `apps/web/ops-console`: internal operator UI — tenant lifecycle, support impersonation (audited
  and time-boxed), and usage/billing views. Separate app from the start so operator screens never
  leak into the seller UI.
  *(Delivered — ADR 0019: a server-rendered Next.js app over the `ops:*` surface. Tenant list and
  detail, an audited and time-boxed impersonation with a persistent banner, and the impersonation
  trail. Usage/billing views are not built: there is no billing data yet.)*

**Exit criteria**

- [x] A seller can connect a channel and see imported orders without any support involvement.
      *(The channel screen in `oms-web` begins and ends a connection, and the order list reads the
      imported orders. Both go through the control plane with the seller's own session.)*
- [x] Failed syncs are visible with an actionable explanation, not a raw error. *(The sync-health read
      returns prose per problem and the tests assert the internal kind does not leak.)*
- [x] Tenant isolation test: tenant A cannot see tenant B orders through any UI endpoint.
      *Proven end to end: `test/integration/tenant-seller-isolation.test.ts` boots two real Medusa
      instances — separate schema, separate admin secret, separate port — seeds a distinct order in
      each, then reads both through the real seller HTTP surface. A seller listing orders sees only
      its own, and asking for the other tenant's order id is refused rather than served.*
- [x] Every UI action maps to an audited API call (no client-side-only state changes).
      *(Every screen reads through the control plane; the only state-changing actions are connect and
      disconnect, both plain form posts to a control-plane route, and impersonation, which writes the
      audit record before it returns.)*
- [x] Operator role is distinct from seller roles; ops-console endpoints reject seller credentials.
      *Proven both directions: the seller read rejects an operator, and the ops surface rejects a
      seller (the impersonation cases in `apps/services/control-plane/test/http.test.ts`).*
- [x] Impersonation is logged with actor, target tenant, and expiry.
      *The `POST /v1/ops/impersonate` handler writes an append-only record with the actor, the tenant,
      and the expiry the session actually got before it returns, and `GET /v1/ops/impersonations`
      reads it back. Evidence: the ops cases in `apps/services/control-plane/test/http.test.ts` and
      the impersonation cases in `apps/services/control-plane/test/identity.test.ts`.*

**Non-goals**

- No WMS screens (picking, packing, stocktake). No accounting. No chat.

**Known limits (recorded, not hidden)**

- **The seller read is covered end to end against a real instance.** `test/integration/seller-read.test.ts`
  boots a vanilla Medusa 2.21.1 against a dedicated database, seeds an order through Medusa's own core
  workflows, and reads it back through `SellerOrderReader` over HTTP Basic. It asserts the fields we
  depend on are populated (`display_id` as a number, `email`, `*items`, `variant_sku`) and that the
  money crosses from whole rupiah to sen exactly. It still runs only where a database is available
  (`pnpm test:integration`), not in the default `pnpm test`.
- **Manual order actions (accept, cancel, reship) are not built.** They are writes to the tenant's
  commerce engine and need their own decision about idempotency and channel write-back, not a
  read-surface extension.

---

## M6 — WMS core

**Goal.** Warehouse operations that Medusa does not provide.

**Status.** Complete. The **backend is delivered and proven end to end**: the `wms` and
`purchase-order` modules, the inbound and outbound workflows, the Admin API routes and the stock
ledger all exist, and `test/integration/wms-stock-write-path.test.ts` boots a real Medusa, walks
receipt → put-away → pick → stocktake over HTTP, and reads `inventory_level.stocked_quantity` out of
the tenant schema to show the engine's number and the ledger's moved together — then reads the same
number back through `GET /admin/stock-levels`, the exact route the M4 push compares against, so the
change is pushable. The **WMS screens in `apps/web/oms-web` are built** — layout, inbound, pick
tasks, stocktakes, and the per-bin contents and ledger — over a new control-plane seller WMS surface
(`/v1/seller/wms/*`, capability-gated by `wms:read`/`wms:write`). The channel-sync SLO is now
declared (`CHANNEL_SYNC_SLO_SECONDS`, ADR 0002), asserted at the worker boundary, and enforced
against the cadence at startup. Design: `docs/adr/0018`.

**Deliverables**

- Custom modules under `data-plane/modules/` (via module links, never core table changes):
  `wms` (bin locations, put-away, pick tasks, pack, stocktake) and `purchase-order` (inbound).
  *(Delivered: `data-plane/modules/wms` and `data-plane/modules/purchase-order`, both registered in
  `medusa-config.ts`. Each owns its tables; the warehouse reaches the engine's stock location by
  `stock_location_id`, so no core table is altered.)*
- WMS screens in `apps/web/oms-web`. *(Delivered: `/warehouse` (warehouses and bins), `/warehouse/inbound`
  (purchase orders, receiving, put-away), `/warehouse/pick-tasks` (create and scan), `/warehouse/stocktakes`
  (open and apply), and `/warehouse/bins/[binId]` (contents and movement ledger). Writes are server
  actions over the control plane's seller WMS routes; the tenant and the actor are the session's, never
  the form's.)*
- Inbound flow: purchase order → goods receipt → put-away → stock available. *(Delivered:
  `receivePurchaseOrderWorkflow` posts units into the staging bin and adjusts the Medusa level in one
  workflow; `putAwayWorkflow` relocates them bin to bin without touching the level.)*
- Outbound flow: order → pick task (with barcode scan) → pack → handover to fulfillment. *(Delivered
  through pack: `createPickTaskWorkflow` and `scanPickLineWorkflow` collect units into a packing bin
  and refuse a scan whose barcode does not match the variant. Handover is M7.)*
- Stock adjustment and stocktake with variance reporting. *(Delivered: `openStocktakeWorkflow`
  freezes the system quantity, `applyStocktakeWorkflow` records the variance as a signed movement;
  the stocktake screen shows the variance before it is applied and the bin ledger shows it afterwards.)*

**Exit criteria**

- [x] A purchase order can be received and increases available stock at a specific bin.
      *Proven end to end: the received units read back in the staging bin, and the level at the
      warehouse's stock location rises by the same quantity.*
- [x] A pick task can be completed by barcode scan and blocks on wrong-item scans.
      *Proven end to end: the right barcode completes the task; a wrong one is a 400 and moves no
      stock.*
- [x] Stocktake variance produces an auditable adjustment, never a silent overwrite.
      *Proven end to end: the correction is a signed `stocktake` movement whose reason carries the
      counted number, and the ledger is asserted to be append-only.*
- [x] All WMS data lives in custom modules; `pnpm boundaries` proves no core table was altered.
      *`pnpm boundaries` is clean, and the WMS migration creates only `wms_*` and `purchase_order*`
      tables in the tenant schema.*
- [x] A seller can run the inbound, outbound and stocktake flows from the UI, and a viewer or an
      impersonated session can look but not move stock. *Delivered as the `/warehouse` screens over
      the control plane's `/v1/seller/wms/*` surface; `http.test.ts` pins that a `seller_viewer` and
      an impersonated session read the warehouse and get a 403 on every write, and
      `apps/web/oms-web/test/control-plane.test.ts` pins that each screen function addresses the
      route the control plane actually serves.*
- [x] WMS operations reflect in channel stock within the sync SLO. *Proven in two halves, one per
      side of the boundary. The engine half: `test/integration/wms-stock-write-path.test.ts` shows a
      receipt and a stocktake move `inventory_level`, and reads the number back through
      `GET /admin/stock-levels` — the route the M4 push compares against — so the change is
      pushable. The channel half: `apps/services/worker/test/stock-sync-slo.test.ts` shows a stock
      change the warehouse made is carried to the channel in one pass (the channel is pushed the
      local number, not its stale one), and that the pass re-arms on a cadence within the declared
      SLO. The SLO itself is `CHANNEL_SYNC_SLO_SECONDS` (300s) in `packages/contracts`; the worker
      refuses to start on a cadence longer than it (`cadenceMeetsSyncSlo`), so the promise cannot be
      configured away. Skipped without `TEST_DATABASE_URL`, like the other real-Medusa tests.*

**Non-goals**

- No wave/batch picking optimization. No robotics or conveyor integration. No multi-warehouse
  transfer automation.

---

## M7 — Fulfillment providers (local couriers)

**Goal.** Ship orders through the marketplace's own logistics arrangement (primary) or a seller's own
courier (self-arranged), without manual re-entry, and carry the printable label and delivery status
back to the OMS.

**Status.** In progress. ADR 0021 amends ADR 0020's assumption about *who creates the shipment*: for
Shopee and TikTok Shop/Tokopedia the marketplace arranges logistics (it books the waybill, issues the
printable label and owns buyer tracking), so **channel shipping arrangement is the primary M7 path**
and courier providers serve self-arranged shipping. The courier-centered pieces stay and remain the
self-arranged path: `docs/adr/0020` decides where a
courier integration lives
(connector-style providers in the integration plane, with the shipment itself in the tenant's Medusa
Fulfillment module), `packages/contracts/src/fulfillment.ts` adds the courier-neutral types and the
pure `selectCourier` rule, `packages/courier-sdk` fixes the `CourierProvider` interface, and the
integration plane now exposes a courier surface (`/v1/couriers/*`) that fans quotes out across
registered providers, books the quote rate shopping chose, tracks and cancels — all under the shared
governor, which now governs `CourierCode` on the same footing as `ChannelCode`. The tracking
write-back to the channel is built (ADR 0020's approval-gated extension): the `ChannelConnector`
gains `attachTrackingNumber` and a `supportsTrackingWriteBack` capability, the plane exposes
`/v1/channels/:channel/tracking`, and the worker runs a `shipment.write_back` unit. The tenant-side
half is built too: `CommerceClient.recordShipment` posts to a data-plane route that runs
`recordShipmentWorkflow`, turning "order X shipped with waybill Y" into the engine's own Fulfillment
(consuming the reservation) plus the shipment that carries the label, idempotent on the waybill. The
tenant's rate-shopping rules are now stored as ADR 0020 places them: with the control-plane tenant
record, in the platform's `platform_ops` schema, read and written over
`/v1/seller/rate-shopping-rules` and cleared on termination. The pieces are now joined by the
**`shipment.create` unit**: it reads the tenant's rules over the control plane's service-token
surface, quotes across couriers, applies `selectCourier`, books the chosen quote, records the
tenant-side Fulfillment, and queues `shipment.write_back` rather than calling the channel inline —
so the channel write stays governed and retryable on its own (`apps/services/worker/src/shipment-create.ts`,
`apps/services/worker/test/shipment-create.test.ts`). A real courier provider is blocked on sourcing a
courier SDK (ADR 0007's vendoring rule); the courier surface is proven with in-test providers. ADR
0021's primary path is now implemented end to end: the **`shipment.arrange` unit** has the channel
book the waybill, records the tenant-side Fulfillment carrying it, and fetches the printable label
into the fulfillment's `label_url` when the channel exposes one — the arrangement call is the
write-back, so this path queues no `shipment.write_back`
(`apps/services/worker/src/shipment-arrange.ts`, `apps/services/worker/test/shipment-arrange.test.ts`).
The **delivery-status pull path** is built too: `shipment.track` reads the tenant's active shipments
from the engine, asks the channel or the courier for the newest event, and writes forward advances
through a new tenant-side `advanceShipmentWorkflow`
(`apps/services/worker/src/shipment-track.ts`, `apps/services/worker/test/shipment-track.test.ts`).
The shipments are now **visible in the OMS**: the seller order detail projects the engine's
fulfillments — the waybill, the courier, the arrangement, the normalised delivery status and its
event timeline — off Medusa's own `GET /admin/orders/:id` (no new tenant route, ADR 0016), and the
order list shows Medusa's `fulfillment_status`; the pages render them with the seller-facing labels
and an `http(s)`-only link guard for tracking/label URLs
(`apps/services/control-plane/src/seller-orders.ts`,
`apps/web/oms-web/src/app/orders/[orderId]/page.tsx`,
`apps/services/control-plane/test/integration/shipment-write-path.test.ts`).
The exit criteria are still unticked: a real courier provider and the seller "ship this order"
action remain.

**Deliverables**

- Fulfillment by channel shipping arrangement (the primary path, ADR 0021): `ChannelConnector` gains a
  capability-gated arrangement surface (`getShippingArrangementParameters`, `arrangeShipment`,
  `fetchShippingLabel`, `fetchChannelTracking`) plus `supportsShippingArrangement`,
  `supportsShippingLabel`, `supportsChannelTracking`. Shopee implements it (`getShippingParameter`,
  `shipOrder`, `getTrackingNumber`, `createShippingDocument`/`downloadShippingDocument`) and TikTok
  Shop implements it (`getEligibleShippingService`, `shipPackage`/`markPackageAsShipped`,
  `getPackageShippingDocument`, `getTracking`).
- Fulfillment module providers for target couriers (JNE, J&T, SiCepat, Anteraja, and/or an
  aggregator such as RajaOngkir), for **self-arranged** shipping. *(The provider surface is delivered
  and tested; the providers themselves wait on a vendored courier SDK, ADR 0007.)*
- Rate shopping: select courier by tenant-defined rules. *(The rule is delivered as a pure function,
  `selectCourier` in `packages/contracts`: it applies the tenant's hard constraints, applies the
  chosen strategy, breaks ties deterministically, and returns the chosen quote plus the reason every
  other quote lost — the audit is the return value, so it cannot drift from the decision. Evidence:
  `packages/contracts/test/rate-shopping.test.ts`. The rules themselves are now stored, as ADR 0020
  places them: `RateShoppingRulesStore` keeps them with the control-plane tenant record in the
  platform's `platform_ops` schema, read and written over `/v1/seller/rate-shopping-rules` and
  cleared on termination. The plane's quote fan-out feeds `selectCourier` the quotes and books the
  chosen one — `apps/services/integration-plane/test/couriers.test.ts`. The loop is now closed in the
  `shipment.create` unit: the same rule that is auditable is the rule that decides what ships, and
  the selection is the value the workflow returns —
  `apps/services/worker/test/shipment-create.test.ts`.)*
- Tracking number write-back to the channel. *(Delivered: `ChannelConnector.attachTrackingNumber`
  plus `supportsTrackingWriteBack` (ADR 0020's approved extension), the plane route
  `/v1/channels/:channel/tracking`, and the worker `shipment.write_back` unit. TikTok Shop implements
  it via `fulfillment/updateShippingInfo`; Shopee declares `false` and refuses loudly until its
  channel-dependent `ship_order` shape is implemented — ADR 0021 corrects the earlier claim that the
  SDK could not express it, and the shape is genuinely channel-dependent.)*
- Channel shipping arrangement: the marketplace books the waybill, issues the printable label and
  owns buyer tracking (the primary path, ADR 0021).
- Handover and delivery status sync back into the order.

**Exit criteria**

- [ ] Fulfilling an order produces a tracking number and writes it back to the channel.
      *(Two paths, per ADR 0021. **Channel-arranged (primary):** the seller selects order(s), the
      plane reads the channel's arrangement parameters, `arrangeShipment` has the marketplace book
      the waybill, and the tenant-side Fulfillment is recorded carrying it — the write-back for this
      case *is* the arrangement call, since the marketplace issued the number. **Self-arranged:**
      the plane books a courier and returns a waybill, and `shipment.write_back`/
      `attachTrackingNumber` tells the channel — capability-gated, governed, idempotent on the
      waybill; the tenant-side record is built (`recordShipment` → `recordShipmentWorkflow`), proven
      over HTTP against a real Medusa (`test/integration/shipment-write-path.test.ts`), and the
      `shipment.create` unit joins quote → `selectCourier` → book → record → queue write-back
      (`apps/services/worker/test/shipment-create.test.ts`). Shopee's arrangement + write-back shape
      is unblocked by ADR 0021 (methods exist in the vendored SDK). **Channel-arranged is now
      implemented:** the `shipment.arrange` unit (`apps/services/worker/src/shipment-arrange.ts`,
      `apps/services/worker/test/shipment-arrange.test.ts`) has the channel book the waybill, records
      the tenant-side Fulfillment carrying it, and fetches the printable label into the fulfillment's
      `label_url` when the channel exposes one — the arrangement call is the write-back, so this path
      queues no `shipment.write_back`. What remains is a real courier provider for the self-arranged
      path and the seller "ship this order" action that enqueues the unit; the OMS now *shows* the
      resulting waybill and status.)*
- [ ] Delivery status updates flow back and are visible in the OMS UI.
      *(The pull path is delivered: `shipment.track` reads the tenant's active shipments from the
      engine (`/admin/shipments/active`), asks the channel (`fetchChannelTracking`) for a
      channel-arranged one and the courier (`CourierProvider.track`) for a self-arranged one, and
      writes only forward advances through `advanceShipmentWorkflow`
      (`apps/services/worker/src/shipment-track.ts`, `apps/services/worker/test/shipment-track.test.ts`;
      the engine ends are proven over HTTP in
      `apps/services/control-plane/test/integration/shipment-write-path.test.ts`). The pass rides the
      reconciliation cadence and re-arms itself, and is only armed for a channel whose connector
      reports channel tracking. **The UI half is delivered:** the seller order detail shows each
      shipment's courier, arrangement, waybill (linked when the URL is `http(s)`), printable label,
      normalised delivery status and event timeline, projected from Medusa's own
      `GET /admin/orders/:id?fields=*fulfillments,...` with no extra tenant route (ADR 0016), and the
      order list shows Medusa's `fulfillment_status`; the projection is unit-tested against stubbed
      transport (`apps/services/control-plane/test/http.test.ts`) and end to end against a real
      Medusa (`.../integration/shipment-write-path.test.ts`). What remains is the live track pass
      running on the reconciliation cadence against a real channel connector.)*
- [ ] Courier failures are surfaced with an actionable reason and a retry path.
      *(Half delivered: a failed quote is reported per courier with a neutral reason and does not
      sink the others, and a rate limit propagates as a reschedulable 429 rather than being hidden
      in the failure list; the workflow's retry policy and the UI are next.)*
- [x] Rate shopping respects tenant rules and is auditable (why this courier was chosen).
      *(`packages/contracts/test/rate-shopping.test.ts` — 9 tests, 0 fail — shows every hard
      constraint rejecting exactly the quotes it should, each strategy choosing what it names, a
      deterministic tie-break so the choice is reproducible from its inputs, and the
      no-qualifying-quote case returning an actionable reason. The audit is the function's return
      value (`selectCourier`), not a log line beside it. The plane proves the loop closes: the quote
      `selectCourier` chose is the exact service `createShipment` books
      (`apps/services/integration-plane/test/couriers.test.ts`). The rules are tenant-owned and
      stored: `/v1/seller/rate-shopping-rules` reads and writes them, a viewer may read but not
      change them, an unknown courier is a 422, and termination clears them —
      `apps/services/control-plane/test/http.test.ts`. The Postgres store is proven against a real
      database, not only in memory:
      `apps/services/control-plane/test/integration/rate-shopping-rules-store.test.ts`.)*

**Non-goals**

- No warehouse management of courier contracts. No COD reconciliation.

**Known limits (recorded, not hidden)**

- **A courier create is not natively idempotent.** No target courier offers an idempotency key today,
  so a retried create can produce a second waybill. The idempotency key and the stored shipment are
  the guard, and a duplicate is an operator-visible failure rather than a silent one (docs/adr/0020).
- **No courier provider is registered in production yet.** The plane answers honestly that it serves
  none until a provider is vendored and wired in `main.ts`; a courier key configured with no provider
  is logged at startup rather than failing a request.
- **Nothing enqueues `shipment.create` or `shipment.arrange` yet.** Both units are built and
  dispatched (proven in `apps/services/worker/test/units.test.ts`), but the producer — a seller "ship
  this order" action that enqueues the job — is not wired. Until then each path is reachable only by
  enqueuing the job directly. The OMS now *shows* a shipment once it exists (waybill, courier,
  arrangement, delivery status and event timeline on the order detail), so the missing piece is the
  action that creates one, not the surface that reads it. This mirrors how `shipment.write_back`
  had no producer until `shipment.create` gained one.
- **Shopee's tracking write-back is not implemented yet (corrected by ADR 0021).** The M7 note that
  Shopee's `ship_order` "cannot be expressed through the vendored SDK" was **wrong**: `shipOrder`,
  `getShippingParameter`, `getTrackingNumber` and the shipping-document methods all exist. The
  correct shape *is* channel-dependent — `pickup.tracking_number` for a shop that arranges its own
  courier, and the marketplace's own arrangement otherwise, decided by `getShippingParameter`'s
  `info_needed` plus the shop's channel list — so the fix is to implement the
  `getShippingParameter` flow and both shapes, then verify against a live Development Shop before
  flipping the capability. Until that lands, Shopee declares `supportsTrackingWriteBack: false` and
  `attachTrackingNumber` throws rather than no-op, so a caller cannot mistake silence for a written
  waybill.
- **TikTok's write-back sends no shipping-provider id.** `updateShippingInfo` takes an optional
  `shipping_provider_id` alongside the tracking number, and the courier-neutral input has no
  equivalent. Only `tracking_number` is sent; a shop that requires a provider id will reject the call
  and the failure is surfaced (as `UPSTREAM_ERROR`) rather than guessed at. The fix is to carry the
  provider id from the courier's own metadata once a real provider exists.

---

## M8 — Multi-channel expansion (Shopee, Lazada)

**Goal.** Prove the connector pattern pays off: adding a channel is now mechanical.

**Deliverables**

- `connectors/shopee`, `connectors/lazada` following M2's shape exactly.
- Per-channel capability matrix visible to sellers.
- Channel-specific quirks documented in each connector, not in shared code.

**Exit criteria**

- [ ] Adding a channel required **no changes** to `channel-sdk`, workflows, or reconciliation.
- [ ] If shared code had to change, it was generalized — and that change is documented in an ADR.
- [ ] Stock is consistent across all connected channels with no oversell under concurrency.
- [ ] Each new connector shipped with offline contract tests from day one.

**Non-goals**

- No channels beyond the agreed list. No marketplace listing/ads management.

---

## Change control

Scope is protected deliberately. Any of the following requires an ADR **and** human approval
before implementation:

- Adding a milestone, or reordering them.
- Building something listed as a non-goal.
- Changing the tenant isolation model.
- Changing `packages/contracts` event or type shapes in a breaking way.
- Introducing a new runtime dependency that is large or hard to remove.

A PR that does any of the above without an approved ADR is rejected, regardless of code quality.

## Definition of done (applies to every milestone)

- [ ] Exit criteria met and demonstrated (test output, not a claim).
- [ ] Tests written per `AGENTS.md` §6, including compensation and tenant-isolation tests where
      applicable.
- [ ] `pnpm check` and `pnpm boundaries` pass.
- [ ] No invariant in `AGENTS.md` §2 violated.
- [ ] Docs updated: `ARCHITECTURE.md` if structure changed, an ADR if a decision was made,
      `PLAN.md` status row updated.
