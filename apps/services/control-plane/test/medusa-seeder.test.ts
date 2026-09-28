/**
 * Tenant seeding tests.
 *
 * The seeder makes real HTTP calls against a tenant's Medusa Admin API, so the things worth
 * testing are the wire contract (auth shape, idempotent convergence) rather than a stub's return
 * value. The transport is a recording fake because there is no live Medusa in a unit test; every
 * other input — the key store, the target store, the region lookup — is the real implementation.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryMedusaAdminKeyStore } from "@platform/secrets";
import { TENANT_DEFAULTS, HttpTenantSeeder } from "../src/medusa-seeder.ts";
import { InMemoryMedusaTargetStore } from "../src/medusa-target.ts";
import { createLogger } from "../src/logging.ts";

const silentLogger = createLogger("error", {}, () => {});
const TENANT = "tnt_seed_a";

interface Recorded {
  readonly url: string;
  readonly method: string;
  readonly authorization: string | undefined;
  readonly body: string | undefined;
}

/** A transport that answers list routes from a mutable state and records every call. */
function fakeTenant(state: { region: boolean; stockLocation: boolean }) {
  const calls: Recorded[] = [];
  const transport = (async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const target = String(url);
    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({
      url: target,
      method,
      authorization: headers.get("authorization") ?? undefined,
      body
    });

    if (method === "GET" && target.includes("/admin/regions")) {
      return json({ regions: state.region ? [{ id: "reg_seeded" }] : [] });
    }
    if (method === "POST" && target.endsWith("/admin/regions")) {
      state.region = true;
      return json({ region: { id: "reg_seeded" } });
    }
    if (method === "GET" && target.includes("/admin/stock-locations")) {
      return json({ stock_locations: state.stockLocation ? [{ id: "sloc_seeded" }] : [] });
    }
    if (method === "POST" && target.endsWith("/admin/stock-locations")) {
      state.stockLocation = true;
      return json({ stock_location: { id: "sloc_seeded" } });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { transport, calls };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

async function harness(state: { region: boolean; stockLocation: boolean }, region: "id-jkt" | "sg-sin" = "id-jkt") {
  const keys = new InMemoryMedusaAdminKeyStore();
  const targets = new InMemoryMedusaTargetStore();
  await keys.put(TENANT, "sk_test_value");
  await targets.set({ tenantId: TENANT, baseUrl: "https://tenant.internal" });
  const { transport, calls } = fakeTenant(state);
  const seeder = new HttpTenantSeeder({
    keys,
    targets,
    regionFor: async () => region,
    logger: silentLogger,
    transport
  });
  return { seeder, calls };
}

test("seeding creates the region and stock location a tenant needs to import an order", async () => {
  const state = { region: false, stockLocation: false };
  const { seeder, calls } = await harness(state);

  await seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" });

  assert.equal(state.region, true);
  assert.equal(state.stockLocation, true);
  const regionPost = calls.find((c) => c.method === "POST" && c.url.endsWith("/admin/regions"));
  assert.deepEqual(JSON.parse(regionPost?.body ?? "{}"), {
    name: "Indonesia",
    currency_code: "idr",
    countries: ["id"]
  });
});

test("the tenant's region decides the currency, not a hardcoded default", async () => {
  const state = { region: false, stockLocation: false };
  const { seeder, calls } = await harness(state, "sg-sin");

  await seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" });

  const regionPost = calls.find((c) => c.method === "POST" && c.url.endsWith("/admin/regions"));
  assert.equal(JSON.parse(regionPost?.body ?? "{}").currency_code, TENANT_DEFAULTS["sg-sin"].currencyCode);
});

test("seeding presents the tenant admin key over Basic, which is what Medusa accepts", async () => {
  const state = { region: false, stockLocation: false };
  const { seeder, calls } = await harness(state);

  await seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" });

  assert.ok(calls.length > 0);
  const expected = `Basic ${Buffer.from("sk_test_value:", "utf8").toString("base64")}`;
  for (const call of calls) {
    assert.equal(call.authorization, expected);
  }
});

test("seeding twice does not create a second region or stock location", async () => {
  const state = { region: false, stockLocation: false };
  const { seeder, calls } = await harness(state);

  await seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" });
  await seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" });

  // The step contract is idempotency: a resumed provisioning run must converge, and a duplicate
  // region is a hard failure because a country can belong to only one region.
  const regionPosts = calls.filter((c) => c.method === "POST" && c.url.endsWith("/admin/regions"));
  const locationPosts = calls.filter((c) => c.method === "POST" && c.url.endsWith("/admin/stock-locations"));
  assert.equal(regionPosts.length, 1);
  assert.equal(locationPosts.length, 1);
});

test("seeding refuses a tenant with no registered target", async () => {
  const keys = new InMemoryMedusaAdminKeyStore();
  await keys.put(TENANT, "sk_test_value");
  const seeder = new HttpTenantSeeder({
    keys,
    targets: new InMemoryMedusaTargetStore(),
    regionFor: async () => "id-jkt",
    logger: silentLogger,
    transport: (async () => json({})) as unknown as typeof fetch
  });

  await assert.rejects(
    () => seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" }),
    /target is not registered/
  );
});

test("seeding refuses a tenant with no admin credential rather than calling unauthenticated", async () => {
  const targets = new InMemoryMedusaTargetStore();
  await targets.set({ tenantId: TENANT, baseUrl: "https://tenant.internal" });
  let called = false;
  const seeder = new HttpTenantSeeder({
    keys: new InMemoryMedusaAdminKeyStore(),
    targets,
    regionFor: async () => "id-jkt",
    logger: silentLogger,
    transport: (async () => {
      called = true;
      return json({});
    }) as unknown as typeof fetch
  });

  await assert.rejects(
    () => seeder.seed({ tenantId: TENANT, schemaName: "tenant_x" }),
    /no admin credential/
  );
  assert.equal(called, false, "no request may be sent without a credential");
});
