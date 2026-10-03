import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrder } from "@/control-plane";
import {
  formatMoney,
  formatTimestamp,
  fulfillmentStatusLabel,
  safeLinkUrl,
  shipmentArrangementLabel,
  shipmentStatusLabel
} from "@/format";
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
        <dt>Status pengiriman</dt>
        <dd>
          {order.fulfillmentStatus === null
            ? <span className="muted">Belum ada</span>
            : fulfillmentStatusLabel(order.fulfillmentStatus)}
        </dd>
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
      <h2>Pengiriman</h2>
      {order.shipments.length === 0 ? (
        <p className="empty">Belum ada pengiriman untuk pesanan ini.</p>
      ) : (
        order.shipments.map((shipment) => {
          const trackingUrl = safeLinkUrl(shipment.trackingUrl);
          const labelUrl = safeLinkUrl(shipment.labelUrl);
          return (
            <section key={shipment.fulfillmentId} className="panel">
              <dl className="definition">
                <dt>Status</dt>
                <dd>{shipmentStatusLabel(shipment.status)}</dd>
                <dt>Kurir</dt>
                <dd>{shipment.courier ?? "—"}</dd>
                <dt>Layanan</dt>
                <dd>{shipment.serviceLevel ?? "—"}</dd>
                <dt>Pemesanan</dt>
                <dd>
                  {shipment.arrangement === null
                    ? <span className="muted">—</span>
                    : shipmentArrangementLabel(shipment.arrangement)}
                </dd>
                <dt>Nomor resi</dt>
                <dd>
                  {shipment.trackingNumber === null ? (
                    <span className="muted">Belum ada</span>
                  ) : trackingUrl === null ? (
                    shipment.trackingNumber
                  ) : (
                    <a href={trackingUrl} target="_blank" rel="noreferrer noopener">
                      {shipment.trackingNumber}
                    </a>
                  )}
                </dd>
                <dt>Label</dt>
                <dd>
                  {labelUrl === null ? (
                    <span className="muted">—</span>
                  ) : (
                    <a href={labelUrl} target="_blank" rel="noreferrer noopener">
                      Unduh label
                    </a>
                  )}
                </dd>
                <dt>Dikirim</dt>
                <dd>{formatTimestamp(shipment.shippedAt ?? "")}</dd>
                <dt>Terkirim</dt>
                <dd>{formatTimestamp(shipment.deliveredAt ?? "")}</dd>
              </dl>
              {shipment.events.length === 0 ? (
                <p className="muted">Belum ada riwayat pelacakan.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Status</th>
                      <th>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipment.events.map((event, index) => (
                      <tr key={`${event.occurredAt}-${index}`}>
                        <td>{formatTimestamp(event.occurredAt)}</td>
                        <td>{shipmentStatusLabel(event.status)}</td>
                        <td>{event.description === "" ? "—" : event.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })
      )}
      <p>
        <Link href="/orders">Kembali ke daftar pesanan</Link>
      </p>
    </Shell>
  );
}
