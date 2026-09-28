# ADR 0013 — Workflow engine: a port with a Redis-backed adapter, not a framework in the workflows

- **Status:** Accepted (approved 2026-09-26)
- **Date:** 2026-09-26
- **Deciders:** Platform team

## Context

ADR 0002 decided that **all sync work runs through the Redis workflow engine**, never as
`setTimeout` or in-process cron, and that reconciliation is the source of truth. M3 built the
*units* that engine will run — `orderImportOnce`, `importListingsOnce`, `pushStockOnce` — each a
function over ports, and deliberately did **not** pick an engine. The worker process today exposes
only a health surface (`apps/services/worker/src/main.ts`) and runs no workflow on a timer, which
is the honest state AGENTS.md §2.5 requires.

M4's exit criteria make the engine unavoidable:

- "Kill the worker mid-reconciliation; on restart it resumes without duplicating effects."
  Nothing today persists a pending unit of work, so a restart loses it.
- "Reconciliation respects the rate-limit budget and never starves real-time operations." The
  governor can *refuse* a call (M3, done) but nothing *re-enqueues* it; the refused work is
  recorded failed and stays that way.
- "Injected drift is detected and repaired." Repair must run "via the same idempotent workflows
  used by real-time paths (no second code path)", so repair and real-time work must share one
  dispatch mechanism — the engine.

Two questions had to be settled, and neither is settled by ADR 0002:

1. **Which engine?** "Redis workflow engine" names the backing store, not a library. The realistic
   candidates differ in a way that matters here: Temporal/Inngest own retry, compensation and
   orchestration inside the framework and want the workflow logic written against their SDK, while
   BullMQ is a job queue that leaves orchestration in our code.
2. **Where does rate limiting live?** ADR 0002 point 6 says "the governor decides when work is
   dispatched." BullMQ also has a built-in rate limiter and its own retry/backoff. Running both
   would mean two things decide delay, and the shared app-key budget the governor exists to enforce
   would be enforced twice, inconsistently.

The uncomfortable constraint: our workflows are already **written and tested as plain functions
over ports** (269 tests across the repo). An engine that requires rewriting them as SDK-specific
workflow definitions would discard that and re-couple the workflow logic to a vendor — the opposite
of the port discipline that makes the boundary tests possible today.

## Decision

**We will keep the workflows as plain, engine-agnostic functions over ports, and add one thin
`WorkflowQueue` port with a Redis-backed adapter (BullMQ as the default) in production and an
in-memory adapter in tests. The governor is the *only* component that decides delay; the queue is
not configured with a second rate limiter, and a denied or throttled call is re-enqueued with the
governor's `Retry-After` rather than retried by the queue.**

Concretely:

- **The engine is a boundary, like every other dependency.** A `WorkflowQueue` port exposes
  `enqueue(unit, payload, options)` and `schedule(unit, payload, runAt)`. The workflow functions
  do not import BullMQ; they receive their dependencies (including the queue, when a unit
  re-enqueues itself) through the same context they already use.
- **One unit type per existing workflow.** `order.import`, `listing.import`, `stock.push`, and the
  M4 units `reconcile.orders`, `reconcile.stock`. Mapping a unit to its function is a single table
  in one place, so adding a unit is a visible edit.
- **The governor decides delay, the queue only carries it.** A `CHANNEL_RATE_LIMITED` result
  re-enqueues the unit with `runAt = now + retryAfter` derived from the governor's decision, and
  the idempotency record stays `in_progress` (its lease is what makes a mid-flight crash
  recoverable) rather than being marked failed. BullMQ's `limiter`/`backoff` options are left
  unset — using them would put a second, per-queue budget beside the shared per-app-key one.
- **Idempotency already makes at-least-once safe.** The engine's delivery guarantee is
  at-least-once, which is fine precisely because every outbound write is idempotent (ADR 0002) and
  the claim is now a reclaimable lease (M3). The engine does not need exactly-once.
- **Compensation stays in the workflow, not the engine.** ADR 0002 requires workflows to declare
  compensation for each state-mutating step; M3's `compensate()` already implements this for order
  import. We do not adopt a framework's saga/try-catch orchestration for M4; the engine runs one
  unit to completion or the unit compensates itself.
- **Persistence is the same seam as sync state.** Durable sync state (storing the idempotency
  records, refs, cursors in Postgres behind the existing interface) lands as part of M4 too;
  an engine that survives restart while its idempotency records do not would be a false comfort.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Temporal | Owns retries, compensation, timers and orchestration inside the framework, so the workflow logic must be written against its SDK. That re-couples the workflows to a vendor and discards the plain-function port design the tests are built on. Operationally heavy (its own server + persistence) for a platform whose workflows are single short steps, not long-running sagas. |
| Inngest | Same coupling problem as Temporal; adds a hosted control plane dependency. Also duplicates the retry/backoff question we have already answered with the governor. |
| BullMQ as the orchestrator (not just the queue) | Would put retry policy and flow orchestration in job graphs, competing with the governor's delay decision and burying compensation in queue config rather than in the workflow's tested `compensate()`. |
| Keep `setTimeout` / in-process intervals | Explicitly rejected by ADR 0002 and AGENTS.md §2.5: no restart survival, no distributed locking, duplicates across replicas. |
| Use BullMQ's built-in rate limiter instead of the governor | The governor is not just a rate limiter: it holds a budget **per app key across every tenant** and a per-seller fairness budget, and it records channel-wide `Retry-After` cooldowns. BullMQ's limiter is per-queue, per-process. Running both means the app-key budget is enforced twice and inconsistently, and the cooldown is invisible to the queue. |
| A bespoke Redis queue (lists + ZSET) | Reinvents delay scheduling, visibility timeouts, and stalled-job recovery that BullMQ already tests. Not worth the lines saved. |

## Consequences

**What becomes easier:**

- The workflows, the governor and the sync state stay testable without Redis: an in-memory queue
  adapter runs the same unit functions in tests.
- Only one component decides delay (`RateLimitGovernor`), so the app-key budget has a single source
  of truth and the `Retry-After` cooldown actually affects dispatch.
- Swapping the queue (BullMQ today, something else later) is an adapter change, not a workflow
  rewrite — the same shape as the sync-state store and the Medusa transport.

**What becomes harder / technical debt we accept:**

- **We own the orchestration glue.** BullMQ gives us durable, delayed, retried jobs but not saga
  semantics; compensation is our code. That is the deliberate trade for keeping the workflows
  engine-agnostic, and it is already how M3's order-import compensation works.
- **One more moving part and one more operational concern** (Redis for the queue in addition to
  Redis for the engine). The queue and the governor's future Redis-backed state should share one
  Redis, not two.
- **`WorkflowQueue` is a new shared port**, so it belongs in `packages/contracts` or a small
  `packages/workflow-queue`; where it lands is an implementation detail this ADR does not fix.
- **A delayed job and an in-flight claim can both exist** for the same key while the lease is
  alive. The lease (not the queue) is what prevents a double effect, so the two must be tuned
  together: a retry delay longer than the lease TTL lets a second attempt start while the first is
  still alive — safe only because the write is idempotent.

**How we would reverse this later:** if a channel needed genuine long-running, multi-step sagas
with human approval steps, Temporal's durable execution would earn its weight and this decision
should be revisited. The port boundary is what makes that reversal contained: replacing the queue
adapter and the unit table, not the workflows.
