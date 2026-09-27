# ADR 0006 — Runtime and build: Node native TypeScript, Extensionless-free imports

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Platform team

## Context

M0 scaffolded workspaces whose `exports` point at `./src/index.ts`, and `tsc` accepted them
because `moduleResolution` was `Bundler`. Nothing could actually **run** them. M1 adds real
services and tests, so this had to be settled first, on evidence rather than preference.

Three options were considered for running TypeScript across services and tests. We measured the
one we preferred instead of assuming it worked.

**Finding 1 (measured).** Node 24.21 strips types natively and resolves a package whose `exports`
points at a `.ts` file:

```
node --test probe.test.ts        # imports "@t/pkg" -> ./src/index.ts
✔ workspace ts import
```

**Finding 2 (measured).** Node does **not** rewrite a `.js` specifier to a `.ts` file. The
conventional `tsc` ESM style — `export * from "./ids.js"` while only `ids.ts` exists on disk —
fails at runtime, not at compile time:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/ids.js'
  imported from .../src/index.ts
```

That is the worst failure shape: `tsc` is happy, tests and services crash. Our M0 packages had
exactly this style, so the status quo was already broken for runtime use.

**Finding 3 (measured).** TypeScript 5.9 with `rewriteRelativeImportExtensions` compiles source
that imports `"./ids.ts"` into output that imports `"./ids.js"`, and `allowImportingTsExtensions`
permits the `.ts` specifier in the first place:

```js
// lenient of dist/index.js
export * from "./ids.js";
```

So a single specifier style can serve both direct execution (Node) and a production build (tsc).

## Decision

**We will run TypeScript directly under Node's type stripping in development and tests, with
exports pointing at source, and use explicit `.ts` extensions on relative imports. A production
build emits to `dist/` with extensions rewritten to `.js` by `tsc`.**

Concretely:

- Every workspace `exports` points at `./src/index.ts`. No build step is needed to run tests or
  start a service locally.
- Relative imports inside a workspace carry the **real on-disk extension** (`.ts`), not a `.js`
  specifier that would lie about what exists.
- `tooling/tsconfig/base.json` sets `module`/`moduleResolution` to `NodeNext`,
  `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`, and `noEmit` for typechecking.
  A separate build config (added when the first service has a deploy target) turns emission on.
- **Node >= 22.18** is required, because unflagged type stripping is not guaranteed earlier. The
  root `engines` field states this so a wrong runtime fails loudly at install rather than
  mysteriously at run.
- **TypeScript >= 5.7** is required for `rewriteRelativeImportExtensions`.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Keep `.js` specifiers and compile before every run | Turns every test run into a build, and reintroduces the failure in Finding 2 the moment someone runs a file directly. The specifier would also point at something that does not exist in the repo. |
| A loader such as `tsx` or `ts-node` | A new runtime dependency for something the platform now does natively (AGENTS.md §2.10), and it interposes a non-standard resolver in every process. |
| Bundle services with `esbuild`/`tsup` | Adds a build dependency and hides module-boundary mistakes that our `pnpm boundaries` checker is specifically designed to catch. `tsc` is already present and preserves module structure. |
| `moduleResolution: "Bundler"` with no runtime story | This was the M0 state. It typechecks and cannot run. It is what Finding 2 exposed. |

## Consequences

**What becomes easier:**

- Running any test or service is `node path/to/file.ts`. No build, no watcher, no loader flags.
- The import style in source matches reality, so a missing file fails immediately.
- `pnpm typecheck` and `pnpm test` exercise the same module graph, so a typecheck pass means the
  graph is at least resolvable.

**What becomes harder / technical debt we accept:**

- `.ts` extensions in imports look unusual to newcomers used to bundler-style resolution. It is
  enforced by tooling, and `AGENTS.md` §5 records it.
- Two TypeScript configs (typecheck and build) once the first deployable exists. Keeping them
  separate is deliberate: typecheck must never emit.
- Type stripping means no `enum` and no `namespace` in source; we use `const` objects and union
  types instead. This matches the existing `PLATFORM_EVENTS` style, so nothing is lost.
- We depend on a recent Node. Our base image must be >= 22.18, not the common 20.

**How we would reverse this later:**

If a service ever needs emit-time transforms that type stripping cannot support (decorators with
metadata, for example), that service gets a real build step and imports from `dist/`. The
extension style does not change, so the reversal is contained to that service's startup command.
