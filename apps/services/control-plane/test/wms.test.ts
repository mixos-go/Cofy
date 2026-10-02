/**
 * The warehouse client's own contract (docs/PLAN.md M6).
 *
 * The route tests exercise the client through the server, which proves the authorization path and
 * the projection. This file pins what they cannot see: the exact URL and method each method issues,
 * and the fact that a response we cannot parse is an upstream fault rather than an empty list.
 *
 * That is not ceremony. AGENTS.md §10 records a client whose method addressed a path the route did
 * not serve while every test on both sides stayed green — the worker stubbed the client and the
 * control plane called the route directly, so nothing exercised the seam. Pinning the URL against a
 * fake transport is what makes a rename on one side a failing test on the other.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryMedusaAdminKeyStore } from "@platform/secrets";
import { InMemoryMedusaTargetStore } from "../src/medusa-target.ts";
import { HttpWmsClient } from "../src/wms.ts";
import type { WmsTransport } from "../src/wms.ts";
import { createLogger } from "../src/logging.ts";

const TENANT = "tnt-1";

interface Call {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
  readonly authorization: string | undefined;
}

async function harness(): Promise<{
  client: HttpWmsClient;
  calls: Call[];
  reply: (body: unknown, status?: number) => void;
  setRaw: (text: string, status?: number) => void;
}> {
  const targets = new InMemoryMedusaTargetStore();
  const keys = new InMemoryMedusaAdminKeyStore();
  await targets.set({ tenantId: TENANT, baseUrl: "https://tenant.example.test" });
  await keys.put(TENANT, "sk_test_secret");

  const calls: Call[] = [];
  let next: { text: string; status: number } = { text: "{}", status: 200 };

  const transport: WmsTransport = async (url, init) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      body: init.body === undefined ? null : JSON.parse(String(init.body)),
      authorization: (init.headers as Record<string, string> | undefined)?.authorization
    });
    return { ok: next.status >= 200 && next.status < 300, status: next.status, text: async () => next.text };
  };

  const client = new HttpWmsClient({
    targets,
    keys,
    transport,
    logger: createLogger("error", {}, () => {})
  });

  return {
    client,
    calls,
    reply: (body, status = 200) => {
      next = { text: JSON.stringify(body), status };
    },
    setRaw: (text, status = 200) => {
      next = { text, status };
    }
  };
}

test("the warehouse client", async (t) => {
  await t.test("every read addresses the tenant instance's own Admin route, over a Basic credential", async () => {
    const h = await harness();

    h.reply({ warehouses: [] });
    await h.client.listWarehouses(TENANT);
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/warehouses");

    h.reply({ bins: [] });
    await h.client.listBins(TENANT);
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/bins");
    await h.client.listBins(TENANT, "wh_1");
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/bins?warehouseId=wh_1");

    h.reply({ binId: "bin_1", code: "A-01", kind: "storage", contents: [] });
    await h.client.getBinContents(TENANT, "bin_1");
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/bins/bin_1/contents");

    h.reply({ purchaseOrders: [] });
    await h.client.listPurchaseOrders(TENANT);
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/purchase-orders");

    h.reply({ pickTasks: [] });
    await h.client.listPickTasks(TENANT, { warehouseId: "wh_1", status: "open" });
    assert.equal(
      h.calls.at(-1)?.url,
      "https://tenant.example.test/admin/wms/pick-tasks?warehouseId=wh_1&status=open"
    );

    h.reply({ stocktakes: [] });
    await h.client.listStocktakes(TENANT);
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/stocktakes");

    h.reply({ movements: [] });
    await h.client.listStockMovements(TENANT, { binId: "bin_1", sku: "SKU-1" });
    assert.equal(
      h.calls.at(-1)?.url,
      "https://tenant.example.test/admin/wms/stock-movements?binId=bin_1&sku=SKU-1"
    );

    // Every read is a GET and carries the tenant's key over Basic, never a bearer (ADR 0012).
    for (const call of h.calls) {
      assert.equal(call.method, "GET", `${call.url} must be a GET`);
      assert.ok(call.authorization?.startsWith("Basic "), `${call.url} must carry a Basic credential`);
    }
  });

  await t.test("every write addresses the route the data plane actually serves", async () => {
    const h = await harness();

    h.reply({ warehouse: { id: "wh_1", name: "Gudang", stockLocationId: null } }, 201);
    await h.client.createWarehouse({ tenantId: TENANT, name: "Gudang" });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/warehouses");
    assert.equal(h.calls.at(-1)?.method, "POST");

    h.reply({ bin: { id: "bin_1", warehouseId: "wh_1", code: "A-01", kind: "storage" } }, 201);
    await h.client.createBin({ tenantId: TENANT, warehouseId: "wh_1", code: "A-01", kind: "storage" });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/bins");

    h.reply(
      {
        purchaseOrder: {
          id: "po_1",
          warehouseId: "wh_1",
          status: "ordered",
          lines: [{ id: "pol_1", sku: "SKU-1", orderedQuantity: 10 }]
        }
      },
      201
    );
    await h.client.createPurchaseOrder({
      tenantId: TENANT,
      warehouseId: "wh_1",
      lines: [{ sku: "SKU-1", title: "Kaos", orderedQuantity: 10 }]
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/purchase-orders");

    h.reply({ receipt: { purchaseOrderId: "po_1", stagingBinId: "bin_stg", status: "received" } });
    await h.client.receivePurchaseOrder({
      tenantId: TENANT,
      purchaseOrderId: "po_1",
      lines: [{ sku: "SKU-1", quantity: 10 }],
      actor: "seller@example.com"
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/purchase-orders/po_1/receive");

    h.reply({ putAway: { fromBinId: "a", toBinId: "b", sku: "SKU-1", quantity: 4 } });
    await h.client.putAway({
      tenantId: TENANT,
      warehouseId: "wh_1",
      fromBinId: "a",
      toBinId: "b",
      sku: "SKU-1",
      quantity: 4,
      actor: null
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/put-away");

    h.reply(
      {
        pickTask: {
          pickTaskId: "task_1",
          orderId: "order_1",
          packingBinId: "bin_pack",
          lines: [{ id: "ptl_1", sku: "SKU-1", quantity: 2, binId: "bin_st", expectedBarcode: "123" }]
        }
      },
      201
    );
    const task = await h.client.createPickTask({
      tenantId: TENANT,
      warehouseId: "wh_1",
      orderId: "order_1",
      packingBinId: "bin_pack",
      lines: [{ sku: "SKU-1", quantity: 2 }]
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/pick-tasks");
    // The created line's id comes back so a caller can scan it without re-reading the task.
    assert.equal(task.lines[0]?.id, "ptl_1");

    h.reply({ scan: { pickTaskId: "task_1", sku: "SKU-1", picked: 2, status: "completed" } });
    await h.client.scanPickLine({
      tenantId: TENANT,
      pickTaskId: "task_1",
      sku: "SKU-1",
      barcode: "123",
      quantity: 2,
      actor: null
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/pick-tasks/task_1/scans");

    h.reply({ stocktake: { stocktakeId: "st_1", systemQuantity: 10 } }, 201);
    await h.client.openStocktake({ tenantId: TENANT, warehouseId: "wh_1", binId: "bin_1", sku: "SKU-1" });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/stocktakes");

    h.reply({
      stocktake: {
        stocktakeId: "st_1",
        warehouseId: "wh_1",
        sku: "SKU-1",
        binId: "bin_1",
        systemQuantity: 10,
        countedQuantity: 7,
        variance: -3,
        quantityAfter: 7
      }
    });
    const applied = await h.client.applyStocktake({
      tenantId: TENANT,
      stocktakeId: "st_1",
      countedQuantity: 7,
      countedBy: "seller@example.com"
    });
    assert.equal(h.calls.at(-1)?.url, "https://tenant.example.test/admin/wms/stocktakes/st_1/apply");
    assert.equal(applied.variance, -3);
  });

  await t.test("a response we cannot parse is an upstream fault, not an empty list", async () => {
    const h = await harness();

    // A renamed field is the failure this catches: the list would otherwise read as "no warehouses".
    h.reply({ warehouses: [{ id: "wh_1", name: "Gudang" }] });
    await assert.rejects(
      () => h.client.listWarehouses(TENANT),
      (error: { code?: string }) => error.code === "UPSTREAM_ERROR"
    );

    h.setRaw("<html>a proxy error page</html>");
    await assert.rejects(
      () => h.client.listWarehouses(TENANT),
      (error: { code?: string }) => error.code === "UPSTREAM_ERROR"
    );

    h.setRaw("", 200);
    await assert.rejects(
      () => h.client.listWarehouses(TENANT),
      (error: { code?: string }) => error.code === "UPSTREAM_ERROR"
    );
  });

  await t.test("a tenant with no target or no key is a hard 404 before any request is made", async () => {
    const targets = new InMemoryMedusaTargetStore();
    const keys = new InMemoryMedusaAdminKeyStore();
    let called = false;
    const client = new HttpWmsClient({
      targets,
      keys,
      transport: async () => {
        called = true;
        return { ok: true, status: 200, text: async () => "{}" };
      },
      logger: createLogger("error", {}, () => {})
    });

    await assert.rejects(
      () => client.listWarehouses(TENANT),
      (error: { code?: string }) => error.code === "TENANT_NOT_FOUND"
    );

    await targets.set({ tenantId: TENANT, baseUrl: "https://tenant.example.test" });
    await assert.rejects(
      () => client.listWarehouses(TENANT),
      (error: { code?: string }) => error.code === "TENANT_NOT_FOUND"
    );
    assert.equal(called, false, "an unaddressable tenant must not produce a request");
  });

  await t.test("the engine's own message survives a refusal, and its status decides the code", async () => {
    const h = await harness();

    h.reply({ message: "No single storage bin holds 3 of SKU-1; the pick cannot be sourced." }, 400);
    await assert.rejects(
      () =>
        h.client.createPickTask({
          tenantId: TENANT,
          warehouseId: "wh_1",
          orderId: "order_1",
          packingBinId: "bin_pack",
          lines: [{ sku: "SKU-1", quantity: 3 }]
        }),
      (error: { code?: string; message?: string }) =>
        error.code === "VALIDATION_FAILED" && /cannot be sourced/.test(error.message ?? "")
    );

    h.reply({ message: "Purchase order po_9 was not found." }, 404);
    await assert.rejects(
      () =>
        h.client.receivePurchaseOrder({
          tenantId: TENANT,
          purchaseOrderId: "po_9",
          lines: [{ sku: "SKU-1", quantity: 1 }],
          actor: null
        }),
      (error: { code?: string }) => error.code === "NOT_FOUND"
    );

    // A 500 is the instance failing, which is retryable; it must not read as a bad request.
    h.reply({ message: "boom" }, 500);
    await assert.rejects(
      () => h.client.listWarehouses(TENANT),
      (error: { code?: string; retryable?: boolean }) =>
        error.code === "UPSTREAM_ERROR" && error.retryable === true
    );
  });
});

