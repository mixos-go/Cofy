import { readFileSync } from "node:fs";
import { defineConfig, Modules } from "@medusajs/framework/utils";

/**
 * Translates the `sslmode` of `DATABASE_URL` into the driver-level `ssl` option.
 *
 * Medusa's `createPgConnection` always sets `connection.ssl` explicitly, defaulting to `false`
 * when the config does not provide one. That overrides `sslmode` in the connection string, so a
 * URL that says `?sslmode=require` still connects unencrypted. A managed Postgres that *requires*
 * TLS then refuses the connection outright (`no pg_hba.conf entry ... no encryption`). The URL is
 * still the single source of truth, so it is read here and translated; the control plane's own
 * `pg` pools read the same parameter natively.
 *
 * `rejectUnauthorized` mirrors node-postgres, not libpq: `require` verifies the chain (so an
 * untrusted certificate needs `sslrootcert` or an explicitly trusted CA), and `no-verify`
 * encrypts without verifying, which is the escape hatch for a provider whose CA is not installed.
 */
export function databaseSslOptions(
  databaseUrl: string | undefined
): false | { rejectUnauthorized: boolean; ca?: string } {
  if (!databaseUrl) {
    return false;
  }

  const params = new URL(databaseUrl).searchParams;
  const mode = (params.get("sslmode") ?? "disable").toLowerCase();
  if (mode === "disable") {
    return false;
  }
  if (mode === "no-verify" || mode === "prefer" || mode === "allow") {
    return { rejectUnauthorized: false };
  }

  const rootCertPath = params.get("sslrootcert");
  if (rootCertPath) {
    return { rejectUnauthorized: true, ca: readFileSync(rootCertPath, "utf8") };
  }
  return { rejectUnauthorized: true };
}

/**
 * Tenant Medusa configuration.
 *
 * This is the engine's own config, loaded by `medusa start` inside a tenant instance. It registers
 * our data-plane modules and nothing else; the engine stays vanilla (ADR 0001, AGENTS.md §2.1).
 *
 * `channel-order-link` is registered with `resolve` + `isQueryable` so that the module link in the
 * module's `src/links/` can join it to the core Order module (ADR 0010).
 */
export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA,
    // `databaseSchema` alone is not enough to keep core tables out of `public`. MikroORM derives a
    // `schema` for `SET search_path` only from `clientUrl`'s `?schema=` query parameter, and Medusa
    // hands it a structured connection object built from DATABASE_URL, so `databaseSchema` never
    // reaches the driver. It is passed to `loadDatabaseConfig` only as the *shared* connection's
    // schema; per-module connections still default to `public`. `searchPath` is what knex actually
    // applies (`set search_path to "<schema>"`), so it is set here explicitly. `connection.ssl` is
    // set for the same class of reason: Medusa's own default would ignore the URL's `sslmode` and
    // connect unencrypted to a TLS-required managed Postgres. See ADR 0011.
    databaseDriverOptions: {
      searchPath: process.env.DATABASE_SCHEMA,
      connection: {
        ssl: databaseSslOptions(process.env.DATABASE_URL)
      }
    },
    http: {
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
      // Medusa requires all three CORS values. A tenant instance is called by the control plane,
      // never by a browser, so they default to empty (allow no origins) rather than to a wildcard.
      authCors: process.env.AUTH_CORS ?? "",
      storeCors: process.env.STORE_CORS ?? "",
      adminCors: process.env.ADMIN_CORS ?? ""
    }
  },
  modules: {
    [Modules.ORDER]: {},
    // Resolved by path, not package name: data-plane workspaces must not declare internal
    // `@platform/*` dependencies (they are compiled into the tenant's Medusa, AGENTS.md §3).
    // The path points at the module entry file explicitly: Medusa's resolver does not treat a
    // bare directory containing `src/` as a package root, so `.../src` would fail to resolve.
    channelOrderLink: {
      resolve: "../modules/channel-order-link/src/index.ts",
      definition: {
        isQueryable: true
      }
    }
  }
});
