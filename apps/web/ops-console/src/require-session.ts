/**
 * Requiring a session in a page (ADR 0017).
 *
 * Every authenticated page starts here. The redirect is a redirect, not a rendered message: an
 * absent cookie is not a condition a seller can act on.
 */

import { redirect } from "next/navigation";
import { readSessionToken } from "@/session";

export async function requireSessionToken(): Promise<string> {
  const token = await readSessionToken();
  if (token === null) redirect("/login");
  return token;
}
