/**
 * Inbound: purchase orders, receiving, and put-away (docs/PLAN.md M6, ADR 0018).
 *
 * The flow is one screen because it is one job done in one place: a delivery arrives against a PO,
 * the units land in the warehouse's staging bin, and they are moved to storage. Receiving is what
 * raises the Medusa level at the warehouse's stock location — put-away does not touch it — so the
 * order of the two panels below is the order the work happens in.
 *
 * A PO's outstanding quantity is derived from its lines (`ordered - received`), not read off the PO
 * status: the status is a summary, and a screen that shows "partially received" without saying how
 * much is left is not actionable.
 */

import { redirect } from "next/navigation";
import { listBins, listPurchaseOrders, listWarehouses } from "@/control-plane";
import type { Bin, PurchaseOrder } from "@/control-plane";
import { purchaseOrderStatusLabel } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";
import { createPurchaseOrderAction, putAwayAction, receivePurchaseOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function InboundPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const token = await requireSessionToken();
  const { error, ok } = await searchParams;

  const [warehousesResult, binsResult, ordersResult] = await Promise.all([
    listWarehouses(token),
    listBins(token),
    listPurchaseOrders(token)
  ]);
  for (const result of [warehousesResult, binsResult, ordersResult]) {
    if (!result.ok) {
      if (result.kind === "unauthenticated") redirect("/login");
      return (
        <Shell>
          <h1>Barang masuk</h1>
          <p className="notice">{result.message}</p>
        </Shell>
      );
    }
  }
  if (!warehousesResult.ok || !binsResult.ok || !ordersResult.ok) redirect("/login");

  const warehouses = warehousesResult.value.warehouses;
  const bins = binsResult.value.bins;
  const purchaseOrders = ordersResult.value.purchaseOrders;
  // Put-away moves stock within one warehouse, so the form is per warehouse and lists only that
  // warehouse's staging and storage bins. A single form mixing every warehouse's bins would let a
  // seller "move" stock from one site to another, which the engine must then reject.
  const stagingByWarehouse = new Map(
    warehouses.map((warehouse) => [
      warehouse.id,
      bins.filter((bin) => bin.warehouseId === warehouse.id && bin.kind === "staging")
    ])
  );
  const storageByWarehouse = new Map(
    warehouses.map((warehouse) => [
      warehouse.id,
      bins.filter((bin) => bin.warehouseId === warehouse.id && bin.kind === "storage")
    ])
  );
  const putAwaySites = warehouses
    .map((warehouse) => ({
      warehouse,
      staging: stagingByWarehouse.get(warehouse.id) ?? [],
      storage: storageByWarehouse.get(warehouse.id) ?? []
    }))
    .filter((site) => site.staging.length > 0 && site.storage.length > 0);

  return (
    <Shell>
      <h1>Barang masuk</h1>
      {error === undefined ? null : <p className="notice">{error}</p>}
      {ok === undefined ? null : <p className="muted">Tersimpan.</p>}

      {warehouses.length === 0 ? (
        <p className="empty">
          Belum ada gudang. <a href="/warehouse">Tambahkan gudang dan rak</a> terlebih dahulu.
        </p>
      ) : (
        <>
          <form action={createPurchaseOrderAction} className="panel">
            <h2>Pesan barang</h2>
            <div className="row">
              <label className="field">
                <span>Gudang</span>
                <select name="warehouseId" required>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Referensi pemasok (opsional)</span>
                <input name="supplierReference" maxLength={200} placeholder="INV-2026-001" />
              </label>
            </div>
            {/* Two line rows are shown so the common case (two SKUs) needs no JavaScript; a third is
                an empty row the seller can fill or leave alone. */}
            <div className="lines">
              {[0, 1, 2].map((index) => (
                <div className="row" key={index}>
                  <label className="field">
                    <span>SKU</span>
                    <input name="lineSku" maxLength={200} placeholder="SKU-1" />
                  </label>
                  <label className="field">
                    <span>Nama barang</span>
                    <input name="lineTitle" maxLength={300} placeholder="Kaos Hitam L" />
                  </label>
                  <label className="field">
                    <span>Jumlah</span>
                    <input name="lineQuantity" inputMode="numeric" placeholder="10" />
                  </label>
                </div>
              ))}
            </div>
            <button type="submit">Buat pesanan</button>
          </form>

          <h2 className="section">Pesanan barang</h2>
          {purchaseOrders.length === 0 ? (
            <p className="empty">Belum ada pesanan barang.</p>
          ) : (
            purchaseOrders.map((order) => (
              <PurchaseOrderPanel
                key={order.id}
                order={order}
                stagingBins={stagingByWarehouse.get(order.warehouseId) ?? []}
              />
            ))
          )}

          <h2 className="section">Pindahkan ke rak penyimpanan</h2>
          {putAwaySites.length === 0 ? (
            <p className="notice warn">
              Butuh minimal satu rak Area terima dan satu rak Penyimpanan di gudang yang sama.{" "}
              <a href="/warehouse">Atur rak</a>.
            </p>
          ) : (
            putAwaySites.map(({ warehouse, staging, storage }) => (
              <form action={putAwayAction} className="panel" key={warehouse.id}>
                <h2>{warehouse.name}</h2>
                <p className="muted">
                  Pindahkan unit dari Area terima ke Penyimpanan. Jumlah stok yang dilihat kanal tidak
                  berubah pada langkah ini — stok sudah bertambah saat penerimaan.
                </p>
                <input type="hidden" name="warehouseId" value={warehouse.id} />
                <div className="row">
                  <label className="field">
                    <span>Dari rak</span>
                    <select name="fromBinId" required>
                      {staging.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {bin.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Ke rak</span>
                    <select name="toBinId" required>
                      {storage.map((bin) => (
                        <option key={bin.id} value={bin.id}>
                          {bin.code}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>SKU</span>
                    <input name="sku" required maxLength={200} placeholder="SKU-1" />
                  </label>
                  <label className="field">
                    <span>Jumlah</span>
                    <input name="quantity" required inputMode="numeric" placeholder="10" />
                  </label>
                  <button type="submit">Pindahkan</button>
                </div>
              </form>
            ))
          )}
        </>
      )}
    </Shell>
  );
}

/**
 * One PO: what it ordered, what is left, and the receipt form.
 *
 * The receipt form posts the outstanding quantity per line as the default, because a delivery that
 * matches the order is the common case; the seller edits it only when it does not.
 */
function PurchaseOrderPanel({
  order,
  stagingBins
}: {
  order: PurchaseOrder;
  stagingBins: readonly Bin[];
}) {
  const outstanding = order.lines.map((line) => Math.max(0, line.orderedQuantity - line.receivedQuantity));
  const fullyReceived = order.lines.every((line) => line.receivedQuantity >= line.orderedQuantity);

  return (
    <div className="panel">
      <h2>
        {order.supplierReference ?? order.id}{" "}
        <span className="channel">{purchaseOrderStatusLabel(order.status)}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nama</th>
            <th className="numeric">Dipesan</th>
            <th className="numeric">Diterima</th>
            <th className="numeric">Sisa</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={line.id}>
              <td>{line.sku}</td>
              <td>{line.title}</td>
              <td className="numeric">{line.orderedQuantity}</td>
              <td className="numeric">{line.receivedQuantity}</td>
              <td className="numeric">{outstanding[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {fullyReceived ? (
        <p className="muted">Sudah diterima penuh.</p>
      ) : stagingBins.length === 0 ? (
        // Receiving posts into the warehouse's staging bin, so there is nowhere to put the units
        // until one exists. Offering the form would only produce the engine's refusal.
        <p className="notice warn">
          Gudang ini belum punya rak Area terima. <a href="/warehouse">Atur rak</a> sebelum menerima.
        </p>
      ) : (
        <form action={receivePurchaseOrderAction}>
          <input type="hidden" name="purchaseOrderId" value={order.id} />
          <p className="muted">
            Terima ke rak Area terima {stagingBins.map((bin) => bin.code).join(", ")}. Stok di lokasi
            gudang bertambah sejumlah yang diterima.
          </p>
          <div className="lines">
            {order.lines.map((line, index) => (
              <div className="row" key={line.id}>
                <input type="hidden" name="lineSku" value={line.sku} />
                <span>
                  {line.sku} <span className="muted">{line.title}</span>
                </span>
                <input
                  name="lineQuantity"
                  inputMode="numeric"
                  defaultValue={outstanding[index] === 0 ? "" : String(outstanding[index])}
                  placeholder="0"
                  aria-label={`Jumlah terima ${line.sku}`}
                />
              </div>
            ))}
          </div>
          <button type="submit">Terima</button>
        </form>
      )}
    </div>
  );
}
