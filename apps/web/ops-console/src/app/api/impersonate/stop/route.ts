/**
 * End an impersonation (ADR 0019).
 *
 * Clears the impersonation cookie and returns the operator to the tenant's page, where the ordinary
 * operator view is shown again. This is the operator choosing to stop early; the control plane
 * would have stopped it at the TTL anyway, so this is a convenience, not the enforcement.
 */

import { NextResponse } from "next/server";
import { clearImpersonationCookie, readImpersonation, readSessionToken } from "@/session";

export async function POST(request: Request): Promise<NextResponse> {
  const active = await readImpersonation();
  await clearImpersonationCookie();

  const token = await readSessionToken();
  if (token === null) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const target = active === null ? "/tenants" : `/tenants/${encodeURIComponent(active.tenantId)}`;
  return NextResponse.redirect(new URL(target, request.url), { status: 303 });
}
