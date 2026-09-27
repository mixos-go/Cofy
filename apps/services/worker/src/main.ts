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

import { createServer } from "node:http";
import { createLogger } from "@platform/observability";
import type { LogLevel } from "@platform/observability";
import { HttpChannelGateway, HttpCommerceClient, HttpSyncStateClient } from "./ports.ts";

function readToken(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    // A missing service token is a misconfiguration that must stop startup, not degrade to
    // unauthenticated calls that a marketplace would reject anyway.
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function main(): Promise<void> {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel | undefined) ?? "info");

  const controlPlane = new HttpSyncStateClient({
    baseUrl: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    serviceToken: readToken("CONTROL_PLANE_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const gateway = new HttpChannelGateway({
    baseUrl: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002",
    serviceToken: readToken("INTEGRATION_SERVICE_TOKENS").split(",")[0]?.trim() ?? ""
  });
  const commerce = new HttpCommerceClient({
    baseUrl: readToken("MEDUSA_ADMIN_BASE_URL"),
    serviceToken: readToken("MEDUSA_ADMIN_TOKEN")
  });

  // Referenced so the wiring is not tree-shaken away and the ports are constructed at boot, which
  // surfaces a bad base URL immediately rather than on the first order.
  logger.info("startup.ports_ready", {
    controlPlane: process.env.CONTROL_PLANE_BASE_URL ?? "http://127.0.0.1:4001",
    integrationPlane: process.env.INTEGRATION_PLANE_BASE_URL ?? "http://127.0.0.1:4002"
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
