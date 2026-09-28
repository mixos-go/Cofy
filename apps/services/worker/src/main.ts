/**
 * Worker entry point.
 *
 * Wires the HTTP ports (control plane for sync state, integration plane for marketplaces, each
 * tenant's Medusa Admin API for commerce) and starts a workflow engine. The engine itself is M4:
 * AGENTS.md §2.5 says no sync work runs without it, so until it lands this process only exposes a
 * health surface and refuses to run workflows on a timer.
 *
 * Nothing here imports a connector or Medusa. The worker orchestrates over HTTP (ADR 0010).
 */

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createLogger } from "@platform/observability";
import type { LogLevel } from "@platform/observability";
import { InMemoryMedusaAdminKeyStore } from "@platform/secrets";
import type { MedusaAdminKeyStore } from "@platform/secrets";
import {
  HttpChannelGateway,
  HttpCommerceClient,
  HttpMedusaTargetResolver,
  HttpSyncStateClient
} from "./ports.ts";
import { createTlsTransport } from "./transport.ts";

function readToken(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    // A missing service token is a misconfiguration that must stop startup, not degrade to
    // unauthenticated calls that a marketplace would reject anyway.
    throw new Error(`${name} is required.`);
  }
  return value;
}

/**
 * The CA bundle used to verify a tenant's engine certificate (ADR 0012 point 6).
 *
 * Absent means "use the system trust store", which is correct for a publicly trusted issuer. A
 * private issuer must supply a bundle, and a malformed one stops startup rather than silently
 * falling back to an unverified connection.
 */
function readOptionalCa(): string | undefined {
  const path = process.env.MEDUSA_TENANT_CA_CERT_PATH;
  if (path === undefined || path === "") return undefined;
  const pem = readFileSync(path, "utf8");
  if (!pem.includes("BEGIN CERTIFICATE")) {
    throw new Error("MEDUSA_TENANT_CA_CERT_PATH is not a PEM certificate bundle.");
  }
  return pem;
}

async function main(): Promise<void> {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel | undefined) ?? "info");
  // The per-tenant admin keys hand to the tenant-facing client (ADR 0012). The in-memory store is
  // the local/dev adapter; production selects the KMS-backed one behind the same interface.
  const medusaAdminKeys: MedusaAdminKeyStore = new InMemoryMedusaAdminKeyStore();

  const controlPlane = new HttpSyncStateClient({
    baseUrl: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    serviceToken: readToken("CONTROL_PLANE_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const gateway = new HttpChannelGateway({
    baseUrl: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    serviceToken: readToken("INTEGRATION_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const commerce = new HttpCommerceClient({
    resolver: new HttpMedusaTargetResolver({
      controlPlane,
      keys: medusaAdminKeys
    }),
    transport: createTlsTransport({ ca: readOptionalCa() })
  });

  // Referenced so the wiring is not tree-shaken away and the ports are constructed at boot, which
  // surfaces bad configuration immediately rather than on the first order. The tenant engine has no
  // single base URL: it is resolved per tenant (ADR 0012).
  logger.info("startup.ports_ready", {
    controlPlane: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    integrationPlane: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    tenantEngine: "resolved-per-tenant"
  });
  void controlPlane;
  void gateway;
  void commerce;

  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", workflows: [] }));
  });
  const port = Number(process.env.WORKER_PORT ?? 4003);
  server.listen(port, () => {
    logger.info("startup.listening", { port });
  });
}

await main();
