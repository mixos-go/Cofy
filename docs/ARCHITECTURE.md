# Architecture

Companion documents: `AGENTS.md` (working contract), `docs/PLAN.md` (milestones),
`docs/adr/` (decisions). Where this document and an ADR disagree, the ADR wins.

## 1. System in one picture

```
        Sellers (connect shop, manage ops)          Marketplaces
                    |                                    ^
                    v                                    |
        +-------------------------------------+          |
        |   apps/web/oms-web    (Next.js)     |          |
        |   apps/web/ops-console (internal)   |          |
        +------------------+------------------+          |
                           | HTTP                        |
        +------------------v------------------+          |
        |   apps/services/control-plane       |          |
        |   tenant registry, auth, RBAC,      |          |
        |   billing, provisioning,            |          |
        |   channel config + credentials      |          |
        +------------------+------------------+          |
                           | provisioning API            |
        +------------------v------------------+          |
        |   apps/services/integration-plane   |          |
        |   connectors, webhooks, rate limit  |----------+
        |   governor, OAuth callbacks         |
        +------------------+------------------+
                           | tenant-client (internal API)
        +------------------v------------------+
        |   TENANT DATA PLANE                 |
        |   Medusa #1 (vanilla) + schema #1   |
        |   Medusa #2 (vanilla) + schema #2   |
        |   ...                               |
        +------------------+------------------+
                           ^
                           | workflows
        +------------------+------------------+
        |   apps/services/worker              |
        |   sync jobs, reconciliation         |
        |   Redis workflow engine             |
        +-------------------------------------+
```

Code in `data-plane/` runs inside each tenant's Medusa instance (custom modules registered via
module links). `connectors/` are bundled into `integration-plane` and `worker`, never deployed
alone. `tooling/` is never shipped.

## 2. Layers and responsibilities

### Control plane (`apps/services/control-plane`)

Owns everything about *who the tenant is*, not *what they sell*.

- Tenant registry: lifecycle (provisioning, active, suspended, terminated), plan, region.
- Identity and access: our own user accounts, RBAC, session management. **Not** Medusa's auth.
- Channel configuration and per-seller credentials (via `packages/secrets`).
- Provisioning orchestration: create schema, run Medusa migrations, seed defaults, register
  routes.
- Billing and usage metering.

**Never** stores product, order, or stock data. Those live in the tenant data plane.

### Integration plane (`apps/services/integration-plane`)

Owns everything about *talking to the outside world*.

- Connectors (via `connectors/*`) implementing `packages/channel-sdk`.
- Webhook receivers: verify signature, persist raw event, enqueue, return. Nothing else.
- OAuth authorization and callback handling. `state` values are single-use and expiring, and the
  redirect URI is derived from configured public origin, never from a request header.
- Seller credentials: the callback persists what the connector returns via
  `packages/secrets`' `CredentialStore`; the probe path proves a stored credential still works.
- Rate-limit governor: global scheduling per app key and per seller.
- Credential refresh scheduling.

**Never** touches a tenant database directly. It uses `packages/tenant-client`.

The service depends only on the `ChannelConnector` interface; connectors are constructed in
`main.ts` and injected, so adding a channel does not change the service. It is called by the control
plane and worker over HTTP with a service token — services never import each other (AGENTS.md §3).

### Worker (`apps/services/worker`)

Owns *executing work over time*.

- Consumes queue jobs and runs workflows (order import, listing import, stock push, fulfillment sync).
- Runs the reconciliation scheduler.
- Owns the Redis workflow engine connection.

The workflows live in `@platform/worker` as functions that take ports, so the same unit runs under
the engine and under a test. It orchestrates over HTTP: the control plane's sync-state surface for
refs, idempotency and SKU maps; the integration plane for marketplace calls; each tenant's Medusa
Admin API for commerce writes. It never imports a connector, never imports Medusa, and never touches
a tenant database (ADR 0010). The engine itself is M4 — until it lands, nothing runs on a timer.

### Data plane (per tenant)

One vanilla Medusa v2 instance per tenant. We treat it as a black box with a stable API:

- Core modules used as-is: Order, Cart, Inventory, Stock Location, Sales Channel, Fulfillment,
  Payment, Pricing, Promotion, Product.
- Custom modules we add *inside* the tenant instance, connected via **module links**:
  `wms`, `purchase-order`, `channel-order-link`.
- No core table is ever altered. No Medusa code is ever forked.

### Packages (shared)

| Package | Responsibility | May import |
|---|---|---|
| `packages/contracts` | Types, zod schemas, error types, event definitions | nothing |
| `packages/channel-sdk` | `ChannelConnector` interface + shared connector utilities | `contracts` |
| `packages/tenant-client` | The only allowed path to tenant data | `contracts` |
| `packages/secrets` | KMS-backed secret access, and the typed `CredentialStore` over it | `contracts` |
| `packages/observability` | Structured JSON logging, one shape for every service | `contracts` |
| `packages/rate-governor` | Central marketplace rate-limit scheduling: one budget per app key, one per seller | `contracts` |
| `packages/sync-state` | Platform-owned sync state: external-order refs, idempotency records, SKU→channel maps, cursors | `contracts` |

