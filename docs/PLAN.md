# Plan

Companion to `AGENTS.md` (working contract) and `docs/ARCHITECTURE.md` (layer map).
This file is the **single source of truth for what we are building next**.

## How to use this plan

- Work on **one milestone at a time**. Do not start M2 while M1 exit criteria are unmet.
- A milestone is done only when **every exit criterion is demonstrably met**. "Mostly working"
  is not done.
- Every milestone has **explicit non-goals**. Building a non-goal is a defect, not initiative.
  If you believe a non-goal is required, stop and ask a human.
- Scope changes go through the **change control** section below, not through a quiet PR.

## Milestone status

| # | Milestone | Status | Depends on |
|---|---|---|---|
| M0 | Repo foundation & guardrails | In progress | — |
| M1 | Tenant provisioning (control plane) | Not started | M0 |
| M2 | Channel connector: TikTok Shop + Tokopedia | Not started | M1 |
| M3 | Order import & stock sync (one channel, end-to-end) | Not started | M2 |
| M4 | Reconciliation & drift repair | Not started | M3 |
| M5 | Seller OMS UI & operator console | Not started | M3 |
| M6 | WMS core (inbound, pick, pack, stocktake) | Not started | M5 |
| M7 | Fulfillment providers (local couriers) | Not started | M6 |
| M8 | Multi-channel expansion (Shopee, Lazada) | Not started | M4 |

---

## M0 — Repo foundation & guardrails

**Goal.** Make it structurally impossible for an agent (or a hurried human) to damage the
codebase, before any business logic exists.

**Deliverables**

- Monorepo with pnpm workspaces grouped per `docs/adr/0004`: `apps/services/*`, `apps/web/*`,
  `packages/*`, `connectors/*`, `data-plane/*`, `tooling/*`.
- TypeScript strict, shared tsconfig, path aliases.
- Empty workspaces with declared `exports`: `contracts`, `channel-sdk`, `tenant-client`, `secrets`.
  `connectors/tiktok-tokopedia`, `data-plane/modules/*`, and `apps/web/ops-console` exist as
  reserved boundaries and stay empty until their milestone.
- `pnpm boundaries` checker enforcing: dependency direction, no Medusa core imports outside the
  data plane, no direct DB access from `apps/services/integration-plane`/`apps/services/worker`.
- CI running `pnpm check` + `pnpm boundaries` on every PR.
- `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/adr/0000-0004`.
- `.env.example` listing required variable names with no real values.
- `docker-compose.yml` for local Postgres + Redis.
- PR template that requires: milestone reference, `pnpm check` result, and dependency
  justification.

**Exit criteria**

- [ ] `pnpm check` passes on a clean clone.
- [ ] `pnpm boundaries` fails when a deliberate violating import is added (prove it with a
      throwaway branch, then revert).
- [ ] CI blocks a PR with a failing check.
- [ ] A new contributor can run the stack locally using only the README.

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

- [ ] Provisioning a tenant is a single API call and completes end-to-end in a test.
- [ ] Provisioning is resumable: kill it mid-way, re-run, end state is correct.
- [ ] Migration fan-out reports per-tenant success/failure and can retry only the failures.
- [ ] Tenant isolation test suite passes: tenant A cannot read tenant B data through any endpoint.
- [ ] Terminating a tenant revokes credentials and schedules data deletion.

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

- [ ] A seller can complete OAuth and we persist working credentials.
- [ ] We can fetch orders and push stock against a sandbox/staging account.
- [ ] Contract tests pass offline and cover: token expiry, rate-limit response, partial failure,
      and a malformed response.
- [ ] `capabilities()` accurately reflects the two-API split (verified against real responses).
- [ ] No marketplace-specific type leaks outside the connector package.

**Non-goals**

- No Shopee or Lazada connector. No listing/product upload to marketplace. No WMS.

---

## M3 — Order import & stock sync (one channel, end-to-end)

**Goal.** The core promise: an order from a marketplace lands in the tenant's Medusa correctly,
and stock propagates back without overselling.

**Deliverables**

- Webhook receiver: signature verification, raw event persistence, dedup, enqueue, fast return.
- Redis workflow engine wired up (per ADR 0002) — no in-process cron anywhere.
- Order import workflow with compensation: upsert external ref → create Medusa order → reserve
  inventory at mapped stock location → emit internal event.
- Stock push workflow: idempotency record → connector push → result handling, with rate-limit
  rescheduling via the governor.
- Rate-limit governor: global budget per app key and per seller.
- Mapping layer: marketplace stock location ↔ Medusa stock location, per tenant.

**Exit criteria**

- [ ] A real order placed on the channel appears in the tenant's Medusa within the agreed SLO,
      with correct line items, totals, and inventory reservation.
