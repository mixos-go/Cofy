/**
 * The warehouse overview (docs/PLAN.md M6, ADR 0018).
 *
 * Two things a seller does here: lay the warehouse out (warehouses and bins) and see the layout they
 * have. Bins are grouped by warehouse because a bin code is only unique inside its warehouse, so a
 * flat list would be ambiguous the moment there are two sites.
 *
 * The read is the control plane's projection, not the tenant instance's response, so this page cannot
 * render a field the seller is not allowed to see even if the data plane starts sending one.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { listBins, listWarehouses } from "@/control-plane";
import type { Bin } from "@/control-plane";
import { binKindLabel } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";
import { createBinAction, createWarehouseAction } from "./actions";

// The layout is live: a bin added a moment ago must appear now.
export const dynamic = "force-dynamic";

export default async function WarehousePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const token = await requireSessionToken();
  const { error, ok } = await searchParams;

  const [warehousesResult, binsResult] = await Promise.all([listWarehouses(token), listBins(token)]);
  if (!warehousesResult.ok) {
    if (warehousesResult.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Gudang</h1>
        <p className="notice">{warehousesResult.message}</p>
      </Shell>
    );
  }
  if (!binsResult.ok) {
    if (binsResult.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Gudang</h1>
        <p className="notice">{binsResult.message}</p>
      </Shell>
    );
  }

  const warehouses = warehousesResult.value.warehouses;
  const binsByWarehouse = new Map<string, Bin[]>();
  for (const bin of binsResult.value.bins) {
    const existing = binsByWarehouse.get(bin.warehouseId) ?? [];
    existing.push(bin);
    binsByWarehouse.set(bin.warehouseId, existing);
  }

  return (
    <Shell>
      <h1>Gudang</h1>
      {/* A write's outcome arrives as a query param, because the action ends in a redirect. */}
      {error === undefined ? null : <p className="notice">{error}</p>}
      {ok === undefined ? null : <p className="muted">Tersimpan.</p>}
      <p className="muted">
        Susun gudang dan rak Anda. Rak bertipe <strong>Area terima</strong> menampung kiriman yang baru
        datang, <strong>Penyimpanan</strong> menampung stok siap jual, dan <strong>Area kemas</strong>{" "}
        menampung unit yang sedang diambil untuk pesanan.
      </p>

      <form action={createWarehouseAction} className="panel">
        <h2>Tambah gudang</h2>
        <div className="row">
          <label className="field">
            <span>Nama gudang</span>
            <input name="name" required maxLength={200} placeholder="Gudang Utama" />
          </label>
          <label className="field">
            <span>ID lokasi stok (opsional)</span>
            {/* The link to the engine's stock location: the level channels see is the one at this
                location (docs/adr/0018). Empty means the warehouse has no engine location yet. */}
            <input name="stockLocationId" maxLength={200} placeholder="loc_..." />
          </label>
          <button type="submit">Tambah</button>
        </div>
      </form>

      {warehouses.length === 0 ? (
        <p className="empty">Belum ada gudang. Tambahkan satu untuk mulai menerima stok.</p>
      ) : (
        <>
          <form action={createBinAction} className="panel">
            <h2>Tambah rak</h2>
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
                <span>Kode rak</span>
                <input name="code" required maxLength={100} placeholder="A-01" />
              </label>
              <label className="field">
                <span>Tipe</span>
                <select name="kind" defaultValue="storage">
                  <option value="storage">Penyimpanan</option>
                  <option value="staging">Area terima</option>
                  <option value="packing">Area kemas</option>
                </select>
              </label>
              <button type="submit">Tambah</button>
            </div>
          </form>

          <h2 className="section">Tata letak</h2>
          <table>
            <thead>
              <tr>
                <th>Gudang</th>
                <th>Lokasi stok</th>
                <th>Rak</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td>{warehouse.name}</td>
                  <td>{warehouse.stockLocationId ?? <span className="muted">Belum tertaut</span>}</td>
                  <td>
                    <WarehouseBins bins={binsByWarehouse.get(warehouse.id) ?? []} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Shell>
  );
}

/** The bins of one warehouse, each linking to its contents and its ledger. */
function WarehouseBins({ bins }: { bins: readonly Bin[] }) {
  if (bins.length === 0) return <span className="muted">Belum ada rak</span>;
  return (
    <ul className="sublist">
      {bins.map((bin) => (
        <li key={bin.id}>
          <Link href={`/warehouse/bins/${encodeURIComponent(bin.id)}`}>{bin.code}</Link>{" "}
          <span className="channel">{binKindLabel(bin.kind)}</span>
        </li>
      ))}
    </ul>
  );
}
