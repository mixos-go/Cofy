# ADR 0007 — Marketplace SDKs are vendored unmodified and wrapped, never edited or installed

- **Status:** Proposed
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

M2 needs typed clients for TikTok Shop and Tokopedia. The `mixos-go` toolkit already provides
generated TypeScript SDKs for four marketplaces, derived from the official reference docs:

| Repo | Package | Generated surface |
|---|---|---|
| `mixos-go/tiktok-shop` | `@mixos-go/tiktok-shop-sdk` | 363 APIs / 25 categories |
| `mixos-go/shopee` | `@mixos-go/shopee-sdk` | 444 APIs / 29 categories |
| `mixos-go/lazada` | `@mixos-go/lazada-sdk` | 372 APIs / 32 categories |
| `mixos-go/bli-bli` | `@mixos-go/bli-bli-sdk` | 131 APIs / 27 categories |

Roughly 1,310 typed operations in total, all MIT-licensed. Reimplementing signing, host
resolution and request shapes for these would be weeks of work and a permanent drift risk.

We inspected all four rather than trusting their descriptions. Findings that constrain the
decision:

1. **They are worth adopting.** TikTok Shop's signature covers the path after `{param}`
   substitution — a detail that is commonly wrong — and both SDKs implement single-flight token
   auto-refresh with multi-seller isolation tests. Both build clean on a fresh clone and pass
   their own suites (TikTok 14/14, Shopee 9/9). Shopee already exposes a timing-safe
   `verifyPushSignature` for push callbacks.
2. **They contain no rate limiting at all.** No mention of `429`, `Retry-After`, backoff or
   throttling anywhere in either `src`. Marketplace rate limits are per app key, which is
   organization-specific, so this is expected rather than a defect (ADR 0002 already assigns
   rate limiting to our own central governor).
3. **They are not on public npm.** `registry.npmjs.org/@mixos-go/*` returns 404; `publishConfig`
   targets GitHub Packages (`npm.pkg.github.com`), which answered 403 for our token. Consuming
   them would require a credentialed registry in every environment, including CI.
4. **`dist/` is gitignored and not committed** (`git ls-files sdk/dist` is empty), and `src/`
   uses extensionless relative imports (`from '../../client'`), which Node's type stripping
   rejects. So they cannot be consumed as TypeScript source the way our own packages are.
5. **Vendored CJS `dist` needs one marker.** Importing the unmodified `dist/index.js` from a
   type-stripped `.ts` file under a `"type": "module"` package fails: named exports do not
   resolve. Adding a `package.json` next to the vendored directory with `"type": "commonjs"`
   makes the import work and the signature function run.
6. **Tokopedia is not covered.** The toolkit contains TikTok Shop categories only. This
   confirms ADR 0003: order/bill history stays in Tokopedia and that side is ours to build.

AGENTS.md §2 states that marketplace logic lives only in connectors, and §3 forbids connectors
from reaching outside `channel-sdk` and `contracts`. The generated SDKs are large, generated,
and owned upstream; whatever we do with them must not put them in a position to be edited by
accident or to leak upward into services.

## Decision

**We will vendor the marketplace SDKs into our repo unmodified, consume their compiled `dist`,
and put all adaptation in our own connector code. We will not install them from a registry and we
will not edit generated files.**

Concretely:

- **Vendoring.** Each SDK is copied into `connectors/<channel>/vendor/<sdk>/` at a pinned
  upstream commit SHA, recorded in a manifest with its license and upstream URL. Vendored files
  are byte-identical to upstream; a checksum test fails the build if they drift.
- **Why that exact location.** `tooling/boundaries` maps a path under `connectors/` to the zone
  `connector:<second segment>`, so a shared `connectors/vendor/` directory would become the zone
  `connector:vendor` and every import of it would be a cross-layer violation. Nesting vendor
  inside the owning connector keeps the import inside one zone. The directory is not matched by
  the `connectors/*` workspace glob, so it is never installed as a workspace; `dist` is in the
  checker's skip set and in eslint's ignore list, so vendored code is deliberately outside our
  lint and typecheck rules. Bundling the generated `src` into the connector package instead would
  pull thousands of generated lines into our own typecheck and lint, which is why we vendor the
  compiled output in a separate, non-workspace directory.
