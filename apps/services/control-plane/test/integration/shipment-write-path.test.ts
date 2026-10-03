/**
 * M7 shipment write-path end-to-end test against a real Medusa HTTP server (docs/adr/0020).
 *
 * The worker books a courier shipment in the integration plane and then has to make the tenant's
 * engine agree that the order shipped. That second half is what this test proves, over HTTP, which
 * is the only path that exercises the route, the middleware and the workflow together:
 *
 *   - recording a shipment creates a Medusa Fulfillment carrying the waybill, and it consumes the
 *     order's reservation (the unit count drops);
 *   - the fulfillment is stamped shipped, so the order reads as handed to a courier rather than
 *     merely packed;
 *   - re-recording the same waybill converges on the first fulfillment instead of fulfilling the
 *     order's items twice — the retry the worker will actually make;
 *   - the delivery-status pull path has its two ends: `/admin/shipments/active` returns the shipment
 *     (docs/adr/0021) and `.../status` advances it, idempotently on a repeat.
 *
 * It reads the fulfillment's label and the reservation straight from the tenant schema, because the
 * assertion that matters is about the engine's rows, not about a response body. Skipped when
 * `TEST_DATABASE_URL` is absent, like the other real-Medusa tests.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresTenantSchemaAdmin } from "@platform/control-plane";
import {
  DATABASE_URL,
  SHIPMENT_SEED_SCRIPT,
  databaseUrlFor,
  runMedusa,
  startServer
} from "./medusa-harness.ts";

const TENANT_ID = "tnt-shipment-itest";
const MINT_SCRIPT = "src/scripts/mint-tenant-api-key.ts";

interface ShipmentSeed {
  readonly orderId: string;
  readonly variantSku: string;
  readonly quantity: number;
  readonly shippingOptionId: string;
  readonly stockLocationId: string;
}

/** A thin Admin API client with the secret key over HTTP Basic, the way the worker calls it. */
function adminFetch(port: number, secretKey: string) {
  const auth = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
  return async (
    path: string,
    init: { method?: string; body?: unknown } = {}
  ): Promise<{ status: number; body: unknown }> => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: auth,
        ...(init.body === undefined ? {} : { "content-type": "application/json" })
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) })
    });
    const text = await response.text();
    return { status: response.status, body: text.length ? JSON.parse(text) : null };
  };
}

function parseSeedLine(stdout: string): Record<string, unknown> {
  const line = /SEED=(\{.*\})/.exec(stdout);
  assert.ok(line !== null, `the fixture did not print a SEED line:\n${stdout.slice(-2000)}`);
  return JSON.parse(line[1]!) as Record<string, unknown>;
}

