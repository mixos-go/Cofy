import type { ChannelCode, TenantId } from "@platform/contracts";

/**
 * KMS-backed secret access (AGENTS.md §2.6).
 *
 * Seller credentials are keyed by tenant and channel. They are never written to the database,
 * never logged, and never placed in a test fixture. The implementation lands in M1; this file
 * fixes the boundary.
 */

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
