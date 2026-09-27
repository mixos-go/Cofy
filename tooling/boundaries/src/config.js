/**
 * Boundary configuration.
 *
 * These rules are the machine-enforced form of AGENTS.md §2.1, §2.2, §2.3, §3 and §8.
 * Change them only alongside the document they enforce, and only via an ADR when the
 * document itself must change.
 */

/** Third-party packages that embed the commerce engine. Only the data plane may use them. */
export const MEDUSA_PACKAGE_PREFIXES = ["@medusajs/"];

/** Direct SQL/ORM clients. Tenant data may only be reached through packages/tenant-client. */
export const DB_DRIVER_PACKAGES = new Set([
  "pg",
  "pg-pool",
  "postgres",
  "mysql",
  "mysql2",
  "better-sqlite3",
  "sqlite3",
  "kysely",
  "drizzle-orm",
  "typeorm",
  "@prisma/client",
  "prisma",
  "mongoose",
  "sequelize",
  "mikro-orm"
]);

/**
 * Zones that may import Medusa packages.
 *
 * `data-plane/*` runs inside the tenant's Medusa instance, so it is the intended consumer.
 * Nothing else may embed the engine. Adding an entry here changes the architecture and
 * requires an ADR (AGENTS.md §8 stop-and-ask).
 */
export const MEDUSA_IMPORT_ALLOWED_ZONES = new Set(["data-plane"]);

/**
 * Zones that may import a database driver directly.
 *
 * `control-plane` owns its own registry database (tenants, plans, credential metadata) — that is
 * not tenant data. `tenant-client` is the single permitted path to tenant data.
 */
export const DB_DRIVER_ALLOWED_ZONES = new Set([
  "service:control-plane",
  "package:tenant-client"
]);

/** Default targets for workspaces under packages/ that are not one of the named core packages. */
export const DEFAULT_PACKAGE_TARGETS = ["package:contracts"];

/**
 * Allowed import targets per source zone.
 *
 * A value of `null` means internal imports are forbidden entirely.
 * Patterns ending in `*` are prefix matches.
 */
export const ALLOWED_TARGETS = {
  "package:contracts": null,
  "package:channel-sdk": ["package:contracts"],
  "package:tenant-client": ["package:contracts"],
  "package:secrets": ["package:contracts"],
  "package:*": DEFAULT_PACKAGE_TARGETS,
  "connector:*": ["package:channel-sdk", "package:contracts"],
  "service:*": ["package:*", "connector:*"],
  "web:*": ["package:*"],
  "data-plane": null,
  "tooling:*": ["tooling:*"],
  // Root-level config files (eslint.config.js, and similar) are tooling by nature.
  "other": ["tooling:*"]
};

/**
 * Source zones that must never import from another zone of the same kind.
 *
 * Services talk over HTTP/queue, never by import. Web apps likewise. AGENTS.md §3.
 */
export const NO_SIBLING_IMPORTS = ["service:*", "web:*"];
