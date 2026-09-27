/**
 * Tenant schema administration.
 *
 * Physically creates and destroys the Postgres schema that holds one tenant's vanilla Medusa
 * instance (ADR 0001). This is control-plane-only work: the integration plane and worker ask
 * `tenant-client` for a connection and never issue DDL.
 */

import { Pool } from "pg";
import { PlatformError } from "@platform/contracts";
import { assertSafeSchemaName } from "@platform/tenant-client";
import type { TenantId } from "@platform/contracts";

export interface TenantSchemaAdmin {
  createSchema(schemaName: string): Promise<void>;
  /** True when the schema already exists. Used to make provisioning resumable. */
  schemaExists(schemaName: string): Promise<boolean>;
  dropSchema(schemaName: string): Promise<void>;
  /**
   * Records that a tenant's data is pending deletion. Termination revokes credentials and
   * schedules deletion; it does not drop data inline, because that must survive an operator
   * mistake being noticed a little too late (docs/PLAN.md M1).
   */
  scheduleDeletion(tenantId: TenantId, schemaName: string, scheduledAt: string): Promise<void>;
  listScheduledDeletions(): Promise<readonly DeletionSchedule[]>;
}

export interface DeletionSchedule {
  readonly tenantId: TenantId;
  readonly schemaName: string;
  readonly scheduledAt: string;
}

/**
 * Real Postgres implementation.
 *
 * Deletion schedules live in the platform's own `platform_ops` schema, not in any tenant schema,
 * so they survive the tenant schema being dropped.
 */
export class PostgresTenantSchemaAdmin implements TenantSchemaAdmin {
  readonly #pool: Pool;

  constructor(connectionString: string) {
    this.#pool = new Pool({ connectionString, max: 4 });
  }

  async createSchema(schemaName: string): Promise<void> {
    assertSafeSchemaName(schemaName);
    // Idempotent by construction: a resumed provisioning run may call this again.
    await this.#pool.query(`create schema if not exists ${schemaName}`);
  }

  async schemaExists(schemaName: string): Promise<boolean> {
    assertSafeSchemaName(schemaName);
    const result = await this.#pool.query(
      "select 1 as present from information_schema.schemata where schema_name = $1",
      [schemaName]
    );
    return result.rowCount === 1;
  }

  async dropSchema(schemaName: string): Promise<void> {
    assertSafeSchemaName(schemaName);
    await this.#pool.query(`drop schema if exists ${schemaName} cascade`);
  }

  async scheduleDeletion(
    tenantId: TenantId,
    schemaName: string,
    scheduledAt: string
  ): Promise<void> {
    assertSafeSchemaName(schemaName);
    await this.#pool.query("create schema if not exists platform_ops");
    await this.#pool.query(
      `create table if not exists platform_ops.tenant_deletions (
         tenant_id text primary key,
         schema_name text not null,
         scheduled_at timestamptz not null,
         purged_at timestamptz
       )`
    );
    await this.#pool.query(
      `insert into platform_ops.tenant_deletions (tenant_id, schema_name, scheduled_at)
       values ($1, $2, $3)
       on conflict (tenant_id) do update set schema_name = excluded.schema_name`,
      [tenantId, schemaName, scheduledAt]
    );
  }

  async listScheduledDeletions(): Promise<readonly DeletionSchedule[]> {
    await this.#pool.query("create schema if not exists platform_ops");
    await this.#pool.query(
      `create table if not exists platform_ops.tenant_deletions (
         tenant_id text primary key,
         schema_name text not null,
         scheduled_at timestamptz not null,
         purged_at timestamptz
       )`
    );
    const result = await this.#pool.query<{ tenant_id: string; schema_name: string; scheduled_at: Date }>(
      "select tenant_id, schema_name, scheduled_at from platform_ops.tenant_deletions where purged_at is null order by scheduled_at"
    );
    return result.rows.map((row) => ({
      tenantId: row.tenant_id,
      schemaName: row.schema_name,
      scheduledAt: row.scheduled_at.toISOString()
    }));
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

/** In-memory implementation for unit tests and local development. */
export class InMemoryTenantSchemaAdmin implements TenantSchemaAdmin {
  readonly schemas = new Set<string>();
  readonly deletions: DeletionSchedule[] = [];

  async createSchema(schemaName: string): Promise<void> {
    assertSafeSchemaName(schemaName);
    this.schemas.add(schemaName);
  }

  async schemaExists(schemaName: string): Promise<boolean> {
    assertSafeSchemaName(schemaName);
    return this.schemas.has(schemaName);
  }

  async dropSchema(schemaName: string): Promise<void> {
    assertSafeSchemaName(schemaName);
    this.schemas.delete(schemaName);
  }

  async scheduleDeletion(
    tenantId: TenantId,
    schemaName: string,
    scheduledAt: string
  ): Promise<void> {
    if (this.deletions.some((entry) => entry.tenantId === tenantId)) return;
    this.deletions.push({ tenantId, schemaName, scheduledAt });
  }

  async listScheduledDeletions(): Promise<readonly DeletionSchedule[]> {
    return [...this.deletions];
  }
}

export function assertSchemaAdminInput(schemaName: string): void {
  try {
    assertSafeSchemaName(schemaName);
  } catch (error) {
    throw new PlatformError("VALIDATION_FAILED", "Invalid schema name for schema administration.", {
      details: { schemaName },
      cause: error
    });
  }
}
