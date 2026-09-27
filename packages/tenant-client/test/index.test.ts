/**
 * Tenant-client tests.
 *
 * Two things are asserted here, and neither is a formality:
 *
 * - Lifecycle gating: only an `active` tenant is reachable, and an unreachable tenant produces a
 *   typed error rather than a connection failure.
 * - Schema-name safety: the schema name is the one value that reaches SQL as an identifier. These
 *   tests are the guardrail on that, since identifiers cannot be parameterised.
 *
 * The database itself is exercised in the integration suite, which needs a live Postgres.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { TenantClient, assertSafeSchemaName } from "../src/index.ts";
import type { TenantDirectory, TenantRoute } from "../src/index.ts";

function directoryOf(routes: readonly TenantRoute[]): TenantDirectory {
  return {
    async resolve(tenantId) {
      return routes.find((route) => route.tenantId === tenantId) ?? null;
    }
  };
}

function clientWith(routes: readonly TenantRoute[]) {
  return new TenantClient({
    connectionString: "postgres://localhost/platform_test",
    directory: directoryOf(routes),
    maxConnectionsPerTenant: 1
  });
}

test("an unknown tenant is reported as TENANT_NOT_FOUND", async () => {
  const client = clientWith([]);

  await assert.rejects(
    () => client.connect("tnt-missing"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_NOT_FOUND");
      return true;
    }
  );
});

test("a provisioning tenant is not reachable and the error says why", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "provisioning" }]);

  await assert.rejects(
    () => client.connect("tnt-a"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "TENANT_NOT_ACTIVE");
      assert.equal((error as { retryable?: boolean }).retryable, true, "provisioning finishes on its own");
      return true;
    }
  );
});

test("a suspended tenant is not retryable: someone has to reactivate it", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "suspended" }]);

  await assert.rejects(
    () => client.connect("tnt-a"),
    (error: unknown) => {
      assert.equal((error as { retryable?: boolean }).retryable, false);
      return true;
    }
  );
});

test("a terminated tenant is unreachable", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "terminated" }]);
  await assert.rejects(() => client.connect("tnt-a"));
});

test("connecting an active tenant creates exactly one pool", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "active" }]);

  const first = await client.connect("tnt-a");
  await client.connect("tnt-a");

  assert.equal(first.schemaName, "tenant_a");
  assert.equal(client.poolCount, 1, "a second connection must reuse the pool");
});

test("evicting a tenant drops its pool", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "active" }]);

  await client.connect("tnt-a");
  assert.equal(client.poolCount, 1);

  await client.evict("tnt-a");
  assert.equal(client.poolCount, 0);
});

test("evicting a tenant that was never connected is a no-op", async () => {
  const client = clientWith([]);
  await client.evict("tnt-nothing");
  assert.equal(client.poolCount, 0);
});

test("withTenant hands the callback a tenant-bound handle", async () => {
  const client = clientWith([{ tenantId: "tnt-a", schemaName: "tenant_a", state: "active" }]);

  const seen = await client.withTenant("tnt-a", async (db) => ({
    tenantId: db.tenantId,
    schemaName: db.schemaName
  }));

  assert.deepEqual(seen, { tenantId: "tnt-a", schemaName: "tenant_a" });
});

test("safe schema names are accepted", () => {
  assert.doesNotThrow(() => assertSafeSchemaName("tenant_a"));
  assert.doesNotThrow(() => assertSafeSchemaName("tenant_0f9a2c"));
});

test("schema names that could escape the identifier position are refused", () => {
  const hostile = [
    "tenant_a; drop schema tenant_b",
    "tenant_a\"",
    "public",
    "tenant_",
    "'tenant_a'",
    "tenant_a --",
    "tenant_ünïcode",
    "tenant_a.secret",
    ""
  ];

  for (const name of hostile) {
    assert.throws(
      () => assertSafeSchemaName(name),
      (error: unknown) => {
        assert.equal((error as { code?: string }).code, "VALIDATION_FAILED");
        return true;
      },
      `expected '${name}' to be refused`
    );
  }
});

test("a tenant whose stored schema name is unsafe is refused at connect time", async () => {
  // The registry derives schema names, so this can only happen if the registry is corrupt. The
  // client must still refuse rather than pass it to SQL.
  const client = clientWith([
    { tenantId: "tnt-a", schemaName: "public; drop schema x", state: "active" }
  ]);

  await assert.rejects(
    () => client.connect("tnt-a"),
    (error: unknown) => {
      assert.equal((error as { code?: string }).code, "VALIDATION_FAILED");
      return true;
    }
  );
  assert.equal(client.poolCount, 0, "no pool may be created for an unsafe schema");
});

test("closeAll ends every pool", async () => {
  const client = clientWith([
    { tenantId: "tnt-a", schemaName: "tenant_a", state: "active" },
    { tenantId: "tnt-b", schemaName: "tenant_b", state: "active" }
  ]);

  await client.connect("tnt-a");
  await client.connect("tnt-b");
  assert.equal(client.poolCount, 2);

  await client.closeAll();
  assert.equal(client.poolCount, 0);
});
