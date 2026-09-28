import type { MedusaTarget, MedusaTargetStore, TenantId } from "@platform/contracts";

/**
 * In-memory tenant → Medusa target registry.
 *
 * A real implementation of the contract, used by services and tests; the Postgres-backed adapter
 * lands behind the same interface. Targets hold only a base URL, so unlike a credential this map
 * is safe to inspect in memory — the admin key lives in `MedusaAdminKeyStore` (packages/secrets).
 *
 * `delete` exists so tenant termination removes the target: a terminated tenant's engine must fail
 * to resolve rather than be reachable at a stale host.
 */
export class InMemoryMedusaTargetStore implements MedusaTargetStore {
  readonly #targets = new Map<TenantId, MedusaTarget>();

  async get(tenantId: TenantId): Promise<MedusaTarget | null> {
    return this.#targets.get(tenantId) ?? null;
  }

  async set(target: MedusaTarget): Promise<void> {
    this.#targets.set(target.tenantId, target);
  }

  async delete(tenantId: TenantId): Promise<void> {
    this.#targets.delete(tenantId);
  }
}
