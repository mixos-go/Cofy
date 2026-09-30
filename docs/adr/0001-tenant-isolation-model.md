# ADR 0001 — Tenant isolation: instance/schema-per-tenant, not shared schema

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

This product is multi-tenant SaaS: one platform serves many sellers, and we are the platform
company — sellers only perform a "connect shop" action.

Medusa v2 has **no native multi-tenancy**. Two facts lock in our choice:

1. Medusa v2 no longer allows adding fields to core entities (unlike v1). The official mechanism
   is custom modules + module links, not extending core tables.
2. The native multi-tenancy feature request in the Medusa repo ([discussion
   #14247](https://github.com/medusajs/medusa/discussions/14247)) describes the cost: adding
   `store_id` to nearly every core entity (Product, Order, Cart, Customer, Inventory, Sales
   Channel, Region, Pricing, Promotion, API Key, User) and then overriding services and API
   routes to inject and validate that scope. The author calls it a **"20x workload"** and notes
   it **"breaks compatibility with future core updates"**. They also note that without coverage
   at the core schema level, developers are forced to build **"shadow tables" or complex
   middleware for every single module"**.

In other words: shared-schema multi-tenancy in Medusa is effectively a **silent fork** — we would
maintain a diverging copy of core modules, and every Medusa upgrade becomes its own project.
That violates invariant §2.1 in `AGENTS.md`.

## Decision

**We will isolate tenants at the instance/schema level: one tenant = one vanilla Medusa instance
with its own database/schema.** Medusa is never forked, never patched, and its core tables are
never altered.

Concretely:

- Each tenant gets one **vanilla** Medusa app (official image, unpatched) plus one Postgres
  schema. Initially, one schema per tenant inside a single Postgres cluster.
- All access to tenant data goes through `packages/tenant-client`, which maps `tenant_id` to the
  correct connection/schema.
- `integration-plane` and `worker` **never** touch a tenant database directly.
- Per-tenant configuration (channels, credentials, warehouse settings) lives in the **control
  plane**, not inside Medusa.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Shared DB, `tenant_id` column on core tables | Requires modifying/overriding core modules = silent fork. "20x workload", broken upgrades, weak isolation, cross-tenant leak risk. |
| Shared DB with Postgres Row-Level Security | Medusa is not tenant-aware, so nothing reliably sets `SET app.tenant_id` on every path. One missed path = a data leak. Too fragile to rely on. |
| Database-per-tenant (physical, not schema) | Best isolation, but higher operational cost with no added benefit at this stage. Schema-per-tenant gives sufficient logical isolation and can be upgraded to this per-tenant later. |
| Leave Medusa, build our own engine | Throws away a production-grade order/inventory/fulfillment foundation. We would spend energy on a commodity engine instead of differentiation. |
| MercurJS | Mercur is a **multi-vendor marketplace within a single store**, not multi-tenancy with data isolation. The author of discussion #14247 confirms: *"Currently, no. The system currently follows a single store structure."* |

## Consequences

**What becomes easier:**

- Medusa stays vanilla → upgrades follow upstream, no patch conflicts.
- Structurally strong data isolation: a cross-tenant leak requires a bug in the routing layer,
  not merely one query missing `WHERE tenant_id`.
- Granular per-tenant backup/restore (per schema).
- Tenant onboarding = provisioning a new schema from a template, not migrating shared data.
- The team does not need to understand Medusa core module internals to add features.

**What becomes harder / technical debt we accept:**

- **Infrastructure cost scales linearly with tenant count.** 1,000 tenants × ~300MB RAM per Node
  process ≈ 300GB RAM. Not sustainable into the tens of thousands.
- **We must build our own control plane**: tenant registry, provisioning orchestrator, migration
  fan-out (run migrations across N schemas), connection routing, per-tenant observability.
- **Cross-tenant analytics becomes ETL work**, not one query. We need a separate data warehouse
  for platform-level reporting.
- **No cross-tenant features come for free** (e.g. global product search).

**How we would reverse/revisit this:**

Revisit when either: (a) tenant count crosses the threshold where per-tenant RAM cost stops
making sense, or (b) most tenants demonstrably do not use Medusa commerce features and only need
order aggregation + stock sync.

Candidate next steps at that point: **schema-per-tenant with a shared app pool** (cheaper, but
needs a connection-routing shim — a gray area since Medusa does not officially support it), or
**tiering** (large tenants get dedicated Medusa, small tenants get a lighter OMS data layer we
build ourselves). Neither change alters `tenant-client` as the abstraction boundary — which is
precisely why that boundary exists from day one.
