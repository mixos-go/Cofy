/**
 * Tenant data access.
 *
 * This package is the **only** permitted path to tenant data (AGENTS.md §2.3). It resolves a
 * `tenant_id` to a connection and hands back a bound query function. Nothing downstream needs to
 * know how tenancy is physically arranged, which is what lets ADR 0001's isolation model change
 * later without touching callers.
 *
 * Isolation is schema-per-tenant inside one Postgres cluster. Each tenant's connection pins
 * `search_path` to that tenant's schema, so an unqualified query cannot reach another tenant.
 */

import { Pool } from "pg";
import { PlatformError } from "@platform/contracts";
import type { TenantId, TenantLifecycleState } from "@platform/contracts";

/**
 * How tenant-client learns where a tenant lives. Implemented by the control plane against its
 * registry; injected here so this package does not depend on how the registry is stored.
 */
export interface TenantDirectory {
  resolve(tenantId: TenantId): Promise<TenantRoute | null>;
}

export interface TenantRoute {
  readonly tenantId: TenantId;
  readonly schemaName: string;
  readonly state: TenantLifecycleState;
}

export interface TenantClientOptions {
  /** Base connection string for the cluster. The schema comes from the route, not from here. */
  readonly connectionString: string;
  readonly directory: TenantDirectory;
  /** Upper bound on pooled connections per tenant. */
  readonly maxConnectionsPerTenant?: number;
  readonly idleTimeoutMs?: number;
}

/** The narrow surface handed to callers, so they cannot reach the pool itself. */
export interface TenantDb {
  readonly tenantId: TenantId;
  readonly schemaName: string;
  query<TRow extends object>(text: string, values?: readonly unknown[]): Promise<readonly TRow[]>;
}

/**
 * Schema names reach SQL as identifiers, which cannot be parameterised. They are derived from the
 * tenant id at provisioning time, but this check is what makes "derived" an invariant rather than
 * an assumption.
 */
const SAFE_SCHEMA_NAME = /^tenant_[a-z0-9_]{1,50}$/;

export function assertSafeSchemaName(schemaName: string): void {
  if (!SAFE_SCHEMA_NAME.test(schemaName)) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "Refusing to use an unsafe schema name. Expected ^tenant_[a-z0-9_]+$.",
      { details: { schemaName } }
    );
  }
}

/**
 * Pools tenant connections and enforces lifecycle rules.
 *
 * Only `active` tenants are reachable. A tenant being provisioned has no schema to read yet, and
 * a suspended or terminated tenant must look gone rather than broken — so both fail closed with a
 * distinguishable error instead of a connection error.
 */
export class TenantClient {
  readonly #directory: TenantDirectory;
  readonly #connectionString: string;
  readonly #maxConnectionsPerTenant: number;
  readonly #idleTimeoutMs: number;
  readonly #pools = new Map<TenantId, Pool>();

  constructor(options: TenantClientOptions) {
    this.#directory = options.directory;
    this.#connectionString = options.connectionString;
    this.#maxConnectionsPerTenant = options.maxConnectionsPerTenant ?? 5;
    this.#idleTimeoutMs = options.idleTimeoutMs ?? 30_000;
  }

  /** Number of live pools. Used by tests and by a per-tenant health readout. */
  get poolCount(): number {
    return this.#pools.size;
  }

  async connect(tenantId: TenantId): Promise<TenantDb> {
    const route = await this.#directory.resolve(tenantId);
    if (route === null) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }

    if (route.state !== "active") {
      throw new PlatformError(
        "TENANT_NOT_ACTIVE",
        `Tenant is '${route.state}' and cannot serve data requests.`,
        { retryable: route.state === "provisioning", details: { tenantId, state: route.state } }
      );
    }

    assertSafeSchemaName(route.schemaName);

    const pool = this.#poolFor(route);
    const schemaName = route.schemaName;

    return {
      tenantId,
      schemaName,
      async query<TRow extends object>(
        text: string,
        values: readonly unknown[] = []
      ): Promise<readonly TRow[]> {
        const result = await pool.query(text, values as unknown[]);
        return result.rows as TRow[];
      }
    };
  }

  /** Runs `fn` with a tenant-bound handle, then leaves the connection pooled. */
  async withTenant<T>(tenantId: TenantId, fn: (db: TenantDb) => Promise<T>): Promise<T> {
    const db = await this.connect(tenantId);
    return fn(db);
  }

  /** Drops a tenant's pool, so a suspended tenant's connections cannot linger. */
  async evict(tenantId: TenantId): Promise<void> {
    const pool = this.#pools.get(tenantId);
    if (pool === undefined) return;
    this.#pools.delete(tenantId);
    await pool.end();
  }

  async closeAll(): Promise<void> {
    const pools = [...this.#pools.values()];
    this.#pools.clear();
    await Promise.all(pools.map((pool) => pool.end()));
  }

  #poolFor(route: TenantRoute): Pool {
    const existing = this.#pools.get(route.tenantId);
    if (existing !== undefined) return existing;

    const pool = new Pool({
      connectionString: this.#connectionString,
      max: this.#maxConnectionsPerTenant,
      idleTimeoutMillis: this.#idleTimeoutMs,
      // Pinning search_path at connection level is the isolation mechanism. Set once here, not
      // per query, so no caller can forget it.
      options: `-c search_path=${route.schemaName}`
    });

    this.#pools.set(route.tenantId, pool);
    return pool;
  }
}
