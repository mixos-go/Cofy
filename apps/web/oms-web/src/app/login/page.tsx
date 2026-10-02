import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readSessionToken } from "@/session";

export const metadata: Metadata = { title: "Masuk — Cofy" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Someone who is already signed in has no reason to see the form.
  if ((await readSessionToken()) !== null) redirect("/orders");

  const { error } = await searchParams;

  return (
    <main>
      <h1>Masuk</h1>
      {error === undefined ? null : <p className="notice">{error}</p>}
      <form className="login" action="/api/session" method="post">
        <label>
          Email
          <input type="email" name="email" autoComplete="username" required />
        </label>
        <label>
          Kata sandi
          <input type="password" name="password" autoComplete="current-password" required />
        </label>
        <button type="submit">Masuk</button>
      </form>
    </main>
  );
}
