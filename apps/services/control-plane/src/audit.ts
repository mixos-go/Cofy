/**
 * The audit trail for acts that are not a seller's own (docs/PLAN.md M5, ADR 0019).
 *
 * Impersonation is the one place where a person acts inside a tenant that is not theirs. A log line
 * would make that visible to whoever is watching the logs at the time; it would not let a reviewer
 * answer "who looked at this tenant, when, and until when" afterwards. So the record is data with a
 * read surface, and the structured log line is a second copy rather than the only one.
 *
 * The store is deliberately append-only and has no update or delete. An audit trail that the code
 * can rewrite is not an audit trail.
 */

import { randomUUID } from "node:crypto";
import type { TenantId, UserId } from "@platform/contracts";

export interface ImpersonationAuditRecord {
  readonly id: string;
  /** The operator who acted. A person, never a tenant. */
  readonly actorAccountId: UserId;
  readonly actorEmail: string;
  /** The tenant that was looked at. */
  readonly tenantId: TenantId;
  readonly startedAt: string;
  /** When the session this record describes stops working. Bounded by construction. */
  readonly expiresAt: string;
}

export interface AuditLog {
  recordImpersonation(input: {
    readonly actorAccountId: UserId;
    readonly actorEmail: string;
    readonly tenantId: TenantId;
    readonly startedAt: string;
    readonly expiresAt: string;
  }): Promise<ImpersonationAuditRecord>;
  listImpersonations(options?: { readonly tenantId?: TenantId }): Promise<readonly ImpersonationAuditRecord[]>;
}

export class InMemoryAuditLog implements AuditLog {
  readonly #records: ImpersonationAuditRecord[] = [];

  async recordImpersonation(input: {
    readonly actorAccountId: UserId;
    readonly actorEmail: string;
    readonly tenantId: TenantId;
    readonly startedAt: string;
    readonly expiresAt: string;
  }): Promise<ImpersonationAuditRecord> {
    const record: ImpersonationAuditRecord = {
      id: randomUUID(),
      actorAccountId: input.actorAccountId,
      actorEmail: input.actorEmail,
      tenantId: input.tenantId,
      startedAt: input.startedAt,
      expiresAt: input.expiresAt
    };
    this.#records.push(record);
    return record;
  }

  async listImpersonations(options?: {
    readonly tenantId?: TenantId;
  }): Promise<readonly ImpersonationAuditRecord[]> {
    const all = [...this.#records];
    if (options?.tenantId === undefined) return all;
    return all.filter((record) => record.tenantId === options.tenantId);
  }
}
