/**
 * The banner shown while an operator is impersonating a tenant (ADR 0019).
 *
 * It exists to make one thing unmissable: what is on screen below is the seller's view, reached
 * through a session that belongs to the operator. Every impersonated screen renders it, and it
 * always carries the way out, so leaving early is one click from wherever support has navigated.
 *
 * The remaining time comes from the control plane's expiry, not from a local timer, so the banner
 * cannot show time the session does not have.
 */

import type { ActiveImpersonation } from "@/session";
import { formatRemaining } from "@/format";

export function ImpersonationBanner({ active }: { active: ActiveImpersonation }) {
  return (
    <div className="impersonation-banner">
      <div>
        <strong>Mode bantuan aktif</strong> — Anda melihat tenant{" "}
        <strong>{active.tenantName}</strong> sebagai <code>{active.actorEmail}</code>. Sesi ini
        hanya baca dan berakhir dalam {formatRemaining(active.expiresAt)}.
      </div>
      <form action="/api/impersonate/stop" method="post">
        <button type="submit" className="secondary">
          Akhiri mode bantuan
        </button>
      </form>
    </div>
  );
}
