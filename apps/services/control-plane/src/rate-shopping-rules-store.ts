/**
 * Tenant rate-shopping rules storage (docs/adr/0020).
 *
 * ADR 0020 puts these rules with the control plane's tenant record rather than in the tenant data
 * plane: they are platform config about *how the seller ships*, not commerce data. The registry
 * database already holds platform bookkeeping, so this is one more small table there — never a
 * column on a Medusa core table (AGENTS.md §2.2).
 *
 * The interface is deliberately two methods, not a query builder, so the in-memory and Postgres
 * adapters cannot drift in behaviour (the same rule `TenantStore` follows). `get` answers the
 * default when a tenant has never saved rules, so no caller has to distinguish "unset" from "no
 * constraints".
 */

import { defaultRateShoppingRules } from "@platform/contracts";
import type {
  RateShoppingRules,
  RateShoppingRulesStore,
  TenantRateShoppingRules,
  TenantId
} from "@platform/contracts";
import { Pool } from "pg";
import { assertSafePlatformSchema, DEFAULT_PLATFORM_SCHEMA } from "./platform-schema.ts";

/**
 * In-memory rules registry. Used by unit tests and by local development; the Postgres adapter
 * behind the same interface is the real one.
 */
export class InMemoryRateShoppingRulesStore implements RateShoppingRulesStore {
  readonly #rules = new Map<TenantId, { readonly rules: RateShoppingRules; readonly updatedAt: string }>();

  async get(tenantId: TenantId): Promise<TenantRateShoppingRules> {
    const stored = this.#rules.get(tenantId);
    return {
      tenantId,
      rules: stored?.rules ?? defaultRateShoppingRules(),
      updatedAt: stored?.updatedAt ?? new Date(0).toISOString()
    };
  }

  async set(input: {
    readonly tenantId: TenantId;
    readonly rules: RateShoppingRules;
    readonly now: string;
  }): Promise<TenantRateShoppingRules> {
    this.#rules.set(input.tenantId, { rules: input.rules, updatedAt: input.now });
    return { tenantId: input.tenantId, rules: input.rules, updatedAt: input.now };
  }

  async delete(tenantId: TenantId): Promise<void> {
    this.#rules.delete(tenantId);
  }
}

export interface PostgresRateShoppingRulesStoreOptions {
  /** Schema the platform bookkeeping tables live in. Defaults to `platform_ops`. */
  readonly schema?: string;
}

/**
 * Postgres-backed rules store.
 *
 * The rules are stored as `jsonb`: they are a small, self-describing document that is read whole
 * and written whole, never queried field-by-field, so normalising them into columns would add
 * migration surface for no query benefit. The row is upserted per tenant, which is exactly the
 * "one set of rules per tenant" the contract promises.
 */
export class PostgresRateShoppingRulesStore implements RateShoppingRulesStore {
  readonly #pool: Pool;
  readonly #schema: string;
  #schemaReady: Promise<void> | null = null;

  constructor(connectionString: string, options: PostgresRateShoppingRulesStoreOptions = {}) {
    const schema = options.schema ?? DEFAULT_PLATFORM_SCHEMA;
    // Rejects anything that is not a bare identifier before it reaches an interpolated DDL string.
    assertSafePlatformSchema(schema);
    this.#schema = schema;
    this.#pool = new Pool({ connectionString, max: 2 });
  }

  #ensureSchema(): Promise<void> {
    this.#schemaReady ??= (async () => {
      const s = this.#schema;
      await this.#pool.query(`create schema if not exists ${s}`);
      await this.#pool.query(
        `create table if not exists ${s}.tenant_rate_shopping_rules (
           tenant_id text primary key,
           rules jsonb not null,
           updated_at timestamptz not null
         )`
      );
    })();
    return this.#schemaReady;
  }

  async get(tenantId: TenantId): Promise<TenantRateShoppingRules> {
    await this.#ensureSchema();
    const result = await this.#pool.query<{ rules: RateShoppingRules; updated_at: Date }>(
      `select rules, updated_at from ${this.#schema}.tenant_rate_shopping_rules where tenant_id = $1`,
      [tenantId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      return { tenantId, rules: defaultRateShoppingRules(), updatedAt: new Date(0).toISOString() };
    }
    return { tenantId, rules: row.rules, updatedAt: row.updated_at.toISOString() };
  }

  async set(input: {
    readonly tenantId: TenantId;
    readonly rules: RateShoppingRules;
    readonly now: string;
  }): Promise<TenantRateShoppingRules> {
    await this.#ensureSchema();
    await this.#pool.query(
      `insert into ${this.#schema}.tenant_rate_shopping_rules (tenant_id, rules, updated_at)
       values ($1, $2, $3)
       on conflict (tenant_id) do update set rules = excluded.rules, updated_at = excluded.updated_at`,
      [input.tenantId, JSON.stringify(input.rules), input.now]
    );
    return { tenantId: input.tenantId, rules: input.rules, updatedAt: input.now };
  }

  async delete(tenantId: TenantId): Promise<void> {
    await this.#ensureSchema();
    await this.#pool.query(
      `delete from ${this.#schema}.tenant_rate_shopping_rules where tenant_id = $1`,
      [tenantId]
    );
  }

  /** Release the pool. Called on shutdown and by a test after its assertions. */
  async close(): Promise<void> {
    await this.#pool.end();
  }
}
