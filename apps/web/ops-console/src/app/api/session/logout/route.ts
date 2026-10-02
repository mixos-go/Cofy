/**
 * Logout (ADR 0017).
 *
 * Clears the operator cookie. It also clears any impersonation cookie: leaving a tenant session
 * behind after the operator has left the console would be a session nobody is watching, which is
 * the opposite of what the time-box is for.
 */

import { NextResponse } from "next/server";
import { clearImpersonationCookie, clearSessionCookie } from "@/session";

export async function POST(request: Request): Promise<NextResponse> {
  await clearSessionCookie();
  await clearImpersonationCookie();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
