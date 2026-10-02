# ADR 0019 — Operator impersonation is a time-boxed, read-only session, and it is recorded before it is usable

- **Status:** Accepted
- **Date:** 2026-09-26
- **Deciders:** Cofy platform team

## Context

M5 promises an internal operator console with "support impersonation (audited and time-boxed)"
(`docs/PLAN.md`). Support has to be able to see what a seller sees — an order that will not import, a
channel that shows connected but syncs nothing — and the alternative to looking is asking the seller
to read fields back over a chat, which is slower and gets the details wrong.

Impersonation is also the one feature where a person acts inside a tenant that is not theirs. That
makes four questions architectural rather than a UI detail, and each is expensive to change once
support has used the feature in anger.

1. **What role does the impersonated session carry?** A session with the seller's own role would let
   support cancel an order, reship it, or move stock. A change made that way has no seller behind it,
   and the tenant's own records would show an action by an account the seller does not recognise.
2. **How does it end?** A session that ends only when someone remembers to end it is not time-boxed.
   A session that never ends is a standing credential to every tenant.
3. **How is it attributable?** "Who looked at this tenant, and when" has to be answerable after the
   fact, by someone who was not watching at the time. A log line is written for whoever is watching
   now; it is not a record a reviewer can query.
4. **What does support actually see?** A privileged operator view of the tenant's data would be a
   second projection to build, secure, and keep in step with the seller's. It would also show support
   fields the seller cannot see, which is a data-minimisation problem, not a feature.

Two constraints from existing decisions bound the answer:

- **ADR 0016 fixed the seller read.** Commerce reads are served by proxying the tenant's own Medusa
  Admin API, and the response is an allowlist. Whatever impersonation returns, it must not widen that
  projection or introduce a second path to tenant data.
- **ADR 0017 fixed the UI shape.** `apps/web/oms-web` is a server-rendered Next.js shell that talks
  only to our APIs, with the session token in an httpOnly cookie. The operator console
  (`apps/web/ops-console`, reserved by ADR 0004) is a separate app for the same reason: operator
  screens must not leak into the seller UI.

## Decision

**We will implement impersonation as a short-lived, read-only session minted by the control plane for
one named tenant, recorded in an append-only audit log before the caller can use it, and exercised
only through the seller's own routes.**

Concretely:

- **The impersonated session is a `seller_viewer`, never the seller's own role.** Support reads; it
  does not write. This is the least-privilege floor, and it is enforced by the role on the session
  rather than by hiding buttons: `authorize` refuses `order:write` and `stock:write` for that role,
  so a write is impossible even if a screen offers one. A support action that writes would need its
  own decision about attribution and channel write-back; this ADR does not make one.
- **The session is time-boxed at 30 minutes** (`DEFAULT_IMPERSONATION_TTL_SECONDS`), far shorter
  than the 12-hour login. Nothing has to revoke it: it runs out. `SessionManager.resolve` drops an
  expired session on access, so a token that has been rejected once does not stay resolvable.
- **`accountId` stays the operator's.** The session acts for the tenant (`tenantId` is the target)
  but is not the tenant's account. A reviewer tracing an action reaches the person who did it, not a
  seller who did not. The session carries an `impersonation` record naming the actor's account and
  email, and `login` always sets it to `null`, so an ordinary session can never be mistaken for one.
- **An impersonated session may not impersonate again.** Chaining would make the trail point at a
  session rather than a person. The check is in `SessionManager.impersonate`, and the operator's own
  account must be an operator and enabled.
- **The audit record is written before the response is returned, and a failure to write fails the
  request.** `POST /v1/ops/impersonate` mints the session, writes the record with the expiry the
  session actually got, then returns. An impersonation that happened but was not recorded is the one
  outcome that must not be possible, so the write is not fire-and-forget and is not a log line only.
  `GET /v1/ops/impersonations` reads the trail back, optionally narrowed by tenant.
- **The console reads the tenant through the seller's own routes, with the impersonation token.**
  `GET /v1/sync/health` and `GET /v1/seller/orders` do not know they are being called by an operator;
  they serve the seller's projection from the seller's tenant. There is no operator-only read of
  tenant commerce data, so there is no second projection to secure.
- **`ops:read` and `ops:impersonate` are capabilities of `operator` alone.** A seller credential
  cannot reach either route, and the tests assert it. This makes the console's guard the same
  `authorize` call every other route uses, not a UI-level check.
- **The UI keeps the two sessions in two cookies.** The operator's session stays in
  `cofy_ops_session` so the console can keep calling `ops:*` routes; the impersonation token lives in
  `cofy_ops_impersonation`, written with the impersonation's own expiry, so the browser drops it when
  the control plane stops honouring it. Every impersonated screen renders a banner naming the tenant
  and the actor and offering the way out, so leaving early is one click from anywhere.
- **The store is append-only.** `AuditLog` has record and list, and no update or delete. An audit
  trail the code can rewrite is not an audit trail.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Give the impersonated session the seller's own role | Support could cancel orders and move stock with no seller behind the change, and the tenant's records would show an account it does not recognise. Least privilege is cheaper than explaining a write that had no owner. |
| A long-lived impersonation that ends only on logout | Not time-boxed. It is a standing credential to every tenant, and the failure mode is silence: nobody notices a session that was never closed. |
| Revocation via a denylist instead of a short TTL | Adds a store to keep correct and a revocation path that must work during an incident, to buy a longer session nobody asked for. The TTL runs out on its own. |
| A log line as the audit record | A log line serves whoever is watching at the time. A reviewer asking "who looked at this tenant last Tuesday" needs a record they can query, and log retention is not an audit policy. |
| A separate operator-only read of tenant commerce data | A second projection to build and secure, showing support fields the seller cannot see. Reading through the seller's routes means one projection, one scoping rule, and no extra data exposure. |
| Impersonation implemented in the UI (swap a token, hide the write buttons) | The guard has to be where the data is, not where the buttons are. The role on the session is enforced by `authorize`; the UI cannot be the thing that stops a write. |
| Allowing an impersonated session to impersonate again | The trail would name a session instead of a person, which defeats the one property the feature exists to provide. |

## Consequences

**What becomes easier:**

- Support can see a seller's actual view without asking the seller to read fields back, and the
  seller's view is the only view, so nothing has to be kept in step.
- "Who looked at this tenant, and when" is a query (`GET /v1/ops/impersonations`), not an archaeology
  exercise over logs.
- The blast radius of a leaked operator credential is bounded twice over: the role is read-only, and
  the session is short.

**What becomes harder / technical debt we accept:**

- **The audit log is in-memory.** It does not survive a restart and is not shared across control
  plane replicas. That is fine while the control plane is a single instance and support is small, but
  it is a real gap: a restart loses the trail. Moving it to a table is the first thing to do when the
  control plane scales out, and the interface is already the seam for it.
- **Support cannot act on what it sees.** A stuck order can be diagnosed but not nudged. That is the
  intended floor, not an oversight; the write path, when it exists, will need its own attribution
  decision.
- **The time-box is fixed.** 30 minutes suits diagnosing a sync problem and is too short for a long
  support session, which will show up as a re-impersonation. Making it configurable is easy; deciding
  who may request a longer one is not, so it is not configurable yet.

**How we would reverse this later:** if support needs to act, the change is a new role (or a
capability set) for the impersonated session plus an audit record that distinguishes read from write.
The session model already carries the actor, so the trail does not change shape. If the control plane
scales out, `AuditLog` moves to Postgres behind the same interface.
