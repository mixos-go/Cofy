# ADR 0011 — Keeping vanilla Medusa per-tenant schemas correct without forking

- **Status:** Accepted
- **Date:** 2026-09-28 (amended 2026-09-28 with Defect 3, the TLS one)
- **Deciders:** Cofy platform team

## Context

ADR 0001 chose instance/schema-per-tenant with **vanilla Medusa**. M1 proved our own queries stay
inside a schema, but it did not prove that *Medusa's own migrations* land there. Running the real
CLI (`medusa db:migrate`, Medusa 2.21.1) against a fresh schema exposed two defects. Both are in
Medusa's own code, and neither may be fixed by patching `node_modules` (AGENTS.md §2.1).

**Defect 1 — core tables land in `public`.** With `projectConfig.databaseSchema = <tenant>` set,
only 23 module tables landed in the tenant schema; 125 core tables (product, order, cart,
customer, …) landed in `public`. Tracing the config path:

- Medusa's `loadDatabaseConfig` builds a structured connection object from `DATABASE_URL` and
  passes `databaseSchema` only to the **shared** connection. Per-module connections keep their own
  default, which is `public`.
- MikroORM derives the schema it emits as `SET search_path TO ...` from `clientUrl`'s `?schema=`
  query parameter. Because the config hands it a structured object, there is no `clientUrl`, so
  `searchPath` is null for every non-shared connection.
- Knex applies `set search_path to "<schema>"` only when its own `searchPath` is set, and Medusa
  never sets it from `databaseSchema`.

Net effect: `DATABASE_SCHEMA` is read, but the value never reaches the connection that runs the
DDL. Two tenants would share `public` — a silent isolation break, not a visible error.

**Defect 2 — the second tenant's migration fails on enum types.** Medusa's order migrations create
enum types behind a guard that reads `pg_type` with **no namespace filter**:

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status_enum') THEN
    CREATE TYPE return_status_enum AS ENUM ('requested', ...);
  END IF;
