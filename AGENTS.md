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
packages/sync-state       ->  packages/contracts
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
- **`worker` must not import a connector or Medusa.** It orchestrates workflows and reaches
  marketplaces through the integration plane and a tenant's commerce engine through its own HTTP
  API (ADR 0010). `worker` imports `packages/*` only.
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

- **Language.** Every artifact in this repository is written in **English**: code, comments,
  commit messages, ADRs, and docs. Chat, summaries, and feedback to the user are written in
  **Indonesian**. Never use Chinese (Mandarin) in either — not in prose, not in identifiers, not
  as an accidental paste.
- **Runtime is Node with native TypeScript type stripping.** Relative imports carry real
  extensions (`./thing.ts`). Do not use `enum`, `namespace`, or parameter properties — type
  stripping does not support them. See `docs/adr/0006`.
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
- **A test name states the invariant, not the call.** `a seller may not read another tenant by
  guessing its id` describes a rule that must hold; `listTenants returns 403` describes an
  implementation and passes for the wrong reasons.
- **Do not weaken an assertion to make a test pass.** If a test fails, either the code is wrong or
  the test encodes a wrong expectation. Decide which, and fix that one. Changing
  `assert.equal(x, 2)` to `assert.equal(x, 1)` because the code produces 1 is the failure mode
  §8's "never weaken an existing test" exists to prevent.

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
  tenant A cannot read tenant B's data. The unit suites are not enough for this: `search_path`
  pinning can only be proven against a real database, so isolation tests for data access belong in
  `apps/services/control-plane/test/integration/` and run under `pnpm test:integration`.
- **A test may be skipped, never weakened.** The integration suite skips itself when
  `TEST_DATABASE_URL` is unset so that `pnpm test` works without a database. Keep that property: an
  isolation test that silently stops asserting is the failure mode this rule exists to prevent.

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
7. When you tick a milestone exit criterion in `docs/PLAN.md`, record next to it the command you
   ran and what it printed. A criterion is evidence, not intent: "tenant isolation passes" means a
   named test file passing against a real database, and the plan entry says which one.
8. If part of an exit criterion is unmet, leave it unticked and write the gap under the milestone's
   "Known limits". An unticked box with a stated reason is worth more than a ticked one nobody can
   reproduce.

### Stop and ask a human before

- Changing the tenant isolation model.
- Adding a large runtime dependency (framework, ORM, new message broker).
- Changing the event format in `contracts` (a breaking change across apps).
- Anything touching secret handling or seller credentials.
- Disabling a test or a CI checker.

---

## 9. Lessons from real connectors

Hard-won specifics from building `connectors/shopee` and `connectors/tiktok-tokopedia`. Add here
when a channel teaches us something the contract cannot express.

- **Generated marketplace SDKs lie about response shapes.** The TikTok SDK's typed
  `GetOrderDetailResponse` omits `orders[].id`, `create_time` and `line_items`, and points at a
  stale endpoint version. Verify a generated type against the official spec before trusting it,
  and check the path the client actually requests in a test. Do not patch `dist/` (ADR 0007);
  describe the real shape in a reviewed local schema instead.
- **Money conventions differ per channel and must never be shared.** Shopee sends integer minor
  units; TikTok sends decimal strings (`"100.00"`). Parse decimal strings with string arithmetic,
  not `Number(x) * 100`. One money reader per connector. See `connectors/tiktok-tokopedia/src/money.ts`.
- **Marketplace "success" can be an HTTP 200 with an error in the body.** Always pass responses
  through a success assertion; an unmapped non-zero code reads as an empty successful page. The
  same applies to a transport 429 with no body code — map it to `RateLimitedError` so the governor
  sees it (AGENTS.md §4).
- **A cursor must be able to say "caught up".** `Cursor.value = null` ends a reconciliation walk;
  a page token keeps it resumable. Test both transitions, or reconciliation will either loop
  forever or stop early.
- **Record undocumented fields as gaps, not guesses.** When the spec omits something (TikTok's
  per-line quantity, its webhook signature), declare the capability `false` or use a sentinel and
  write the gap under the milestone's "Known limits" in `docs/PLAN.md`. A guess that looks like a
  working feature is worse than a visible gap.
- **Vendored SDKs need a CommonJS boundary.** A CJS `dist` only resolves named exports if its
  `package.json` declares `"type": "commonjs"`, and the build directory must be un-ignored (see
  `.gitignore`). Route every vendored import through one `src/vendor/<sdk>.ts` bridge.
- **Share connector tooling, not connector code.** The vendor-integrity and checksum scripts live
  in `tooling/vendor/`, not inside one connector, so the second connector reuses them instead of
  copying them.
- **Read quantity from a live order before trusting a documented field.** TikTok Shop sends one line
  item per unit and no quantity field; reading quantity as `0` (or inventing it from a spec that
  omits it) silently makes every order look empty. A single sandbox order settled it: two identical
  line items summed to twice the unit price. Verify a channel's undocumented/absent fields with real
  data, and make the mapping's default explicit and tested.
- **Do not assume a channel has a separate sandbox host.** TikTok Shop's sandbox is a Development
  Shop authorized against the same app on the production base URL, so the connector needs no switch.
  Confirm this before building one.
- **Keep a live verification script per connector, and prove it reaches the API.** A script that runs
  the connector's own path (`scripts/verify-orders.mjs`) turns "probably works" into evidence. Run it
  once with placeholder credentials: if the gateway answers an app_key/credential error rather than a
  transport or signature error, the wiring, signing and host are proven before real credentials
  exist. The script must read secrets from the environment, never write them, and mask them in output.

