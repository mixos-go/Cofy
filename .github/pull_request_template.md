## Milestone

<!-- Which milestone from docs/PLAN.md does this serve? e.g. M0, M3 -->

Milestone:

## What changed

<!-- Brief description. Link the issue if there is one. -->

## Why

<!-- The problem being solved. Not a restatement of the diff. -->

## Verification

<!-- Required. Paste real output, do not just claim success. -->

- [ ] `pnpm check` — result:
- [ ] `pnpm boundaries` — result:
- [ ] If a check could not run, explain why:

## Invariant checklist

- [ ] No fork or patch of Medusa; no core table altered (`AGENTS.md` §2.1, §2.2)
- [ ] All tenant data access goes through `packages/tenant-client` (§2.3)
- [ ] Outbound writes are idempotent, key persisted before send (§2.4)
- [ ] No in-process cron or fire-and-forget for marketplace work (§2.5)
- [ ] No secrets in logs, fixtures, or git (§2.6)
- [ ] Dependency direction respected (§3, enforced by `pnpm boundaries`)

## New dependencies

<!-- Required if any dependency was added. If none, write "none". -->

| Dependency | Why it is needed | Why existing code/deps cannot do it |
|---|---|---|
| | | |

## Scope check

- [ ] This does not build anything listed as a non-goal for the milestone
- [ ] No change to the tenant isolation model, `contracts` event shapes, or CI checkers
      (if any is checked, an approved ADR is linked below)

ADR (if required):

## Notes for the reviewer

<!-- Trade-offs taken, things you are unsure about, follow-up work deferred. -->
