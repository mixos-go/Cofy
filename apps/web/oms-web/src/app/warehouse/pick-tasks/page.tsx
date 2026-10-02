/**
 * Pick tasks (docs/PLAN.md M6, ADR 0018).
 *
 * A picker's screen: each open task shows what to collect and from which bin, and the scan form is
 * the one write. The barcode is the gate — a wrong scan is refused by the tenant's workflow before
 * any unit moves — so the expected barcode is shown next to the field rather than hidden, because a
 * picker who cannot see what was expected cannot tell a bad label from a bad scan.
 *
 * Creating a task needs a packing bin and an order id, which in a full build come from the order
 * screen; here they are entered directly, which is what makes the outbound flow exercisable before
 * M7 wires handover.
 */

import { redirect } from "next/navigation";
import { listBins, listPickTasks, listWarehouses } from "@/control-plane";
import type { PickTask } from "@/control-plane";
import { pickTaskStatusLabel } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";
import { createPickTaskAction, scanPickLineAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PickTasksPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; ok?: string; status?: string }>;
}) {
  const token = await requireSessionToken();
  const { error, ok, status } = await searchParams;
  // Default to the open tasks: a picker's screen should not be dominated by finished work.
  const filter = status === "all" ? {} : { status: status ?? "open" };

  const [warehousesResult, binsResult, tasksResult] = await Promise.all([
    listWarehouses(token),
    listBins(token),
    listPickTasks(token, filter)
  ]);
  for (const result of [warehousesResult, binsResult, tasksResult]) {
    if (!result.ok) {
      if (result.kind === "unauthenticated") redirect("/login");
      return (
        <Shell>
          <h1>Pengambilan</h1>
          <p className="notice">{result.message}</p>
        </Shell>
      );
    }
  }
  if (!warehousesResult.ok || !binsResult.ok || !tasksResult.ok) redirect("/login");

  const warehouses = warehousesResult.value.warehouses;
  const bins = binsResult.value.bins;
  const packingBins = bins.filter((bin) => bin.kind === "packing");
  const tasks = tasksResult.value.pickTasks;
  // A pick task's warehouse and its packing bin must agree, so the create form is rendered per
  // warehouse with only that warehouse's packing bins. A single form listing every bin would let a
  // seller pick a bin that belongs to a different site, which the engine then has to reject.
  const warehousesWithPacking = warehouses
    .map((warehouse) => ({
      warehouse,
      packing: packingBins.filter((bin) => bin.warehouseId === warehouse.id)
    }))
    .filter((entry) => entry.packing.length > 0);

  return (
    <Shell>
      <h1>Pengambilan</h1>
      {error === undefined ? null : <p className="notice">{error}</p>}
      {ok === undefined ? null : <p className="muted">Tersimpan.</p>}

      <p className="muted">
        Pindai barcode barang saat mengambil dari rak. Unit yang diambil dipindahkan ke rak Area kemas.
      </p>

      {warehouses.length === 0 ? (
        <p className="empty">
          Belum ada gudang. <a href="/warehouse">Tambahkan gudang dan rak</a> terlebih dahulu.
        </p>
      ) : warehousesWithPacking.length === 0 ? (
        <p className="notice warn">
          Butuh rak Area kemas sebagai tujuan. <a href="/warehouse">Atur rak</a>.
        </p>
      ) : (
        warehousesWithPacking.map(({ warehouse, packing }) => (
          <form action={createPickTaskAction} className="panel" key={warehouse.id}>
            <h2>Buat tugas pengambilan — {warehouse.name}</h2>
            <input type="hidden" name="warehouseId" value={warehouse.id} />
            <div className="row">
              <label className="field">
                <span>ID pesanan</span>
                <input name="orderId" required maxLength={200} placeholder="order_..." />
              </label>
              <label className="field">
                <span>Rak kemas</span>
                <select name="packingBinId" required>
                  {packing.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.code}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lines">
              {[0, 1].map((index) => (
                <div className="row" key={index}>
                  <label className="field">
                    <span>SKU</span>
                    <input name="lineSku" maxLength={200} placeholder="SKU-1" />
                  </label>
                  <label className="field">
                    <span>Jumlah</span>
                    <input name="lineQuantity" inputMode="numeric" placeholder="1" />
                  </label>
                </div>
              ))}
            </div>
            <button type="submit">Buat tugas</button>
          </form>
        ))
      )}

      <p className="muted">
        Menampilkan: <a href="/warehouse/pick-tasks">terbuka</a> ·{" "}
        <a href="/warehouse/pick-tasks?status=all">semua</a>
      </p>

      {tasks.length === 0 ? (
        <p className="empty">Belum ada tugas pengambilan.</p>
      ) : (
        tasks.map((task) => <PickTaskPanel key={task.id} task={task} />)
      )}
    </Shell>
  );
}

function PickTaskPanel({ task }: { task: PickTask }) {
  const open = task.status !== "completed";
  return (
    <div className="panel">
      <h2>
        {task.orderId} <span className="channel">{pickTaskStatusLabel(task.status)}</span>
      </h2>
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th className="numeric">Diminta</th>
            <th className="numeric">Diambil</th>
            <th>Rak</th>
            <th>Barcode diharapkan</th>
          </tr>
        </thead>
        <tbody>
          {task.lines.map((line) => (
            <tr key={line.id}>
              <td>{line.sku}</td>
              <td className="numeric">{line.quantity}</td>
              <td className="numeric">{line.pickedQuantity}</td>
              <td>{line.pickedBinId ?? line.binId ?? "—"}</td>
              <td>{line.expectedBarcode ?? <span className="muted">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {open ? (
        <form action={scanPickLineAction} className="inline-form">
          <input type="hidden" name="pickTaskId" value={task.id} />
          <input name="sku" required maxLength={200} placeholder="SKU" aria-label="SKU" />
          <input name="barcode" required maxLength={300} placeholder="Barcode" aria-label="Barcode" />
          <input name="quantity" required inputMode="numeric" placeholder="Jumlah" aria-label="Jumlah" />
          <button type="submit">Pindai</button>
        </form>
      ) : (
        <p className="muted">Selesai.</p>
      )}
    </div>
  );
}
