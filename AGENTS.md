# AGENTS.md — Working Contract for This Repository

> **Read this file in full before writing code.** This document is a contract, not a suggestion.
> If an instruction here conflicts with personal preference, this document wins.
> If you (an agent) believe this document is wrong, **do not silently violate it** — write an ADR
> in `docs/adr/` explaining why, and ask a human to approve it.

---

## 1. What we are building

A multi-tenant omnichannel OMS/WMS SaaS platform for the Indonesian market, branded **Cofy**. We
are the **platform company**; sellers only perform a "connect shop" action.

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

connectors/*              ->  packages/channel-sdk, packages/courier-sdk, packages/contracts
packages/channel-sdk      ->  packages/contracts
packages/courier-sdk      ->  packages/contracts
packages/tenant-client    ->  packages/contracts
packages/secrets          ->  packages/contracts
packages/observability    ->  packages/contracts
packages/http-transport   ->  packages/contracts
packages/sync-state       ->  packages/contracts
packages/workflow-queue   ->  packages/contracts
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
  attachTrackingNumber(externalOrderId: string, tracking: TrackingWriteBack, cred: Credential): Promise<void>;
  webhookHandlers(): Readonly<Record<string, WebhookHandler>>;
  capabilities(): ChannelCapabilities;              // declaration, not assumption
}
```

The authoritative definition lives in `packages/channel-sdk/src/index.ts`; the block above is a
summary. The shape is frozen and its rationale is recorded in `docs/adr/0005`. `attachTrackingNumber`
is the one approved extension to it (docs/adr/0020): a channel that cannot write tracking back
declares `supportsTrackingWriteBack: false` and the method throws rather than no-op.

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
  - **Exception — text a seller or operator reads.** User-visible copy in the seller UI
    (`apps/web/oms-web`) and the operator console (`apps/web/ops-console`) is Indonesian, because
    the people using them are Indonesian sellers and our own Indonesian-speaking support team, and
    a half-translated screen is worse than either language. This covers rendered strings and page
    `<title>`s only. Identifiers, comments, test names, and everything the reader does not see stay
    English, so the exception cannot quietly widen.
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
- **A path that proxies a tenant's HTTP API is proven against a booted instance, not a stub.** A
  stubbed transport proves the projection, the authorization path and the money conversion, but not
  that the fields we ask the vendor for are the fields it returns — a renamed field becomes a null
  in production and the stub still passes. The seller read's integration test
  (`test/integration/seller-read.test.ts`) boots a real Medusa HTTP server: `db:migrate` through the
  pinned CLI, a fixture under `data-plane/medusa-config/src/scripts/` run by `medusa exec` to seed
  through the vendor's own core workflows, then `medusa start` and the real client. Fixtures live in
  the data plane because   `medusa exec` resolves them there and they import `@medusajs/*`, which no
  `@platform/*` workspace may (AGENTS.md §2.1).
- **Integration tests that boot a real Medusa run serially.** `test:integration` for
  `apps/services/control-plane` passes `--test-concurrency=1`. `node --test` runs test *files* in
  parallel by default, and once two files each boot a Medusa instance they compete for the same
  cores: the later boot then times out waiting on `/health` instead of failing an assertion, so the
  symptom is a flake that reads like a broken fixture. One booted instance at a time is the point of
  the flag; do not remove it. The shared boot/seed helpers live in `test/integration/medusa-harness.ts`.

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
4. **`main` is the release line and `develop` is the integration line.** One long-lived feature branch
   per milestone is a merge-order trap: the branches stack, and forgetting which one lands first
   conflicts the rest against a `main` that already moved. Work on `develop` instead — commits carry
   the state, so a milestone that merges is already a clean ancestor of the next. Branch off `develop`
   only for work that must land on its own (a hotfix, or a change to a decided area that needs review
   before anything is built on it), and merge it back promptly. `main` only ever fast-forwards from
   `develop`, so history stays linear and no commit is replayed twice.
5. Run `pnpm check` before committing. If it cannot run because the environment is not ready,
   **say so in the PR** — do not claim it is green.
6. If you make an architectural decision not covered by the docs, **write an ADR** using the
   format in `docs/adr/0000-template.md`.
7. If you find `AGENTS.md` is no longer accurate, update it in the same PR as the change that
   made it inaccurate.
8. When you tick a milestone exit criterion in `docs/PLAN.md`, record next to it the command you
   ran and what it printed. A criterion is evidence, not intent: "tenant isolation passes" means a
   named test file passing against a real database, and the plan entry says which one.
9. If part of an exit criterion is unmet, leave it unticked and write the gap under the milestone's
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
- **A service boundary that rebuilds an error from an HTTP status can silently drop retryability.**
  The worker reconstructs a `PlatformError` from the integration plane's JSON body, where the only
  other signal is the status number. Deriving `retryable` from `status >= 500` makes the governor's
  `429 CHANNEL_RATE_LIMITED` terminal, so a throttled call is never retried. Derive it from the code
  (`isRetryable(status, code)` in `packages/contracts`) and keep the retry hint (`Retry-After`) in
  the error `details` as well as the header, because the caller may only read the body.
- **An idempotency claim must be a lease, not a permanent flag.** A claim left `in_flight` by a
  crashed attempt freezes that key forever: a later retry is skipped, not retried. Give the claim an
  `expiresAt` while it is in progress, let a later caller steal it once the lease passes, and clear
  the stolen partial result so a replay never returns a value no attempt completed. Completing an
  already-terminal claim with the same outcome must be a no-op, not a conflict — a stolen lease can
  leave two attempts finishing the same idempotent write.
- **Two implementations of one interface drift unless one suite tests both.** The in-memory store
  and the Postgres store held the same promises on paper and would not have held them in practice:
  an in-memory `Map` cannot enforce a uniqueness constraint the way a primary key does, and the
  compare-and-swap in `claimIdempotency` has to be a `select ... for update` inside one transaction
  rather than two statements. Run the *same* conformance suite against both
  (`packages/sync-state/testing`), or "the in-memory one mirrors the real one" is an assumption, and
  the difference surfaces as a production-only bug. The suite lives on a `./testing` subpath so
  `node:test` never loads in a running service.
- **A sync SLO on a pull-driven path is bounded by the cadence, so declare it and check it against
  the cadence.** ADR 0002 promised eventual consistency "within an SLO" but named no number, and the
  M6 criterion inherited that gap. Freshness on the pull path is the interval between reconciliation
  passes, so a cadence longer than the SLO promises something the system cannot deliver: the fix is
  one shared constant (`CHANNEL_SYNC_SLO_SECONDS`) plus `cadenceMeetsSyncSlo`, checked in
  `readReconciliationInterval` so a bad cadence stops startup rather than shipping an unmet promise.
  The SLO is also two-sided — the engine must move the number *and* the push's own read
  (`GET /admin/stock-levels`) must return it — so the assertion is split across the real-Medusa
  test and the worker boundary test rather than duplicated in one place that can only see one side.
- **The end of a milestone is where an unproven integration — not an unimplemented feature —
  hides.** M6's backend, screens and isolation were all done and green, and the only open criterion
  was a cross-cutting statement ("WMS reflects in channel stock") that belonged to neither the WMS
  code nor the M4 push. When a criterion names two subsystems, prove each half where it lives and
  say in the plan which test covers which half; a single test reaching across both boundaries would
  need a fake for one of them, and the fake is where the two halves silently stop agreeing.
- **A UI client and the route it calls are two files that can disagree while both suites pass.**
  `apps/web/oms-web/src/control-plane.ts` builds a URL string; the control plane's route table in
  `http.ts` matches it. Nothing type-checks the pair, so a renamed path or a changed method keeps
  the client's tests green (they stub `fetch` and assert a response the client parses) and the
  server's tests green (they call the route the client no longer uses). The warehouse surface hit
  exactly this: `createPickTask` was declared twice and one copy addressed the wrong path. Pin the
  seam — assert the URL and method each client function issues against the route the server
  registers (`apps/web/oms-web/test/control-plane.test.ts`), the way a contract test would, and treat
  a page-level test that only renders the result as not covering it.
- **A form that offers a choice the engine must reject is a bug in the form.** The WMS screens
  originally rendered one create form listing every warehouse's bins, so a seller could pair a
  warehouse with another site's packing bin and only find out from the engine's refusal. When two
  fields are constrained to agree (warehouse and its bins, a PO and its staging bin), render the form
  per parent and list only that parent's children. The engine still validates; the UI should not
  make an invalid combination selectable in the first place.
- **A job-id-deduping queue will silently drop a reschedule if the retry reuses the original id.**
  BullMQ dedupes on job id across *every* state, not just pending: re-enqueueing a reschedule under
  the id of the job that is currently being processed is a no-op, and the retry never runs. Derive a
  fresh id from the retry's `runAt` (`<id>@<runAt>`) so two reschedules of one job to the same
  instant still collapse into one retry. Identity for correctness is the idempotency lease, not the
  job id (ADR 0013).
- **A durable queue makes test isolation the test's job, not the adapter's.** The in-memory adapter
  hands out a fresh instance per test; Redis does not, so one test's leftover jobs are delivered to
  the next test's consumer unless each test drains the queue first. Run the same conformance suite
  against both (`packages/workflow-queue/testing`) and reset the durable backing between tests.
- **A job-id-deduping queue keeps terminal jobs, so "id exists" is not "id is taken".** BullMQ retains
  a completed or failed job in Redis indefinitely. An `enqueue` that dedupes on mere existence would
  make every later enqueue under that id a silent no-op — and the reconciliation scheduler reuses a
  target's base id on every boot, so a restarted worker would reconcile nothing. Dedupe only on a
  non-terminal state (`waiting`/`active`/`delayed`/…); a terminal id must be freed before re-adding.
  This is the same failure shape as the reschedule-id rule above, one state further along.
- **A package may import `@platform/contracts` and nothing else** (AGENTS.md §3). A dispatcher that
  needs a logger declares a three-method interface locally — `Logger` from `@platform/observability`
  satisfies it structurally — rather than taking a dependency on the observability package, which
  the boundary checker rejects.
- **A new external boundary is a sibling of an existing one, not a new layer.** Courier providers
  (M7) are the same shape as channel connectors — authenticate, call an external API, report rate
  limits, stay pure with respect to credentials — so they reuse the integration plane's app-key
  ownership and governor rather than growing a `courier-plane` (docs/adr/0020). A second runtime for
  the same call shape is surface, not separation. The one genuinely new piece, rate shopping, is a
  *decision*, not an integration: it belongs in `contracts` as a pure function so the chosen courier
  and its explanation come from one call and cannot drift.
- **An audit requirement means the decision must return its own explanation.** M7 asks that rate
  shopping be "auditable — why this courier was chosen". A log line written next to the choice would
  be a second artifact that can disagree with it; making `selectCourier` return the chosen quote *and*
  every rejected quote with its reason makes the audit the return value (docs/adr/0014, docs/adr/0015).
  The same reasoning forces a deterministic tie-break: without one, quotes equal on price and transit
  would be ordered by input position, and a caller that collected them concurrently would choose a
  different courier run to run — an audit that cannot be reproduced is not an audit.
- **A fan-out reports per-target failures but never swallows a rate limit.** The courier quote route
  prices several couriers in one request and collects a failing courier into `failures` so one being
  down does not stop the seller shipping with another — but a `RateLimitedError` is rethrown, not
  collected. It is not "this courier is broken", it is "come back later": folding it into the failure
  list would hand the caller a partial answer and drop the retry hint the worker reschedules on
  (docs/adr/0002). The same distinction applies to any future fan-out.
- **The governor is keyed by resource, and a courier is a resource.** `RateLimitGovernor` governs a
  `GovernedResource` (`ChannelCode | CourierCode`) with one budget per key, so a courier's limit and
  a channel's limit are separate buckets spent the same way. Do not add a second governor for
  couriers: two copies of the acquire/deny/`recordRateLimited` logic is how one copy silently drifts
  from the other (docs/adr/0020).
- **Repair must reopen a failed ref *inside* the pull, not in a loop before it.** Reopening every
  `failed` ref and then re-counting makes the drift number fall to zero for orders the channel's
  current page no longer returns — the dashboard reads healthy while the order is still missing,
  which is a worse failure than showing drift. Gate the reopen on the order being in hand
  (`retryFailedRefs` in `importOrdersOnce`), so `remaining` can only reach zero for work the pull
  actually did. The repair path is the same function the real-time path calls; the flag is the only
  difference (ADR 0014).
- **One classifier for drift, shared by the writer and the reader.** The worker's repair pass and the
  control-plane dashboard both classify from the ref's own state (`classifyOrderRefDrift` in
  `packages/contracts`), so the number an operator reads is the number reconciliation acts on. A
  second copy of the rule — especially the stale cutoff — is how the two drift apart.
- **A `reserved` ref is drift only once no attempt can still hold it.** The age cutoff must exceed the
  idempotency lease, or a healthy in-flight import is reclassified as drift and repaired underneath
  itself. Both are deployment inputs, so the constraint is documented rather than enforced in code.
- **`repaired` is repair activity, not a drift delta.** A pass's imported count can exceed the drift
  detected before it, because the same cursor walk also delivers new orders. Report `detected` and
  `remaining` as the pair that describes drift; keep `repaired` for how much work the pass did.
- **A service client and its route can disagree while every test stays green.** The worker's
  `listOrderRefs` first addressed the target as a query string (`/v1/sync/order-refs?tenantId=…`)
  while the control plane's route is path-addressed (`/v1/sync/order-refs/:tenantId/:channel`). Every
  worker test stubbed `SyncStateClient`, and every control-plane test called the route directly, so
  nothing exercised the seam — the mismatch would have surfaced as a 404 in production. When a client
  gains a method, pin its URL in a test against a fake transport (`test/ports.test.ts`), and keep the
  new client addressed like its siblings so the convention is the thing being copied.
- **A validator that copies a contract list silently rejects the members added later.** The control
  plane validated `entity` against a hand-written `orders`/`listings` pair. When M4 added `stock` to
  `SYNC_ENTITIES`, the worker's stock reconciliation could still *read* its cursor — the read route
  takes `entity` from the path and the param parser kept up — but every *advance* was a 422, so the
  pass repaired its first page and then failed. A unit re-arms only when it completes, so stock
  reconciliation never re-armed at all: it ran once at startup and stopped, while the drift count
  never converged. Both test suites stayed green because the worker tests used
  `InMemorySyncStateStore` and the route tests only ever sent `orders`. Derive the check from the
  exported list (`SYNC_ENTITIES`, `asChannelCode`) and iterate that list in the test, so the next
  member is covered the moment it is declared rather than when someone remembers.

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
- **A generated `MedusaService` method is `softDelete<Plural>`, not `dismiss<Plural>`.** The
  compensation in `create-channel-order.ts` called `dismissChannelOrderLinks`, which does not
  exist; the runtime error only surfaces when the failure path actually runs, so a happy-path test
  never catches it. Probe the generated methods (`listAndCount…`, `softDelete…`) and cover the
  compensation path with an induced failure, not just the success path.
- **`stock_locations` on a variant is an array, and it is what a reservation needs.** Reserving
  against a sales channel requires a location that is stocked *and* associated with that channel;
  Medusa refuses with `Variant ... is not stocked at any location available to sales channel` when
  the lookup returned the relation as a scalar or missed the association. Read
  `stock_locations[].id` and pass those as `location_ids` to `reserveInventoryStep`, or the
  reservation is silently skipped (`reserved_quantity` stays `0`, an oversell, not an error).
- **Provisioning must seed a default region and stock location before the tenant is `active`.**
  Without a region an order cannot be priced; without a stock location its reservation fails, so
  the first import errors on a tenant that looks provisioned. The seeder reaches the tenant's
  authenticated Admin API, so the admin credential (ADR 0012) must be minted **before** seeding —
  the step orders `ensureAdminKey` then `seed`. Seed idempotently by natural key (region by
  currency, location by name): a country can belong to only one region, so a blind retry turns a
  resumed provisioning run into a hard failure.
- **The in-memory workflow engine does not persist executions, so `transactionId` resume is a
  no-op.** `workflow_execution` stays empty and a repeated request re-executes the workflow. The
  `channel_order_link` unique index is therefore the real idempotency barrier, not workflow
  transaction resume; do not document resume behavior the configured engine does not provide.
- **`@medusajs/medusa` declares no `bin` and does not depend on `@medusajs/cli`, so a clean
  install creates no `medusa` binary.** It appeared locally only because an earlier install had
  hoisted the CLI; CI's `pnpm install --frozen-lockfile` never did, so the real-CLI migration test
  failed with `spawn .../.bin/medusa ENOENT` and every downstream assertion failed with
  `relation "channel_order_link" does not exist`. The CLI is reached through a peer of
  `@medusajs/framework`, which pnpm does not link as an executable. Pin `@medusajs/cli` as an
  explicit devDependency of `medusa-config`; a test that invokes a binary by path must have that
  binary as a direct dependency, or it passes on a warm developer tree and fails on a cold one.
- **A second React major in the workspace silently re-resolves the data plane's React.** Adding a
  Next.js app on React 19 added a second `react`/`react-dom` to the graph, and pnpm resolved
  `data-plane/modules/channel-order-link`'s `@medusajs/medusa` to **React 19** while
  `medusa-config` stayed on 18 — one data plane split across two React majors, visible only as a
  lockfile key change (`react@18.3.1` → `react@19.3.0` in the importer's peer suffix) and a peer
  warning. Next 15 accepts `react ^18.2.0 || ^19.0.0`, so the fix is to keep **one** React major
  for the whole workspace (18.3.1, the one Medusa already brought) rather than upgrade the data
  plane. When a lockfile diff looks like a downgrade, compare reference *counts*
  (`git show HEAD:pnpm-lock.yaml | grep -c 'react-dom@18.3.1'`) before believing it: re-keying peer
  suffixes deletes and re-adds the same entries, so the line count moves while the resolution does
  not.

## 12. Lessons from the WMS write path

Hard-won specifics from M6's warehouse modules and their stock write. Same rule as §9–§11. Full
rationale: `docs/adr/0018`.

- **`medusa db:generate` bakes the *active* `DATABASE_SCHEMA` into the migration SQL, and its
  `down()` drops that schema.** Generating with `DATABASE_SCHEMA=tenant_gen` produced
  `create table "tenant_gen"."wms_bin" ...` plus `drop schema if exists "tenant_gen"` — a migration
  that only ever works for one tenant and, on rollback, destroys the schema every other table lives
  in. Generate with **no** `DATABASE_SCHEMA` set: the SQL is then unqualified, the same shape
  Medusa's own module migrations use, and `search_path` decides the schema at run time. The
  `.snapshot-<module>.json` is also schema-agnostic when generated this way; grep it for the schema
  name before committing.
- **`db:generate` takes the module's *registered* name, not its folder name.** `medusa db:generate
  purchase-order` failed with `Cannot generate migrations for unknown module(s)` and listed the
  modules it knew, where the key was `purchaseOrder` — the key in `medusa-config`'s `modules` map.
  A folder named `purchase-order` is unrelated to the key; read the "Available modules" list the
  error prints rather than guessing.
- **`adjustInventoryLevelsStep` adjusts an existing level and throws when there is none.** A tenant
  that sells a SKU it has never stocked at this warehouse fails its first receipt. Resolve the
  variant's `inventory_item_id` through `product_variant.inventory_items` and create the level at
  zero first (`createInventoryLevels`), with a compensation that deletes the levels it created — a
  level created at zero and left behind after a rollback is a phantom row the next run trips over.
- **Derive a bin quantity from an append-only ledger instead of storing a counter.** A stored
  quantity read-modify-written by a receipt and a pick racing on the same bin loses one of the two.
  Summing signed `delta` rows cannot lose a write: both movements are inserted and the sum reflects
  both. `quantity_before`/`quantity_after` are recorded for the audit trail but nothing reads them
  back as a current value. The same reasoning makes a stocktake correction a *delta* with the
  counted number in the reason, not an assignment — which is what "auditable adjustment, never a
  silent overwrite" requires.
- **A relocation between bins must not touch the inventory level.** Put-away and pick move units
  inside one stock location; the level already moved at receipt (and, for a pick, the reservation
  taken at import already holds the units). Adjusting the level on a relocation makes the warehouse
  total drift by the moved quantity, and on a pick it double-decrements once fulfillment ships.
- **Prove a module's migrations with the real CLI before wiring anything to it.** The WMS and
  purchase-order tables only exist because `db:migrate` ran them; a typecheck passes whether or not
  the module is registered. The M6 integration test boots a real server, walks receipt → put-away →
  pick → stocktake over HTTP, and reads `inventory_level.stocked_quantity` out of the tenant schema
  to show the engine's number and the ledger's number moved together.

---

## 13. Lessons from the shipment write path

Hard-won specifics from turning "order X shipped with waybill Y" into the engine's own fulfillment
(M7 increment 3, `data-plane/medusa-config/src/workflows/record-shipment.ts`). Same rule as §9–§12.

- **`createFulfillmentWorkflow` discards the labels you pass it.** The workflow forwards `labels` to
  the fulfillment provider and then writes `providerResult.labels ?? []` back onto the record
  (`FulfillmentModuleService.createFulfillment`). The `manual` provider returns `labels: []`
  unconditionally, so a waybill handed to `createOrderFulfillmentWorkflow` is silently dropped — the
  fulfillment is created, the reservation is consumed, and `fulfillment_label` stays empty. Record the
  label on the *shipment* (`createShipmentWorkflow({ id, labels })`), which calls `updateFulfillment`
  and persists it. This is invisible to any test that only asserts the fulfillment exists.
- **`order.items[].id` and `order_item.id` are different id namespaces, and only one is a reservation's
  `line_item_id`.** `reservation_item.line_item_id` holds `ordli_…` (the order *line item*), which is
  what the query graph returns for `order.items[].id`; a raw `select id from order_item` returns
  `orditem_…` (the order *item* join row) and matches nothing. `createOrderFulfillmentWorkflow` filters
  reservations by the ids it read from `order.items[].id`, so a diagnostic that queries the table
  directly and compares to a reservation's `line_item_id` looks like a mismatch in the workflow when
  the workflow is correct — the two id spaces are the trap. Join through `order_item.item_id` to relate
  them; do not compare `order_item.id` to a reservation.
- **A consumed reservation is soft-deleted, not zeroed.** `prepareInventoryUpdate` pushes a fully
  fulfilled reservation to `deleteReservationsStep`, so `reservation_item.quantity` stays at its old
  value and only `deleted_at` moves. A test that asserts "the reservation was consumed" with
  `where quantity > 0` keeps passing while the row is untouched — assert `where deleted_at is null`
  instead, and read `inventory_level.stocked_quantity` to show the units actually left the location.
- **A test pool opened against a database must close before the database is dropped.** The teardown
  hook dropped the tenant database with `with (force)` while a `pg.Pool` still held a connection, so
  node-postgres raised `terminating connection due to administrator command` *after* the test had
  reported — an `uncaughtException` that fails the whole file while every assertion is green. Order
  the teardown in one hook: stop the server, `await pool.end()`, close the schema admin, then drop.
- **The fulfillment *is* the shipment record, so the seller read needs no new tenant route.** Both
  arrangement paths (channel-booked and courier-booked) end as a Medusa fulfillment, so shipment
  visibility is a projection off the order read — `GET /admin/orders/:id` with `*fulfillments`,
  `*fulfillments.labels` and `*fulfillments.metadata` — not a `/shipments` route beside it
  (docs/adr/0016, 0021). The projection must be as defensive as the order one: a fulfillment with no
  id is skipped, an unrecognised `arrangement` reads as `null`, malformed events are dropped, and a
  fulfillment with no label still projects (the seller has to see that the order shipped). The
  end-to-end proof is in `test/integration/shipment-write-path.test.ts`, where the seller read
  returns the very shipment the write path recorded.
