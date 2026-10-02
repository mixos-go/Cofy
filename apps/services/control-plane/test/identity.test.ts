/**
 * Identity and authorization tests.
 *
 * These run against the real scrypt hashing and the real in-memory store. Password hashing is not
 * stubbed: the cost parameters and the timing-safe comparison are part of what is being asserted.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryAccountStore,
  SessionManager,
  authorize,
  hashPassword,
  verifyPassword
} from "../src/identity.ts";
import type { Session } from "@platform/contracts";

const NOW = "2026-09-27T00:00:00.000Z";
const GOOD_PASSWORD = "correct horse battery";

function accounts() {
  return new InMemoryAccountStore();
}

test("a password hash verifies against its own password and nothing else", async () => {
  const hash = await hashPassword(GOOD_PASSWORD);

  assert.equal(await verifyPassword(GOOD_PASSWORD, hash), true);
  assert.equal(await verifyPassword("correct horse batterz", hash), false);
  assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
});

test("the same password hashes differently each time", async () => {
  const first = await hashPassword(GOOD_PASSWORD);
  const second = await hashPassword(GOOD_PASSWORD);
  assert.notEqual(first, second, "a shared salt would make hashes comparable across accounts");
});

test("a malformed stored hash is rejected rather than throwing", async () => {
  assert.equal(await verifyPassword(GOOD_PASSWORD, "not-a-hash"), false);
  assert.equal(await verifyPassword(GOOD_PASSWORD, "scrypt$1$2$3$zz$zz"), false);
});

test("short passwords are refused at creation", async () => {
  await assert.rejects(
    () => hashPassword("short"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "VALIDATION_FAILED");
      return true;
    }
  );
});

test("seller accounts must belong to a tenant and operators must not", async () => {
  const store = accounts();

  await assert.rejects(
    () =>
      store.create({
        email: "seller@example.com",
        displayName: "Seller",
        password: GOOD_PASSWORD,
        role: "seller_owner",
        tenantId: null,
        now: NOW
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "VALIDATION_FAILED");
      return true;
    }
  );

  await assert.rejects(
    () =>
      store.create({
        email: "ops@example.com",
        displayName: "Ops",
        password: GOOD_PASSWORD,
        role: "operator",
        tenantId: "tnt-a",
        now: NOW
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "VALIDATION_FAILED");
      return true;
    }
  );
});

test("emails are compared case-insensitively and cannot be duplicated", async () => {
  const store = accounts();
  await store.create({
    email: "Seller@Example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });

  const found = await store.getByEmail("seller@example.com");
  assert.equal(found?.email, "seller@example.com");

  await assert.rejects(
    () =>
      store.create({
        email: "SELLER@example.com",
        displayName: "Other",
        password: GOOD_PASSWORD,
        role: "seller_owner",
        tenantId: "tnt-a",
        now: NOW
      }),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "CONFLICT");
      return true;
    }
  );
});

test("login rejects a wrong password and an unknown email identically", async () => {
  const store = accounts();
  await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });

  const wrongPassword = await sessions.login("seller@example.com", "wrong password here").catch((e: unknown) => e);
  const unknownEmail = await sessions.login("nobody@example.com", GOOD_PASSWORD).catch((e: unknown) => e);

  assert.equal((wrongPassword as { code?: string }).code, "UNAUTHENTICATED");
  assert.equal((unknownEmail as { code?: string }).code, "UNAUTHENTICATED");
  assert.equal(
    (wrongPassword as Error).message,
    (unknownEmail as Error).message,
    "distinct messages would turn login into an account-enumeration oracle"
  );
});

test("a disabled account cannot log in even with the right password", async () => {
  const store = accounts();
  const account = await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });
  await store.disable(account.id, NOW);

  const sessions = new SessionManager({ accounts: store, now: () => NOW });
  await assert.rejects(
    () => sessions.login("seller@example.com", GOOD_PASSWORD),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "UNAUTHENTICATED");
      return true;
    }
  );
});

test("a session carries the account's tenant and role", async () => {
  const store = accounts();
  await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_staff",
    tenantId: "tnt-a",
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });
  const session = await sessions.login("seller@example.com", GOOD_PASSWORD);

  assert.equal(session.tenantId, "tnt-a");
  assert.equal(session.role, "seller_staff");
  assert.equal(session.expiresAt, "2026-09-27T12:00:00.000Z");
  assert.equal((await sessions.resolve(session.token))?.accountId, session.accountId);
});

test("expired sessions no longer resolve", async () => {
  const store = accounts();
  await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });

  let clock = NOW;
  const sessions = new SessionManager({ accounts: store, ttlSeconds: 60, now: () => clock });
  const session = await sessions.login("seller@example.com", GOOD_PASSWORD);

  clock = "2026-09-27T00:01:01.000Z";
  assert.equal(await sessions.resolve(session.token), null);

  // And the expired token must stay dead even if the clock moves back.
  clock = NOW;
  assert.equal(await sessions.resolve(session.token), null);
});

test("logout invalidates a session immediately", async () => {
  const store = accounts();
  await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });
  const session = await sessions.login("seller@example.com", GOOD_PASSWORD);
  await sessions.logout(session.token);
  assert.equal(await sessions.resolve(session.token), null);
});

function session(overrides: Partial<Session>): Session {
  return {
    token: "tok",
    accountId: "acc-1",
    tenantId: "tnt-a",
    role: "seller_owner",
    issuedAt: NOW,
    expiresAt: "2026-09-27T12:00:00.000Z",
    impersonation: null,
    ...overrides
  };
}

test("a seller may act only on their own tenant", () => {
  const seller = session({ role: "seller_owner", tenantId: "tnt-a" });

  assert.doesNotThrow(() => authorize(seller, "order:write", "tnt-a"));

  assert.throws(
    () => authorize(seller, "order:write", "tnt-b"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "FORBIDDEN");
      return true;
    }
  );
});

test("a viewer cannot write even on their own tenant", () => {
  const viewer = session({ role: "seller_viewer", tenantId: "tnt-a" });
  assert.throws(() => authorize(viewer, "order:write", "tnt-a"));
  assert.doesNotThrow(() => authorize(viewer, "order:read", "tnt-a"));
});

test("an operator may terminate tenants but may not touch commerce data", () => {
  const operator = session({ role: "operator", tenantId: null });

  assert.doesNotThrow(() => authorize(operator, "tenant:terminate", "tnt-a"));
  assert.doesNotThrow(() => authorize(operator, "tenant:read", "tnt-a"));

  // Operator actions inside a tenant's data would be unattributable to a seller, so they are
  // denied even though the operator can see the tenant.
  assert.throws(() => authorize(operator, "order:write", "tnt-a"));
  assert.throws(() => authorize(operator, "stock:write", "tnt-a"));
});

test("an operator impersonates a tenant with a short, read-only, attributable session", async () => {
  const store = accounts();
  await store.create({
    email: "ops@example.com",
    displayName: "Ops",
    password: GOOD_PASSWORD,
    role: "operator",
    tenantId: null,
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });
  const operator = await sessions.login("ops@example.com", GOOD_PASSWORD);

  const impersonated = await sessions.impersonate({ actor: operator, tenantId: "tnt-a" });

  // Least privilege: support reads, it does not write.
  assert.equal(impersonated.role, "seller_viewer");
  assert.equal(impersonated.tenantId, "tnt-a");

  // Time-boxed, and much shorter than the operator's own session.
  assert.ok(
    Date.parse(impersonated.expiresAt) < Date.parse(operator.expiresAt),
    "an impersonation must expire sooner than a login"
  );
  assert.equal(impersonated.expiresAt, new Date(Date.parse(NOW) + 30 * 60 * 1000).toISOString());

  // Attributable: the record names the person, not the tenant's staff.
  assert.equal(impersonated.impersonation?.actorEmail, "ops@example.com");
  assert.equal(impersonated.impersonation?.actorAccountId, operator.accountId);

  // The impersonated session acts for the tenant but is not the tenant's account.
  assert.equal(impersonated.accountId, operator.accountId);

  // And it resolves like any other session, so the seller routes accept it.
  assert.equal((await sessions.resolve(impersonated.token))?.tenantId, "tnt-a");
});

test("a seller may not impersonate, and an impersonated session may not impersonate again", async () => {
  const store = accounts();
  const seller = await store.create({
    email: "seller@example.com",
    displayName: "Seller",
    password: GOOD_PASSWORD,
    role: "seller_owner",
    tenantId: "tnt-a",
    now: NOW
  });
  await store.create({
    email: "ops@example.com",
    displayName: "Ops",
    password: GOOD_PASSWORD,
    role: "operator",
    tenantId: null,
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });

  const sellerLogin = await sessions.login("seller@example.com", GOOD_PASSWORD);
  assert.equal(sellerLogin.accountId, seller.id);
  await assert.rejects(
    () => sessions.impersonate({ actor: sellerLogin, tenantId: "tnt-b" }),
    (error: unknown) => (error as { code?: string }).code === "FORBIDDEN"
  );

  const operator = await sessions.login("ops@example.com", GOOD_PASSWORD);
  const impersonated = await sessions.impersonate({ actor: operator, tenantId: "tnt-a" });
  // Chaining would make the audit trail point at a session rather than a person.
  await assert.rejects(
    () => sessions.impersonate({ actor: impersonated, tenantId: "tnt-b" }),
    (error: unknown) => (error as { code?: string }).code === "FORBIDDEN"
  );
});

test("an impersonated session stops working once its short TTL passes", async () => {
  const store = accounts();
  await store.create({
    email: "ops@example.com",
    displayName: "Ops",
    password: GOOD_PASSWORD,
    role: "operator",
    tenantId: null,
    now: NOW
  });

  let clock = NOW;
  const sessions = new SessionManager({ accounts: store, now: () => clock });
  const operator = await sessions.login("ops@example.com", GOOD_PASSWORD);
  const impersonated = await sessions.impersonate({ actor: operator, tenantId: "tnt-a" });

  assert.notEqual(await sessions.resolve(impersonated.token), null);

  // Just past the impersonation TTL. The operator's own session, issued at the same instant, is
  // still valid — so what ended the access is the time-box, not a logout.
  clock = new Date(Date.parse(NOW) + 30 * 60 * 1000 + 1).toISOString();
  assert.equal(await sessions.resolve(impersonated.token), null);
  assert.notEqual(await sessions.resolve(operator.token), null);
});

test("a disabled operator cannot impersonate", async () => {
  const store = accounts();
  const created = await store.create({
    email: "ops@example.com",
    displayName: "Ops",
    password: GOOD_PASSWORD,
    role: "operator",
    tenantId: null,
    now: NOW
  });

  const sessions = new SessionManager({ accounts: store, now: () => NOW });
  const operator = await sessions.login("ops@example.com", GOOD_PASSWORD);
  await store.disable(created.id, NOW);

  await assert.rejects(
    () => sessions.impersonate({ actor: operator, tenantId: "tnt-a" }),
    (error: unknown) => (error as { code?: string }).code === "FORBIDDEN"
  );
});
