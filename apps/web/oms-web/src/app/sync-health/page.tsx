import { redirect } from "next/navigation";
import { getSyncHealth } from "@/control-plane";
import { formatTimestamp } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

export const dynamic = "force-dynamic";

export default async function SyncHealthPage() {
  const token = await requireSessionToken();
  const result = await getSyncHealth(token);

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Kesehatan sinkronisasi</h1>
        <p className="notice">{result.message}</p>
      </Shell>
    );
  }

  const { channels } = result.value;

  return (
    <Shell>
      <h1>Kesehatan sinkronisasi</h1>
      {channels.length === 0 ? (
        <p className="empty">Belum ada kanal yang tersinkron.</p>
      ) : (
        channels.map((channel) => (
          <section key={channel.channel}>
            <h2>
              <span className="channel">{channel.channel}</span>{" "}
              <span className="muted">
                {channel.unresolved === 0
                  ? "tidak ada masalah"
                  : `${channel.unresolved} masalah`}
              </span>
            </h2>
            {channel.problems.length === 0 ? (
              <p className="empty">Semua pesanan kanal ini sudah cocok.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID pesanan kanal</th>
                    <th>Masalah</th>
                    <th>Sejak</th>
                  </tr>
                </thead>
                <tbody>
                  {channel.problems.map((problem) => (
                    <tr key={`${problem.externalOrderId}-${problem.since}`}>
                      <td>{problem.externalOrderId}</td>
                      <td>{problem.explanation}</td>
                      <td>{formatTimestamp(problem.since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </Shell>
  );
}
