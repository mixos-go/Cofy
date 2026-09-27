/**
 * OAuth `state` values for channel authorization.
 *
 * The `state` parameter is the only thing tying a marketplace callback to the seller who started
 * it, so it is a security boundary, not a formality (AGENTS.md §2.6). Three properties matter and
 * each is tested:
 *
 * - **Unpredictable.** Generated with `randomBytes`, never a counter or a timestamp.
 * - **Single use.** Consuming a state removes it, so a replayed callback fails.
 * - **Short lived.** A state that outlives the flow is a credential inviting replay; it expires.
 *
 * The store holds no tokens. It maps an opaque state value to the tenant and channel that started
 * the flow, and nothing else.
 */

import { randomBytes } from "node:crypto";
import { PlatformError } from "@platform/contracts";
import type { ChannelCode, Instant, TenantId } from "@platform/contracts";

export interface OAuthStateRecord {
  readonly state: string;
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly redirectUri: string;
  readonly createdAt: Instant;
  readonly expiresAt: Instant;
}

export interface CreateStateInput {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly redirectUri: string;
  readonly now: Date;
}

export interface OAuthStateStore {
  create(input: CreateStateInput): Promise<OAuthStateRecord>;

  /**
   * Validate and consume a state in one step. Returns `null` for an unknown, already-used, or
   * expired state. Validation and consumption are one operation because separating them invites a
   * caller forgetting to consume, which is exactly the replay this exists to stop.
   */
  consume(state: string, now: Date): Promise<OAuthStateRecord | null>;
}

export const DEFAULT_STATE_TTL_SECONDS = 10 * 60;

export class InMemoryOAuthStateStore implements OAuthStateStore {
  readonly #states = new Map<string, OAuthStateRecord>();
  readonly #ttlSeconds: number;
  readonly #generate: () => string;

  constructor(
    options: { readonly ttlSeconds?: number; readonly generate?: () => string } = {}
  ) {
    this.#ttlSeconds = options.ttlSeconds ?? DEFAULT_STATE_TTL_SECONDS;
    this.#generate = options.generate ?? (() => randomBytes(32).toString("base64url"));
  }

  async create(input: CreateStateInput): Promise<OAuthStateRecord> {
    if (input.redirectUri === "") {
      throw new PlatformError("VALIDATION_FAILED", "An OAuth state needs the redirect URI it was issued for.");
    }

    this.#sweep(input.now);

    const state = this.#generate();
    const record: OAuthStateRecord = {
      state,
      tenantId: input.tenantId,
      channel: input.channel,
      redirectUri: input.redirectUri,
      createdAt: input.now.toISOString(),
      expiresAt: new Date(input.now.getTime() + this.#ttlSeconds * 1000).toISOString()
    };
    this.#states.set(state, record);
    return record;
  }

  async consume(state: string, now: Date): Promise<OAuthStateRecord | null> {
    this.#sweep(now);

    const record = this.#states.get(state);
    if (record === undefined) return null;

    // Consume before returning: a state is spent the moment it is looked at, whether or not the
    // subsequent token exchange succeeds. A failed authorization must be restarted, not retried
    // against the same state.
    this.#states.delete(state);

    if (Date.parse(record.expiresAt) <= now.getTime()) return null;
    return record;
  }

  #sweep(now: Date): void {
    for (const [state, record] of this.#states) {
      if (Date.parse(record.expiresAt) <= now.getTime()) this.#states.delete(state);
    }
  }
}
