/**
 * Seller-read end-to-end test against a real Medusa HTTP server (ADR 0016).
 *
 * The seller read is a proxy: the control plane calls the tenant's own `GET /admin/orders` with the
 * platform's secret API key. Every other test of it stubs the transport at the seam we own, which
 * proves the projection, the money conversion, the channel join and the authorization path — but not
 * that the fields we ask Medusa for are the fields it actually returns. A renamed or dropped field
 * (`display_id`, `email`, `variant_sku`, `*items`) would pass those tests and produce a seller list
 * full of nulls.
 *
 * This test closes that gap by booting a real vanilla Medusa 2.21.1 against a dedicated database:
 *
 *   1. `db:migrate` through the pinned CLI, into a tenant schema (the same path provisioning uses).
 *   2. `medusa exec` a fixture that creates a sales channel, an IDR region, a published product and
 *      one pending order through Medusa's own core workflows, and mints a secret API key.
 *   3. `medusa start` the real HTTP server.
 *   4. `SellerOrderReader` reads that order back over HTTP Basic and its output is asserted.
 *
 * Skipped when `TEST_DATABASE_URL` is absent, like the other real-Medusa integration tests, so
 * `pnpm test` runs without a database; run with `pnpm test:integration`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { Pool } from "pg";
import {
  PostgresTenantSchemaAdmin,
  SellerOrderReader
} from "@platform/control-plane";
import { InMemorySyncStateStore } from "@platform/sync-state";
import type { MedusaTargetStore } from "@platform/contracts";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import type { Logger } from "@platform/control-plane";

const DATABASE_URL = process.env.TEST_DATABASE_URL;

const MEDUSA_CWD = new URL("../../../../../data-plane/medusa-config", import.meta.url).pathname;
const MEDUSA_COMMAND = `${MEDUSA_CWD}/node_modules/.bin/medusa`;
const SEED_SCRIPT = "src/scripts/seed-seller-read-order.ts";

const TENANT_ID = "tnt-seller-read-itest";

function databaseUrlFor(base: string, databaseName: string): string {
  const url = new URL(base);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

interface SeedResult {
  readonly orderId: string;
  readonly displayId: number;
  readonly secretKey: string;
}

/** Runs a Medusa CLI subcommand to completion, returning its exit code and output. */
function runMedusa(
  args: readonly string[],
  env: Record<string, string>,
  timeoutMs: number
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(MEDUSA_COMMAND, [...args], {
      cwd: MEDUSA_CWD,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

/** Boots `medusa start` and waits for `/health`, so the reader has something real to call. */
async function startServer(
  env: Record<string, string>,
  port: number,
  timeoutMs: number
): Promise<{ stop: () => void }> {
  const child = spawn(MEDUSA_COMMAND, ["start", "--port", String(port)], {
    cwd: MEDUSA_CWD,
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  // Drained, never buffered: a verbose boot must not fill a pipe and stall the process.
  child.stdout.resume();
  child.stderr.resume();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (child.exitCode !== null) {
      throw new Error(`Medusa exited during boot with code ${child.exitCode}.`);
    }
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) {
        return { stop: () => child.kill("SIGKILL") };
      }
    } catch {
      // Not listening yet.
    }
  }
  child.kill("SIGKILL");
  throw new Error(`Medusa did not become healthy within ${timeoutMs}ms.`);
}

/** A target/key store over one already-running instance; the test knows both by construction. */
function storesFor(baseUrl: string, secretKey: string): {
  targets: MedusaTargetStore;
  keys: MedusaAdminKeyStore;
} {
  return {
    targets: {
      async get(tenantId) {
        return tenantId === TENANT_ID ? { tenantId: TENANT_ID, baseUrl } : null;
      },
      async set() {},
      async delete() {}
    },
    keys: {
      async get(tenantId) {
        return tenantId === TENANT_ID ? secretKey : null;
      },
      async put() {},
      async delete() {},
      async listTenants() {
        return [TENANT_ID];
      }
    }
  };
}

const silentLogger: Logger = {
  info() {},
  warn() {},
  error() {},
  debug() {},
  child() {
    return silentLogger;
  }
};

test(
  "the seller read returns a real Medusa order, with the fields and the money unit we ask for",
  { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false },
  async (t) => {
    const databaseName = `seller_read_itest_${process.pid}_${Date.now()}`;
    const admin = new Pool({ connectionString: DATABASE_URL! });
    await admin.query(`create database ${databaseName}`);
    const tenantDatabaseUrl = databaseUrlFor(DATABASE_URL!, databaseName);

    const schemaAdmin = new PostgresTenantSchemaAdmin(tenantDatabaseUrl);
    const schemaName = `tenant_seller_read_${process.pid}`;
    // A port in a private range, so a parallel run does not collide with a real service.
    const port = 45_000 + (process.pid % 1000);

    // One hook, so the order is explicit: the server stops, then its connections close, then the
    // database drops. Dropping first would terminate live connections and node-postgres raises
    // after the test has already reported. The server is held in a mutable slot because it only
    // exists once the fixture has run, but the hook must be registered before that can fail.
    const running: { server: { stop: () => void } | null } = { server: null };
    t.after(async () => {
      running.server?.stop();
      await schemaAdmin.close();
      await admin.query(`drop database if exists ${databaseName} with (force)`);
      await admin.end();
    });

    await schemaAdmin.createSchema(schemaName);

    const env = {
      DATABASE_URL: tenantDatabaseUrl,
      DATABASE_SCHEMA: schemaName,
      JWT_SECRET: "seller-read-itest",
      COOKIE_SECRET: "seller-read-itest",
      TENANT_ID,
      MEDUSA_DISABLE_TELEMETRY: "1",
      CI: "true"
    };

    const migrate = await runMedusa(["db:migrate"], env, 600_000);
    assert.equal(migrate.exitCode, 0, `db:migrate failed:\n${migrate.stderr.slice(-2000)}`);

    const seed = await runMedusa(["exec", `./${SEED_SCRIPT}`], env, 300_000);
    const seededLine = /SEED=(\{.*\})/.exec(seed.stdout);
    assert.ok(
      seededLine !== null,
      `the fixture did not print a SEED line:\n${seed.stdout.slice(-2000)}\n${seed.stderr.slice(-2000)}`
    );
    const seeded = JSON.parse(seededLine[1]!) as SeedResult;
    assert.equal(typeof seeded.displayId, "number", "Medusa's display_id must be a number, not a string");

    running.server = await startServer(env, port, 180_000);

    const baseUrl = `http://127.0.0.1:${port}`;
    const syncState = new InMemorySyncStateStore();
    // Committed refs are what attribute an order to a channel (ADR 0016 point 4). Reserving and
    // committing here is the same pair the importer performs, so the join is exercised for real.
    await syncState.reserveOrderRef({ tenantId: TENANT_ID, channel: "shopee", externalOrderId: "ext-1", now: new Date().toISOString() });
    await syncState.commitOrderRef(TENANT_ID, "shopee", "ext-1", seeded.orderId, new Date().toISOString());

    const reader = new SellerOrderReader({
      ...storesFor(baseUrl, seeded.secretKey),
      syncState,
      transport: fetch,
      logger: silentLogger
    });

    await t.test("the list returns the order, attributed to its channel", async () => {
      const list = await reader.listOrders({ tenantId: TENANT_ID, limit: 10, offset: 0 });
      assert.equal(list.total, 1);
      const summary = list.orders[0];
      assert.ok(summary, "the seeded order must be listed");
      assert.equal(summary.orderId, seeded.orderId);
      // If `display_id` came back as a string this would be null, which is exactly the regression
      // the stub-based tests cannot catch.
      assert.equal(summary.displayId, seeded.displayId);
      assert.equal(summary.status, "pending");
      assert.equal(summary.email, "buyer@example.com");
      assert.equal(summary.channel, "shopee");
      assert.equal(summary.externalOrderId, "ext-1");
      // `*items` must have come back, or the list shows an item count of 0.
      assert.equal(summary.itemCount, 2);
      // Medusa stores IDR in whole rupiah; the platform counts sen. 20000 rupiah x 2 = Rp 40.000.
      assert.deepEqual(summary.total, { amount: 4_000_000, currency: "IDR" });
    });

    await t.test("the detail returns lines with the sku and the unit price in sen", async () => {
      const detail = await reader.getOrder({ tenantId: TENANT_ID, orderId: seeded.orderId });
      assert.equal(detail.orderId, seeded.orderId);
      assert.equal(detail.lines.length, 1);
      const line = detail.lines[0];
      assert.ok(line, "the order must have its line item");
      assert.equal(line.sku, "SKU-1");
      assert.equal(line.title, "Kaos M");
      assert.equal(line.quantity, 2);
      assert.deepEqual(line.unitPrice, { amount: 2_000_000, currency: "IDR" });
      assert.deepEqual(line.subtotal, { amount: 4_000_000, currency: "IDR" });
      assert.deepEqual(detail.subtotal, { amount: 4_000_000, currency: "IDR" });
    });

    await t.test("the credential is required, so an unauthenticated read cannot list orders", async () => {
      const anonymous = await fetch(`${baseUrl}/admin/orders?limit=1`);
      assert.equal(anonymous.status, 401);
    });
  }
);
