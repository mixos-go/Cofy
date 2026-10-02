/**
 * The operator shell: navigation plus logout.
 *
 * Distinct from the seller shell on purpose. An operator console that looks like the seller app is
 * one where an operator forgets which of the two they are looking at, and the whole point of the
 * impersonation design is that acting for a tenant is never mistaken for being the tenant.
 */

import type { ReactNode } from "react";
import Link from "next/link";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="app-bar">
        <span className="brand">Cofy Ops</span>
        <nav>
          <Link href="/tenants">Tenant</Link>
          <Link href="/audit">Jejak impersonasi</Link>
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
