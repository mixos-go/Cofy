# ADR 0010 — Sync state lives in the control plane; commerce writes go through the tenant's Medusa API

- **Status:** Proposed (needs human approval — it touches tenant data access, a stop-and-ask area)
- **Date:** 2026-09-26
- **Deciders:** Platform engineering

## Context

M3 is the first milestone where the worker both **reads** marketplace data and **writes** into a
tenant's data plane. Two questions have no answer in the current docs, and guessing either would
create debt that is expensive to undo:

1. **Where does sync state live** — the external-order reference, the idempotency record for every
   outbound write (AGENTS.md §2.4), the SKU ↔ channel-variant mapping (ADR 0009), and the pull
   cursors? It is not commerce data, but it is per-tenant and it must be transactionally correct.
2. **How does the worker create a Medusa order and reserve inventory?** `AGENTS.md` §2.3 says every
   tenant query goes through `packages/tenant-client`; §2.2 forbids adding columns to core Medusa
   tables and points to custom modules + module links. `tenant-client` exposes only a `query(text,
   values)` handle, so "go through tenant-client" cannot mean "INSERT the Medusa order tables by
   hand" — that would bypass Medusa's pricing, inventory and event invariants and is a hand-built
   engine, which ADR 0001 explicitly rejected.

Constraints already fixed:

- `integration-plane` and `worker` must never touch a tenant database directly (ADR 0001).
- Per-tenant configuration (channels, credentials, warehouse settings) belongs in the **control
  plane**, not inside Medusa (ADR 0001).
- Services never import each other; they talk over HTTP or the queue (AGENTS.md §3).
- The tenant runs **vanilla** Medusa and is never forked (ADR 0001).

## Decision

**We will split the two stores by ownership, and reach the tenant's commerce engine through its
own API rather than through its database.**

Concretely:

1. **Platform-owned sync state lives in the control plane registry** (the platform database that
   already holds tenants and provisioning runs), exposed to the worker as an HTTP API:
   - `channel_connection` (already implicit from M2's credential store),
   - `channel_order_ref` — unique `(tenant_id, channel, external_order_id)`; this is the constraint
     ADR 0002 relies on to make a duplicate delivery a no-op,
   - `idempotency_record` — key, operation, request fingerprint, outcome; written **before** the
     outbound call (§2.4),
   - `channel_listing` / `channel_sku_map` — the mapping ADR 0009 produces,
   - `sync_cursor` — per `(tenant, channel, entity)`, advanced only after a successful commit.
   Rationale: this data is about the *channel*, not about commerce; it must be queryable across
   tenants for ops; and it must outlive a tenant re-provision.
2. **Commerce writes go through the tenant's Medusa Admin API over HTTP.** The worker resolves a
   tenant to its Medusa base URL and a scoped admin token stored by the control plane, then calls
   order-create and inventory-reserve endpoints. It does **not** import `@medusajs/*` and does not
   write Medusa tables. This keeps Medusa vanilla and keeps its invariants intact.
3. **`data-plane/modules/channel-order-link` is a real Medusa module inside the tenant instance**,
   linked to the Order module, holding the external reference. It runs under Medusa and imports only
   Medusa packages (AGENTS.md §3). The worker sets it through the tenant's API, never by importing it.
4. **`tenant-client` is used for nothing in the M3 write path.** The integration-plane keeps holding
   no tenant-database access at all; the worker needs none either, because (1) is HTTP and (2) is
   HTTP. `tenant-client` remains the boundary for the control plane's own data operations and for
   later read paths that genuinely need SQL.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Store sync state in each tenant's Medusa schema/DB | It is not commerce data, it must be cross-tenant queryable for ops, and it would die with a tenant re-provision. Also contradicts ADR 0001's "per-tenant configuration lives in the control plane". |
| Worker writes Medusa order/inventory tables via `tenant-client` raw SQL | Hand-built engine: bypasses pricing, reservation, events and future core changes. ADR 0001 rejected exactly this. |
| Worker imports and runs Medusa workflows in-process | Requires embedding the Medusa app and its dependency tree in the worker, breaks "vanilla, deployed separately", and makes a core upgrade a worker redeploy with compile-time coupling. |
| Store the external order ref in Medusa order `metadata` | Would work and is less code, but it is untyped, unqueryable by `(tenant, channel, external_order_id)` at the platform level, and invisible to reconciliation outside the tenant. The module + link is the supported extension point; `metadata` stays available for throwaway annotations only. |
| Put sync state in Redis | The queue and cursors are not the same thing; idempotency and the order reference must be durable and unique-constrained, which Redis does not give us. |

## Consequences

**What becomes easier:**

- The worker needs no tenant-database credentials, so ADR 0001's "no direct tenant DB access"
  stays literally true rather than nominally true.
- Idempotency and the external-order uniqueness live where they can be enforced with a real unique
  constraint and read across tenants.
- Medusa stays vanilla and upgradable.

**What becomes harder / technical debt we accept:**

- **Two round trips per order import** (control-plane registry, then tenant Medusa API). Acceptable;
  sync is already eventually consistent.
- **A new failure mode: partial commit between the two stores.** Handled by ordering — reserve the
  idempotency key first, create the Medusa order, then mark the ref committed — and by compensation
  (release the reservation, mark `order.import_failed` for reconciliation). This is the compensation
  test M3 requires.
- **The control-plane registry becomes a hot dependency.** A registry outage stops imports. It is
  already required for credentials, so this does not add a new critical path, only widens an existing one.
- **Per-tenant Medusa admin tokens become another secret to manage.** Stored via `packages/secrets`
  keyed like a channel credential; the same KMS and rotation rules apply.

**How we would reverse this later:** if tenant count makes per-tenant Medusa HTTP too costly, the
revisit is ADR 0001's own revisit ("schema-per-tenant with a shared app pool"). Both stores here are
behind interfaces (`ChannelRegistryClient`, tenant Medusa client), so that change does not touch the
workflows.
