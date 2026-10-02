/**
 * M6 WMS end-to-end test against a real Medusa HTTP server (docs/adr/0018).
 *
 * The unit-level tests of the ledger, the workflows and the routes each prove a piece. This test
 * proves the M6 exit criteria against the real engine, because those criteria are statements about
 * the system as a whole:
 *
 *   - a received purchase order increases available stock at a specific bin — the units appear in
 *     the staging bin *and* Medusa's inventory level rises at the warehouse's stock location, so the
 *     number a channel would be pushed is the number the shelf holds;
 *   - a pick completes only with the right barcode, and a wrong-item scan is refused;
 *   - a stocktake variance produces an auditable adjustment — a signed `stocktake` movement whose
 *     reason carries the counted number — and never overwrites the quantity.
 *
 * It walks the flow over HTTP, which is the only path that exercises the routes, the middlewares and
 * the workflows together, and reads the engine's inventory level straight from the tenant schema to
 * show both halves of the write moved. Skipped when `TEST_DATABASE_URL` is absent, like the other
 * real-Medusa tests.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresTenantSchemaAdmin } from "@platform/control-plane";
import {
  DATABASE_URL,
  databaseUrlFor,
  runMedusa,
  startServer
} from "./medusa-harness.ts";

const TENANT_ID = "tnt-wms-itest";
const MINT_SCRIPT = "src/scripts/mint-tenant-api-key.ts";
const WMS_SCRIPT = "src/scripts/seed-tenant-wms.ts";

interface WmsSeed {
  readonly sku: string;
  readonly barcode: string;
  readonly variantId: string;
  readonly stockLocationId: string;
  readonly warehouseId: string;
  readonly stagingBinId: string;
  readonly storageBinId: string;
  readonly packingBinId: string;
  readonly purchaseOrderId: string;
  readonly receiptStatus: string;
  readonly pickTaskId: string;
  readonly expectedBarcode: string | null;
  readonly pickStatus: string;
  readonly stocktakeSystemQuantity: number;
  readonly stocktakeVariance: number;
  readonly storageContents: { sku: string; quantity: number }[];
  readonly packingContents: { sku: string; quantity: number }[];
}

/** A thin Admin API client with the secret key over HTTP Basic, the way the console calls it. */
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

function parseSeed(stdout: string): WmsSeed {
  return parseSeedLine(stdout) as unknown as WmsSeed;
}

