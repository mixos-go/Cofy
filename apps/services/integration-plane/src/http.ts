/**
 * Integration plane HTTP API.
 *
 * Built on `node:http` with no framework, matching the control plane (AGENTS.md §2.10). Every
 * route declares its auth explicitly: `service` routes require a bearer service token, `public`
 * routes are reachable from a browser. There is no default, so a new route cannot forget to say.
 *
 * The surface is deliberately small. This is the seam the next milestone writes into — order
 * import and the rate-limit governor land here — so it exposes OAuth (begin, callback) and a
 * credential probe that proves a stored credential is usable, and nothing else.
 */

import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { PlatformError, RateLimitedError, httpStatusFor } from "@platform/contracts";
import type { ChannelCode } from "@platform/contracts";
import type { ChannelConnector } from "@platform/channel-sdk";
import { z } from "zod";
import { ChannelRegistry } from "./channels.ts";
import type { IntegrationPlaneOptions } from "./types.ts";

type AuthRequirement = { readonly kind: "public" } | { readonly kind: "service" };

export interface RouteContext {
  readonly request: IncomingMessage;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly body: unknown;
  readonly correlationId: string;
}

export interface Route {
  readonly method: "GET" | "POST";
  readonly path: string;
  readonly auth: AuthRequirement;
  readonly handler: (ctx: RouteContext) => Promise<unknown>;
}

const authorizeBody = z.object({
  tenantId: z.string().min(1).max(64)
});

/**
 * A probe asks "can we still use this seller's credential?" and reports only that.
 *
 * It never returns order data or the credential itself. Its whole purpose is to turn "the token is
 * stored" into "the token works against the live API", which is the gap a stored-but-dead
 * credential would otherwise leave.
 */
const probeBody = z.object({
  tenantId: z.string().min(1).max(64)
});

/**
 * The worker's three calls into this plane. Each is one page or one batch, never a walk: the
 * workflow owns pagination and rescheduling, this plane owns "talk to the marketplace"
 * (AGENTS.md §4). Cursors and stock items are opaque contracts, so no marketplace shape crosses
 * this boundary.
 */
const pageBody = z.object({
  tenantId: z.string().min(1).max(64),
  cursor: z.string().nullable().default(null)
});

const stockPushBody = z.object({
  tenantId: z.string().min(1).max(64),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        available: z.number().int().nonnegative(),
        externalProductId: z.string().min(1).optional(),
        externalSkuId: z.string().min(1).optional(),
        externalInventoryId: z.string().min(1).optional()
      })
    )
    .min(1)
    .max(200)
});

/** Load the credential for a tenant and channel, or fail as disconnected. */
async function credentialFor(
  options: IntegrationPlaneOptions,
  tenantId: string,
  channel: ChannelCode
) {
  const stored = await options.credentials.get({ tenantId, channel });
  if (stored === null) {
    throw new PlatformError("CHANNEL_DISCONNECTED", "This tenant has not connected the channel.", {
      details: { tenantId, channel }
    });
  }
  return stored;
}

async function requireCapability(
  connector: ChannelConnector,
  capability:
    | "supportsOrderPull"
    | "supportsListingRead"
    | "supportsStockPush"
    | "supportsStockSnapshotRead"
): Promise<void> {
  // A connector declares what it can do (AGENTS.md §4). Calling past a `false` would either throw
  // from the connector or, worse, look like an empty success; refusing here makes it a clear error.
  if (!connector.capabilities()[capability]) {
    throw new PlatformError("VALIDATION_FAILED", `This channel does not support ${capability}.`, {
      details: { capability }
    });
  }
}

function channelParam(params: Readonly<Record<string, string>>): ChannelCode {
  const channel = params.channel;
  if (channel === undefined) {
    throw new PlatformError("NOT_FOUND", "No channel in the path.");
  }
  return channel as ChannelCode;
}

/**
 * Run one marketplace call under the shared governor (ADR 0002).
 *
 * The governor decides *when*, it does not sleep: a denial becomes a `RateLimitedError` the caller
 * reschedules on, because blocking a request here would hold the connection and, with one budget
 * shared by every tenant, make one slow caller everyone's problem. The worker reschedules; this
 * plane only refuses.
 *
 * A `Retry-After` the marketplace sends overrides our accounting for the whole channel: the
 * marketplace knows its own state and may be counting traffic the governor never saw, so every
 * tenant waits rather than each retrying into the same wall.
 */
