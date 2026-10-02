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
import { PlatformError, RateLimitedError, httpStatusFor, asChannelCode, asCourierCode, SERVICE_LEVELS } from "@platform/contracts";
import type { ChannelCode, CourierCode, ShipmentQuote } from "@platform/contracts";
import type { ChannelConnector } from "@platform/channel-sdk";
import type { CourierCredential } from "@platform/courier-sdk";
import { z } from "zod";
import { ChannelRegistry } from "./channels.ts";
import { CourierRegistry } from "./couriers.ts";
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

/**
 * A shipment request in courier-neutral terms (docs/adr/0020).
 *
 * Deliberately not a courier's shape: the provider maps this into its own API. `weightGrams` is an
 * integer because couriers bill on whole grams, and a float here would round differently in every
 * provider.
 */
const shipmentRequestBody = z.object({
  orderId: z.string().min(1).max(128),
  destination: z.object({
    city: z.string().min(1).max(128),
    postalCode: z.string().min(1).max(16).nullable().default(null),
    address: z.string().min(1).max(512)
  }),
  weightGrams: z.number().int().positive(),
  declaredValue: z.object({ amount: z.number().int().nonnegative(), currency: z.literal("IDR") }),
  requiresInsurance: z.boolean().default(false),
  requiresCod: z.boolean().default(false)
});

const quoteBody = z.object({
  tenantId: z.string().min(1).max(64),
  shipment: shipmentRequestBody,
  /** Couriers to price. Empty/absent means every registered courier. */
  couriers: z.array(z.string().min(1)).max(16).optional()
});

const serviceLevelSchema = z.enum(SERVICE_LEVELS);

const shipmentQuoteSchema = z.object({
  courier: z.string().min(1),
  serviceLevel: serviceLevelSchema,
  price: z.object({ amount: z.number().int().nonnegative(), currency: z.literal("IDR") }),
  estimatedDays: z.object({ min: z.number().int().nonnegative(), max: z.number().int().nonnegative() }),
  supportsInsurance: z.boolean(),
  supportsCod: z.boolean(),
  providerQuoteId: z.string().min(1)
});

const createShipmentBody = z.object({
  tenantId: z.string().min(1).max(64),
  quote: shipmentQuoteSchema,
  shipment: shipmentRequestBody
});