---

## 10. Lessons from the order/stock write path

Hard-won specifics from building `packages/sync-state` and `apps/services/worker`. Same rule as
§9: add here when a write path teaches us something the contract cannot express.

- **A service-only surface must be closed when its token is unset, and a session token is not a
  substitute.** The control plane's `/v1/sync/*` routes authenticate the worker by a service token
  (ADR 0008's shape). An operator session is a different trust level and must not open that surface.
  Test both the missing-token and the wrong-kind-of-token case, or the surface is open by accident.
- **Claim the sync-state ref before the commerce write, and treat `reserved` as "not a duplicate".**
  Only a `committed` ref short-circuits. A `reserved` or `in_flight` claim means another attempt may
  be mid-write; a second run must not race it into a second order. The idempotency record is the
  proof of what happened, never the worker's memory.
- **Compensation must find the order through the data plane's link table, not through worker state.**
  A crash before the ref is committed is exactly the case where memory is gone. Read
  `channel-order-link` (ADR 0010 point 3) via the tenant's API to learn whether a create landed;
  release it, then mark the ref failed.
- **One fixed idempotency key per SKU (or per order) is wrong for a repeatable absolute write.**
  The second stock change would collide with the first as `IDEMPOTENCY_CONFLICT`. Key the record by a
  digest of the payload: an unchanged re-push replays, a changed value is a new operation.
- **Advance a pull cursor only after the whole page committed.** Advance earlier and a crash skips
  orders silently; the ref/idempotency checks make a re-read of the page a no-op, so re-reading is
  always the safe direction.
- **Record a partial marketplace success as failed.** A batch where some items were rejected must
  not be replayed as done on the next attempt; a happy-path-only success assertion is how a
  rejected SKU disappears.
- **Node's strip-only TypeScript rejects parameter properties.** `constructor(private readonly x)`
  throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` under `node --test`. Use an explicit field
  assignment, matching §5.

---

## 11. Lessons from the vanilla Medusa data plane

Hard-won specifics from making Medusa's *own* migrations land in a tenant schema without forking
it. Same rule as §9/§10. Full rationale: `docs/adr/0011`.

- **`DATABASE_SCHEMA` is read by Medusa but does not pin the schema on the connection that runs
  DDL.** `loadDatabaseConfig` passes it to the shared connection only, and MikroORM derives its
  `SET search_path` from `clientUrl`'s `?schema=`, which is absent when Medusa builds a structured
  connection object. The option that actually reaches every module connection is the knex-level
  `projectConfig.databaseDriverOptions.searchPath`. Without it, 125 core tables land in `public`
  while the tenant schema gets only module tables — a silent isolation break, not an error.
- **A `pg_type` guard without a namespace filter is a database-global check.** Medusa's order
  migrations create three enum types behind `IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname =
  ...)`. `pg_type` is shared across schemas, so the first tenant satisfies the guard for every
  other tenant; the second tenant's `CREATE TYPE` is skipped and its `CREATE TABLE` fails with
  `type ... does not exist`. The control plane pre-creates those enums per schema. Re-check the
  list (`MEDUSA_GUARDED_ENUMS`) on every Medusa upgrade: a new or changed guarded enum silently
  reintroduces the failure for tenant #2 onward, while tenant #1 keeps passing.
- **Prove data-plane behavior with the real CLI, not with config assertions.** Both defects above
  are invisible to a unit test that inspects `projectConfig`. The integration test runs
  `medusa db:migrate` against a dedicated database and asserts `public` has zero tables and the
  tenant schema has the full set — that is what turns "the config looks right" into evidence.
- **A config that must run under two runtimes needs one source of truth and a thin adapter.** The
  Medusa CLI resolves `medusa-config` through a CommonJS `require` and cannot load a `.ts` file,
  while our tests and services run TypeScript directly. `medusa-config.js` is a three-line ESM shim
  that imports `medusa-config.ts`; do not put logic in the shim, and do not fork the config into
  two files.
- **Medusa's driver ignores `sslmode` in `DATABASE_URL`.** `createPgConnection` always sets
  `connection.ssl`, defaulting to `false`, so `?sslmode=require` still connects unencrypted and a
  TLS-required managed Postgres refuses the migration with `no pg_hba.conf entry ... no encryption`.
  `medusa-config` reads `sslmode` from the URL and sets `databaseDriverOptions.connection.ssl`
  (`no-verify` → `rejectUnauthorized: false`; `require` → verify, with `ca` from `sslrootcert`).
  Never use `NODE_TLS_REJECT_UNAUTHORIZED=0`: it disables verification for every outbound TLS
  connection, marketplaces included. A local Postgres accepts unencrypted connections, so this is
  invisible in development — test against a `hostssl`-only server before trusting it.
- **A module is not loaded until a real migration run proves it.** `channel-order-link` and its
  module link are discovered by convention (`src/links/` of the *project*, not the module), so
  "the file exists and typechecks" says nothing about whether Medusa wires it. The real-CLI
  integration test asserts both `channel_order_link` and the link table
  (`order_order_channelorderlink_...`) exist in the tenant schema; that is the evidence. The same
  test asserts the partial unique index on `(tenant_id, channel, external_order_id)` rejects a
  duplicate and frees the key after a soft delete — the uniqueness M3's import idempotency rests on.
