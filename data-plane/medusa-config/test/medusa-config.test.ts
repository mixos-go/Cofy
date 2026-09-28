/**
 * Tenant Medusa config tests.
 *
 * The tenant schema has to reach Medusa's database driver, or core tables land in `public` and
 * two tenants share them. `DATABASE_SCHEMA` alone does not do that: Medusa's `loadDatabaseConfig`
 * passes it to the *shared* connection only, and MikroORM derives the schema it puts on
 * `SET search_path` from `clientUrl`'s `?schema=` parameter, which is absent because the config
 * hands it a structured connection object. The value that actually pins the schema is the
 * knex-level `searchPath` in `databaseDriverOptions`, so that is what is asserted here.
 *
 * The config reads the environment at module load, so each case sets it first and then imports a
 * fresh copy of the module (the query string busts Node's module cache).
 *
 * Verified against the real CLI (Medusa 2.21.1): with this option every core table lands in the
 * tenant schema; without it, 125 of them land in `public`.
 */

import test from "node:test";
import assert from "node:assert/strict";

let importCount = 0;

async function loadConfigWith(env: {
  readonly DATABASE_SCHEMA?: string | undefined;
  readonly DATABASE_URL?: string | undefined;
}) {
  const previousSchema = process.env.DATABASE_SCHEMA;
  const previousUrl = process.env.DATABASE_URL;
  if (env.DATABASE_SCHEMA === undefined) delete process.env.DATABASE_SCHEMA;
  else process.env.DATABASE_SCHEMA = env.DATABASE_SCHEMA;
  if (env.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = env.DATABASE_URL;

  try {
    const loaded = (await import(`../medusa-config.ts?case=${importCount++}`)) as {
      default: {
        projectConfig: {
          databaseDriverOptions?: {
            searchPath?: string;
            connection?: { ssl?: false | { rejectUnauthorized: boolean } };
          };
        };
      };
    };
    return loaded.default.projectConfig;
  } finally {
    if (previousSchema === undefined) delete process.env.DATABASE_SCHEMA;
    else process.env.DATABASE_SCHEMA = previousSchema;
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  }
}

test("the tenant schema is passed to the database driver, not only to projectConfig", async () => {
  const projectConfig = await loadConfigWith({ DATABASE_SCHEMA: "tenant_alpha" });
  assert.equal(projectConfig.databaseDriverOptions?.searchPath, "tenant_alpha");
});

test("no schema means no search_path override, so a non-tenant run keeps Postgres defaults", async () => {
  const projectConfig = await loadConfigWith({ DATABASE_SCHEMA: undefined });
  assert.equal(projectConfig.databaseDriverOptions?.searchPath, undefined);
});

/**
 * SSL: Medusa's `createPgConnection` sets `connection.ssl` explicitly (to `false` by default),
 * which overrides `sslmode` in the connection string. A TLS-required managed Postgres then
 * refuses the migration with `no pg_hba.conf entry ... no encryption`, even when the URL says
 * `sslmode=require`. Verified against the real CLI: with only `?sslmode=no-verify` in the URL the
 * migration fails unencrypted; translating it into `connection.ssl` makes it succeed.
 */
test("a plain URL stays unencrypted, matching a local Postgres", async () => {
  const projectConfig = await loadConfigWith({
    DATABASE_SCHEMA: "tenant_alpha",
    DATABASE_URL: "postgres://user:pw@db.internal:5432/platform"
  });
  assert.equal(projectConfig.databaseDriverOptions?.connection?.ssl, false);
});

test("sslmode=no-verify encrypts without verifying, so a provider CA is not required", async () => {
  const projectConfig = await loadConfigWith({
    DATABASE_SCHEMA: "tenant_alpha",
    DATABASE_URL: "postgres://user:pw@db.internal:5432/platform?sslmode=no-verify"
  });
  assert.deepEqual(projectConfig.databaseDriverOptions?.connection?.ssl, {
    rejectUnauthorized: false
  });
});

test("sslmode=require verifies the certificate chain", async () => {
  const projectConfig = await loadConfigWith({
    DATABASE_SCHEMA: "tenant_alpha",
    DATABASE_URL: "postgres://user:pw@db.internal:5432/platform?sslmode=require"
  });
  assert.deepEqual(projectConfig.databaseDriverOptions?.connection?.ssl, {
    rejectUnauthorized: true
  });
});
