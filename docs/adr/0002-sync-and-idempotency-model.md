# ADR 0002 — Sync model: idempotent, queue-driven, with reconciliation as the source of truth

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

Omnichannel sync is unreliable by nature, and this is the single largest source of bugs in an
OMS/WMS platform:

- Marketplace webhooks are **at-least-once**: the same order can arrive twice, or not at all.
- Network calls to marketplaces fail, time out, or succeed without us receiving the response.
- Marketplaces rate-limit aggressively per app key, so work must be spread over time.
- Stock is shared across channels: an oversell is a customer-facing failure, and an unnecessary
  stock-out is a revenue loss.

The naive approach — "on webhook, call the marketplace API and update stock" — fails because it
is non-idempotent, unbounded, and has no recovery path when a step dies mid-way.

## Decision

**We will treat reconciliation as the source of truth and webhooks as an optimization.** All
outbound writes are idempotent; all sync work runs through the Redis workflow engine.

Concretely:

- **Webhooks only enqueue.** A webhook handler verifies the signature, writes a raw event row,
  and returns `200`. No outbound calls inside a handler.
- **Every outbound write is idempotent.** An idempotency key (derived from
  `tenant_id + channel + entity + external_id + operation`) is persisted *before* the request is
  sent. A retry with the same key is a no-op.
- **Every inbound external entity has a unique constraint** on `(tenant_id, channel,
  external_order_id)`. Duplicate delivery becomes a constraint violation, not a duplicate order.
- **All sync runs as workflows on the Redis workflow engine**, never as `setTimeout` or
  in-process cron. Workflows must declare compensation for each step that mutates state.
- **A periodic reconciliation job runs regardless of webhook health.** It pulls orders and stock
  snapshots by cursor and repairs drift. If webhooks were perfect, reconciliation would find
  nothing; it exists precisely because they are not.
- **Rate limiting is centralized in a shared governor.** Connectors report `Retry-After` and
  rate-limit errors; the governor decides when work is dispatched.
- **The sync SLO is declared, not implied.** A stock change reaches a channel within
  `CHANNEL_SYNC_SLO_SECONDS` (300s, `packages/contracts`). Because the pull path is the source of
  truth, freshness is bounded by the reconciliation cadence, so the worker refuses to start on a
  cadence longer than the SLO (`cadenceMeetsSyncSlo`). A deployment that needs a longer cadence must
  revisit the SLO rather than quietly exceed it.

Order of authority when sources disagree: **reconciliation pull > webhook > local cache.**

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Webhook-driven, no reconciliation | Silently drifts whenever a webhook is dropped. Drift is discovered by customers, not by us. |
| Best-effort outbound calls with retry-in-memory | A process restart loses all pending work. No recovery path. |
| Optimistic stock decrement without reservation | Oversells under concurrent orders across channels. |
| Per-connector rate limiters | Each connector would reinvent scheduling, and we could not enforce a global budget per app key. |
| In-process cron for sync | Does not survive restarts, no distributed locking, duplicates work across replicas. |

## Consequences

**What becomes easier:**

- A dropped webhook or a crashed worker is a non-event: reconciliation repairs it.
- Retries are safe by construction, so we can retry aggressively without fear of double effects.
- Rate-limit budgets are enforceable globally, per app key and per seller.
- Debugging is tractable: every outbound operation has a persisted idempotency record.

**What becomes harder / technical debt we accept:**

- **More moving parts**: queue, workflow engine, reconciliation scheduler, idempotency store.
- **Latency**: sync is eventually consistent. We must be explicit with sellers that stock
  propagation is not instantaneous, and we need an SLO for it. *Resolved:* the SLO is declared
  (`CHANNEL_SYNC_SLO_SECONDS`) and enforced against the cadence at worker startup, and
  `apps/services/worker/test/stock-sync-slo.test.ts` asserts a change reaches the channel within it.
  What remains a measurement rather than a guarantee is the duration of a single pass, which the
  governor's per-call limits bound and production observes.
- **Storage grows**: raw webhook events and idempotency records need retention policies.
- **Reconciliation costs API quota**, which competes with real-time operations. Cursor design and
  backoff must be deliberate.

**How we would reverse/revisit this:**

If a marketplace offers a genuinely reliable, ordered, exactly-once event stream with replay, we
could reduce reconciliation frequency for that channel — but we would keep the idempotency layer
and unique constraints regardless, since they are what make the system safe under failure.
