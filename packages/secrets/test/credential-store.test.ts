/**
 * Credential store tests.
 *
 * The credential is what lets us act on a seller's behalf, so the tests cover the failures that
 * would be security incidents rather than bugs: a token readable through the wrong channel, a
 * summary that leaks a token, and a malformed record being silently reinterpreted.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import { CredentialStore, InMemorySecretStore } from "../src/index.ts";

const ref = { tenantId: "tnt-a", channel: "tiktok_tokopedia" } as const;

function newStore(): { secrets: InMemorySecretStore; store: CredentialStore } {
  const secrets = new InMemorySecretStore();
  return { secrets, store: new CredentialStore(secrets) };
}

test("a stored credential is read back with its tokens and context", async () => {
  const { store } = newStore();

  await store.put({
    ...ref,
    accessToken: "act.123",
    refreshToken: "rft.456",
    expiresAt: "2026-09-29T00:00:00.000Z",
    context: { shopCipher: "cipher-1" }
  });

  const credential = await store.get(ref);
  assert.ok(credential);
  assert.equal(credential.accessToken, "act.123");
  assert.equal(credential.refreshToken, "rft.456");
  assert.equal(credential.expiresAt, "2026-09-29T00:00:00.000Z");
  assert.deepEqual(credential.context, { shopCipher: "cipher-1" });
});

test("an unconnected channel reads as null rather than throwing", async () => {
  const { store } = newStore();
  assert.equal(await store.get({ tenantId: "tnt-a", channel: "shopee" }), null);
});

test("a summary exposes the connection but never the tokens", async () => {
  const { store } = newStore();
  await store.put({
    ...ref,
    accessToken: "act.123",
    refreshToken: "rft.456",
    expiresAt: null,
    context: { shopCipher: "cipher-1", shopId: "7494" }
  });

  const summaries = await store.summariesForTenant("tnt-a");
  assert.equal(summaries.length, 1);

  const summary = summaries[0];
  assert.ok(summary);
  assert.equal(summary.channel, "tiktok_tokopedia");
  assert.deepEqual(summary.context, { shopCipher: "cipher-1", shopId: "7494" });

  // The whole point of a summary is that it is safe to return from an API and to log.
  const serialised = JSON.stringify(summary);
  assert.ok(!serialised.includes("act.123"), "the access token must not appear in a summary");
  assert.ok(!serialised.includes("rft.456"), "the refresh token must not appear in a summary");
});

test("a credential filed under the wrong channel is rejected, not served", async () => {
  const { secrets, store } = newStore();

  // Simulate a corrupted or maliciously written record: the key says one channel, the payload
  // another. Serving it would send one marketplace's token to a different marketplace.
  await secrets.put(
    { tenantId: "tnt-a", channel: "shopee" },
    JSON.stringify({
      version: 1,
      channel: "tiktok_tokopedia",
      accessToken: "act.123",
      refreshToken: null,
      expiresAt: null,
      context: {}
    })
  );

  await assert.rejects(store.get({ tenantId: "tnt-a", channel: "shopee" }), (error: unknown) => {
    assert.ok(error instanceof PlatformError);
    assert.equal(error.code, "VALIDATION_FAILED");
    return true;
  });
});

test("a credential written by a future version is not silently reinterpreted", async () => {
  const { secrets, store } = newStore();
  await secrets.put(
    { tenantId: "tnt-a", channel: "shopee" },
    JSON.stringify({
      version: 2,
      channel: "shopee",
      accessToken: "act.123",
      refreshToken: null,
      expiresAt: null,
      context: {}
    })
  );

  await assert.rejects(store.get({ tenantId: "tnt-a", channel: "shopee" }), (error: unknown) => {
    assert.ok(error instanceof PlatformError);
    assert.equal(error.code, "VALIDATION_FAILED");
    return true;
  });
});

test("storing an empty access token is rejected", async () => {
  const { store } = newStore();
  await assert.rejects(
    store.put({ ...ref, accessToken: "", refreshToken: null, expiresAt: null, context: {} }),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.code, "VALIDATION_FAILED");
      return true;
    }
  );
});

test("clearing a connection removes it from both get and the summaries", async () => {
  const { store } = newStore();
  await store.put({ ...ref, accessToken: "act.123", refreshToken: null, expiresAt: null, context: {} });

  await store.clear(ref);

  assert.equal(await store.get(ref), null);
  assert.deepEqual(await store.summariesForTenant("tnt-a"), []);
});

test("one tenant's credential is never readable as another tenant's", async () => {
  const { store } = newStore();
  await store.put({ ...ref, accessToken: "act.a", refreshToken: null, expiresAt: null, context: {} });
  await store.put({
    tenantId: "tnt-b",
    channel: "tiktok_tokopedia",
    accessToken: "act.b",
    refreshToken: null,
    expiresAt: null,
    context: {}
  });

  const a = await store.get({ tenantId: "tnt-a", channel: "tiktok_tokopedia" });
  const b = await store.get({ tenantId: "tnt-b", channel: "tiktok_tokopedia" });
  assert.equal(a?.accessToken, "act.a");
  assert.equal(b?.accessToken, "act.b");
});
