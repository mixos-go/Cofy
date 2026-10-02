import { redirect } from "next/navigation";
import { listChannels } from "@/control-plane";
import { channelLabel, formatExpiry } from "@/format";
import { requireSessionToken } from "@/require-session";
import { Shell } from "@/ui/shell";

// A connection list is live operational data: a channel connected a moment ago must appear now.
export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const token = await requireSessionToken();
  const { error } = await searchParams;
  const result = await listChannels(token);

  if (!result.ok) {
    if (result.kind === "unauthenticated") redirect("/login");
    return (
      <Shell>
        <h1>Kanal</h1>
        <p className="notice">{result.message}</p>
      </Shell>
    );
  }

  const { connections, availableChannels } = result.value;
  const byChannel = new Map(connections.map((connection) => [connection.channel, connection]));

  return (
    <Shell>
      <h1>Kanal</h1>
      {/* The outcome of a connect or disconnect arrives as a query param, because the action itself
          is a form post that ends in a redirect. */}
      {error === undefined ? null : <p className="notice">{error}</p>}
      <p className="muted">Sambungkan toko marketplace Anda agar pesanan masuk otomatis ke Cofy.</p>
      <table>
        <thead>
          <tr>
            <th>Marketplace</th>
            <th>Status</th>
            <th>Kredensial</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {/* Every channel we serve is rendered, connected or not, so the screen never has to
              infer "not connected" from a missing row. */}
          {availableChannels.map((channel) => {
            const connection = byChannel.get(channel);
            const connected = connection !== undefined;
            return (
              <tr key={channel}>
                <td>{channelLabel(channel)}</td>
                <td>
                  {connected ? (
                    <span className="channel">Terhubung</span>
                  ) : (
                    <span className="muted">Belum terhubung</span>
                  )}
                </td>
                <td>{connected ? formatExpiry(connection.expiresAt) : "—"}</td>
                <td>
                  {connected ? (
                    <form action={`/api/channels/${encodeURIComponent(channel)}/disconnect`} method="post">
                      <button type="submit" className="secondary">
                        Putuskan
                      </button>
                    </form>
                  ) : (
                    <form action={`/api/channels/${encodeURIComponent(channel)}/connect`} method="post">
                      <button type="submit">Hubungkan</button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Shell>
  );
}
