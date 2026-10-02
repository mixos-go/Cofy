/**
 * Login (ADR 0017).
 *
 * The only place the UI accepts a credential. The token the control plane returns goes straight into
 * the httpOnly cookie and never into the response body, so it cannot end up in a page, a log or
 * client state. A plain form posts here, so login works without JavaScript.
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
    // Back to the form with the reason. The message comes from the control plane, which does not
    // distinguish an unknown email from a wrong password.
    const url = new URL("/login", request.url);
    url.searchParams.set("error", result.message);
    return NextResponse.redirect(url, { status: 303 });
  }

  await setSessionCookie(result.value.token, result.value.expiresAt);
  return NextResponse.redirect(new URL("/orders", request.url), { status: 303 });
}
