import type { TenantId } from "@platform/contracts";

/**
 * The platform-issued Medusa admin credential (ADR 0012).
 *
 * This is not a seller channel credential: it is the secret API key the platform mints inside a
 * tenant's Medusa instance and the worker presents to that instance's Admin API. It is stored
 * separately from `CredentialStore` because the two answer different questions — that one holds a
 * seller's marketplace token, this one holds our authority over the tenant's own engine — and
 * because a `SecretRef` is keyed by `(tenant, channel)`, which has no meaning for a tenant's own
 * engine.
 *
 * A key is scoped to its instance, not to a resource within it: Medusa lets only *publishable*
 * keys be limited to sales channels, so a secret key carries full admin authority in the tenant it
 * belongs to. That is exactly why this store is keyed by tenant alone and why a value must never
 * be shared across tenants.
 */
export interface MedusaAdminKeyStore {
  /** Store or replace the key for a tenant. */
  put(tenantId: TenantId, key: string): Promise<void>;

  /** Read the key. Callers must not log or persist the returned value. */
  get(tenantId: TenantId): Promise<string | null>;

  /** Remove a tenant's key. Called on tenant termination, alongside credential revocation. */
  delete(tenantId: TenantId): Promise<void>;

  /** Tenants that currently hold a key. Backs provisioning and operator views, never the value. */
  listTenants(): Promise<readonly TenantId[]>;
}

/**
 * In-memory implementation, for local development and tests.
 *
 * Like `InMemorySecretStore` this is a real implementation of the contract, not a mock: the
 * behaviour under test is this behaviour. Values are never written to disk and never returned by
 * `listTenants`, the operation most likely to end up in a log line. The KMS-backed adapter for
 * production lands behind this same interface.
 */
export class InMemoryMedusaAdminKeyStore implements MedusaAdminKeyStore {
  readonly #values = new Map<TenantId, string>();

  async put(tenantId: TenantId, key: string): Promise<void> {
    this.#values.set(tenantId, key);
  }

  async get(tenantId: TenantId): Promise<string | null> {
    return this.#values.get(tenantId) ?? null;
  }

  async delete(tenantId: TenantId): Promise<void> {
    this.#values.delete(tenantId);
  }

  async listTenants(): Promise<readonly TenantId[]> {
    return [...this.#values.keys()];
  }
}
