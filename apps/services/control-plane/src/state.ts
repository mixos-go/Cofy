/**
 * Tenant lifecycle state machine.
 *
 * The allowed transitions are written out rather than computed, because each one is a product
 * decision and the reason belongs next to the rule:
 *
 * - A tenant that failed to provision goes back to `provisioning` by re-running the orchestrator,
 *   not by a transition. There is no `failed` state: a half-provisioned tenant is retried rather
 *   than parked. See `docs/PLAN.md` M1.
 * - `terminated` is terminal. Data deletion is scheduled, not reversed.
 * - Reactivation from `suspended` is allowed but always explicit, so a suspended tenant never
 *   silently starts serving again after a restart.
 */

import { PlatformError } from "@platform/contracts";
import type { TenantLifecycleState } from "@platform/contracts";

const ALLOWED_TRANSITIONS: Readonly<Record<TenantLifecycleState, readonly TenantLifecycleState[]>> = {
  provisioning: ["active", "terminated"],
  active: ["suspended", "terminated"],
  suspended: ["active", "terminated"],
  terminated: []
};

export function canTransitionTenant(from: TenantLifecycleState, to: TenantLifecycleState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTenantTransition(from: TenantLifecycleState, to: TenantLifecycleState): void {
  if (canTransitionTenant(from, to)) return;
  throw new PlatformError(
    "TENANT_STATE_INVALID",
    `Cannot move a tenant from '${from}' to '${to}'.`,
    { details: { from, to, allowed: ALLOWED_TRANSITIONS[from] } }
  );
}

/** True when a tenant in this state is expected to serve data requests (ADR 0001). */
export function isServableState(state: TenantLifecycleState): boolean {
  return state === "active";
}

export function allowedTransitionsFrom(state: TenantLifecycleState): readonly TenantLifecycleState[] {
  return ALLOWED_TRANSITIONS[state];
}
