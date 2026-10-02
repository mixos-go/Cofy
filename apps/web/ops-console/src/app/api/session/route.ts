/**
 * Login for the ops console.
 *
 * The operator's own session goes into the operator cookie. This route is deliberately separate
 * from the seller login: an operator credential must not be usable to sign into the seller app, and
 * a seller credential must not be usable here — the control plane's role check is the real guard,
 * but keeping the two doors apart means a mistake in one does not become a mistake in both.
 */

import { NextResponse } from "next/server";
import { login } from "@/control-plane";
import { setSessionCookie } from "@/session";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  const result = await login(email, password);
  if (!result.ok) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", result.message);
    return NextResponse.redirect(url, { status: 303 });
  }

  await setSessionCookie(result.value.token, result.value.expiresAt);
  return NextResponse.redirect(new URL("/tenants", request.url), { status: 303 });
}