const trackingBody = z.object({
  tenantId: z.string().min(1).max(64),
  trackingNumber: z.string().min(1).max(128)
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
  const decision = options.governor.acquire({ tenantId, resource: channel });
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

/**
 * Run one courier call under the same governor (docs/adr/0020).
 *
 * Identical accounting to a channel call: a courier's limit is per app key and the platform owns one
 * key, so a denial becomes a `RateLimitedError` the worker reschedules on, and a courier's own
 * `Retry-After` pauses the courier for every tenant. Sharing the governor is the point — a second
 * copy of this logic is how one copy silently drifts from the other.
 */
async function callCourier<T>(
  options: IntegrationPlaneOptions,
  courier: CourierCode,
  tenantId: string,
  call: () => Promise<T>
): Promise<T> {
  const decision = options.governor.acquire({ tenantId, resource: courier });
  if (decision.kind === "reschedule") {
    const retryAfterSeconds = Math.max(1, Math.ceil(decision.retryAfterMs / 1000));
    options.logger.info("courier.rate_limited", {
      tenantId,
      courier,
      reason: decision.reason,
      retryAfterSeconds
    });
    throw new RateLimitedError(
      `Rate limit for ${courier}: ${decision.reason}.`,
      retryAfterSeconds,
      { reason: decision.reason, retryAfterSeconds }
    );
  }

  try {
    return await call();
  } catch (error) {
    if (error instanceof RateLimitedError) {
      options.governor.recordRateLimited(courier, error.retryAfterSeconds);
    }
    throw error;
  }
}

/**
 * The platform-owned key for a courier, or a non-retryable error.
 *
 * A missing key means the courier is registered but not configured — an operator mistake, not a
 * seller's, so it fails loudly rather than looking like "no quotes".
 */
function courierCredentialFor(
  options: IntegrationPlaneOptions,
  courier: CourierCode
): CourierCredential {
  const credential = options.courierKeys.get(courier);
  if (credential === null) {
    throw new PlatformError("VALIDATION_FAILED", `No credential is configured for ${courier}.`, {
      details: { courier }
    });
  }
  return credential;
}

function courierParam(params: Readonly<Record<string, string>>): CourierCode {
  const raw = params.courier;
  const courier = raw === undefined ? null : asCourierCode(raw);
  if (courier === null) {
    throw new PlatformError("NOT_FOUND", "Unknown courier.", { details: { courier: raw } });
  }
  return courier;
}

export function createRoutes(
  options: IntegrationPlaneOptions,
  registry: ChannelRegistry,
  couriers: CourierRegistry
): readonly Route[] {
  const now = options.now ?? (() => new Date());

  return [
    {
      method: "GET",
      path: "/health",
      auth: { kind: "public" },
      handler: async () => ({
        status: "ok",
        channels: registry.channels(),
        couriers: couriers.couriers()
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
      // Every channel this tenant currently holds a credential for, as non-secret summaries.
      //
      // The control plane asks this to render the seller's channel list, and it must be able to ask
      // without ever seeing a token: the summaries carry the marketplace identifiers and the expiry,
      // which is what a "connected, expires in 3 days" row needs, and nothing that grants access.
      method: "POST",
      path: "/v1/channels/connections",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const { tenantId } = authorizeBody.parse(body);
        return { connections: await options.credentials.summariesForTenant(tenantId) };
      }
    },
    {
      // Revoke one channel's credential. Idempotent on purpose: disconnecting an already-disconnected
      // channel is a no-op, not an error, because the seller's intent ("this channel should not be
      // connected") is already satisfied and a 404 would only teach them to retry.
      method: "POST",
      path: "/v1/channels/:channel/disconnect",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const { tenantId } = authorizeBody.parse(body);
        const raw = params.channel;
        const channel = raw === undefined ? null : asChannelCode(raw);
        if (channel === null) {
          throw new PlatformError("NOT_FOUND", "Unknown channel.", { details: { channel: raw } });
        }
        // A channel we do not serve still has to be clearable, so the registry is not consulted: a
        // connector removed from configuration must not strand a credential it once stored.
        await options.credentials.clear({ tenantId, channel });
        options.logger.info("channel.disconnected", { tenantId, channel });
        return { disconnected: true, channel };
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
    },
    {
      // Every courier this plane can quote, and what each supports. Credential-free: capabilities
      // are a property of the platform's app registration (docs/adr/0003), so the worker can read
      // them before any key is configured and the seller UI can show the matrix (M8 deliverable).
      method: "POST",
      path: "/v1/couriers/capabilities",
      auth: { kind: "service" },
      handler: async () => ({
        couriers: couriers.all().map((entry) => ({
          courier: entry.courier,
          capabilities: entry.provider.capabilities()
        }))
      })
    },
    {
      // Price one shipment across the couriers named, in courier-neutral terms.
      //
      // This is a fan-out, not a rate-shopping decision: it returns every quote it collected and
      // the caller applies `selectCourier` (docs/adr/0020). A courier that fails to quote is
      // reported in `failures` rather than failing the whole request — one courier being down must
      // not stop the seller shipping with another.
      method: "POST",
      path: "/v1/couriers/quotes",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = quoteBody.parse(body);
        const requested =
          parsed.couriers === undefined || parsed.couriers.length === 0
            ? couriers.couriers()
            : parsed.couriers.map((raw) => courierParam({ courier: raw }));

        const quotes: ShipmentQuote[] = [];
        const failures: { courier: CourierCode; reason: string }[] = [];
        for (const courier of requested) {
          const provider = couriers.require(courier).provider;
          try {
            const credential = courierCredentialFor(options, courier);
            const priced = await callCourier(options, courier, parsed.tenantId, () =>
              provider.quote(parsed.shipment, credential)
            );
            quotes.push(...priced);
          } catch (error) {
            // A rate limit is not "this courier is broken": it is "come back later". Swallowing it
            // into `failures` would hand the caller a partial answer and lose the retry hint, so it
            // propagates and the worker reschedules the whole fan-out.
            if (error instanceof RateLimitedError) throw error;
            failures.push({ courier, reason: failureReason(error) });
          }
        }
        return { quotes, failures };
      }
    },
    {
      // Book one shipment for an already-chosen quote. The caller passes the quote back so the
      // provider books the exact service that was priced; the quote is the audit's chosen value.
      method: "POST",
      path: "/v1/couriers/:courier/shipments",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = createShipmentBody.parse(body);
        const courier = courierParam(params);
        // The quote is echoed back from a prior quote call, so its courier must be the one in the
        // path: booking courier B for a quote that named courier A would bill a service that was
        // never priced. Narrow the echoed string to a real code and refuse a mismatch.
        const quotedCourier = asCourierCode(parsed.quote.courier);
        if (quotedCourier === null || quotedCourier !== courier) {
          throw new PlatformError("VALIDATION_FAILED", "The quote does not belong to this courier.", {
            details: { courier, quotedCourier: parsed.quote.courier }
          });
        }
        const provider = couriers.require(courier).provider;
        const credential = courierCredentialFor(options, courier);
        const quote: ShipmentQuote = { ...parsed.quote, courier: quotedCourier };
        const shipment = await callCourier(options, courier, parsed.tenantId, () =>
          provider.createShipment(quote, parsed.shipment, credential)
        );
        return { shipment };
      }
    },
    {
      // The tracking events for one shipment, oldest first. A pull, like stock (ADR 0002): the
      // worker's track pass walks active shipments and asks here, so freshness is cadence-bound.
      method: "POST",
      path: "/v1/couriers/:courier/tracking",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = trackingBody.parse(body);
        const courier = courierParam(params);
        const provider = couriers.require(courier).provider;
        const credential = courierCredentialFor(options, courier);
        const events = await callCourier(options, courier, parsed.tenantId, () =>
          provider.track(parsed.trackingNumber, credential)
        );
        return { events };
      }
    },
    {
      method: "POST",
      path: "/v1/couriers/:courier/shipments/cancel",
      auth: { kind: "service" },
      handler: async ({ params, body }) => {
        const parsed = trackingBody.parse(body);
        const courier = courierParam(params);
        const provider = couriers.require(courier).provider;
        const credential = courierCredentialFor(options, courier);
        await callCourier(options, courier, parsed.tenantId, () =>
          provider.cancelShipment(parsed.trackingNumber, credential)
        );
        return { cancelled: true, courier, trackingNumber: parsed.trackingNumber };
      }
    }
  ];
}

/**
 * A seller-readable cause for a courier failure, without leaking the courier's raw error body.
 *
 * A rate limit is named so the worker can tell "retry later" from "this will never work"; anything
 * else is a generic cause, because a raw upstream message is not actionable to a seller and may
 * carry internals we should not surface.
 */
function failureReason(error: unknown): string {
  if (error instanceof RateLimitedError) return "rate_limited";
  if (error instanceof PlatformError) return error.code;
  return "courier_error";
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
  const couriers = new CourierRegistry(options.couriers);
  const routes = createRoutes(options, registry, couriers);

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