`packages/sync-state` is the platform's half of the order/stock pipeline. It stores only stitched
identifiers and cursors, never product, order, or stock data — that stays in the tenant data plane.
Its interface is exposed by the control plane and reached by the worker over HTTP (ADR 0010).

## 3. Key flows

### 3.1 Seller connects a shop

```
Seller clicks "Connect Shopee"
  -> control-plane issues OAuth state (tenant-scoped, single-use)
  -> redirect to marketplace authorization page
  -> marketplace redirects to integration-plane callback
  -> integration-plane verifies state, exchanges code for credentials
  -> credentials stored via packages/secrets, keyed (tenant_id, channel)
  -> control-plane marks channel as connected
  -> initial reconciliation workflow enqueued (backfill orders + stock)
```

The seller never sees app keys, binding steps, or API concepts. See ADR 0003.

### 3.2 Marketplace order arrives

```
Marketplace webhook
  -> integration-plane verifies signature
  -> raw event persisted (dedup key = channel + event_id)
  -> job enqueued, HTTP 200 returned
  -> worker runs import workflow (M3 also runs this pull-only, by cursor):
       step 1: reserve external order ref  (unique: tenant_id, channel, external_order_id)
       step 2: create Medusa order via the tenant's Admin API, with an idempotency key
       step 3: commit the ref (M4 adds reservation-at-a-stock-location and the pick task)
     compensation: find the order by channel-order-link, release it, mark the ref failed
```

Duplicate delivery finds a committed ref in step 1 and becomes a no-op. A redelivery whose Medusa
order exists but whose ref was never committed replays through the same idempotency key instead of
creating a second order. See ADR 0002 and ADR 0010. The cursor advances only after a page is fully
committed, so a crash re-reads the page rather than skipping orders.

### 3.3 Stock changes in our system

```
Stock mutation (sale, return, stock adjustment, inbound PO)
  -> internal event emitted
  -> worker runs stock-push workflow per connected channel:
       step 1: resolve each SKU's channel address from the stored listing map (ADR 0009)
       step 2: claim idempotency record keyed by the payload digest
       step 3: connector.pushStock() via the integration plane
       step 4: record result; on rate limit -> reschedule via governor
     compensation: none needed (an absolute stock set is idempotent), but failures are recorded
```

A SKU with no stored mapping is refused as `unknown_sku`, never pushed to a guessed address. A
re-push of unchanged values replays the recorded result and makes no second call.

### 3.4 Reconciliation (runs regardless of webhook health)

```
scheduler -> per tenant, per channel, per entity type:
  pull by cursor (orders, listings, stock snapshot)
  diff against local state
  repair drift via the same idempotent workflows
  advance cursor only after successful commit
```

Reconciliation is the source of truth. Webhooks are an optimization. See ADR 0002.

Repair reuses the exact workflows above rather than a second implementation: listing import stores
the SKU→variant map, order import re-reads its cursor window and dedups on the order ref, and stock
push replays or re-pushes through the payload-keyed idempotency record. A repair path that differed
from the live path would be a second place to get idempotency wrong.

## 4. Tenant isolation

One tenant = one Medusa instance + one Postgres schema. `packages/tenant-client` is the only
component that knows how to reach a tenant's data; everything else passes a `tenant_id`.

Enforcement:

- `integration-plane` and `worker` have no database credentials for tenant schemas.
- `packages/tenant-client` resolves `tenant_id -> connection` from the control-plane registry.
- Every endpoint accepting a `tenant_id` must have a test proving cross-tenant reads fail.

Full rationale and accepted trade-offs: `docs/adr/0001`.

## 5. Repository layout

```
apps/
  services/                 # long-running backend runtimes we deploy
    control-plane/
    integration-plane/
    worker/
  web/                      # browser-bundled runtimes we deploy
    oms-web/                # seller-facing
    ops-console/            # internal operator-facing
packages/                   # stable shared libraries — few, slow to change
  contracts/
  channel-sdk/
  tenant-client/
  secrets/
  observability/
  sync-state/
connectors/                 # adapters — volatile, one package per channel
  tiktok-tokopedia/
  shopee/                   # built early, ahead of its M8 milestone
  lazada/                   # planned (M8)
data-plane/                 # runs INSIDE each tenant's Medusa instance
  medusa-config/
  modules/
    wms/
    purchase-order/
    channel-order-link/
tooling/                    # repo tooling, never shipped
  boundaries/
  tsconfig/
  eslint-config/
docs/
  ARCHITECTURE.md
  PLAN.md
  adr/
AGENTS.md
```

The three groupings are deliberate: `apps/` is split by runtime, `connectors/` is separated from
`packages/` by volatility, and `data-plane/` is top-level because it runs under Medusa rather than
under our services. Rationale and rejected alternatives: `docs/adr/0004`.

## 6. What we explicitly do not build (for now)

- Accounting / general ledger — integrate later, do not build.
- Chat commerce — separate concern, not in this system.
- Cross-tenant analytics — deferred to a data warehouse (see ADR 0001).
- Our own commerce engine — Medusa covers it.
