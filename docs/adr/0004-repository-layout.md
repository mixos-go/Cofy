# ADR 0004 — Repository layout: boundaries mirror runtime

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

The first draft layout put everything non-app under a single flat `packages/`, with `apps/` flat
and no home for Medusa custom module code. Three problems made that unsustainable:

1. **`packages/` conflated two different kinds of thing**: stable core libraries (`contracts`,
   `tenant-client`) and adapters that grow unboundedly (`connector-*`). With ten channels,
   `packages/` becomes an undifferentiated list, and nobody can tell what is safe to change.
2. **`apps/` mixed runtimes.** `oms-web` is a Next.js app bundled for the browser; the others are
   long-running backend services. Different build, different deploy, different lifecycle.
3. **The data plane had no home.** `docs/ARCHITECTURE.md` states that custom Medusa modules
   (`wms`, `purchase-order`) live *inside* each tenant's Medusa instance, but the layout had no
   directory for that code. Code with no designated home ends up somewhere arbitrary — which is
   exactly how a codebase decays.

The deeper issue: a directory that mixes two runtimes will eventually contain files that violate
the boundary between them.

## Decision

**We will organize the repository by runtime boundary, grouped from the start, and separate core
libraries from adapters.**

```
apps/
  services/       # long-running backend runtimes we deploy
    control-plane/
    integration-plane/
    worker/
  web/            # browser-bundled runtimes we deploy
    oms-web/      # seller-facing
    ops-console/  # internal operator-facing

packages/         # stable shared libraries — few, slow to change
  contracts/      # types, zod, errors, events — leaf, imports nothing
  channel-sdk/    # ChannelConnector interface + shared utilities
  tenant-client/  # the only path to tenant data
  secrets/        # KMS-backed secret access

connectors/       # adapters — volatile, one package per channel
  shopee/
  tiktok-tokopedia/
  lazada/

data-plane/       # runs INSIDE each tenant's Medusa instance
  medusa-config/  # vanilla config + module registration
  modules/
    wms/
    purchase-order/
    channel-order-link/

tooling/          # repo tooling, never shipped
  boundaries/     # dependency direction + forbidden import checker
  tsconfig/
  eslint-config/

docs/
```

Rationale for the three groupings that differ from the draft:

- **`apps/services/` vs `apps/web/`** — split by runtime, not by importance. Grouping now avoids a
  breaking reorganization later; the split also makes it obvious that a web app must never be
  imported by a service.
- **`connectors/` as a peer of `packages/`** — the count of channels is visible at a glance,
  `packages/` stays short and stable, and the plugin-like nature of a connector is explicit. A
  connector is an adapter we own, not a general-purpose library.
- **`data-plane/` as a top-level directory** — this code is executed by Medusa inside the tenant
  instance, not by our services. Making it top-level makes the most dangerous boundary in the
  system (our code vs the vanilla engine) visible in the file tree.

**`ops-console/` is reserved now, built later.** Splitting it from `oms-web` at the start
prevents operator screens from leaking into the seller UI, and prevents a disruptive split once
seller UI code exists.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Flat `apps/` and flat `packages/` | Mixes runtimes and conflates stable libraries with volatile adapters. Reorganizing later touches tsconfig paths, CI, Dockerfiles, and imports simultaneously. |
| `packages/connectors/*` | Keeps everything non-app uniform, but hides channel count and keeps `packages/` growing forever. |
| Connectors as a workspace inside `apps/` | A connector is not deployable; it is bundled into services. Putting it in `apps/` invites someone to try deploying it. |
| `data-plane` code inside `packages/` | Obscures that it runs inside the tenant's Medusa instance under a different runtime and lifecycle than our libraries. |
| Deferring `apps/web/` grouping until there are 7+ apps | The reorganization is breaking and expensive once code exists. Grouping costs nothing now. |

## Consequences

**What becomes easier:**

- The file tree answers "what runtime does this run in?" without opening a file.
- `packages/` stays small and stable; volatility is isolated in `connectors/`.
- The data plane boundary is visible, so violations are noticed in review.
- `pnpm boundaries` rules map directly onto directory groups, making enforcement simple.
- Adding a channel or an app is additive, with no reorganization.

**What becomes harder / technical debt we accept:**

- **Slightly deeper paths** (`apps/services/control-plane`) and a longer relative import base.
  Mitigated by workspace package names (`@platform/*`) resolved through pnpm, which keep imports
  short without reintroducing deep-import paths.
- **Three groupings to explain to newcomers** instead of one. Mitigated by `docs/ARCHITECTURE.md`
  §5 and this ADR.
- **`ops-console/` sits empty initially**, which can look like clutter. Accepted deliberately as a
  reserved boundary.
- **Two workspace globs for apps** (`apps/services/*`, `apps/web/*`) rather than one.

**How we would reverse/revisit this:**

Only if the number of apps shrinks to the point where grouping adds no information, or if a
runtime emerges that fits none of the three boundaries. Adding a fourth group is cheap; collapsing
groups is not, which is why we grouped early rather than late.
