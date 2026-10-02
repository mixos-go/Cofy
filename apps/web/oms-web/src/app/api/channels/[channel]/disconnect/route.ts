/**
 * Disconnect a marketplace (docs/PLAN.md M5).
 *
 * A POST, so it cannot be triggered by a link or a prefetch — this revokes a credential. The
 * control plane does the revoking; this route only carries the seller's session and the channel
 * name, and reports the outcome back on the channel screen.
 */

import { NextResponse } from "next/server";
import { disconnectChannel } from "@/control-plane";
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
  const result = await disconnectChannel(token, channel);
  const url = new URL("/channels", request.url);
  if (!result.ok) {
    url.searchParams.set("error", result.message);
  }
  return NextResponse.redirect(url, { status: 303 });
}
