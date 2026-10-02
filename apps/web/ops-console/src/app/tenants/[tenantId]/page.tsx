import { redirect } from "next/navigation";
import Link from "next/link";
import { getImpersonatedSyncHealth, getTenant, listImpersonations } from "@/control-plane";
import { formatTimestamp } from "@/format";
import { readImpersonation } from "@/session";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";
import { ImpersonationBanner } from "@/ui/impersonation-banner";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { tenantId } = await params;
  const { error } = await searchParams;
  const operatorToken = await requireSessionToken();

  // The operator's own read: tenant facts, always available regardless of impersonation.
  const detail = await getTenant(operatorToken, tenantId);
  if (!detail.ok) {
    if (detail.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Tenant</h1>
        <p className="notice">{detail.message}</p>
      </Shell>
    );
  }

  const { tenant } = detail.value;

  // Support history for this tenant, shown to the operator. It is read with the operator's token,
  // so it is not visible to a seller and cannot be seen through an impersonated session.
  const history = await listImpersonations(operatorToken, tenantId);

  // The impersonation, if one is active for *this* tenant. A cookie for another tenant is ignored
  // here rather than cleared: the operator may be looking around before switching.
  const active = await readImpersonation();
  const impersonatingThis = active !== null && active.tenantId === tenantId ? active : null;

  // Under impersonation, the operational picture is the seller's own sync health, read with the
  // seller session. This is the point of the feature: support sees the seller's view, not a
  // privileged superset of it.
  const sellerHealth =
    impersonatingThis === null ? null : await getImpersonatedSyncHealth(impersonatingThis.token);

  return (
    <Shell>
      {impersonatingThis === null ? null : <ImpersonationBanner active={impersonatingThis} />}

      <h1>{tenant.displayName}</h1>
      {error === undefined ? null : <p className="notice">{error}</p>}

      <dl className="definition">
        <dt>Slug</dt>
        <dd>{tenant.slug}</dd>
        <dt>Paket</dt>
        <dd>{tenant.plan}</dd>
        <dt>Wilayah</dt>
        <dd>{tenant.region}</dd>
        <dt>Status</dt>
        <dd>{tenant.state}</dd>
        <dt>Skema</dt>
        <dd>{tenant.schemaName}</dd>
      </dl>

      {impersonatingThis === null ? (
        <section>
          <h2>Dukungan penjual</h2>
          <p className="muted">
            Masuk sebagai operator untuk melihat apa yang penjual lihat. Sesi ini hanya baca dan
            berakhir otomatis.
          </p>
          <form action="/api/impersonate" method="post">
            <input type="hidden" name="tenantId" value={tenantId} />
            <button type="submit">Masuk sebagai operator</button>
          </form>
        </section>
      ) : (
        <section>
          <h2>Kesehatan sinkronisasi penjual</h2>
          {sellerHealth === null || !sellerHealth.ok ? (
            <p className="notice">
              {sellerHealth === null || sellerHealth.ok
                ? "Kesehatan sinkronisasi tidak tersedia."
                : sellerHealth.message}
            </p>
          ) : sellerHealth.value.channels.length === 0 ? (
            <p className="empty">Belum ada kanal yang tersinkron.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Kanal</th>
                  <th>Masalah</th>
                  <th>Diperiksa</th>
                </tr>
              </thead>
              <tbody>
                {sellerHealth.value.channels.map((channel) => (
                  <tr key={channel.channel}>
                    <td>{channel.channel}</td>
                    <td>{channel.unresolved === 0 ? "Tidak ada masalah" : `${channel.unresolved} masalah`}</td>
                    <td>{formatTimestamp(channel.observedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section>
        <h2>Riwayat impersonasi</h2>
        {!history.ok ? (
          <p className="notice">{history.message}</p>
        ) : history.value.impersonations.length === 0 ? (
          <p className="empty">Belum ada impersonasi untuk tenant ini.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Operator</th>
                <th>Mulai</th>
                <th>Berakhir</th>
              </tr>
            </thead>
            <tbody>
              {history.value.impersonations.map((record) => (
                <tr key={record.id}>
                  <td>{record.actorEmail}</td>
                  <td>{formatTimestamp(record.startedAt)}</td>
                  <td>{formatTimestamp(record.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p>
        <Link href="/tenants">Kembali ke daftar tenant</Link>
      </p>
    </Shell>
  );
}
