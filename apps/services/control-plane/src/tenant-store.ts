/**
 * Tenant registry storage.
 *
 * The registry is the platform's own database. It holds who tenants are, their lifecycle state,
 * and provisioning progress. It never holds product, order, or stock data — those live in each
 * tenant's data plane (ADR 0001, docs/ARCHITECTURE.md §2).
 *
 * The interface is deliberately a set of small operations rather than a query builder, so the
 * in-memory and Postgres implementations cannot drift in behaviour.
 */

import { PlatformError } from "@platform/contracts";
import type {
  Instant,
  ProvisioningRun,
  ProvisioningStep,
  ProvisioningStepRecord,
  TenantId,
  TenantLifecycleState,
  TenantPlan,
  TenantRecord,
  RegionCode
} from "@platform/contracts";
import { PROVISIONING_STEPS } from "@platform/contracts";

export interface CreateTenantInput {
  readonly id: TenantId;
  readonly slug: string;
  readonly displayName: string;
  readonly plan: TenantPlan;
  readonly region: RegionCode;
  readonly now: Instant;
}

export interface TenantStore {
  createTenant(input: CreateTenantInput): Promise<TenantRecord>;
  getTenant(id: TenantId): Promise<TenantRecord | null>;
  getTenantBySlug(slug: string): Promise<TenantRecord | null>;
  listTenants(): Promise<readonly TenantRecord[]>;
  /** Applies a state change. Callers must have validated the transition already. */
  setTenantState(id: TenantId, state: TenantLifecycleState, now: Instant): Promise<TenantRecord>;

  getProvisioningRun(tenantId: TenantId): Promise<ProvisioningRun>;
  /** Records the outcome of one step attempt. `attempt` is incremented by the store. */
  recordStep(
    tenantId: TenantId,
    step: ProvisioningStep,
    update: {
      readonly status: ProvisioningStepRecord["status"];
      readonly now: Instant;
      readonly errorMessage?: string;
    }
  ): Promise<ProvisioningStepRecord>;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/;

export function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "Slug must be lowercase alphanumeric with dashes, 2-41 characters, and start alphanumeric.",
      { details: { slug } }
    );
  }
}

/**
 * Schema name is derived from the tenant id, never from the slug: renaming a tenant's display
 * slug must never move its data, and two tenants whose slugs collide after normalisation must
 * still live in different schemas.
 */
export function deriveSchemaName(tenantId: TenantId): string {
  const normalised = tenantId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return `tenant_${normalised}`.slice(0, 55);
}

/**
 * In-memory registry. Used by unit tests and by local development.
 *
 * It implements the same lifecycle guarantees as the Postgres store, including "a tenant gets
 * exactly one provisioning run, created with every step pending".
 */
export class InMemoryTenantStore implements TenantStore {
  readonly #tenants = new Map<TenantId, TenantRecord>();
  readonly #slugs = new Map<string, TenantId>();
  readonly #steps = new Map<TenantId, ProvisioningStepRecord[]>();

  async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
    assertValidSlug(input.slug);

    if (this.#slugs.has(input.slug)) {
      throw new PlatformError("CONFLICT", "A tenant with this slug already exists.", {
        details: { slug: input.slug }
      });
    }
    if (this.#tenants.has(input.id)) {
      throw new PlatformError("CONFLICT", "A tenant with this id already exists.", {
        details: { tenantId: input.id }
      });
    }

    const tenant: TenantRecord = {
      id: input.id,
      slug: input.slug,
      displayName: input.displayName,
      state: "provisioning",
      plan: input.plan,
      region: input.region,
      schemaName: deriveSchemaName(input.id),
      createdAt: input.now,
      updatedAt: input.now
    };

    this.#tenants.set(tenant.id, tenant);
    this.#slugs.set(tenant.slug, tenant.id);
    this.#steps.set(
      tenant.id,
      PROVISIONING_STEPS.map((step) => ({
        step,
        status: "pending" as const,
        attempt: 0,
        startedAt: null,
        finishedAt: null,
        errorMessage: null
      }))
    );

    return tenant;
  }

  async getTenant(id: TenantId): Promise<TenantRecord | null> {
    return this.#tenants.get(id) ?? null;
  }

  async getTenantBySlug(slug: string): Promise<TenantRecord | null> {
    const id = this.#slugs.get(slug);
    return id === undefined ? null : (this.#tenants.get(id) ?? null);
  }

  async listTenants(): Promise<readonly TenantRecord[]> {
    return [...this.#tenants.values()];
  }

  async setTenantState(
    id: TenantId,
    state: TenantLifecycleState,
    now: Instant
  ): Promise<TenantRecord> {
    const tenant = this.#tenants.get(id);
    if (tenant === undefined) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId: id } });
    }

    const updated: TenantRecord = { ...tenant, state, updatedAt: now };
    this.#tenants.set(id, updated);
    return updated;
  }

  async getProvisioningRun(tenantId: TenantId): Promise<ProvisioningRun> {
    const steps = this.#steps.get(tenantId);
    if (steps === undefined) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }
    return { tenantId, steps: [...steps], complete: steps.every((s) => s.status === "succeeded") };
  }

  async recordStep(
    tenantId: TenantId,
    step: ProvisioningStep,
    update: {
      readonly status: ProvisioningStepRecord["status"];
      readonly now: Instant;
      readonly errorMessage?: string;
    }
  ): Promise<ProvisioningStepRecord> {
    const steps = this.#steps.get(tenantId);
    if (steps === undefined) {
      throw new PlatformError("TENANT_NOT_FOUND", "No such tenant.", { details: { tenantId } });
    }

    const index = steps.findIndex((s) => s.step === step);
    const previous = steps[index];
    if (index < 0 || previous === undefined) {
      throw new PlatformError("VALIDATION_FAILED", "Unknown provisioning step.", {
        details: { step }
      });
    }

    // `attempt` counts starts, so it only moves when a step begins. Finishing a failed step does
    // not inflate the count, which keeps resume behaviour readable.
    const next: ProvisioningStepRecord = {
      step,
      status: update.status,
      attempt: update.status === "running" ? previous.attempt + 1 : previous.attempt,
      startedAt:
        update.status === "running"
          ? update.now
          : (previous.startedAt ?? (update.status === "succeeded" ? update.now : null)),
      finishedAt:
        update.status === "succeeded" || update.status === "failed"
          ? update.now
          : previous.finishedAt,
      errorMessage: update.status === "failed" ? (update.errorMessage ?? "Step failed.") : null
    };

    steps[index] = next;
    return next;
  }
}
