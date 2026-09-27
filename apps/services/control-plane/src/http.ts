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
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PlatformError, httpStatusFor } from "@platform/contracts";
import type { Capability, ChannelCode, TenantId, TenantPlan, RegionCode, SyncEntity } from "@platform/contracts";
import type { SyncStateStore } from "@platform/sync-state";
import type { Logger } from "./logging.ts";
import type { SessionManager } from "./identity.ts";
import { authorize } from "./identity.ts";
import type { TenantRegistry } from "./tenants.ts";
import type { ProvisioningOrchestrator } from "./provisioning.ts";
import type { TenantTerminationService } from "./termination.ts";

/** A route either requires a session, a service token, or is explicitly public. No default. */
type AuthRequirement =
  | { readonly kind: "public" }
  | { readonly kind: "service" }
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

/** Bodies and params for the worker-facing sync-state surface (ADR 0010). */
const syncOrderRefBody = z.object({
  tenantId: z.string().min(1).max(64),
  externalOrderId: z.string().min(1).max(200)
});

const syncCommitBody = z.object({
  tenantId: z.string().min(1).max(64),
  externalOrderId: z.string().min(1).max(200),
  orderId: z.string().min(1).max(200)
});

const syncIdempotencyClaimBody = z.object({
  tenantId: z.string().min(1).max(64),
  key: z.string().min(1).max(200),
  operation: z.string().min(1).max(120),
  fingerprint: z.string().min(1).max(200)
});

const syncIdempotencyCompleteBody = z.object({
  tenantId: z.string().min(1).max(64),
  key: z.string().min(1).max(200),
  outcome: z.enum(["succeeded", "failed"]),
  result: z.unknown().optional()
});

const skuMapBody = z.object({
  tenantId: z.string().min(1).max(64),
  sku: z.string().min(1).max(200),
  externalProductId: z.string().min(1).max(200),
  externalSkuId: z.string().min(1).max(200),
  externalInventoryId: z.string().min(1).max(200).nullable().default(null)
});

const cursorBody = z.object({
  tenantId: z.string().min(1).max(64),
  cursor: z.string().max(4000).nullable()
});

export interface ControlPlaneApiOptions {
  readonly registry: TenantRegistry;
  readonly provisioning: ProvisioningOrchestrator;
  readonly termination: TenantTerminationService;
  readonly sessions: SessionManager;
  /** Platform-owned channel sync state (ADR 0010). The worker reaches it only through these routes. */
  readonly syncState: SyncStateStore;
  /** Bearer tokens the worker presents. Empty means the sync-state surface is closed. */
  readonly serviceTokens: readonly string[];
  readonly logger: Logger;
}

/**
 * Compare in constant time and without early exit on length.
 *
 * A plain `===` leaks how much of a token matched via timing, enough to recover a token byte by
 * byte. `timingSafeEqual` needs equal-length buffers, so the length is folded into the result
 * rather than returning early, and every candidate is compared so timing does not reveal which
 * one matched.
 */
