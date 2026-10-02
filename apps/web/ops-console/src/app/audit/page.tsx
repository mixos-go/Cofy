import { redirect } from "next/navigation";
import Link from "next/link";
import { listImpersonations } from "@/control-plane";
import { formatRemaining, formatTimestamp } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

// The trail is the point of the feature: it must reflect every impersonation the moment it starts.
export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const token = await requireSessionToken();
  const result = await listImpersonations(token);

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Jejak impersonasi</h1>
        <p className="notice">{result.message}</p>
      </Shell>
    );
  }

  const { impersonations } = result.value;

  return (
    <Shell>
      <h1>Jejak impersonasi</h1>
      <p className="muted">
        Setiap kali operator masuk sebagai penjual, tercatat di sini. Catatan ini tidak dapat diubah.
      </p>
      {impersonations.length === 0 ? (
        <p className="empty">Belum ada impersonasi.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Operator</th>
              <th>Tenant</th>
              <th>Mulai</th>
              <th>Berakhir</th>
              <th>Sisa</th>
            </tr>
          </thead>
          <tbody>
            {impersonations.map((record) => (
              <tr key={record.id}>
                <td>{record.actorEmail}</td>
                <td>
                  <Link href={`/tenants/${encodeURIComponent(record.tenantId)}`}>{record.tenantId}</Link>
                </td>
                <td>{formatTimestamp(record.startedAt)}</td>
                <td>{formatTimestamp(record.expiresAt)}</td>
                {/* A duration, because "is this still open" is the question a reviewer has. */}
                <td>{formatRemaining(record.expiresAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
