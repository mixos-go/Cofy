import type { ChannelCode, Instant, TenantId } from "@platform/contracts";
import { PlatformError } from "@platform/contracts";
import type { SecretStore } from "./index.ts";

/**
 * Persisting a seller's channel credential (docs/adr/0003).
 *
 * The credential a connector returns after `completeAuthorization` is the only thing that lets us
 * call a marketplace on that seller's behalf, so it lives in the secret store — never in the
 * registry database, never in a log line, never in a fixture.
 *
 * This is a thin, typed layer over `SecretStore` rather than a second storage mechanism: the
 * secret store already handles encryption and per-`(tenant, channel)` keying, and one credential
 * per pair is exactly what we hold. Keeping one backend means there is only one place to get
 * secret handling right.
 */

/**
 * The non-secret view of a connection, for listing what a tenant has connected.
 *
 * Deliberately excludes the access and refresh tokens. `context` holds marketplace identifiers
 * (shop id, cipher) that operators need to see and that are not credentials themselves.
 */
export interface ChannelConnectionSummary {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly expiresAt: Instant | null;
  readonly context: Readonly<Record<string, string>>;
}

/**
 * The credential shape as stored.
 *
 * `version` is written so a future change to the shape can be migrated rather than guessed at:
 * reading an unknown version is an explicit failure, not a silent reinterpretation.
 */
interface StoredCredential {
  readonly version: 1;
  readonly channel: ChannelCode;
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: Instant | null;
  readonly context: Readonly<Record<string, string>>;
}

const STORED_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseStored(raw: string, ref: { tenantId: TenantId; channel: ChannelCode }): StoredCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential is not valid JSON.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }

  if (!isRecord(parsed)) {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential is not an object.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }
  if (parsed.version !== STORED_VERSION) {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential has an unknown version.", {
      details: { tenantId: ref.tenantId, channel: ref.channel, version: parsed.version }
    });
  }
  if (parsed.channel !== ref.channel) {
    // A credential readable under the wrong channel would send one marketplace's token to another.
    throw new PlatformError("VALIDATION_FAILED", "Stored credential is filed under the wrong channel.", {
      details: { tenantId: ref.tenantId, expected: ref.channel, found: parsed.channel }
    });
  }
  if (typeof parsed.accessToken !== "string" || parsed.accessToken === "") {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential is missing an access token.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }
  if (parsed.refreshToken !== null && typeof parsed.refreshToken !== "string") {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential has a malformed refresh token.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }
  if (parsed.expiresAt !== null && typeof parsed.expiresAt !== "string") {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential has a malformed expiry.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }
  if (!isRecord(parsed.context)) {
    throw new PlatformError("VALIDATION_FAILED", "Stored credential has a malformed context.", {
      details: { tenantId: ref.tenantId, channel: ref.channel }
    });
  }

  return {
    version: STORED_VERSION,
    // The equality check above guarantees this is `ref.channel`, but TypeScript cannot narrow an
    // `unknown`, so the narrowed value is the trusted one.
    channel: ref.channel,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    expiresAt: parsed.expiresAt,
    context: parsed.context as Readonly<Record<string, string>>
  };
}

/**
 * Reads and writes seller channel credentials.
 *
 * The store never returns a credential to a caller that only needs to list connections; use
 * `summariesForTenant` for that. `get` is the operation that hands out tokens, and callers must
 * not log or persist its result (AGENTS.md §2.6).
 */
export class CredentialStore {
  readonly #secrets: SecretStore;

  constructor(secrets: SecretStore) {
    this.#secrets = secrets;
  }

  /**
   * Store or replace one credential. The credential's own `channel` must match `channel`; a
   * mismatch is a programming error and would corrupt the keying, so it is rejected loudly.
   */
  async put(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
    readonly accessToken: string;
    readonly refreshToken: string | null;
    readonly expiresAt: Instant | null;
    readonly context: Readonly<Record<string, string>>;
  }): Promise<ChannelConnectionSummary> {
    if (input.accessToken === "") {
      throw new PlatformError("VALIDATION_FAILED", "Cannot store a credential without an access token.", {
        details: { tenantId: input.tenantId, channel: input.channel }
      });
    }

    const stored: StoredCredential = {
      version: STORED_VERSION,
      channel: input.channel,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      context: input.context
    };
    await this.#secrets.put({ tenantId: input.tenantId, channel: input.channel }, JSON.stringify(stored));

    return {
      tenantId: input.tenantId,
      channel: input.channel,
      expiresAt: input.expiresAt,
      context: input.context
    };
  }

  /** Read a credential. Returns `null` when the tenant has not connected this channel. */
  async get(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
  }): Promise<{
    readonly channel: ChannelCode;
    readonly accessToken: string;
    readonly refreshToken: string | null;
    readonly expiresAt: Instant | null;
    readonly context: Readonly<Record<string, string>>;
  } | null> {
    const raw = await this.#secrets.get({ tenantId: input.tenantId, channel: input.channel });
    if (raw === null) return null;
    const stored = parseStored(raw, input);
    return {
      channel: stored.channel,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      expiresAt: stored.expiresAt,
      context: stored.context
    };
  }

  /** Remove a credential, e.g. when a seller disconnects a channel. */
  async clear(input: { readonly tenantId: TenantId; readonly channel: ChannelCode }): Promise<void> {
    await this.#secrets.delete({ tenantId: input.tenantId, channel: input.channel });
  }

  /**
   * Non-secret summaries of every channel this tenant has connected. This is the operation safe
   * to return from an API or put in a log line.
   */
  async summariesForTenant(tenantId: TenantId): Promise<readonly ChannelConnectionSummary[]> {
    const channels = await this.#secrets.listForTenant(tenantId);
    const summaries: ChannelConnectionSummary[] = [];
    for (const channel of channels) {
      const raw = await this.#secrets.get({ tenantId, channel });
      if (raw === null) continue;
      const stored = parseStored(raw, { tenantId, channel });
      summaries.push({
        tenantId,
        channel,
        expiresAt: stored.expiresAt,
        context: stored.context
      });
    }
    return summaries;
  }
}
