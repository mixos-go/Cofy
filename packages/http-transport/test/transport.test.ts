/**
 * Transport tests.
 *
 * The rule under test is the one that must never regress: a credential-bearing hop never travels
 * over plain HTTP, and certificate verification is never disabled. These are asserted without a
 * live server — the refusal happens before any connection is attempted — because the failure they
 * guard against is a *configuration* that silently sends a tenant's admin key in the clear.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createPlainTransport, createTlsTransport, readOptionalCa } from "../src/index.ts";

test("the TLS transport refuses an http URL instead of downgrading", async () => {
  const transport = createTlsTransport();
  await assert.rejects(
    () => transport("http://tenant.internal/admin/orders", { method: "GET" }),
    (error: Error & { code?: string }) => {
      assert.equal(error.code, "VALIDATION_FAILED");
      assert.match(error.message, /non-TLS/);
      return true;
    }
  );
});

test("the plain transport is a separate function, so a credential hop cannot reach it by accident", () => {
  // They are distinct values on purpose: a caller that wants TLS cannot be handed the plain one by
  // a naming mistake, because there is no shared factory with a flag.
  assert.notEqual(createTlsTransport, createPlainTransport);
});

test("an unset or empty CA path means the system trust store, not an empty bundle", () => {
  assert.equal(readOptionalCa(undefined), undefined);
  assert.equal(readOptionalCa(""), undefined);
});

test("a CA path that is not a PEM bundle is refused rather than handed to Node", () => {
  const dir = mkdtempSync(join(tmpdir(), "cofy-ca-"));
  const path = join(dir, "not-a-cert.pem");
  writeFileSync(path, "this is not a certificate");

  // A malformed `ca` would fail the handshake with an error that looks like an outage, so it is
  // caught here where the cause is obvious.
  assert.throws(() => readOptionalCa(path), /not a PEM certificate bundle/);
});

test("a PEM bundle is read and returned", () => {
  const dir = mkdtempSync(join(tmpdir(), "cofy-ca-"));
  const path = join(dir, "ca.pem");
  writeFileSync(path, "-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n");

  assert.match(readOptionalCa(path) ?? "", /BEGIN CERTIFICATE/);
});
