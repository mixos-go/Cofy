/**
 * Identity: accounts, password verification, and sessions.
 *
 * This is our own identity layer, not Medusa's (docs/ARCHITECTURE.md §2). It lives in the control
 * plane because "who may act" is a platform question, and the tenant data plane is a black box we
 * never authenticate against.
 *
 * Passwords are hashed with scrypt from `node:crypto`. That is a deliberate choice over a
 * dependency: scrypt is a memory-hard KDF in the standard library, and AGENTS.md §2.10 asks for a
 * written reason before adding a dependency for something the platform can already do.
 */

import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { PlatformError } from "@platform/contracts";
import type { Account, Capability, Role, Session, TenantId, UserId } from "@platform/contracts";
import { roleHasCapability } from "@platform/contracts";

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_COST = 16_384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELISM = 1;

export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 12;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      keylen,
      { N: SCRYPT_COST, r: SCRYPT_BLOCK_SIZE, p: SCRYPT_PARALLELISM },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      }
    );
  });
}

/**
 * Creates a self-describing hash so the cost parameters can change later without invalidating
 * existing passwords. Format: `scrypt$N$r$p$saltHex$hashHex`.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new PlatformError("VALIDATION_FAILED", "Password must be at least 12 characters.");
  }
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, SCRYPT_KEY_LENGTH);
  return [
    "scrypt",
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELISM,
    salt.toString("hex"),
    derived.toString("hex")
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
  if (
    nRaw === undefined ||
    rRaw === undefined ||
    pRaw === undefined ||
    saltHex === undefined ||
    hashHex === undefined
  ) {
    return false;
  }

  const params = { N: Number(nRaw), r: Number(rRaw), p: Number(pRaw) };
  // A hash whose parameters were corrupted in storage must fail authentication, not throw.
  // `scrypt` rejects out-of-range parameters with a RangeError, which would otherwise surface as
  // a 500 on the login route and turn a data problem into an outage.
  if (!isUsableScryptParams(params)) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length === 0) return false;

  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, Buffer.from(saltHex, "hex"), expected.length, params, (error, out) => {
      if (error) reject(error);
      else resolve(out);
    });
  }).catch(() => null);

  if (derived === null) return false;
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * Checks scrypt cost parameters against the bounds Node enforces.
 *
 * `N` must be a power of two greater than 1, and the memory requirement (`128 * N * r`) must stay
 * within Node's default limit. Without this guard a hostile or corrupt hash could also be used to
 * demand an enormous amount of memory.
 */
function isUsableScryptParams(params: { N: number; r: number; p: number }): boolean {
  const { N, r, p } = params;
  const isPositiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
  if (!isPositiveInteger(N) || !isPositiveInteger(r) || !isPositiveInteger(p)) return false;
  if (N <= 1 || (N & (N - 1)) !== 0) return false;
  const memoryBytes = 128 * N * r;
  if (memoryBytes > 1024 * 1024 * 1024) return false;
  if (p > 16) return false;
  return true;
}

export interface CreateAccountInput {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly role: Role;
  readonly tenantId: TenantId | null;
  readonly now: string;
}

export interface AccountStore {
  create(input: CreateAccountInput): Promise<Account>;
  /** Password hash lookup, kept separate so a hash is never part of the `Account` view. */
  getPasswordHash(accountId: UserId): Promise<string | null>;
  getByEmail(email: string): Promise<Account | null>;
  getById(id: UserId): Promise<Account | null>;
  listForTenant(tenantId: TenantId): Promise<readonly Account[]>;
  disable(id: UserId, now: string): Promise<void>;
}

export class InMemoryAccountStore implements AccountStore {
  readonly #accounts = new Map<UserId, Account>();
  readonly #hashes = new Map<UserId, string>();

  async create(input: CreateAccountInput): Promise<Account> {
    const email = input.email.trim().toLowerCase();

    // An operator sits above tenancy; everyone else must belong to exactly one tenant. Allowing
    // a tenant-less seller account would create a principal that no isolation rule covers.
    if (input.role === "operator" && input.tenantId !== null) {
      throw new PlatformError("VALIDATION_FAILED", "Operator accounts must not belong to a tenant.");
    }
    if (input.role !== "operator" && input.tenantId === null) {
      throw new PlatformError("VALIDATION_FAILED", "Seller accounts must belong to a tenant.");
    }
    if (await this.getByEmail(email)) {
      throw new PlatformError("CONFLICT", "An account with this email already exists.");
    }

    const account: Account = {
      id: randomUUID(),
      email,
      displayName: input.displayName,
      tenantId: input.tenantId,
      role: input.role,
      createdAt: input.now,
      disabledAt: null
    };

    this.#accounts.set(account.id, account);
    this.#hashes.set(account.id, await hashPassword(input.password));
    return account;
  }

