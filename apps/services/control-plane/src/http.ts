/**
 * Control plane HTTP API.
 *
 * Built on `node:http` with no framework. The surface is a handful of routes, and AGENTS.md §2.10
 * asks for a written reason before adding a dependency for something the platform can already do.
 * Every route follows the same shape:
 *
 * 1. authenticate the bearer token,
 * 2. authorize capability and tenant scope,
 * 3. validate the request body with zod (AGENTS.md §5),
 * 4. call a service,
 * 5. map a `PlatformError` to a status with `httpStatusFor`.
 *
 * Steps 1-2 are part of the route table rather than left to each handler, so a new route cannot
 * forget them: a route without an explicit auth requirement does not compile.
 */

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { z } from "zod";
import { PlatformError, httpStatusFor } from "@platform/contracts";
import type { Capability, TenantId, TenantPlan, RegionCode } from "@platform/contracts";
import type { Logger } from "./logging.ts";
import type { SessionManager } from "./identity.ts";
import { authorize } from "./identity.ts";
import type { TenantRegistry } from "./tenants.ts";
import type { ProvisioningOrchestrator } from "./provisioning.ts";
import type { TenantTerminationService } from "./termination.ts";

/** A route either requires a session, or is explicitly public. There is no default. */
type AuthRequirement =
  | { readonly kind: "public" }
  | { readonly kind: "session"; readonly capability: Capability; readonly scope: "self" | "tenant" };

export interface RouteContext {
  readonly request: IncomingMessage;
  readonly params: Readonly<Record<string, string>>;
  readonly body: unknown;
  readonly tenantId: TenantId | null;
  readonly correlationId: string;
}

export interface Route {
  readonly method: "GET" | "POST" | "DELETE";
  /** Path pattern. `:name` matches one segment. */
  readonly path: string;
  readonly auth: AuthRequirement;
  readonly handler: (ctx: RouteContext) => Promise<unknown>;
}

