/**
 * Per-tenant Medusa target resolution and credential presentation (ADR 0012).
 *
 * The property that matters is that the worker holds no single engine: two tenants must resolve to
 * two hosts and two keys within one process, and the credential must leave as HTTP Basic, which is
 * the only form Medusa accepts a secret key in. A regression that re-shares one base URL across
 * tenants would be invisible in a single-tenant test, so there is a two-tenant case.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryMedusaAdminKeyStore } from "@platform/secrets";
import type { TenantId } from "@platform/contracts";
import { HttpCommerceClient, HttpMedusaTargetResolver } from "../src/ports.ts";
import type { Transport } from "@platform/http-transport";

const TENANT_A = "tnt-a";
const TENANT_B = "tnt-b";

function resolverFor(targets: Record<string, string>, keys: InMemoryMedusaAdminKeyStore): HttpMedusaTargetResolver {
  const controlPlane = {
    async getMedusaTarget(tenantId: TenantId) {
      const baseUrl = targets[tenantId];
      if (baseUrl === undefined) throw new Error("no target");
      return { target: { tenantId, baseUrl } };
    }
  };
  return new HttpMedusaTargetResolver({
    controlPlane: controlPlane as unknown as ConstructorParameters<typeof HttpMedusaTargetResolver>[0]["controlPlane"],
    keys
  });
}

test("two tenants in one worker resolve to their own engines and their own keys", async () => {
  const keys = new InMemoryMedusaAdminKeyStore();
  await keys.put(TENANT_A, "key-a");
  await keys.put(TENANT_B, "key-b");

  const resolver = resolverFor(
    { [TENANT_A]: "https://a.medusa.example", [TENANT_B]: "https://b.medusa.example" },
    keys
  );

  const a = await resolver.resolve(TENANT_A);
  const b = await resolver.resolve(TENANT_B);

  assert.equal(a.baseUrl, "https://a.medusa.example");
  assert.equal(b.baseUrl, "https://b.medusa.example");
  assert.notEqual(a.secretKey, b.secretKey);
});

test("a tenant without a credential fails rather than resolving with an empty key", async () => {
  const resolver = resolverFor({ [TENANT_A]: "https://a.medusa.example" }, new InMemoryMedusaAdminKeyStore());
  await assert.rejects(() => resolver.resolve(TENANT_A), /no Medusa admin credential/);
});

test("a commerce call authenticates with Basic, to the resolved host", async () => {
  const keys = new InMemoryMedusaAdminKeyStore();
  await keys.put(TENANT_A, "secret-key-a");
  const calls: { url: string; authorization: string }[] = [];
  const transport: Transport = async (url, init) => {
    calls.push({ url, authorization: (init.headers as Record<string, string>).authorization ?? "" });
    return { ok: true, status: 200, text: () => Promise.resolve('{"variants":[]}') };
  };

  const client = new HttpCommerceClient({ resolver: resolverFor({ [TENANT_A]: "https://a.medusa.example" }, keys), transport });
  await client.resolveVariantsBySku({ tenantId: TENANT_A, skus: ["SKU-1"] });

  assert.equal(calls.length, 1);
  const call = calls[0];
  assert.ok(call);
  assert.ok(call.url.startsWith("https://a.medusa.example/admin/variants"));
  // Medusa rejects a secret key sent as Bearer, so the scheme is part of the contract.
  const expected = `Basic ${Buffer.from("secret-key-a:", "utf8").toString("base64")}`;
  assert.equal(call.authorization, expected);
  assert.ok(!call.authorization.startsWith("Bearer"));
});