END $$;
```

`pg_type` is database-global and `typname` is not schema-qualified, so the guard is satisfied by
*any* schema that already holds the type. The first tenant creates them; for the second tenant the
guard is true, `CREATE TYPE` is skipped, and the following
`CREATE TABLE ... "status" return_status_enum` fails with `type "return_status_enum" does not
exist`. Three types are affected (`return_status_enum`, `order_claim_type_enum`,
`claim_reason_enum`); a fourth, `order_status_enum`, is safe only because its migration drops and
recreates it unconditionally. A fourth guard pattern (`CREATE TYPE` with no guard) would fail
differently, so this is a property to re-check on every Medusa upgrade.

**Defect 3 — a TLS-required managed Postgres is refused, even when the URL asks for TLS.** Medusa's
`createPgConnection` always sets `connection.ssl`, defaulting to `false` when the config does not
supply one:

```js
const ssl = options.driverOptions?.ssl ?? options.driverOptions?.connection?.ssl ?? false;
```

Because that value is set explicitly, node-postgres never falls back to the URL's `sslmode`, so
`DATABASE_URL=...?sslmode=require` still connects unencrypted and a managed instance whose `pg_hba`
requires TLS refuses it (`no pg_hba.conf entry ... no encryption`). A local Postgres accepts
unencrypted connections, so this is invisible during development and first appears when tenants are
provisioned against a real managed database.

## Decision

**We will keep Medusa vanilla and make the tenant schema correct from outside it, in three places.**

1. **Pin the schema at the driver, in `medusa-config`.** Set
   `projectConfig.databaseDriverOptions = { searchPath: process.env.DATABASE_SCHEMA }`. `searchPath`
   is the option knex actually honours (`set search_path to "<schema>"`), so it reaches every
   module connection, not just the shared one. `databaseSchema` is kept as well, because it is what
   Medusa reads for its shared connection.

2. **Pre-create the `pg_type`-guarded enums per tenant, in the control plane.** `createSchema`
   creates `return_status_enum`, `order_claim_type_enum` and `claim_reason_enum` inside the new
   schema, with values pinned to `@medusajs/order` 2.21.1, before Medusa's migration runs. The
   guard then finds a type in the *same* schema, and the migration's `CREATE TYPE` is a correct
   no-op. Creation is transactional and idempotent (`duplicate_object` is swallowed), matching the
   resumability contract every provisioning step already has.

The enum list and its values are version-pinned data, not a derivation. `createSchema` carries a
comment saying so; a Medusa upgrade that adds or changes a guarded enum must update the list.

3. **Translate the URL's `sslmode` into the driver's `connection.ssl`, in `medusa-config`.** A small
   `databaseSslOptions(url)` reads `sslmode` from `DATABASE_URL` and returns the driver value Medusa
   would otherwise drop: `false` for a plain URL, `{ rejectUnauthorized: false }` for `no-verify`,
   and `{ rejectUnauthorized: true }` (with `ca` from `sslrootcert` when given) for `require`. The
   URL stays the single source of truth, and the control plane's own `pg` pools read the same
   parameter natively, so one variable configures both. `no-verify` is documented as the escape
   hatch for a provider whose CA Node does not already trust.

## Rejected alternatives

| Alternative | Why rejected |
|---|---|
| Fork Medusa and add `typtype`/namespace filters to the guards | Directly violates AGENTS.md §2.1 and ADR 0001. Every upgrade becomes a merge project, which is the cost ADR 0001 exists to avoid. |
| Patch `node_modules` after install (a `postinstall` codemod) | A silent fork in disguise: the patch is invisible to reviewers, and a version bump reapplies it against changed code. |
| Create the enums once in a shared schema and add it to every tenant's `search_path` | Couples tenants through a shared namespace, so one tenant's type change affects others, and it weakens the isolation ADR 0001 promises. It also reintroduces the same class of cross-schema shadowing for tables, not just types. |
| Put `?schema=<tenant>` on `clientUrl` instead of `searchPath` | Medusa builds the connection object itself from `DATABASE_URL`; there is no supported hook to inject a `clientUrl` per module, so this depends on an internal shape that changes between releases. `searchPath` is the documented driver option. |
| Pre-create enums by replaying the migration SQL we extract from `@medusajs/order` | Couples us to Medusa's internal file layout and SQL text, and breaks the moment a migration is renamed or reordered. The three type names and values are a small, stable surface; the file layout is not. |
| Run migrations into `public`, then move tables into the tenant schema | Moving tables does not move enum types, defaults, or dependent objects reliably, and it is far more fragile than either fix above. |
| Rely on `sslmode` in the URL alone for TLS | Empirically fails: Medusa's `createPgConnection` sets `connection.ssl` explicitly, so the URL's `sslmode` is ignored and the migration is refused by a TLS-required server. Verified by running the real CLI against a `hostssl`-only Postgres. |
| Terminate TLS in a sidecar/proxy so Medusa connects unencrypted | Adds a hop and a moving part to every tenant's data path to avoid a three-line config change, and it hides the encryption boundary from the code that owns the connection. |
| Set `NODE_TLS_REJECT_UNAUTHORIZED=0` process-wide for `no-verify` | Disables certificate verification for *all* outbound TLS — including marketplace HTTPS — not just the database. The per-connection `ssl` option scopes it to one socket. |

## Consequences

**What becomes easier:**

- Medusa stays vanilla and upgradeable; all three fixes live in configuration and control-plane code
  we own and test.
- `medusa-config` is now the single place that pins a tenant schema and translates `sslmode`, so the
  CLI path and any in-process path cannot diverge, and one `DATABASE_URL` configures Medusa and our
  own pools.
- The failure modes of Defects 1–2 are covered by a real-CLI integration test, so a Medusa upgrade
  that reintroduces them fails CI rather than a tenant's onboarding. Defect 1 and Defect 3 are also
  locally reproducible — the test suite is able to run against a TLS-required Postgres.

**What becomes harder / technical debt we accept:**

- `MEDUSA_GUARDED_ENUMS` duplicates type definitions that live in Medusa's migrations. They can
  drift on upgrade; the comment and the integration test are the only guards.
- `medusa-config.ts` cannot be loaded by the CLI directly: the CLI resolves `medusa-config` through
  a CommonJS `require`, which cannot load a `.ts` file. A thin `medusa-config.js` ESM shim imports
  the `.ts` source so there is one source of truth; the shim must be kept in step if the config
  module is renamed.
- We depend on `databaseDriverOptions.searchPath` remaining an honoured MikroORM/knex option. It is
  a documented Medusa config field, but it is not a stability guarantee; the integration test is
  what catches a change.
- `databaseSslOptions` mirrors node-postgres semantics rather than libpq's: `require` verifies the
  chain and needs the provider CA installed or passed via `sslrootcert`. A provider that expects
  libpq's weaker `require` (encrypt, do not verify) needs `sslmode=no-verify` instead. The mapping
  is a small, tested function; a provider whose URL uses a non-standard parameter is not covered.

**How we would reverse this later:** if Medusa fixes any defect upstream, the corresponding
workaround can be deleted — the `searchPath` line, the `connection.ssl` translation, or the enum
pre-creation and its constant — once the integration test still passes without it.
