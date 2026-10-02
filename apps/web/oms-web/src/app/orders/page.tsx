import Link from "next/link";
import { redirect } from "next/navigation";
import { listOrders } from "@/control-plane";
import { formatMoney, formatTimestamp } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

// Orders are live operational data, so the page must not be served from a cached render.
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const token = await requireSessionToken();
  const result = await listOrders(token, { limit: 20, offset: 0 });

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Pesanan</h1>
        <p className="notice">{result.message}</p>
      </Shell>
    );
  }

  const { orders, total } = result.value;

  return (
    <Shell>
      <h1>Pesanan</h1>
      <p className="muted">{total} pesanan</p>
      {orders.length === 0 ? (
        <p className="empty">Belum ada pesanan yang tersinkron.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Kanal</th>
              <th>Status</th>
              <th>Pembeli</th>
              <th className="numeric">Item</th>
              <th className="numeric">Total</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId}>
                <td>
                  <Link href={`/orders/${encodeURIComponent(order.orderId)}`}>
                    {order.displayId === null ? order.orderId : `#${order.displayId}`}
                  </Link>
                </td>
                <td>
                  {order.channel === null ? (
                    <span className="muted">Belum tertaut</span>
                  ) : (
                    <span className="channel">{order.channel}</span>
                  )}
                </td>
                <td>{order.status}</td>
                <td>{order.email ?? "—"}</td>
                <td className="numeric">{order.itemCount}</td>
                <td className="numeric">{formatMoney(order.total)}</td>
                <td>{formatTimestamp(order.placedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
