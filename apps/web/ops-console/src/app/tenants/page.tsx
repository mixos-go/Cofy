import { redirect } from "next/navigation";
import Link from "next/link";
import { listTenants } from "@/control-plane";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

// Tenant status is live: a tenant that just finished provisioning must show as active now.
export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const token = await requireSessionToken();
  const result = await listTenants(token);

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Tenant</h1>
        <p className="notice">{result.message}</p>
      </Shell>
    );
  }

  const { tenants } = result.value;

  return (
    <Shell>
      <h1>Tenant</h1>
      <p className="muted">
        Buka satu tenant untuk melihat detailnya atau masuk sebagai operator untuk mendukung penjual.
      </p>
      {tenants.length === 0 ? (
        <p className="empty">Belum ada tenant.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Slug</th>
              <th>Paket</th>
              <th>Wilayah</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <td>
                  <Link href={`/tenants/${encodeURIComponent(tenant.id)}`}>{tenant.displayName}</Link>
                </td>
                <td>{tenant.slug}</td>
                <td>{tenant.plan}</td>
                <td>{tenant.region}</td>
                <td>{tenant.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