  async getPasswordHash(accountId: UserId): Promise<string | null> {
    return this.#hashes.get(accountId) ?? null;
  }

  async getByEmail(email: string): Promise<Account | null> {
    const wanted = email.trim().toLowerCase();
    for (const account of this.#accounts.values()) {
      if (account.email === wanted) return account;
    }
    return null;
  }

  async getById(id: UserId): Promise<Account | null> {
    return this.#accounts.get(id) ?? null;
  }

  async listForTenant(tenantId: TenantId): Promise<readonly Account[]> {
    return [...this.#accounts.values()].filter((account) => account.tenantId === tenantId);
  }

  async disable(id: UserId, now: string): Promise<void> {
    const account = this.#accounts.get(id);
    if (account === undefined) {
      throw new PlatformError("NOT_FOUND", "No such account.", { details: { accountId: id } });
    }
    this.#accounts.set(id, { ...account, disabledAt: now });
  }
}

export class SessionManager {
  readonly #accounts: AccountStore;
  readonly #ttlSeconds: number;
  readonly #now: () => string;
  readonly #sessions = new Map<string, Session>();

  constructor(options: {
    readonly accounts: AccountStore;
    readonly ttlSeconds?: number;
    readonly now?: () => string;
  }) {
    this.#accounts = options.accounts;
    this.#ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  /**
   * Authenticates and issues a session.
   *
   * A wrong password and an unknown email return the same error, because distinguishing them
   * turns the login endpoint into an account-enumeration oracle.
   */
  async login(email: string, password: string): Promise<Session> {
    const invalid = new PlatformError("UNAUTHENTICATED", "Invalid email or password.");

    const account = await this.#accounts.getByEmail(email);
    if (account === null) throw invalid;
    if (account.disabledAt !== null) throw invalid;

    const hash = await this.#accounts.getPasswordHash(account.id);
    if (hash === null) throw invalid;
    if (!(await verifyPassword(password, hash))) throw invalid;

    const issuedAt = this.#now();
    const session: Session = {
      token: randomBytes(32).toString("base64url"),
      accountId: account.id,
      tenantId: account.tenantId,
      role: account.role,
      issuedAt,
      expiresAt: new Date(Date.parse(issuedAt) + this.#ttlSeconds * 1000).toISOString()
    };

    this.#sessions.set(session.token, session);
    return session;
  }

  async resolve(token: string): Promise<Session | null> {
    const session = this.#sessions.get(token);
    if (session === undefined) return null;

    if (Date.parse(session.expiresAt) <= Date.parse(this.#now())) {
      // Expired sessions are removed on access rather than by a sweeper: there is no background
      // work here on purpose, and a token that has been rejected once must not stay resolvable.
      this.#sessions.delete(token);
      return null;
    }

    return session;
  }

  async logout(token: string): Promise<void> {
    this.#sessions.delete(token);
  }
}

/**
 * Authorization gate.
 *
 * Every route that accepts a `tenant_id` must call this before touching data (AGENTS.md §6). It
 * checks two distinct things and keeps them distinct in the error:
 *
 * - the session may hold the capability at all (role check), and
 * - the session is acting on the tenant it actually belongs to (scope check).
 *
 * Collapsing these would leak whether a tenant exists to a caller who may not see it.
 */
export function authorize(
  session: Session,
  capability: Capability,
  targetTenantId: TenantId | null
): void {
  if (!roleHasCapability(session.role, capability)) {
    throw new PlatformError("FORBIDDEN", "Role lacks the required capability.", {
      details: { role: session.role, capability }
    });
  }

  const isOperator = session.role === "operator";
  if (!isOperator && targetTenantId !== null && session.tenantId !== targetTenantId) {
    throw new PlatformError("FORBIDDEN", "Session may not act on another tenant.", {
      details: { capability }
    });
  }
}
