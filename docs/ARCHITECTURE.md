# Architecture

Companion documents: `AGENTS.md` (working contract), `docs/PLAN.md` (milestones),
`docs/adr/` (decisions). Where this document and an ADR disagree, the ADR wins.

## 1. System in one picture

```
        Sellers (connect shop, manage ops)          Marketplaces
                    |                                    ^
                    v                                    |
        +-------------------------------------+          |
        |   apps/oms-web  (Next.js)           |          |
        |   seller & ops UI                   |          |
        +------------------+------------------+          |
                           | HTTP                        |
        +------------------v------------------+          |
        |   apps/control-plane                |          |
        |   tenant registry, auth, RBAC,      |          |
        |   billing, provisioning,            |          |
        |   channel config + credentials      |          |
        +------------------+------------------+          |
                           | provisioning API            |
        +------------------v------------------+          |
        |   apps/integration-plane            |          |
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
        |   apps/worker                       |
        |   sync jobs, reconciliation         |
        |   Redis workflow engine             |
        +-------------------------------------+
```

## 2. Layers and responsibilities

### Control plane (`apps/control-plane`)

Owns everything about *who the tenant is*, not *what they sell*.

- Tenant registry: lifecycle (provisioning, active, suspended, terminated), plan, region.
- Identity and access: our own user accounts, RBAC, session management. **Not** Medusa's auth.
- Channel configuration and per-seller credentials (via `packages/secrets`).
- Provisioning orchestration: create schema, run Medusa migrations, seed defaults, register
  routes.
- Billing and usage metering.

**Never** stores product, order, or stock data. Those live in the tenant data plane.

### Integration plane (`apps/integration-plane`)

Owns everything about *talking to the outside world*.

- Connectors (via `packages/connector-*`) implementing `packages/channel-sdk`.
- Webhook receivers: verify signature, persist raw event, enqueue, return. Nothing else.
- OAuth authorization and callback handling.
- Rate-limit governor: global scheduling per app key and per seller.
- Credential refresh scheduling.

**Never** touches a tenant database directly. It uses `packages/tenant-client`.

### Worker (`apps/worker`)

Owns *executing work over time*.

- Consumes queue jobs and runs workflows (order import, stock push, fulfillment sync).
- Runs the reconciliation scheduler.
- Owns the Redis workflow engine connection.

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
| `packages/secrets` | KMS-backed secret access | `contracts` |

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
  -> worker runs import workflow:
       step 1: upsert external order ref  (unique: tenant_id, channel, external_order_id)
       step 2: create Medusa order via tenant-client
       step 3: reserve inventory at the mapped stock location
       step 4: emit internal event for downstream (WMS pick task, notification)
     compensation: release reservation, mark import failed for reconciliation retry
```

Duplicate delivery hits the unique constraint in step 1 and becomes a no-op. See ADR 0002.

### 3.3 Stock changes in our system

```
Stock mutation (sale, return, stock adjustment, inbound PO)
  -> internal event emitted
  -> worker runs stock-push workflow per connected channel:
       step 1: persist idempotency record
       step 2: connector.pushStock()
       step 3: record result; on rate limit -> reschedule via governor
     compensation: none needed (idempotent), but failures are recorded for reconciliation
```

### 3.4 Reconciliation (runs regardless of webhook health)

```
scheduler -> per tenant, per channel, per entity type:
  pull by cursor (orders, stock snapshot)
  diff against local state
  repair drift via the same idempotent workflows
  advance cursor only after successful commit
```

Reconciliation is the source of truth. Webhooks are an optimization. See ADR 0002.

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
  control-plane/
  integration-plane/
  worker/
  oms-web/
packages/
  contracts/
  channel-sdk/
  tenant-client/
  secrets/
  connector-shopee/
  connector-tiktok-tokopedia/
  connector-lazada/
docs/
  ARCHITECTURE.md
  PLAN.md
  adr/
AGENTS.md
```

## 6. What we explicitly do not build (for now)

- Accounting / general ledger — integrate later, do not build.
- Chat commerce — separate concern, not in this system.
- Cross-tenant analytics — deferred to a data warehouse (see ADR 0001).
- Our own commerce engine — Medusa covers it.
