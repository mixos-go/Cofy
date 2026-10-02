/**
 * The session cookie (ADR 0017, reused by the ops console).
 *
 * This cookie holds the *operator's* own session, never an impersonation token. Keeping the two
 * apart is what lets the console keep calling `ops:*` routes while it acts for a tenant, and it
 * means closing the console cannot silently leave a tenant session behind.
 */

import { cookies } from "next/headers";

export const SESSION_COOKIE = "cofy_ops_session";

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * The active impersonation (ADR 0019).
 *
 * It is a seller session, not an operator one, so it never replaces `SESSION_COOKIE`. The cookie
 * value is the token plus the few facts the banner needs to describe it — which tenant, who opened
 * it, when it ends. Those facts are the control plane's, copied verbatim from the impersonation
 * response; the console does not compute them, so the banner cannot claim a longer life than the
 * session has.
 *
 * `expires` is set to the impersonation's own expiry, so the browser stops sending the cookie
 * exactly when the control plane stops accepting the token. Two independent time-boxes, and the
 * shorter one wins.
 */
export const IMPERSONATION_COOKIE = "cofy_ops_impersonation";

export interface ActiveImpersonation {
  readonly token: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly actorEmail: string;
  readonly expiresAt: string;
}

export async function readImpersonation(): Promise<ActiveImpersonation | null> {
  const store = await cookies();
  const raw = store.get(IMPERSONATION_COOKIE)?.value;
  if (raw === undefined || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveImpersonation>;
    if (
      typeof parsed.token !== "string" ||
      typeof parsed.tenantId !== "string" ||
      typeof parsed.tenantName !== "string" ||
      typeof parsed.actorEmail !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      // A cookie we cannot read is one we must not guess at. Treating it as absent sends the
      // operator back to the button rather than showing a banner for an unknown tenant.
      return null;
    }
    return {
      token: parsed.token,
      tenantId: parsed.tenantId,
      tenantName: parsed.tenantName,
      actorEmail: parsed.actorEmail,
      expiresAt: parsed.expiresAt
    };
  } catch {
    return null;
  }
}

export async function setImpersonationCookie(active: ActiveImpersonation): Promise<void> {
  const store = await cookies();
  store.set(IMPERSONATION_COOKIE, JSON.stringify(active), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(active.expiresAt)
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);
}