test(
  "recording a shipment fulfills the order, carries the waybill, and a retry converges",
  { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false },
  async (t) => {
    const databaseName = `shipment_itest_${process.pid}_${Date.now()}`;
    const admin = new Pool({ connectionString: DATABASE_URL! });
    await admin.query(`create database ${databaseName}`);
    const tenantDatabaseUrl = databaseUrlFor(DATABASE_URL!, databaseName);

    const schemaAdmin = new PostgresTenantSchemaAdmin(tenantDatabaseUrl);
    const schemaName = `tenant_shipment_${process.pid}`;
    const port = 48_000 + (process.pid % 1000);

    // The server and the read-only pool both only exist once their dependencies do, but the cleanup
    // hook must be registered before anything can fail. Held in slots so one hook can order the
    // teardown: the server stops, the pool's connections close, then the database drops. Dropping
    // first would terminate a live connection and node-postgres raises after the test has reported.
    const running: { server: { stop: () => void } | null } = { server: null };
    const pool = new Pool({ connectionString: tenantDatabaseUrl, options: `-c search_path=${schemaName}` });
    t.after(async () => {
      running.server?.stop();
      await pool.end();
      await schemaAdmin.close();
      await admin.query(`drop database if exists ${databaseName} with (force)`);
      await admin.end();
    });

    await schemaAdmin.createSchema(schemaName);

    const env = {
      DATABASE_URL: tenantDatabaseUrl,
      DATABASE_SCHEMA: schemaName,
      JWT_SECRET: "shipment-itest",
      COOKIE_SECRET: "shipment-itest",
      TENANT_ID,
      MEDUSA_DISABLE_TELEMETRY: "1",
      CI: "true"
    };

    const migrate = await runMedusa(["db:migrate"], env, 600_000);
    assert.equal(migrate.exitCode, 0, `db:migrate failed:\n${migrate.stderr.slice(-2000)}`);

    const mint = await runMedusa(["exec", `./${MINT_SCRIPT}`], env, 300_000);
    assert.equal(mint.exitCode, 0, `the API-key fixture failed:\n${mint.stderr.slice(-2000)}`);
    const secretKey = parseSeedLine(mint.stdout).secretKey as string;
    assert.ok(secretKey.startsWith("sk_"), "Medusa's secret key token must start with sk_");

    running.server = await startServer(env, port, 180_000);

    const fixture = await runMedusa(["exec", `./${SHIPMENT_SEED_SCRIPT}`], env, 300_000);
    assert.equal(
      fixture.exitCode,
      0,
      `the shipment fixture failed:\n${fixture.stdout.slice(-2000)}\n${fixture.stderr.slice(-2000)}`
    );
    const seed = parseSeedLine(fixture.stdout) as unknown as ShipmentSeed;

    const call = adminFetch(port, secretKey);
    const waybill = { trackingNumber: "JNE-SHIP-0001", trackingUrl: "https://track.example.test/JNE-SHIP-0001" };

    // Live reservations, not the soft-deleted rows Medusa keeps: a consumed reservation is deleted,
    // so an assertion on `quantity > 0` would still pass if the row were merely emptied.
    const reservationCount = async (): Promise<number> => {
      const { rows } = await pool.query<{ count: string }>(
        `select count(*)::text as count from reservation_item where deleted_at is null`
      );
      return Number(rows[0]!.count);
    };

    const first = await call("/admin/shipments", {
      method: "POST",
      body: {
        orderId: seed.orderId,
        items: [{ sku: seed.variantSku, quantity: seed.quantity }],
        trackingNumber: waybill.trackingNumber,
        trackingUrl: waybill.trackingUrl,
        courier: "jne",
        serviceLevel: "regular",
        arrangement: "courier",
        channel: "shopee",
        externalOrderId: null
      }
    });

    await t.test("the shipment becomes a fulfillment carrying the waybill", async () => {
      assert.equal(first.status, 200, JSON.stringify(first.body));
      const body = first.body as { fulfillmentId: string; trackingNumber: string };
      assert.equal(body.trackingNumber, waybill.trackingNumber);

      const { rows } = await pool.query<{ tracking_number: string; tracking_url: string; shipped_at: Date | null }>(
        `select l.tracking_number, l.tracking_url, f.shipped_at
           from fulfillment_label l
           join fulfillment f on f.id = l.fulfillment_id
          where f.id = $1`,
        [body.fulfillmentId]
      );
      assert.equal(rows.length, 1, "the fulfillment must exist and carry exactly one label");
      assert.equal(rows[0]!.tracking_number, waybill.trackingNumber);
      assert.equal(rows[0]!.tracking_url, waybill.trackingUrl);
      assert.ok(rows[0]!.shipped_at !== null, "the fulfillment must be stamped shipped, not merely packed");
    });

    await t.test("the fulfillment consumes the order's reservation and takes the units out of stock", async () => {
      assert.equal(await reservationCount(), 0, "the reservation must be consumed, not left behind");

      const { rows } = await pool.query<{ stocked_quantity: string }>(
        `select stocked_quantity from inventory_level where location_id = $1`,
        [seed.stockLocationId]
      );
      assert.equal(rows.length, 1);
      assert.equal(
        Number(rows[0]!.stocked_quantity),
        98,
        "the fulfilled units must leave the location: 100 stocked less 2 shipped"
      );
    });

    await t.test("re-recording the same waybill converges instead of shipping twice", async () => {
      const second = await call("/admin/shipments", {
        method: "POST",
        body: {
          orderId: seed.orderId,
          items: [{ sku: seed.variantSku, quantity: seed.quantity }],
          trackingNumber: waybill.trackingNumber,
          trackingUrl: waybill.trackingUrl,
          courier: "jne",
          serviceLevel: "regular",
          arrangement: "courier",
          channel: "shopee",
          externalOrderId: null
        }
      });
      assert.equal(second.status, 200, JSON.stringify(second.body));
      assert.equal(
        (second.body as { fulfillmentId: string }).fulfillmentId,
        (first.body as { fulfillmentId: string }).fulfillmentId,
        "a retry must return the first fulfillment, not a new one"
      );

      const { rows } = await pool.query<{ count: string }>(
        `select count(*)::text as count from fulfillment`
      );
      assert.equal(rows[0]!.count, "1", "the retry must not create a second fulfillment");
    });

    await t.test("the active page returns the shipment, with its arrangement and handle", async () => {
      const active = await call("/admin/shipments/active?limit=10");
      assert.equal(active.status, 200, JSON.stringify(active.body));
      const shipments = (active.body as { shipments: { fulfillmentId: string; arrangement: string; courier?: string; status: string }[] })
        .shipments;
      const found = shipments.find(
        (entry) => entry.fulfillmentId === (first.body as { fulfillmentId: string }).fulfillmentId
      );
      assert.ok(found !== undefined, "the recorded shipment must be active and returned");
      assert.equal(found.arrangement, "courier");
      assert.equal(found.courier, "jne");
      assert.equal(found.status, "created");
    });

    await t.test("a status advance is recorded and a repeat is a no-op", async () => {
      const fulfillmentId = (first.body as { fulfillmentId: string }).fulfillmentId;
      const advance = {
        status: "in_transit",
        events: [{ status: "in_transit", occurredAt: "2026-09-26T00:00:00.000Z", description: "Departed" }]
      };

      const firstAdvance = await call(`/admin/shipments/${fulfillmentId}/status`, {
        method: "POST",
        body: advance
      });
      assert.equal(firstAdvance.status, 200, JSON.stringify(firstAdvance.body));
      assert.equal((firstAdvance.body as { advanced: boolean }).advanced, true);

      // The same status again must not append a second event: the pass re-reads and converges.
      const repeat = await call(`/admin/shipments/${fulfillmentId}/status`, {
        method: "POST",
        body: advance
      });
      assert.equal(repeat.status, 200, JSON.stringify(repeat.body));
      assert.equal((repeat.body as { advanced: boolean }).advanced, false);

      const { rows } = await pool.query<{ metadata: { shipment_status: string; shipment_events: unknown[] } }>(
        `select metadata from fulfillment where id = $1`,
        [fulfillmentId]
      );
      assert.equal(rows[0]!.metadata.shipment_status, "in_transit");
      assert.equal(rows[0]!.metadata.shipment_events.length, 1, "the repeat must not duplicate the event");
    });
  }
);
