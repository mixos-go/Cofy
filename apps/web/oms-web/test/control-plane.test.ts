/**
 * The seller UI's client, pinned against the control plane's routes (docs/PLAN.md M6).
 *
 * The warehouse pages exercise this client through a running control plane, which proves the reads
 * and writes work. This file pins what a page cannot see: the exact URL and method each function
 * issues, and the fact that a failure is returned as a value rather than thrown.
 *
 * That is the lesson AGENTS.md §10 records — a client whose method addressed a path no route served
 * while both sides' tests stayed green, because nothing exercised the seam between them. Stubbing
 * `fetch` here makes a rename on the control plane a failing test on this side.
 */

import test from "node:test";
import assert from "node:assert/strict";

import type { ApiResult } from "../src/control-plane.ts";
import {
  applyStocktake,
  createBin,
  createPickTask,
  createPurchaseOrder,
  createWarehouse,
  disconnectChannel,
  getBinContents,
  getOrder,
  listBins,
  listOrders,
  listPickTasks,
  listPurchaseOrders,
  listStockMovements,
  listStocktakes,
  listWarehouses,
  openStocktake,
  putAway,
  receivePurchaseOrder,
  scanPickLine
} from "../src/control-plane.ts";

interface Call {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

const BASE = "https://control-plane.example.test";

/** The `failed` arm of an `ApiResult`, so its status and message are readable at each use. */
function failed(result: ApiResult<unknown>): { readonly status: number; readonly message: string } {
  assert.equal(result.ok, false, "expected a failed result");
  assert.equal(result.ok === false && result.kind, "failed", "expected a `failed` result, not `unauthenticated`");
  return result as { readonly status: number; readonly message: string };
}

/** The `unauthenticated` arm, which is the only failure a page answers with a redirect. */
function unauthenticated(result: ApiResult<unknown>): boolean {
  return result.ok === false && result.kind === "unauthenticated";
}

/** Install a `fetch` that records the call and answers with `body`, and restore it afterwards. */
function stubFetch(t: { after: (fn: () => void) => void }, body: unknown, status = 200): Call[] {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({
      url,
      method: init?.method ?? "GET",
      body: init?.body === undefined ? null : JSON.parse(String(init.body))
    });
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

test("the warehouse client", async (t) => {
  process.env.CONTROL_PLANE_BASE_URL = BASE;

  await t.test("every read addresses the seller route the control plane serves", async () => {
    const calls = stubFetch(t, {});

    await listWarehouses("tok");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/warehouses`);

    await listBins("tok");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/bins`);
    await listBins("tok", "wh_1");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/bins?warehouseId=wh_1`);

    await getBinContents("tok", "bin_1");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/bins/bin_1/contents`);

    await listStockMovements("tok", "bin_1");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/stock-movements?binId=bin_1`);
    await listStockMovements("tok", "bin_1", "SKU-1");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/stock-movements?binId=bin_1&sku=SKU-1`);

    await listPurchaseOrders("tok");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/purchase-orders`);

    await listPickTasks("tok");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/pick-tasks`);
    await listPickTasks("tok", { warehouseId: "wh_1", status: "open" });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/pick-tasks?warehouseId=wh_1&status=open`);

    await listStocktakes("tok", { status: "open" });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/stocktakes?status=open`);

    // Every read is a GET and carries the session as a bearer, never in the URL.
    for (const call of calls) {
      assert.equal(call.method, "GET", `${call.url} must be a GET`);
    }
  });

  await t.test("every write addresses the route the control plane serves", async () => {
    const calls = stubFetch(t, {});

    await createWarehouse("tok", { name: "Gudang" });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/warehouses`);
    assert.equal(calls.at(-1)?.method, "POST");
    assert.deepEqual(calls.at(-1)?.body, { name: "Gudang" });

    await createBin("tok", { warehouseId: "wh_1", code: "A-01", kind: "storage" });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/bins`);

    await createPurchaseOrder("tok", {
      warehouseId: "wh_1",
      lines: [{ sku: "SKU-1", title: "Kaos", orderedQuantity: 10 }]
    });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/purchase-orders`);

    await receivePurchaseOrder("tok", "po_1", [{ sku: "SKU-1", quantity: 10 }]);
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/purchase-orders/po_1/receive`);
    // The seller's identity is not sent: the control plane attributes the act from the session.
    assert.deepEqual(calls.at(-1)?.body, { lines: [{ sku: "SKU-1", quantity: 10 }] });

    await putAway("tok", { warehouseId: "wh_1", fromBinId: "a", toBinId: "b", sku: "SKU-1", quantity: 4 });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/put-away`);

    await createPickTask("tok", {
      warehouseId: "wh_1",
      orderId: "order_1",
      packingBinId: "bin_pack",
      lines: [{ sku: "SKU-1", quantity: 2 }]
    });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/pick-tasks`);

    await scanPickLine("tok", "task_1", { sku: "SKU-1", barcode: "123", quantity: 2 });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/pick-tasks/task_1/scans`);

    await openStocktake("tok", { warehouseId: "wh_1", binId: "bin_1", sku: "SKU-1" });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/stocktakes`);

    await applyStocktake("tok", "st_1", 7);
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/stocktakes/st_1/apply`);
    assert.deepEqual(calls.at(-1)?.body, { countedQuantity: 7 });
  });

  await t.test("a bin id and an order id are escaped, so a slash cannot address another route", async () => {
    const calls = stubFetch(t, {});
    await getBinContents("tok", "bin/../wh_9");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/bins/bin%2F..%2Fwh_9/contents`);

    await scanPickLine("tok", "task/../task_9", { sku: "S", barcode: "B", quantity: 1 });
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/wms/pick-tasks/task%2F..%2Ftask_9/scans`);
  });

  await t.test("a failure is returned as a value, and a 401 is distinguished from the rest", async () => {
    // A 403 is a message the page renders; a 401 is the only one the page answers with a redirect.
    stubFetch(t, { error: { message: "You do not have permission to move stock." } }, 403);
    const forbidden = await createBin("tok", { warehouseId: "wh_1", code: "A-01", kind: "storage" });
    assert.equal(forbidden.ok, false);
    assert.equal(failed(forbidden).status, 403);
    assert.equal(failed(forbidden).message, "You do not have permission to move stock.");

    stubFetch(t, { error: { message: "Your session has expired." } }, 401);
    const expired = await listWarehouses("tok");
    assert.equal(unauthenticated(expired), true);

    // A malformed body is a generic failure, not a crash: the page still has to render something.
    stubFetch(t, { not: "an error envelope" }, 500);
    const broken = await listWarehouses("tok");
    assert.equal(failed(broken).status, 500);

    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("connection refused");
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = original;
    });
    const unreachable = await listWarehouses("tok");
    assert.equal(failed(unreachable).status, 0);
  });

  await t.test("the channel client is unchanged by the warehouse surface", async () => {
    const calls = stubFetch(t, { disconnected: true, channel: "shopee" });
    await disconnectChannel("tok", "shopee");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/channels/shopee/disconnect`);
  });

  await t.test("the order reads address the seller routes, and a shipment rides on the detail", async () => {
    const calls = stubFetch(t, { orders: [], total: 0 });

    await listOrders("tok");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/orders?limit=20&offset=0`);
    assert.equal(calls.at(-1)?.method, "GET");

    // The order id is escaped, so a slash cannot address another route.
    await getOrder("tok", "order/../order_9");
    assert.equal(calls.at(-1)?.url, `${BASE}/v1/seller/orders/order%2F..%2Forder_9`);
  });
});
