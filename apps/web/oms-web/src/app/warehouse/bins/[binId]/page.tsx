/**
 * One bin: what it holds, and every movement that put it there (docs/PLAN.md M6, ADR 0018).
 *
 * This is the screen the stocktake's "auditable, never a silent overwrite" claim rests on. The
 * contents are summed from the ledger, and the ledger is shown underneath with the quantity before
 * and after each move — so a `stocktake` movement reads as "counted 7, was 10, now 7, by this
 * person" rather than as a number that changed for no visible reason.
 *
 * The two reads are independent calls. The contents route derives its total from the same rows, and
 * showing them separately is what lets a seller reconcile the two if they ever disagree, which is
 * the failure this screen exists to catch.
 */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBinContents, listStockMovements } from "@/control-plane";
import { binKindLabel, formatDelta, formatTimestamp, movementKindLabel } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

export const dynamic = "force-dynamic";

export default async function BinPage({ params }: { params: Promise<{ binId: string }> }) {
  const token = await requireSessionToken();
  const { binId } = await params;

  const [contentsResult, movementsResult] = await Promise.all([
    getBinContents(token, binId),
    listStockMovements(token, binId)
  ]);

  if (!contentsResult.ok) {
    if (contentsResult.kind === "unauthenticated") redirect("/login");
    // The tenant's engine answers a missing bin with 404, which the control plane passes through. A
    // bin that is not there is a 404 here, not an empty page that looks like an empty bin.
    if (contentsResult.status === 404) notFound();
    return (
      <Shell>
        <h1>Rak</h1>
        <p className="notice">{contentsResult.message}</p>
      </Shell>
    );
  }
  if (!movementsResult.ok) {
    if (movementsResult.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Rak</h1>
        <p className="notice">{movementsResult.message}</p>
      </Shell>
    );
  }

  const contents = contentsResult.value;
  const movements = movementsResult.value.movements;

  return (
    <Shell>
      <p className="muted">
        <Link href="/warehouse">← Gudang</Link>
      </p>
      <h1>
        Rak {contents.code} <span className="channel">{binKindLabel(contents.kind)}</span>
      </h1>

      <h2 className="section">Isi rak</h2>
      {contents.contents.length === 0 ? (
        // "Never used" and "counted to zero" are different, so an empty bin says so rather than
        // showing a zero row (docs/adr/0018).
        <p className="empty">Belum ada pergerakan stok di rak ini.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th className="numeric">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {contents.contents.map((entry) => (
              <tr key={entry.sku}>
                <td>{entry.sku}</td>
                <td className="numeric">{entry.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="section">Riwayat pergerakan</h2>
      {movements.length === 0 ? (
        <p className="empty">Belum ada pergerakan.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Jenis</th>
              <th>SKU</th>
              <th className="numeric">Perubahan</th>
              <th className="numeric">Sebelum</th>
              <th className="numeric">Sesudah</th>
              <th>Alasan</th>
              <th>Oleh</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{formatTimestamp(movement.createdAt)}</td>
                <td>{movementKindLabel(movement.kind)}</td>
                <td>{movement.sku}</td>
                <td className="numeric">{formatDelta(movement.delta)}</td>
                <td className="numeric">{movement.quantityBefore}</td>
                <td className="numeric">{movement.quantityAfter}</td>
                <td>{movement.reason ?? "—"}</td>
                <td>{movement.actor ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
