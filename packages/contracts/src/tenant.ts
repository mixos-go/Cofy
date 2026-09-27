/**
 * Tenant contracts: who a tenant is, what state it is in, and how provisioning progresses.
 *
 * These are the vocabulary of the control plane. `apps/services/*` and `packages/*` share them;
 * the tenant data plane never sees them (AGENTS.md §3).
 */

import type { Instant, TenantId } from "./ids.ts";

/**
 * Lifecycle states. Transitions are guarded — see `canTransitionTenant` in the control plane.
 *
 * provisioning -> active | terminated      (a failed provision is retried, not parked)
 * active       -> suspended | terminated
 * suspended    -> active | terminated      (reactivation must be deliberate)
 * terminated   -> (terminal)
 */
export const TENANT_LIFECYCLE_STATES = ["provisioning", "active", "suspended", "terminated"] as const;

export type TenantLifecycleState = (typeof TENANT_LIFECYCLE_STATES)[number];

export const TENANT_PLANS = ["starter", "growth", "scale"] as const;

export type TenantPlan = (typeof TENANT_PLANS)[number];

/** Where a tenant's data plane runs. Named after the cloud region, not a datacentre. */
export type RegionCode = "id-jkt" | "sg-sin";

export interface TenantRecord {
  readonly id: TenantId;
  /** Human-readable unique handle. Used in URLs and operator tooling, never as a foreign key. */
  readonly slug: string;
  readonly displayName: string;
  readonly state: TenantLifecycleState;
  readonly plan: TenantPlan;
  readonly region: RegionCode;
  /**
   * Postgres schema holding this tenant's vanilla Medusa instance (ADR 0001). Derived from the
   * tenant id, never from the slug, so a slug rename cannot move data.
   */
  readonly schemaName: string;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/** Operator-facing view including provisioning progress, so a stuck tenant is diagnosable. */
export interface TenantDetail {
  readonly tenant: TenantRecord;
  readonly provisioning: ProvisioningRun;
}

/**
 * Ordered provisioning steps. The order is load-bearing: migrations must run before seeding,
 * and the tenant is marked active last so a half-provisioned tenant is never reachable.
 */
export const PROVISIONING_STEPS = [
  "create_schema",
  "run_medusa_migrations",
  "seed_defaults",
  "register_routes",
  "mark_active"
] as const;

export type ProvisioningStep = (typeof PROVISIONING_STEPS)[number];

export const PROVISIONING_STEP_STATUSES = ["pending", "running", "succeeded", "failed"] as const;

export type ProvisioningStepStatus = (typeof PROVISIONING_STEP_STATUSES)[number];

export interface ProvisioningStepRecord {
  readonly step: ProvisioningStep;
  readonly status: ProvisioningStepStatus;
  /** Incremented on every attempt, so a resumed run shows how many times it was tried. */
  readonly attempt: number;
  readonly startedAt: Instant | null;
  readonly finishedAt: Instant | null;
  /** Present only when `status` is `failed`. Message text, never a stack trace or secret. */
  readonly errorMessage: string | null;
}

export interface ProvisioningRun {
  readonly tenantId: TenantId;
  readonly steps: readonly ProvisioningStepRecord[];
  /** True when every step has succeeded. Derived, but stored views must agree with it. */
  readonly complete: boolean;
}
