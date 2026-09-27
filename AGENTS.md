# AGENTS.md — Working Contract for This Repository

> **Read this file in full before writing code.** This document is a contract, not a suggestion.
> If an instruction here conflicts with personal preference, this document wins.
> If you (an agent) believe this document is wrong, **do not silently violate it** — write an ADR
> in `docs/adr/` explaining why, and ask a human to approve it.

---

## 1. What we are building

A multi-tenant omnichannel OMS/WMS SaaS platform for the Indonesian market. We are the
**platform company**; sellers only perform a "connect shop" action.

- **Medusa v2 is the tenant data plane — always vanilla, never forked.**
- Tenant isolation: **instance/schema-per-tenant**. See `docs/adr/0001`.
- Our value lives in the **control plane** and **integration plane**, not in the commerce engine.

See `docs/ARCHITECTURE.md` for the layer map and `docs/PLAN.md` for the active milestone.

---

## 2. Invariants — MUST NOT be violated

These are the things that break the system silently if violated. Each one has a real
consequence, not just a stylistic preference.

1. **Never fork or patch `node_modules/@medusajs/*`.** Never copy a core module into `packages/`
   and modify it either. Need different behavior? Use a custom module, module link, workflow, or
   subscriber. If that is genuinely impossible, write an ADR first.
2. **Never add columns to core Medusa tables** (product, order, cart, customer, etc.). Medusa v2
   does not support this. Additional data lives in custom modules and is connected via
   **module links**, not direct foreign keys to core tables.
3. **Every query against tenant data MUST go through `packages/tenant-client`.** No direct
   database access to a tenant from `integration-plane` or `worker`. No ad-hoc SQL.
4. **Every operation that writes outward (marketplace API, courier, payment) MUST be idempotent.**
   The idempotency key is persisted to the database *before* the request is sent, not after.
5. **No sync work runs without the workflow engine (Redis).** Do not use `setTimeout`,
   in-process cron, or fire-and-forget for anything touching a marketplace.
6. **Secrets (seller tokens, app secrets) never reach logs, test fixtures, or git.** Access them
   only through `packages/secrets` (KMS-backed). See `.env.example` for variable names.
7. **`packages/contracts` must not import anything from this repository.** It is a leaf in the
   dependency graph. Violating this creates circular imports across the whole repo.
8. **One dependency direction between layers.** See §3. Violating that direction is the fastest
   way to make the codebase impossible to refactor.
9. **Never delete or weaken an existing test to make your change pass.** If the test is wrong,
   fix it with an explanation — do not delete it.
10. **Never add a new dependency without a written reason** in the PR description. A new
    dependency for something you could write in 20 lines will be rejected.

---

## 3. Layer map and dependency direction

Directory groups mirror runtime boundaries. Full rationale: `docs/adr/0004`.

```
apps/services/*           ->  packages/*, connectors/*   (we deploy these)
  control-plane               tenant registry, auth, billing, provisioning
  integration-plane           webhooks, OAuth, rate governor
  worker                      workflows, reconciliation

apps/web/*                ->  packages/*                 (browser-bundled, we deploy these)
  oms-web                     seller-facing UI
  ops-console                 internal operator UI

connectors/*              ->  packages/channel-sdk, packages/contracts
packages/channel-sdk      ->  packages/contracts
packages/tenant-client    ->  packages/contracts
packages/secrets          ->  packages/contracts
packages/contracts        ->  (IMPORTS NOTHING)

data-plane/*              ->  (runs INSIDE the tenant's Medusa instance, not in our services)
```

Enforced rules:

- **Direction is downward only.** `contracts` knows nothing. A connector knows `channel-sdk` and
  `contracts` only.
- **`apps/*` must not import each other.** Apps communicate over HTTP/queue, never via import.
  If you need to share code between apps, it belongs in `packages/`.
- **`apps/web/*` must never be imported by `apps/services/*`**, and vice versa.
- **`integration-plane` must not know the tenant database schema.** It knows `tenant-client` and
  `channel-sdk` only.
- **`data-plane/*` must not import from `apps/`, `packages/`, or `connectors/`.** It runs under
  Medusa inside the tenant instance and may depend only on Medusa's own packages.
- Each package has its own `package.json` with explicit `exports`. No deep imports into internal
  files (`../../src/internal/foo`).

Violations of dependency direction are checked automatically in CI (see §7). Do not work around
the checker.

---

## 4. Required pattern: adding a channel connector

This is the **most frequently repeated** pattern. Every new connector MUST follow the same shape
so it can be tested, rate-limited, and reconciled uniformly.

Each connector is a single workspace `connectors/<name>/` implementing the interface from
`packages/channel-sdk`:

