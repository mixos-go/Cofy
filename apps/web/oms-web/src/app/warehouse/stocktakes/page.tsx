/**
 * Stocktakes (docs/PLAN.md M6, ADR 0018).
 *
 * The screen that makes a variance auditable. Opening a count freezes what the ledger says *now* as
 * the system quantity; applying it records the difference as a signed movement and corrects the
 * engine's level by the same delta. The two steps are separate on purpose: a count taken in the
 * morning and submitted in the afternoon must be measured against the morning.
 *
 * That is why the open rows and the apply form are side by side: the seller reads the system
 * quantity, types what they counted, and the variance they are about to apply is shown before they
 * submit it.
 */

import { redirect } from "next/navigation";
import { listBins, listStocktakes, listWarehouses } from "@/control-plane";
import type { Stocktake } from "@/control-plane";
import { formatVariance, stocktakeStatusLabel, binKindLabel } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";
import { applyStocktakeAction, openStocktakeAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function StocktakesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string; status?: string }>;
}) {
  const token = await requireSessionToken();
  const { error, ok, status } = await searchParams;

  const [warehousesResult, binsResult, stocktakesResult] = await Promise.all([
    listWarehouses(token),
    listBins(token),
    listStocktakes(token, status === undefined || status === "" ? {} : { status })
  ]);
  for (const result of [warehousesResult, binsResult, stocktakesResult]) {
    if (!result.ok) {
      if (result.kind === "unauthenticated") redirect("/login");
      return (
        <Shell>
          <h1>Stok opname</h1>
          <p className="notice">{result.message}</p>
        </Shell>
      );
    }
  }
  if (!warehousesResult.ok || !binsResult.ok || !stocktakesResult.ok) redirect("/login");

  const warehouses = warehousesResult.value.warehouses;
  const bins = binsResult.value.bins;
  const stocktakes = stocktakesResult.value.stocktakes;
  // A stocktake is opened on a bin of a specific warehouse, so the form is per warehouse and lists
  // only that warehouse's bins — the same reason the pick-task form is per warehouse.
  const warehousesWithBins = warehouses
    .map((warehouse) => ({
      warehouse,
      bins: bins.filter((bin) => bin.warehouseId === warehouse.id)
    }))
    .filter((entry) => entry.bins.length > 0);

  return (
    <Shell>
      <h1>Stok opname</h1>
      {error === undefined ? null : <p className="notice">{error}</p>}
      {ok === undefined ? null : <p className="muted">Tersimpan.</p>}

      <p className="muted">
        Buka hitungan untuk membekukan jumlah menurut sistem, lalu terapkan hasil hitung. Selisihnya
        dicatat sebagai penyesuaian yang dapat ditelusuri — bukan penimpaan diam-diam.
      </p>

      {warehousesWithBins.length === 0 ? (
        <p className="empty">
          Butuh gudang dan rak. <a href="/warehouse">Atur gudang</a> terlebih dahulu.
        </p>
      ) : (
        warehousesWithBins.map(({ warehouse, bins: warehouseBins }) => (
          <form action={openStocktakeAction} className="panel" key={warehouse.id}>
            <h2>Buka hitungan — {warehouse.name}</h2>
            <input type="hidden" name="warehouseId" value={warehouse.id} />
            <div className="row">
              <label className="field">
                <span>Rak</span>
                <select name="binId" required>
                  {warehouseBins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.code} · {binKindLabel(bin.kind)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>SKU</span>
                <input name="sku" required maxLength={200} placeholder="SKU-1" />
              </label>
              <button type="submit">Buka</button>
            </div>
          </form>
        ))
      )}

      <p className="muted">
        Menampilkan: <a href="/warehouse/stocktakes">semua</a> ·{" "}
        <a href="/warehouse/stocktakes?status=open">terbuka</a> ·{" "}
        <a href="/warehouse/stocktakes?status=applied">diterapkan</a>
      </p>

      {stocktakes.length === 0 ? (
        <p className="empty">Belum ada hitungan.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Rak</th>
              <th className="numeric">Sistem</th>
              <th className="numeric">Hitung</th>
              <th>Selisih</th>
              <th>Status</th>
              <th>Dihitung oleh</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stocktakes.map((stocktake) => (
              <tr key={stocktake.id}>
                <td>{stocktake.sku}</td>
                <td>{stocktake.binId}</td>
                <td className="numeric">{stocktake.systemQuantity}</td>
                <td className="numeric">{stocktake.countedQuantity ?? "—"}</td>
                <td>{formatVariance(stocktake.variance)}</td>
                <td>
                  <span className="channel">{stocktakeStatusLabel(stocktake.status)}</span>
                </td>
                <td>{stocktake.countedBy ?? "—"}</td>
                <td>
                  <ApplyStocktakeForm stocktake={stocktake} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}

/**
 * The apply form for an open count, or the applied result.
 *
 * An applied count gets no form: applying twice would double the correction, and the tenant's
 * workflow refuses it anyway — showing a button that is guaranteed to fail would be worse than
 * showing none.
 */
function ApplyStocktakeForm({ stocktake }: { stocktake: Stocktake }) {
  if (stocktake.status !== "open") {
    return <span className="muted">Selesai</span>;
  }
  return (
    <form action={applyStocktakeAction} className="inline-form">
      <input type="hidden" name="stocktakeId" value={stocktake.id} />
      <input
        name="countedQuantity"
        required
        inputMode="numeric"
        defaultValue={String(stocktake.systemQuantity)}
        aria-label={`Jumlah hitung ${stocktake.sku}`}
      />
      <button type="submit">Terapkan</button>
    </form>
  );
}
