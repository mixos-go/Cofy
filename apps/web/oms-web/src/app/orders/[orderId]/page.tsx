import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrder } from "@/control-plane";
import { formatMoney, formatTimestamp } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const token = await requireSessionToken();
  const result = await getOrder(token, orderId);

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Pesanan</h1>
        <p className="notice">{result.message}</p>
        <p>
          <Link href="/orders">Kembali ke daftar pesanan</Link>
        </p>
      </Shell>
    );
  }

  const order = result.value;

  return (
    <Shell>
      <h1>
        {order.displayId === null ? order.orderId : `Pesanan #${order.displayId}`}
      </h1>
      <dl className="definition">
        <dt>Kanal</dt>
        <dd>{order.channel ?? <span className="muted">Belum tertaut</span>}</dd>
        <dt>ID pesanan kanal</dt>
        <dd>{order.externalOrderId ?? "—"}</dd>
        <dt>Status</dt>
        <dd>{order.status}</dd>
        <dt>Pembeli</dt>
        <dd>{order.email ?? "—"}</dd>
        <dt>Total</dt>
        <dd>{formatMoney(order.total)}</dd>
        <dt>Dibuat</dt>
        <dd>{formatTimestamp(order.placedAt)}</dd>
        <dt>Diperbarui</dt>
        <dd>{formatTimestamp(order.updatedAt)}</dd>
      </dl>
      <h2>Item</h2>
      {order.lines.length === 0 ? (
        <p className="empty">Pesanan ini tidak punya item.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Produk</th>
              <th>SKU</th>
              <th className="numeric">Jumlah</th>
              <th className="numeric">Harga satuan</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line, index) => (
              <tr key={`${line.sku ?? line.title}-${index}`}>
                <td>{line.title}</td>
                <td>{line.sku ?? "—"}</td>
                <td className="numeric">{line.quantity}</td>
                <td className="numeric">{formatMoney(line.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        <Link href="/orders">Kembali ke daftar pesanan</Link>
      </p>
    </Shell>
  );
}
