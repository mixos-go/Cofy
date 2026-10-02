/**
 * The authenticated shell: navigation plus logout (ADR 0017).
 *
 * Server-rendered, and the logout control is a plain form post rather than a link, so a prefetch or
 * a stray click cannot end a session.
 */

import type { ReactNode } from "react";
import Link from "next/link";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-bar">
        <span className="brand">Cofy</span>
        <nav>
          <Link href="/orders">Pesanan</Link>
          <Link href="/channels">Kanal</Link>
          <Link href="/sync-health">Kesehatan sinkronisasi</Link>
        </nav>
        <form action="/api/session/logout" method="post">
          <button type="submit" className="secondary">
            Keluar
          </button>
        </form>
      </header>
      <main>{children}</main>
    </>
  );
}