test(
  "a received PO raises stock at a bin and in Medusa, a pick needs the right barcode, and a stocktake is an auditable adjustment",
  { skip: DATABASE_URL === undefined ? "TEST_DATABASE_URL not set" : false },
  async (t) => {
    const databaseName = `wms_itest_${process.pid}_${Date.now()}`;
    const admin = new Pool({ connectionString: DATABASE_URL! });
    await admin.query(`create database ${databaseName}`);
    const tenantDatabaseUrl = databaseUrlFor(DATABASE_URL!, databaseName);

    const schemaAdmin = new PostgresTenantSchemaAdmin(tenantDatabaseUrl);
    const schemaName = `tenant_wms_${process.pid}`;
    const port = 47_000 + (process.pid % 1000);

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
      JWT_SECRET: "wms-itest",
      COOKIE_SECRET: "wms-itest",
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

    const fixture = await runMedusa(
      ["exec", `./${WMS_SCRIPT}`],
      { ...env, SEED_BASE_URL: `http://127.0.0.1:${port}`, SEED_SECRET_KEY: secretKey },
      300_000
    );
    assert.equal(
      fixture.exitCode,
      0,
      `the WMS fixture failed:\n${fixture.stdout.slice(-2000)}\n${fixture.stderr.slice(-2000)}`
    );
    const seed = parseSeed(fixture.stdout);

    const call = adminFetch(port, secretKey);

    await t.test("the received units are in the staging bin and the engine's level rose by the same amount", async () => {
      assert.equal(seed.receiptStatus, "received", "receiving the whole PO completes it");

      // The staging bin is where a delivery lands before put-away. The fixture then moved all ten
      // to storage, so staging reads back to zero — which is itself the put-away proof.
      const staging = await call(`/admin/wms/bins/${seed.stagingBinId}/contents`);
      assert.equal(staging.status, 200);
      const stagingContents = (staging.body as { contents: { sku: string; quantity: number }[] }).contents;
      assert.equal(
        stagingContents.find((entry) => entry.sku === seed.sku)?.quantity,
        0,
        "staging must be empty after the delivery was put away"
      );

      // Storage holds what was put away, less what was picked and less the stocktake's -1: 10 - 4 - 1.
      assert.equal(
        seed.storageContents.find((entry) => entry.sku === seed.sku)?.quantity,
        5,
        "storage must hold put-away less picked less the counted variance"
      );
      assert.equal(
        seed.packingContents.find((entry) => entry.sku === seed.sku)?.quantity,
        4,
        "the picked units must be in the packing bin"
      );

      // The engine's own level, read from the tenant schema. This is the half a channel is pushed,
      // so it has to be the same movement the ledger recorded: 10 received, 1 lost to the count.
      const pool = new Pool({ connectionString: tenantDatabaseUrl, options: `-c search_path=${schemaName}` });
      try {
        const { rows } = await pool.query<{ stocked_quantity: number }>(
          `select l.stocked_quantity
             from inventory_level l
             join inventory_item i on i.id = l.inventory_item_id
            where i.sku = $1 and l.location_id = $2`,
          [seed.sku, seed.stockLocationId]
        );
        assert.equal(rows.length, 1, "the received SKU must have one level at the warehouse's location");
        assert.equal(
          Number(rows[0]!.stocked_quantity),
          9,
          "Medusa's stocked quantity must equal received minus the stocktake variance"
        );
      } finally {
        await pool.end();
      }
    });

    await t.test("the M4 push read returns the WMS-adjusted number, so the change can propagate", async () => {
      // The criterion is "WMS operations reflect in channel stock". The push is addressed by the
      // stored listing map and its *comparison* value comes from `GET /admin/stock-levels` — the
      // route the worker's `listStockLevels` calls (docs/adr/0015). Reading it here proves the two
      // halves meet: the WMS moved `inventory_level`, and the exact read the push compares against
      // now reports the moved number, so the next reconciliation pass has nothing to drift against.
      const levels = await call(`/admin/stock-levels?sku=${encodeURIComponent(seed.sku)}`);
      assert.equal(levels.status, 200);
      const level = (levels.body as { levels: { sku: string; available: number }[] }).levels.find(
        (entry) => entry.sku === seed.sku
      );
      assert.ok(level !== undefined, "the tenant must sell the received SKU");
      assert.equal(
        level.available,
        9,
        "the push's own read must return received-minus-variance, so a channel push carries the warehouse's number"
      );
    });

    await t.test("a pick completes only with the right barcode", async () => {
      assert.equal(seed.expectedBarcode, seed.barcode, "the task must carry the variant's barcode");
      assert.equal(seed.pickStatus, "completed", "scanning the right barcode completes the task");

      // A second task, then a wrong-item scan: the units must not move and the scan must be refused.
      const task = await call("/admin/wms/pick-tasks", {
        method: "POST",
        body: {
          warehouseId: seed.warehouseId,
          orderId: "order_seed_wrong_scan",
          packingBinId: seed.packingBinId,
          lines: [{ sku: seed.sku, quantity: 1 }]
        }
      });
      assert.equal(task.status, 201);
      const wrongTaskId = (task.body as { pickTask: { pickTaskId: string } }).pickTask.pickTaskId;

      const before = await call(`/admin/wms/bins/${seed.storageBinId}/contents`);
      const beforeQuantity =
        (before.body as { contents: { sku: string; quantity: number }[] }).contents.find(
          (entry) => entry.sku === seed.sku
        )?.quantity ?? 0;

      const wrong = await call(`/admin/wms/pick-tasks/${wrongTaskId}/scans`, {
        method: "POST",
        body: { sku: seed.sku, barcode: "0000000000000", quantity: 1 }
      });
      assert.equal(wrong.status, 400, "a wrong-item scan must be refused");

      const after = await call(`/admin/wms/bins/${seed.storageBinId}/contents`);
      const afterQuantity =
        (after.body as { contents: { sku: string; quantity: number }[] }).contents.find(
          (entry) => entry.sku === seed.sku
        )?.quantity ?? 0;
      assert.equal(afterQuantity, beforeQuantity, "a refused scan must move no stock");
    });

    await t.test("a stocktake variance is a signed movement, not an overwrite", async () => {
      assert.equal(seed.stocktakeSystemQuantity, 6, "the count opened against 10 put away less 4 picked");
      assert.equal(seed.stocktakeVariance, -1, "counting 5 against a system 6 is a variance of -1");

      // The ledger holds the correction as a movement whose reason carries the counted number, so the
      // change is explainable afterwards. Counting it also proves nothing was overwritten.
      const pool = new Pool({ connectionString: tenantDatabaseUrl, options: `-c search_path=${schemaName}` });
      try {
        const { rows } = await pool.query<{ kind: string; delta: number; reason: string | null }>(
          `select kind, delta, reason
             from wms_stock_movement
            where bin_id = $1 and sku = $2
            order by created_at asc, id asc`,
          [seed.storageBinId, seed.sku]
        );
        const kinds = rows.map((row) => row.kind);
        // Only the movements that touched the storage bin: put-away put 10 in, the pick took 4 out,
        // the count corrected by 1. The other half of each relocation is on the staging and packing
        // bins, which is what makes the pair a relocation rather than a double count.
        assert.deepEqual(kinds, ["put_away", "pick", "stocktake"]);

        const stocktake = rows.at(-1)!;
        assert.equal(stocktake.delta, -1, "the variance must be applied as a signed delta");
        assert.match(stocktake.reason ?? "", /counted 5 against 6/, "the reason must explain the change");

        // Every movement is retained: the receipt into staging, staging out and storage in for the
        // put-away, storage out and packing in for the pick, and the count. A correction that deleted
        // or updated a row would show up here as a missing kind or a lower count.
        const total = await pool.query<{ count: string }>(
          `select count(*)::text as count from wms_stock_movement where sku = $1`,
          [seed.sku]
        );
        assert.equal(total.rows[0]?.count, "6", "the ledger is append-only; nothing was rewritten");
      } finally {
        await pool.end();
      }
    });

    await t.test("receiving more than a line's outstanding quantity is refused", async () => {
      const over = await call(`/admin/wms/purchase-orders/${seed.purchaseOrderId}/receive`, {
        method: "POST",
        body: { lines: [{ sku: seed.sku, quantity: 1 }], actor: "itest" }
      });
      assert.equal(over.status, 400, "a fully received line has nothing outstanding to receive");
    });
  }
);