const createTenantBody = z.object({
  slug: z.string().min(2).max(41),
  displayName: z.string().min(1).max(120),
  plan: z.enum(["starter", "growth", "scale"]),
  region: z.enum(["id-jkt", "sg-sin"])
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export interface ControlPlaneApiOptions {
  readonly registry: TenantRegistry;
  readonly provisioning: ProvisioningOrchestrator;
  readonly termination: TenantTerminationService;
  readonly sessions: SessionManager;
  readonly logger: Logger;
}

export function createRoutes(options: ControlPlaneApiOptions): readonly Route[] {
  const { registry, provisioning, termination, sessions } = options;

  return [
    {
      method: "POST",
      path: "/v1/auth/login",
      auth: { kind: "public" },
      handler: async ({ body }) => {
        const parsed = loginBody.parse(body);
        const session = await sessions.login(parsed.email, parsed.password);
        return {
          token: session.token,
          role: session.role,
          tenantId: session.tenantId,
          expiresAt: session.expiresAt
        };
      }
    },
    {
      method: "POST",
      path: "/v1/tenants",
      auth: { kind: "session", capability: "tenant:create", scope: "self" },
      handler: async ({ body, correlationId }) => {
        const parsed = createTenantBody.parse(body);
        const tenant = await registry.create({
          slug: parsed.slug,
          displayName: parsed.displayName,
          plan: parsed.plan as TenantPlan,
          region: parsed.region as RegionCode
        });

        // Provisioning runs after creation so the caller gets an id immediately and can poll
        // progress. A long provision must not hold an HTTP request open.
        void provisioning.provision(tenant.id).catch((error: unknown) => {
          options.logger.error("tenant.provisioning.dispatch_failed", {
            tenantId: tenant.id,
            correlationId,
            errorMessage: error instanceof Error ? error.message : "unknown"
          });
        });

        return { tenant };
      }
    },
    {
      method: "GET",
      path: "/v1/tenants",
      auth: { kind: "session", capability: "tenant:read", scope: "self" },
      handler: async ({ tenantId }) => {
        // An operator has no tenant, so `tenantId` is null and they see everything. A seller sees
        // only their own. This filter is the authorization boundary, so it lives here.
        const all = await registry.list();
        const visible = tenantId === null ? all : all.filter((t) => t.id === tenantId);
        return { tenants: visible };
      }
    },
    {
      method: "GET",
      path: "/v1/tenants/:tenantId",
      auth: { kind: "session", capability: "tenant:read", scope: "tenant" },
      handler: async ({ params }) => registry.getDetail(params.tenantId ?? "")
    },
    {
      method: "GET",
      path: "/v1/tenants/:tenantId/health",
      auth: { kind: "session", capability: "tenant:read", scope: "tenant" },
      handler: async ({ params }) => {
        const detail = await registry.getDetail(params.tenantId ?? "");
        return {
          tenantId: detail.tenant.id,
          state: detail.tenant.state,
          servable: detail.tenant.state === "active",
          provisioningComplete: detail.provisioning.complete
        };
      }
    },
    {
      method: "POST",
      path: "/v1/tenants/:tenantId/provision",
      auth: { kind: "session", capability: "tenant:create", scope: "tenant" },
      handler: async ({ params }) => {
        const run = await provisioning.provision(params.tenantId ?? "");
        return { provisioning: run };
      }
    },
    {
      method: "DELETE",
      path: "/v1/tenants/:tenantId",
      auth: { kind: "session", capability: "tenant:terminate", scope: "tenant" },
      handler: async ({ params }) => termination.terminate(params.tenantId ?? "")
    }
  ];
}

function matchPath(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i += 1) {
    const expected = patternParts[i];
    const actual = pathParts[i];
    if (expected === undefined || actual === undefined) return null;
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  const LIMIT = 1024 * 1024;

  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    // Refusing oversized bodies keeps a single request from exhausting memory.
    if (size > LIMIT) {
      throw new PlatformError("VALIDATION_FAILED", "Request body too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "Request body is not valid JSON.");
  }
}

function bearerToken(request: IncomingMessage): string | null {
  const header = request.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || token === undefined) return null;
  return token;
}

export function createControlPlaneServer(options: ControlPlaneApiOptions): Server {
  const routes = createRoutes(options);

  return createServer((request, response) => {
    void handle(request, response, routes, options).catch(() => {
      // Last-resort guard. `handle` maps its own errors; reaching here means a bug in that mapping,
      // and the response must still be well-formed.
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "Internal error." } }));
    });
  });
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
  routes: readonly Route[],
  options: ControlPlaneApiOptions
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://localhost");
  const correlationId = `req_${Math.random().toString(36).slice(2, 10)}`;

  const send = (status: number, payload: unknown): void => {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body)
    });
    response.end(body);
  };

  try {
    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.path, url.pathname);
      if (params === null) continue;

      let session = null;
      if (route.auth.kind === "session") {
        const token = bearerToken(request);
        session = token === null ? null : await options.sessions.resolve(token);
        if (session === null) {
          throw new PlatformError("UNAUTHENTICATED", "A valid session token is required.");
        }
      }

      const targetTenantId = params.tenantId ?? session?.tenantId ?? null;

      if (route.auth.kind === "session") {
        // A route scoped to `self` acts on the caller's own tenant; an operator has none. That is
        // intentional: operator-only routes are the ones that must say `scope: "tenant"`.
        const scopeTenantId = route.auth.scope === "self" ? session?.tenantId ?? null : targetTenantId;
        authorize(session!, route.auth.capability, scopeTenantId);
      }

      const body = method === "GET" || method === "DELETE" ? {} : await readBody(request);

      const result = await route.handler({
        request,
        params,
        body,
        tenantId: targetTenantId,
        correlationId
      });

      send(200, result === undefined ? {} : result);
      return;
    }

    throw new PlatformError("NOT_FOUND", "No such route.");
  } catch (error) {
    if (error instanceof PlatformError) {
      options.logger.warn("request.failed", {
        correlationId,
        path: url.pathname,
        code: error.code,
        errorMessage: error.message
      });
      send(httpStatusFor(error.code), {
        error: { code: error.code, message: error.message, details: error.details }
      });
      return;
    }

    if (error instanceof z.ZodError) {
      send(422, {
        error: { code: "VALIDATION_FAILED", message: "Request validation failed.", details: error.issues }
      });
      return;
    }

    const message = error instanceof Error ? error.message : "unknown";
    options.logger.error("request.unhandled", { correlationId, path: url.pathname, errorMessage: message });
    send(500, { error: { code: "UPSTREAM_ERROR", message: "Internal error." } });
  }
}
