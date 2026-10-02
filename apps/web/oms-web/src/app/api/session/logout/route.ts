/**
 * Logout (ADR 0017).
 *
 * Clears the cookie and sends the seller back to the form. It does not call the control plane: the
 * session token is stateless there and expires on its own, so deleting the only copy the UI holds is
 * what ends the UI's access. A POST, so it cannot be triggered by a link or a prefetch.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/session";

export async function POST(request: Request): Promise<NextResponse> {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