function isAuthorizedServiceToken(presented: string | null, allowed: readonly string[]): boolean {
  if (presented === null) return false;
  const presentedBytes = Buffer.from(presented, "utf8");
  let matched = false;
  for (const candidate of allowed) {
    const candidateBytes = Buffer.from(candidate, "utf8");
    const equal =
      presentedBytes.length === candidateBytes.length && timingSafeEqual(presentedBytes, candidateBytes);
    matched = matched || equal;
  }
  return matched;
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
    },

    // --- Worker-facing sync state (ADR 0010). Service-token auth; never a seller session. ---
    {
      method: "POST",
      path: "/v1/sync/order-refs/reserve",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncOrderRefBody.parse(body);
        return options.syncState.reserveOrderRef({
          tenantId: parsed.tenantId,
          channel: channelFromBody(body),
          externalOrderId: parsed.externalOrderId,
          now: new Date().toISOString()
        });
      }
    },
    {
      method: "POST",
      path: "/v1/sync/order-refs/commit",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncCommitBody.parse(body);
        return options.syncState.commitOrderRef(
          parsed.tenantId,
          channelFromBody(body),
          parsed.externalOrderId,
          parsed.orderId,
          new Date().toISOString()
        );
      }
    },
    {
      method: "POST",
      path: "/v1/sync/order-refs/fail",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncOrderRefBody.parse(body);
        return options.syncState.failOrderRef(
          parsed.tenantId,
          channelFromBody(body),
          parsed.externalOrderId,
          new Date().toISOString()
        );
      }
    },
    {
      method: "POST",
      path: "/v1/sync/idempotency/claim",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncIdempotencyClaimBody.parse(body);
        return options.syncState.claimIdempotency({ ...parsed, now: new Date().toISOString() });
      }
    },
    {
      method: "POST",
      path: "/v1/sync/idempotency/complete",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncIdempotencyCompleteBody.parse(body);
        return options.syncState.completeIdempotency({
          tenantId: parsed.tenantId,
          key: parsed.key,
          outcome: parsed.outcome,
          result: parsed.result ?? null,
          now: new Date().toISOString()
        });
      }
    },
    {
      method: "POST",
      path: "/v1/sync/sku-maps/upsert",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = skuMapBody.parse(body);
        return options.syncState.upsertSkuMap({
          ...parsed,
          channel: channelFromBody(body),
          updatedAt: new Date().toISOString()
        });
      }
    },
    {
      method: "GET",
      path: "/v1/sync/sku-maps/:tenantId/:channel/:sku",
      auth: { kind: "service" },
      handler: async ({ params }) =>
        ({ map: await options.syncState.getSkuMap(params.tenantId ?? "", channelParam(params), params.sku ?? "") })
    },
    {
      method: "POST",
      path: "/v1/sync/cursors/set",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = cursorBody.parse(body);
        return options.syncState.setCursor({
          tenantId: parsed.tenantId,
          channel: channelFromBody(body),
          entity: entityFromBody(body),
          cursor: parsed.cursor,
          now: new Date().toISOString()
        });
      }
    },
    {
      method: "GET",
      path: "/v1/sync/cursors/:tenantId/:channel/:entity",
      auth: { kind: "service" },
      handler: async ({ params }) =>
        ({
          cursor: await options.syncState.getCursor(
            params.tenantId ?? "",
            channelParam(params),
            entityParam(params)
          )
        })
    }
  ];
}

/**
 * `channel` and `entity` are read from the body but not constrained by the zod object above, so a
 * bad value becomes a clear 422 rather than silently narrowing to the wrong channel.
 */
function channelFromBody(body: unknown): ChannelCode {
  const channel = (body as { channel?: unknown }).channel;
  if (channel !== "tiktok_tokopedia" && channel !== "shopee" && channel !== "lazada") {
    throw new PlatformError("VALIDATION_FAILED", "A known channel is required.", { details: { channel } });
  }
  return channel;
}

function entityFromBody(body: unknown): SyncEntity {
  const entity = (body as { entity?: unknown }).entity;
  if (entity !== "orders" && entity !== "listings") {
    throw new PlatformError("VALIDATION_FAILED", "A known sync entity is required.", { details: { entity } });
  }
  return entity;
}

function channelParam(params: Readonly<Record<string, string>>): ChannelCode {
  return channelFromBody({ channel: params.channel });
}

function entityParam(params: Readonly<Record<string, string>>): SyncEntity {
  return entityFromBody({ entity: params.entity });
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
      if (route.auth.kind === "service" && !isAuthorizedServiceToken(bearerToken(request), options.serviceTokens)) {
        // The service surface is closed when no tokens are configured, not open by default.
        throw new PlatformError("UNAUTHENTICATED", "A valid service token is required.");
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
