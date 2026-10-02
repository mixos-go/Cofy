import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";
import { PlatformError } from "@platform/contracts";

/**
 * How one outbound hop is made.
 *
 * This lives in a package rather than in the worker because two services now make credential-bearing
 * hops — the worker to a tenant's engine and the control plane to the same engine for seller reads
 * (ADR 0016) — and AGENTS.md §10 is explicit that a security rule must not exist as two copies.
 * The rule below is that a credential never travels over plain HTTP; a second copy of it is how one
 * copy quietly stops enforcing it.
 */
export type Transport = (
  url: string,
  init: RequestInit
) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

/**
 * Read the optional tenant CA bundle from the environment.
 *
 * A private issuer is trusted by pointing `MEDUSA_TENANT_CA_CERT_PATH` at a PEM bundle. A file that
 * is not a certificate is refused rather than passed to Node, because a malformed `ca` would fail
 * the handshake with an error that looks like an outage. Both services that reach a tenant read it
 * the same way, from here, so the check exists once.
 */
export function readOptionalCa(path = process.env.MEDUSA_TENANT_CA_CERT_PATH): string | undefined {
  if (path === undefined || path === "") return undefined;
  const pem = readFileSync(path, "utf8");
  if (!pem.includes("BEGIN CERTIFICATE")) {
    throw new Error("MEDUSA_TENANT_CA_CERT_PATH is not a PEM certificate bundle.");
  }
  return pem;
}

/**
 * A TLS-verifying transport for calls to a tenant's engine (ADR 0012 point 6).
 *
 * The platform ships no HTTP dependency (AGENTS.md: no large runtime dependency without a human
 * call), and Node's global `fetch` cannot be handed a custom CA bundle without `undici`. So the
 * credential-bearing hop uses `node:https` directly, which accepts `ca` and enforces identity
 * verification by default.
 *
 * Two rules that are deliberately not configurable:
 *
 * - **A credential is never sent over plain HTTP.** `https` is required, and an `http` target is a
 *   configuration error rather than a silent downgrade. Internal hosts that were configured as
 *   `http://...` reach the tenant only through a TLS terminator with an `https://` base URL.
 * - **Certificate verification is never disabled.** There is no `rejectUnauthorized: false` path;
 *   a custom CA is the only way to trust a private issuer. Accepting an unverified certificate
 *   would let anything on the path receive the tenant's admin key.
 */
export function createTlsTransport(options: { readonly ca?: string } = {}): Transport {
  return async (url, init) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      throw new PlatformError(
        "VALIDATION_FAILED",
        "Refusing to send a tenant credential over a non-TLS URL.",
        { details: { protocol: parsed.protocol } }
      );
    }

    const body = typeof init.body === "string" ? init.body : undefined;
    const headers = Object.fromEntries(
      Object.entries((init.headers ?? {}) as Record<string, string>).map(([name, value]) => [
        name.toLowerCase(),
        value
      ])
    );
    if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body));

    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port === "" ? 443 : Number(parsed.port),
          path: `${parsed.pathname}${parsed.search}`,
          method: init.method ?? "GET",
          headers,
          // `ca` is passed only when configured; otherwise Node uses the system trust store.
          ...(options.ca === undefined ? {} : { ca: options.ca })
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            resolve({
              ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
              status: response.statusCode ?? 0,
              text: () => Promise.resolve(text)
            });
          });
        }
      );
      request.on("error", (error) => reject(error));
      if (body !== undefined) request.write(body);
      request.end();
    });
  };
}

/**
 * Explicit non-TLS transport for **non-secret** surfaces only, such as the control plane's sync
 * state. Kept separate from the TLS transport above so a credential-bearing hop cannot reach it by
 * accident.
 */
export function createPlainTransport(): Transport {
  return async (url, init) => {
    const parsed = new URL(url);
    const body = typeof init.body === "string" ? init.body : undefined;
    const headers = Object.fromEntries(
      Object.entries((init.headers ?? {}) as Record<string, string>).map(([name, value]) => [
        name.toLowerCase(),
        value
      ])
    );
    if (body !== undefined) headers["content-length"] = String(Buffer.byteLength(body));

    return new Promise((resolve, reject) => {
      const request = httpRequest(
        {
          hostname: parsed.hostname,
          port: parsed.port === "" ? 80 : Number(parsed.port),
          path: `${parsed.pathname}${parsed.search}`,
          method: init.method ?? "GET",
          headers
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const text = Buffer.concat(chunks).toString("utf8");
            resolve({
              ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
              status: response.statusCode ?? 0,
              text: () => Promise.resolve(text)
            });
          });
        }
      );
      request.on("error", (error) => reject(error));
      if (body !== undefined) request.write(body);
      request.end();
    });
  };
}
