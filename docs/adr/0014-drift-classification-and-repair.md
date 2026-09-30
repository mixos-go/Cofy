# ADR 0014 — Drift classification and repair through the ordinary pull

- **Status:** Accepted (approved 2026-09-26)
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

ADR 0002 makes reconciliation the source of truth, and M4's exit criteria require the system to
repair itself: "Injected drift (delete a local order, corrupt a stock level) is detected and
repaired", and "Drift dashboard shows unresolved drift returning to zero after repair". ADR 0013
supplied the engine and the `reconcile.orders` unit already converges orders through the same pull
path the real-time import uses. What was missing was the *definition* of drift and the decision of
where repair runs.

Two things made this non-obvious.

First, the sync-state store has three order-ref statuses and they do not all mean the same thing.
`committed` is final. `reserved` is written before the commerce write and may be a live attempt or a
partial commit between the two stores — ADR 0010's accepted failure mode. `failed` is a known-bad
import. Only two of those are drift, and `reserved` is drift only once no attempt can still hold it.
The idempotency lease already bounds a single attempt, so there is a defensible cutoff, but it is a
policy value (how long is "too long"), not a constant the code can invent.

Second, a repair pass must not report drift resolved for an order it did not actually pull. The
tempting implementation is to reopen every `failed` ref and then re-count: the count drops to zero,
but a ref can be reopened for an order the channel's current page no longer returns, and the
dashboard then reads healthy while the order is still missing. That is a worse failure than showing
drift, because it is silent.

## Decision

We will classify drift from the ref's own state, with one shared pure function
(`classifyOrderRefDrift` / `orderRefsToDrift` in `packages/contracts`), so the worker's repair pass
and the control plane's dashboard cannot disagree about what drift is:

- a `failed` ref is **`failed_import`**, regardless of age;
- a `reserved` ref older than a configured stale cutoff is **`stale_reservation`**;
- a `committed` ref is never drift, and a `reserved` ref inside the cutoff is in-flight work, not
  drift.

We will repair drift through the ordinary pull and no second code path. `importOrdersOnce` gains a
`retryFailedRefs` flag, off for the real-time path and on for a repair pass; the pass calls the same
function the real-time unit calls. A `failed` ref is reopened *inside the pull, while the order is in
the page*, not in a loop before it. This is what keeps the re-count honest: a ref is only reopened for
an order the pull actually has, so `remaining` can never read zero while the order is still missing.
The pull still walks from the persisted cursor, so a `reserved` ref is retried because it was never
committed, and a repair that fails again leaves its ref `failed` for the next pass.

We will read the stale cutoff from operator configuration (`STALE_RESERVATION_SECONDS`), required at
startup like the reconciliation cadence, rather than defaulting in code: how long a partial commit
may sit before we call it broken is a policy decision that must be reviewed. The per-pass ref bound
(`MAX_DRIFT_REFS_PER_PASS`) does carry a code default (500), because it is a safety bound rather than
a policy — any positive value is correct, and a wrong one cannot reclassify healthy work as drift.
The dashboard is a control-plane read (`GET /v1/sync/drift/:tenantId/:channel`) over the durable
store, because an operator must be able to ask "what is drifting now" without starting a pass; it
calls the same classifier and threshold as the worker, and accepts a threshold override for an
ad-hoc read.

We will treat the repair pass's own log line (`drift.repair.completed`, carrying `detected`,
`repaired`, `remaining`) as the drift metric surface, consistent with the platform's structured-JSON
observability. No new metrics stack is introduced for M4.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Reopen every `failed` ref, then re-count | Reports drift resolved for orders the pull never had; the dashboard reads zero while the order is still missing, which is the silent failure this ADR exists to prevent. |
| Classify drift in SQL (age cutoff in the query) | Puts a second copy of a policy value in the control plane and splits the definition of drift across two codebases; the worker and the dashboard would drift apart. |
| A separate repair workflow with its own import logic | Violates ADR 0002's "no second code path" and M4's repair criterion; two import paths diverge in exactly the edge cases drift exercises. |
| Count drift as a gauge in a new metrics service | Adds a dependency and a running component for what the existing structured logs already carry; AGENTS.md §2.10 asks for a written reason before adding a dependency. |
| Default the stale cutoff in code | Hides a policy decision (how long a partial commit may sit) that must be reviewed by an operator, like the reconciliation cadence. |

## Consequences

**What becomes easier:**

- Drift has one definition, shared by the repair pass and the dashboard, so the number an operator
  sees is the number reconciliation acts on.
- Repair cannot report a false zero: reopening happens inside the pull, gated on the order being
  present.
- A throttled or failed repair is not special-cased; it leaves the ref `failed` and the next cadence
  picks it up, so there is no new retry policy to reason about.

**What becomes harder / technical debt we accept:**

- The stale cutoff is a deployment input. Setting it below the idempotency lease would reclassify
  healthy in-flight attempts as drift; the value's relationship to the lease is a documented
  constraint, not something the code enforces.
- Detection reads `failed` and `reserved` refs per target per pass, bounded by `MAX_DRIFT_REFS_PER_PASS`.
  A tenant with more drift than the bound converges over several passes rather than one.
- `repaired` counts orders the pass imported, which can exceed the drift detected before it (the
  cursor may deliver new orders in the same walk). It is a repair-activity signal, not a delta of the
  drift count; `detected` and `remaining` are the pair that describes drift itself.
- The stock snapshot pull is still open, so drift is defined for order refs only today.

**How we would reverse this later:** if drift moves into a dedicated metrics pipeline, the classifier
stays where it is and only the reporting call sites change. If repair needs to run independently of
the cadence, it becomes another unit over the same `importOrdersOnce`, which is already the case.
