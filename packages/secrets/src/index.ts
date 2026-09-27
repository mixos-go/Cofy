import type { ChannelCode, TenantId } from "@platform/contracts";

/**
 * KMS-backed secret access (AGENTS.md §2.6).
 *
 * Seller credentials are keyed by tenant and channel. They are never written to the database,
 * never logged, and never placed in a test fixture. The implementation lands in M1; this file
 * fixes the boundary.
 */

export * from "./credential-store.ts";

export interface SecretRef {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
}

export interface SecretStore {
  /** Store or replace a secret. Returns an opaque reference handle, not the value. */
  put(ref: SecretRef, value: string): Promise<string>;

  /** Read a secret. Callers must not log or persist the returned value. */
  get(ref: SecretRef): Promise<string | null>;

  /** Remove a secret, e.g. when a seller revokes channel access. */
  delete(ref: SecretRef): Promise<void>;

  /** Channels this tenant currently holds a credential for. Backs the ops console view. */
  listForTenant(tenantId: TenantId): Promise<readonly ChannelCode[]>;

  /**
   * Revoke every credential a tenant holds, returning the channels that were revoked.
   *
   * This is what tenant termination calls (docs/PLAN.md M1). It has to be one operation rather
   * than a loop in the caller, because a partially revoked tenant is a security problem, and the
   * definition of "every credential" belongs with the thing that stores credentials.
   */
  deleteAllForTenant(tenantId: TenantId): Promise<readonly ChannelCode[]>;
}

/**
 * In-memory secret store.
 *
 * A real, if simple, implementation: it is correct for a single process and is what local
 * development and tests use. It is deliberately **not** a mock — the behaviour under test is this
 * behaviour. The KMS-backed implementation for production is a separate adapter; see the note in
 * `docs/PLAN.md` M1 about AWS KMS being the expected provider.
 *
 * Values are held in memory and never written to disk, and are never returned by `listForTenant`,
 * which is the operation most likely to end up in a log line.
 */
export class InMemorySecretStore implements SecretStore {
  // The key is an unambiguous encoding of the pair. A delimiter-joined string would alias
  // (tenant "a", channel "b::c") with (tenant "a::b", channel "c"), and a collision between two
  // tenants' credentials is the worst failure this store can have.
  readonly #values = new Map<string, string>();

  #key(ref: SecretRef): string {
    return JSON.stringify([ref.tenantId, ref.channel]);
  }

  async put(ref: SecretRef, value: string): Promise<string> {
    this.#values.set(this.#key(ref), value);
    return `memory://${ref.tenantId}/${ref.channel}`;
  }

  async get(ref: SecretRef): Promise<string | null> {
    return this.#values.get(this.#key(ref)) ?? null;
  }

  async delete(ref: SecretRef): Promise<void> {
    this.#values.delete(this.#key(ref));
  }

  async listForTenant(tenantId: TenantId): Promise<readonly ChannelCode[]> {
    const channels: ChannelCode[] = [];
    for (const key of this.#values.keys()) {
      const [tenant, channel] = JSON.parse(key) as [TenantId, ChannelCode];
      if (tenant === tenantId) channels.push(channel);
    }
    return channels;
  }

  async deleteAllForTenant(tenantId: TenantId): Promise<readonly ChannelCode[]> {
    const revoked = await this.listForTenant(tenantId);
    for (const channel of revoked) {
      this.#values.delete(this.#key({ tenantId, channel }));
    }
    return revoked;
  }
}

/**
 * A redacted view suitable for logs and API responses.
 *
 * Use this whenever a secret-bearing object must cross a boundary that might be logged.
 */
export function redact(secret: string): string {
  if (secret.length <= 8) return "***";
  return `${secret.slice(0, 4)}***${secret.slice(-2)}`;
}
