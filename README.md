# Omnichannel OMS/WMS Platform

A multi-tenant omnichannel Order Management System (OMS) and Warehouse Management System (WMS)
for the Indonesian market. Sellers connect their marketplace shops; we handle order aggregation,
stock synchronization, and fulfillment.

**We are the platform company.** Sellers only perform a "connect shop" action — they never deal
with developer accounts, app keys, or APIs.

## Architecture at a glance

Medusa v2 is the tenant data plane. It is used **vanilla** and is never forked. Our value lives
in the control plane (tenancy, provisioning) and the integration plane (marketplace connectors).

- Tenant isolation: one tenant = one vanilla Medusa instance + one Postgres schema.
- Marketplace apps are platform-owned; sellers only authorize via OAuth.
- Sync is idempotent, queue-driven, and reconciliation is the source of truth.

## Current status

**M0 — Repo foundation & guardrails.** Tooling is live: strict TypeScript across workspaces, a
shared ESLint baseline, and an automated dependency-boundary checker. No business logic yet. See
`docs/PLAN.md` for milestones and the active one.

## Read these first

| Document | Purpose |
|---|---|
| `AGENTS.md` | Working contract and invariants. **Read before writing code.** |
| `docs/ARCHITECTURE.md` | Layer map, responsibilities, key flows. |
| `docs/PLAN.md` | Milestones, exit criteria, non-goals, change control. |
| `docs/adr/` | Accepted architecture decisions and their trade-offs. |

## Development

```bash
pnpm install
pnpm check          # typecheck + lint + test + boundaries
pnpm boundaries     # enforce dependency direction and forbidden imports
pnpm typecheck      # tsc --noEmit across all workspaces
pnpm lint           # eslint
pnpm test           # unit + contract tests
```

Local infrastructure (Postgres, Redis):

```bash
docker compose up -d
docker compose ps          # both services should report (healthy)
```

Copy `.env.example` to `.env` and fill in real values locally. **Never commit `.env`.**

The dependency-boundary checker is the guardrail that keeps the layout from eroding. Its rules
live in `tooling/boundaries/src/config.js`, and its tests in `tooling/boundaries/test/`. If you
change a rule, change the test that covers it in the same commit.

## Repository layout

Directory groups mirror runtime boundaries — see `docs/adr/0004`.

```
apps/
  services/     control-plane, integration-plane, worker   (backend runtimes)
  web/          oms-web, ops-console                       (browser-bundled)
packages/       contracts, channel-sdk, tenant-client, secrets   (stable libraries)
connectors/     one workspace per marketplace channel           (adapters)
data-plane/     Medusa config + custom modules, runs inside each tenant instance
tooling/        boundaries checker, tsconfig, eslint-config
docs/           ARCHITECTURE.md, PLAN.md, adr/
```

## Contributing

1. Read `AGENTS.md` in full.
2. Pick the active milestone in `docs/PLAN.md`. Work on one at a time.
3. Check `docs/adr/` before changing a decided area.
4. Run `pnpm check` before opening a PR. If it cannot run, say so — do not claim it passes.