async function callChannel<T>(
  options: IntegrationPlaneOptions,
  channel: ChannelCode,
  tenantId: string,
  call: () => Promise<T>
): Promise<T> {
  const decision = options.governor.acquire({ tenantId, channel });
  if (decision.kind === "reschedule") {
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    options.logger.info("channel.rate_limited", {
      tenantId,
      channel,
      reason: decision.reason,
      retryAfterSeconds
    });
    throw new RateLimitedError(
      `Rate limit for ${channel}: ${decision.reason}.`,
      retryAfterSeconds,
      // `details` rides in the JSON error body, so the worker sees the retry hint even though it
      // reconstructs the error from the body rather than the `Retry-After` header.
      { reason: decision.reason, retryAfterSeconds }
    );
  }

  try {
    return await call();
  } catch (error) {
    // An authoritative rate-limit response from the channel pauses every tenant on this channel.
    if (error instanceof RateLimitedError) {
      options.governor.recordRateLimited(channel, error.retryAfterSeconds);
    }
    throw error;
  }
}

export function createRoutes(
  options: IntegrationPlaneOptions,
  registry: ChannelRegistry
): readonly Route[] {
  const now = options.now ?? (() => new Date());

  return [
    {
      method: "GET",
      path: "/health",
      auth: { kind: "public" },
      handler: async () => ({
        status: "ok",
        channels: registry.channels()
      })
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/authorize",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const { tenantId } = authorizeBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);

        const redirectUri = `${options.publicBaseUrl}/v1/channels/${channel}/callback`;
        const state = await options.oauthStates.create({ tenantId, channel, redirectUri, now: now() });
        const request = await connector.beginAuthorization({ tenantId, redirectUri, state: state.state });

        // Only the URL and the state leave this route. The state is single-use and expires, so
        // handing it to the caller that started the flow is its intended journey.
        return { authorizeUrl: request.url, state: state.state, expiresAt: state.expiresAt };
      }
    },
    {
      method: "GET",
      path: "/v1/channels/:channel/callback",
      auth: { kind: "public" },
      handler: async ({ params, query }) => {
        const channel = channelParam(params);
        const connector = registry.require(channel);

        const code = query.get("code");
        const state = query.get("state");
        if (code === null || code === "" || state === null || state === "") {
          throw new PlatformError("VALIDATION_FAILED", "The callback requires both `code` and `state`.");
        }

        // Consume the state before doing anything with the code. An unknown, replayed, or expired
        // state stops here, and the marketplace's code is never presented to a connector.
        const record = await options.oauthStates.consume(state, now());
        if (record === null || record.channel !== channel) {
          throw new PlatformError("FORBIDDEN", "The OAuth state is unknown, expired, or already used.");
        }

        const credential = await connector.completeAuthorization(
          { tenantId: record.tenantId, redirectUri: record.redirectUri, state: record.state },
          { code, state: record.state }
        );

        await options.credentials.put({
          tenantId: record.tenantId,
          channel,
          accessToken: credential.accessToken,
          refreshToken: credential.refreshToken,
          expiresAt: credential.expiresAt,
          context: credential.context
        });

        options.logger.info("channel.authorized", {
          tenantId: record.tenantId,
          channel,
          correlationId: undefined
        });

        // The seller sees a confirmation, not tokens.
        return { connected: true, channel };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/probe",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const { tenantId } = probeBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);

        const stored = await options.credentials.get({ tenantId, channel });
        if (stored === null) {
          throw new PlatformError("CHANNEL_DISCONNECTED", "This tenant has not connected the channel.", {
            details: { tenantId, channel }
          });
        }

        // Walk one page from the real connector. This exercises the credential, signing, host and
        // cursor path together; anything less would not prove the connection works. It spends
        // budget like any other read, so it also goes through the governor.
        const page = await callChannel(options, channel, tenantId, () =>
          connector.fetchOrders({ value: null }, stored)
        );

        return {
          tenantId,
          channel,
          reachable: true,
          ordersInFirstPage: page.items.length,
          caughtUp: page.next.value === null
        };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/orders/page",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = pageBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);
        await requireCapability(connector, "supportsOrderPull");

        const credential = await credentialFor(options, parsed.tenantId, channel);
        const page = await callChannel(options, channel, parsed.tenantId, () =>
          connector.fetchOrders({ value: parsed.cursor }, credential)
        );
        return { items: page.items, nextCursor: page.next.value };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/listings/page",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = pageBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);
        await requireCapability(connector, "supportsListingRead");

        const credential = await credentialFor(options, parsed.tenantId, channel);
        const page = await callChannel(options, channel, parsed.tenantId, () =>
          connector.fetchListings({ value: parsed.cursor }, credential)
        );
        return { items: page.items, nextCursor: page.next.value };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/stock",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = stockPushBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);
        await requireCapability(connector, "supportsStockPush");

        const credential = await credentialFor(options, parsed.tenantId, channel);
        const results = await callChannel(options, channel, parsed.tenantId, () =>
          connector.pushStock(parsed.items, credential)
        );
        return { results };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/capabilities",
      auth: { kind: "service" },
      handler: async ({ params }) => {
        // Read-only and credential-free: what a connector can do is a property of the platform's
        // app registration, not of one seller's connection (docs/adr/0003). The worker uses this to
        // decide which reconciliation passes a channel is worth arming (docs/adr/0015).
        const channel = channelParam(params);
        return { channel, capabilities: registry.require(channel).capabilities() };
      }
    },
    {
      method: "POST",
      path: "/v1/channels/:channel/stock-snapshot/page",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = pageBody.parse(body);
        const channel = channelParam(params);
        const connector = registry.require(channel);
        await requireCapability(connector, "supportsStockSnapshotRead");

        const credential = await credentialFor(options, parsed.tenantId, channel);
        const page = await callChannel(options, channel, parsed.tenantId, () =>
          connector.fetchStockSnapshot({ value: parsed.cursor }, credential)
        );
        return { items: page.items, nextCursor: page.next.value };
      }
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

/**
 * Compare in constant time and without early exit on length.
 *
 * A plain `includes`/`===` leaks how much of a token matched via timing, which is enough to
 * recover a token byte by byte given enough attempts. `timingSafeEqual` needs equal-length
 * buffers, so we fold the length difference into the result rather than returning early.
 */
function isAuthorizedServiceToken(presented: string | null, allowed: readonly string[]): boolean {
  if (presented === null) return false;
  const presentedBytes = Buffer.from(presented, "utf8");
  let matched = false;
  for (const candidate of allowed) {
    const candidateBytes = Buffer.from(candidate, "utf8");
    const equal =
      presentedBytes.length === candidateBytes.length &&
      timingSafeEqual(presentedBytes, candidateBytes);
    // No early return: every candidate is compared so timing does not reveal which one matched.
    matched = matched || equal;
  }
  return matched;
}

export function createIntegrationPlaneServer(options: IntegrationPlaneOptions): Server {
  const registry = new ChannelRegistry(options.channels);
  const routes = createRoutes(options, registry);

  return createServer((request, response) => {
    void handle(request, response, routes, options).catch(() => {
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
  options: IntegrationPlaneOptions
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://localhost");
  const correlationId = `req_${Math.random().toString(36).slice(2, 10)}`;

  const send = (status: number, payload: unknown, headers: Record<string, string> = {}): void => {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
      ...headers
    });
    response.end(body);
  };

  try {
    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchPath(route.path, url.pathname);
      if (params === null) continue;

      if (route.auth.kind === "service") {
        const token = bearerToken(request);
        if (!isAuthorizedServiceToken(token, options.serviceTokens)) {
          throw new PlatformError("UNAUTHENTICATED", "A valid service token is required.");
        }
      }

      const body = method === "GET" ? {} : await readBody(request);

      const result = await route.handler({
        request,
        params,
        query: url.searchParams,
        body,
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
      // A 429 must tell the caller when to come back; without `Retry-After`, every worker would
      // retry on its own schedule and defeat the shared budget the governor just enforced.
      const headers: Record<string, string> =
        error instanceof RateLimitedError && error.retryAfterSeconds !== null
          ? { "retry-after": String(error.retryAfterSeconds) }
          : {};
      send(
        httpStatusFor(error.code),
        {
          error: { code: error.code, message: error.message, details: error.details }
        },
        headers
      );
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