```ts
export interface ChannelConnector {
  readonly channel: ChannelCode;                    // "tiktok_tokopedia" | "shopee" | ...
  beginAuthorization(ctx: AuthorizationContext): Promise<AuthorizationRequest>;
  completeAuthorization(ctx: AuthorizationContext, params: OAuthCallbackParams): Promise<Credential>;
  refreshCredential(cred: Credential): Promise<Credential>;
  fetchOrders(cursor: Cursor, cred: Credential): Promise<Page<ChannelOrder>>;
  acknowledgeOrder(externalOrderId: string, cred: Credential): Promise<void>;
  pushStock(items: readonly StockUpdate[], cred: Credential): Promise<readonly StockResult[]>;
  webhookHandlers(): Readonly<Record<string, WebhookHandler>>;
  capabilities(): ChannelCapabilities;              // declaration, not assumption
}
```

The authoritative definition lives in `packages/channel-sdk/src/index.ts`; the block above is a
summary. The shape is frozen and its rationale is recorded in `docs/adr/0005`.

Connector rules:

- **Never call a marketplace API directly from a workflow.** Always go through a connector, so
  retry, rate limiting, and logging stay uniform.
- **Declare `capabilities()` honestly.** If a marketplace does not support something, say so
  there — do not silently do nothing.
- **Rate limiting is handled by the shared governor, not inside the connector.** A connector only
  reports `Retry-After` and rate-limit errors; scheduling lives in the integration plane.
- **Mapping marketplace fields to `ChannelOrder` happens only in the connector.** No other code
  may know the raw marketplace response shape.
- **Webhook handlers must be idempotent and fast.** Verify the signature, enqueue, return. No
  outbound calls from inside a webhook handler.
- **Connectors are pure with respect to credentials.** They receive a `Credential` and never look
  one up. Secret storage stays in `packages/secrets`; see `docs/adr/0005`.

When adding a new connector: **copy the structure of an existing connector; do not invent a new
style.** Consistency matters more than design preference.

---

## 5. Code conventions

- **TypeScript strict.** No new `any`. No `as` casts used to silence an error.
- **Validate at system boundaries.** Every input from outside (HTTP body, webhook, marketplace
  response) is validated with zod before use. Types from `contracts` are the result of
  validation, not an assumption.
- **Money in integer minor units** (sen for IDR). Never use floats for money. Convert only at the
  display boundary.
- **Time is always UTC, typed `Date`.** Timezone conversion happens only in the UI.
- **Naming:** files `kebab-case.ts`, types `PascalCase`, database columns `snake_case`.
- **Errors:** do not `throw new Error("...")` for predictable conditions. Use error types from
  `contracts` so they can be mapped to HTTP status / retry policy.
- **Structured logging** (JSON) with `tenant_id`, `channel`, and `correlation_id` on every entry.
  No `console.log`.
- **Comments only for what cannot be inferred from the code** — hidden invariants, workarounds,
  ordering that matters. Do not comment on the diff or narrate change history.

---

## 6. Testing

- **Every workflow has a test proving its compensation runs** (a failure mid-way, then assert the
  rollback). This is not optional for flows touching stock or money.
- **Every connector has a contract test** against recorded marketplace response fixtures. These
  tests must run without network access.
- **Every bug fix starts with a test that reproduces the bug**, then the fix, then a green test.
- **Do not mock our own code.** Mock only external boundaries (marketplace HTTP, KMS) and explain
  why.
- **Tenant isolation tests are mandatory** for every new endpoint accepting a `tenant_id`: prove
  tenant A cannot read tenant B's data.

---

## 7. Commands

```bash
pnpm install                 # install all workspaces
pnpm typecheck               # tsc --noEmit across all packages
pnpm lint                    # eslint across the repo
pnpm test                    # unit + contract tests
pnpm boundaries              # dependency direction + forbidden-import checker
pnpm test:integration        # requires docker (postgres, redis)
pnpm check                   # typecheck + lint + test + boundaries — run before committing
```

CI runs the same steps as `pnpm check`. **`pnpm boundaries` enforces §3, §2.1 and §2.3**
(cross-layer imports, forbidden Medusa core imports, direct database access). If the checker
complains, fix the code — do not disable the checker. Its rules live in
`tooling/boundaries/src/config.js`; its own tests live in `tooling/boundaries/test/` and must stay
green, because a checker that silently stops checking is worse than no checker.

---

## 8. Workflow for agents

1. Read `AGENTS.md` (this file), `docs/ARCHITECTURE.md`, and the active milestone in
   `docs/PLAN.md`.
2. Look for a relevant ADR in `docs/adr/` before changing a decided area.
3. Work on **one milestone/issue at a time**. Do not mix several large changes in one PR.
4. Run `pnpm check` before committing. If it cannot run because the environment is not ready,
   **say so in the PR** — do not claim it is green.
5. If you make an architectural decision not covered by the docs, **write an ADR** using the
   format in `docs/adr/0000-template.md`.
6. If you find `AGENTS.md` is no longer accurate, update it in the same PR as the change that
   made it inaccurate.

### Stop and ask a human before

- Changing the tenant isolation model.
- Adding a large runtime dependency (framework, ORM, new message broker).
- Changing the event format in `contracts` (a breaking change across apps).
- Anything touching secret handling or seller credentials.
- Disabling a test or a CI checker.
