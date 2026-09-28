import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";
import { PlatformError } from "@platform/contracts";
import type { Transport } from "./ports.ts";

/**
 * A TLS-verifying transport for the worker's calls to a tenant's engine (ADR 0012 point 6).
 *
 * The worker ships no HTTP dependency (AGENTS.md: no large runtime dependency without a human
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
