/**
 * Start connecting a marketplace (docs/PLAN.md M5).
 *
 * A plain form post, so connecting works without JavaScript (ADR 0017). The control plane returns
 * the marketplace's authorization URL; the browser is sent there directly. The OAuth state is the
 * control plane's to hold, not this app's: it is issued and consumed there, and nothing here stores
 * it, so a redirect that never returns leaves no half-finished state behind.
 */

import { NextResponse } from "next/server";
import { connectChannel } from "@/control-plane";
import { readSessionToken } from "@/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> }
): Promise<NextResponse> {
  const token = await readSessionToken();
  if (token === null) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  }

  const { channel } = await params;
  const result = await connectChannel(token, channel);
  if (!result.ok) {
    const url = new URL("/channels", request.url);
    url.searchParams.set("error", result.message);
    return NextResponse.redirect(url, { status: 303 });
  }

  // The marketplace URL is the control plane's, not the caller's, so this is not an open redirect:
  // nothing the seller typed reaches it.
  return NextResponse.redirect(result.value.authorizeUrl, { status: 303 });
}