- **Consuming `dist`, not `src`.** The vendored directory carries a `package.json` declaring
  `"type": "commonjs"`, and our connectors import the compiled entry point. We never import
  generated `src` (finding 4).
- **Regeneration, not mutation.** Updating a marketplace API means re-running upstream's
  `generate.cjs` against `references/api/**` and re-vendoring the new `dist`. There is no manual
  edit path, and no local patch that survives a regeneration. If we need behaviour upstream does
  not have, it goes in our wrapper.
- **Wrapping is the only integration path.** Vendored SDK directories are never imported by
  `apps/*`, `packages/*`, or `data-plane/*`. Only the connector that owns them may import them,
  and connectors still expose nothing but the frozen `ChannelConnector` from ADR 0005.
- **Credentials stay ours.** Our adapter builds a vendored client per request from the
  `Credential` handed in by the caller (ADR 0005). The SDKs' injected `TokenStore` is treated as
  an ephemeral cache inside the connector, never as the source of truth, and `packages/secrets`
  remains the only durable credential store (ADR 0003).
- **Rate limiting stays ours.** Every vendored call is issued through our governor, and vendored
  error responses are mapped to `RateLimitedError` from `packages/contracts` so retry policy is
  derived mechanically. Connectors report; they do not sleep (AGENTS.md §4).
- **Webhook verification reuses vendored primitives.** Channel signature verification (for
  example Shopee's `verifyPushSignature`) is called from our `WebhookHandler.verify`, inside the
  handler that only verifies and enqueues (ADR 0002).
- **Tokopedia is written by us**, as a second upstream API behind the same connector, with
  `splitsOrderHistory: true` — unchanged from ADR 0003.

## Relationship to ADR 0003 and ADR 0005

This ADR **does not amend** ADR 0003 or ADR 0005, and we deliberately did not invent an amendment
for the sake of one. Both already make the right calls, and the toolkit confirms them:

- ADR 0003 treats TikTok Shop and Tokopedia as two APIs. Finding 6 shows the toolkit has no
  Tokopedia surface, so the split-order-history work remains real and ours.
- ADR 0005 passes a `Credential` into every operation and forbids connectors from looking
  credentials up. That is what keeps the vendored `TokenStore` from becoming a second credential
  store, which would be a cross-tenant leak risk.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Install from GitHub Packages | Not on public npm, and the registry rejected our token (finding 3). Would put a credentialed registry into every dev and CI environment to consume MIT code we can vendor in one commit. |
| Copy `src` and use it directly as our TypeScript | Extensionless imports cannot be type-stripped under ADR 0006, and it pairs our runtime to upstream's build assumptions. |
| Fork the SDKs and edit `src/generated` | Every regeneration would overwrite our patches, and a fork of generated code silently diverges from the official docs it was derived from. |
| Reimplement the clients ourselves | Duplicates thousands of typed operations that already match the official docs, and guarantees drift. |
| Import vendored clients directly from services | Bypasses `ChannelConnector`, so rate limiting and credential handling could be skipped, violating ADR 0002 and AGENTS.md §3. |
| Use the SDKs' `TokenStore` as the credential store | Creates a second durable credential location outside `packages/secrets`, breaking the `(tenant_id, channel)` keying that tenant isolation depends on. |

## Consequences

**What becomes easier:**

- M2 starts from ~800 typed TikTok Shop plus Shopee operations instead of a blank page, with
  signing and host resolution already correct against the official docs.
- Adding Shopee, Lazada and Blibli later is the same vendoring procedure, not new integration work.
- CI needs no third-party registry credentials, so the build stays reproducible for every agent.

**What becomes harder / technical debt we accept:**

- We carry roughly a few megabytes of generated code in-repo, and vendored code is outside our
  lint and typecheck rules — it is trusted because it is unmodified and checksummed, not because
  we review it.
- Regeneration is manual and must be deliberate; upstream has no release cadence we can rely on.
- The wrappers are where every real bug will live: mapping vendored error shapes to our taxonomy,
  credential injection, and governor integration.
- `ChannelCode` in `packages/contracts` has no `blibli` member, so adopting the Blibli SDK later
  needs a contracts change through change control.

**How we would reverse this later:** if these SDKs are published to public npm under a stable
release process, vendoring can be replaced by a versioned dependency without changing any wrapper
code, because wrappers depend on the SDKs only through our connector boundary.
