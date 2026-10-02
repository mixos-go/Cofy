/**
 * Start an impersonation (ADR 0019).
 *
 * The operator's session stays in its cookie; the returned seller token goes into the impersonation
 * cookie with the expiry the control plane set. The audit record is written by the control plane
 * before it answers, so reaching this redirect means the act is already on the trail.
 */

import { NextResponse } from "next/server";
import { impersonate } from "@/control-plane";
import { readSessionToken, setImpersonationCookie } from "@/session";

export async function POST(request: Request): Promise<NextResponse> {
  const token = await readSessionToken();
  if (token === null) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const form = await request.formData();
  const tenantId = String(form.get("tenantId") ?? "");
  const result = await impersonate(token, tenantId);

  if (!result.ok) {
    const url = new URL(`/tenants/${encodeURIComponent(tenantId)}`, request.url);
    url.searchParams.set("error", result.message);
    return NextResponse.redirect(url, { status: 303 });
  }

  await setImpersonationCookie({
    token: result.value.token,
    tenantId: result.value.tenantId,
    tenantName: result.value.tenant.displayName,
    actorEmail: result.value.actor.email,
    expiresAt: result.value.expiresAt
  });

  // Straight into the tenant's own view, so support sees what the seller sees from the first click.
  return NextResponse.redirect(
    new URL(`/tenants/${encodeURIComponent(result.value.tenantId)}`, request.url),
    { status: 303 }
  );
}