- [ ] Delivering the same webhook twice creates exactly one order.
- [ ] A sale in Medusa propagates to the channel and reduces available stock there.
- [ ] Concurrent orders across channels never oversell (prove with a concurrency test).
- [ ] Compensation test: fail the workflow after order creation, assert reservation is released
      and no orphan order remains.
- [ ] Rate-limit governor holds under a simulated burst without exceeding the app budget.

**Non-goals**

- No returns/exchanges. No fulfillment. No multi-channel. No WMS picking.

---

## M4 — Reconciliation & drift repair

**Goal.** The system repairs itself. A dropped webhook or a crashed worker becomes a non-event.

**Deliverables**

- Cursor-based pull for orders and stock snapshots, per tenant per channel.
- Drift detection: compare pulled state against local state, classify drift type.
- Repair via the same idempotent workflows used by real-time paths (no second code path).
- Cursor advance only after successful commit; safe re-run.
- Drift metrics and alerting: drift rate, repair latency, unresolved drift count.
- Retention policy for raw webhook events and idempotency records.

**Exit criteria**

- [ ] With webhooks disabled entirely, reconciliation converges orders and stock within the SLO.
- [ ] Injected drift (delete a local order, corrupt a stock level) is detected and repaired.
- [ ] Reconciliation respects the rate-limit budget and never starves real-time operations.
- [ ] Kill the worker mid-reconciliation; on restart it resumes without duplicating effects.
- [ ] Drift dashboard shows unresolved drift returning to zero after repair.

**Non-goals**

- No cross-tenant analytics. No historical backfill beyond the channel's API limits.

---

## M5 — Seller OMS UI & operator console

**Goal.** Sellers can actually run their operations, and our own team can support them. Until now
everything was API-only.

**Deliverables**

- `apps/web/oms-web`: Next.js app consuming our own APIs (not Medusa Admin).
- Channel connection flow (the single-click OAuth promise) with clear connection health.
- Order list/detail with channel source, status, and manual actions (accept, cancel, reship).
- Stock view per location, with sync status per channel.
- Sync health view: what is syncing, what failed, what reconciliation fixed.
- Tenant-scoped auth and RBAC enforced at the API layer, not just hidden in the UI.
- `apps/web/ops-console`: internal operator UI — tenant lifecycle, support impersonation (audited
  and time-boxed), and usage/billing views. Separate app from the start so operator screens never
  leak into the seller UI.

**Exit criteria**

- [ ] A seller can connect a channel and see imported orders without any support involvement.
- [ ] Failed syncs are visible with an actionable explanation, not a raw error.
- [ ] Tenant isolation test: tenant A cannot see tenant B orders through any UI endpoint.
- [ ] Every UI action maps to an audited API call (no client-side-only state changes).
- [ ] Operator role is distinct from seller roles; ops-console endpoints reject seller credentials.
- [ ] Impersonation is logged with actor, target tenant, and expiry.

**Non-goals**

- No WMS screens (picking, packing, stocktake). No accounting. No chat.

---

## M6 — WMS core

**Goal.** Warehouse operations that Medusa does not provide.

**Deliverables**

- Custom modules under `data-plane/modules/` (via module links, never core table changes):
  `wms` (bin locations, put-away, pick tasks, pack, stocktake) and `purchase-order` (inbound).
- WMS screens in `apps/web/oms-web`.
- Inbound flow: purchase order → goods receipt → put-away → stock available.
- Outbound flow: order → pick task (with barcode scan) → pack → handover to fulfillment.
- Stock adjustment and stocktake with variance reporting.

**Exit criteria**

- [ ] A purchase order can be received and increases available stock at a specific bin.
- [ ] A pick task can be completed by barcode scan and blocks on wrong-item scans.
- [ ] Stocktake variance produces an auditable adjustment, never a silent overwrite.
- [ ] All WMS data lives in custom modules; `pnpm boundaries` proves no core table was altered.
- [ ] WMS operations reflect in channel stock within the sync SLO.

**Non-goals**

- No wave/batch picking optimization. No robotics or conveyor integration. No multi-warehouse
  transfer automation.

---

## M7 — Fulfillment providers (local couriers)

**Goal.** Ship orders through Indonesian couriers without manual re-entry.

**Deliverables**

- Fulfillment module providers for target couriers (JNE, J&T, SiCepat, Anteraja, and/or an
  aggregator such as RajaOngkir).
- Rate shopping: select courier by tenant-defined rules.
- Tracking number write-back to the channel.
- Handover and delivery status sync back into the order.

**Exit criteria**

- [ ] Fulfilling an order produces a tracking number and writes it back to the channel.
- [ ] Delivery status updates flow back and are visible in the OMS UI.
- [ ] Courier failures are surfaced with an actionable reason and a retry path.
- [ ] Rate shopping respects tenant rules and is auditable (why this courier was chosen).

**Non-goals**

- No warehouse management of courier contracts. No COD reconciliation.

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
