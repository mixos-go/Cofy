/**
 * Secret store tests.
 *
 * The store holding seller credentials is where a mistake is a security incident rather than a
 * bug, so the tests cover revocation semantics and the redaction helper directly.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemorySecretStore, redact } from "../src/index.ts";

test("a stored secret can be read back and deleted", async () => {
  const store = new InMemorySecretStore();
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "shp-value");

  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee" }), "shp-value");

  await store.delete({ tenantId: "tnt-a", channel: "shopee" });
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee" }), null);
});

test("an unknown secret reads as null rather than throwing", async () => {
  const store = new InMemorySecretStore();
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "lazada" }), null);
});

test("a tenant id containing the delimiter cannot collide with another tenant", async () => {
  const store = new InMemorySecretStore();

  // `ChannelCode` is a closed union, but `TenantId` is a plain string, so a delimiter-joined key
  // could alias these two pairs. Tenant A's credential must never be readable as tenant B's.
  await store.put({ tenantId: "tnt-a", channel: "shopee::lazada" as never }, "first");
  await store.put({ tenantId: "tnt-a::shopee", channel: "lazada" }, "second");

  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee::lazada" as never }), "first");
  assert.equal(await store.get({ tenantId: "tnt-a::shopee", channel: "lazada" }), "second");
  assert.deepEqual(await store.listForTenant("tnt-a::shopee"), ["lazada"]);
});

test("putting the same key twice replaces the value", async () => {
  const store = new InMemorySecretStore();
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "old");
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "new");
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee" }), "new");
});

test("listForTenant returns only that tenant's channels", async () => {
  const store = new InMemorySecretStore();
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "a1");
  await store.put({ tenantId: "tnt-a", channel: "tiktok_tokopedia" }, "a2");
  await store.put({ tenantId: "tnt-b", channel: "lazada" }, "b1");

  assert.deepEqual([...(await store.listForTenant("tnt-a"))].sort(), ["shopee", "tiktok_tokopedia"]);
  assert.deepEqual(await store.listForTenant("tnt-b"), ["lazada"]);
  assert.deepEqual(await store.listForTenant("tnt-c"), []);
});

test("deleteAllForTenant revokes exactly one tenant's credentials", async () => {
  const store = new InMemorySecretStore();
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "a1");
  await store.put({ tenantId: "tnt-a", channel: "tiktok_tokopedia" }, "a2");
  await store.put({ tenantId: "tnt-b", channel: "shopee" }, "b1");

  const revoked = await store.deleteAllForTenant("tnt-a");

  assert.deepEqual([...revoked].sort(), ["shopee", "tiktok_tokopedia"]);
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee" }), null);
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "tiktok_tokopedia" }), null);
  assert.equal(await store.get({ tenantId: "tnt-b", channel: "shopee" }), "b1");
});

test("deleteAllForTenant is idempotent", async () => {
  const store = new InMemorySecretStore();
  await store.put({ tenantId: "tnt-a", channel: "shopee" }, "a1");

  assert.deepEqual(await store.deleteAllForTenant("tnt-a"), ["shopee"]);
  assert.deepEqual(await store.deleteAllForTenant("tnt-a"), []);
});

test("redact hides the middle of a long secret and the whole of a short one", () => {
  assert.equal(redact("abcdefghijkl"), "abcd***kl");
  assert.equal(redact("short"), "***");
  // The boundary: exactly 8 characters is still treated as too short to reveal any of.
  assert.equal(redact("12345678"), "***");
  assert.equal(redact("123456789"), "1234***89");
});
