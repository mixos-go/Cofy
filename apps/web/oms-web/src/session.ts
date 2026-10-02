/**
 * The session cookie (ADR 0017).
 *
 * The control plane authenticates with a bearer token, and this is where that token lives. It is
 * `httpOnly` so no script can read it, `SameSite=Lax` so it is not attached to a cross-site POST,
 * and `Secure` outside development. Server Components read it and forward it as a header; nothing
 * else ever sees it.
 */

import { cookies } from "next/headers";

export const SESSION_COOKIE = "cofy_session";

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
