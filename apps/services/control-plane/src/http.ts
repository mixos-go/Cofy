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
import { PlatformError, httpStatusFor, DEFAULT_STALE_RESERVATION_MS, SYNC_ENTITIES, CHANNEL_CODES, asChannelCode } from "@platform/contracts";
import type { Capability, ChannelCode, ChannelOrderRefStatus, MedusaTargetStore, Session, TenantId, TenantPlan, RegionCode, SyncEntity } from "@platform/contracts";
import type { SyncStateStore } from "@platform/sync-state";
import type { Logger } from "./logging.ts";
import type { SessionManager } from "./identity.ts";
import { authorize } from "./identity.ts";
import type { TenantRegistry } from "./tenants.ts";
import type { ProvisioningOrchestrator } from "./provisioning.ts";
import type { TenantTerminationService } from "./termination.ts";
import type { SellerOrderReader } from "./seller-orders.ts";
import type { ChannelConnectionClient } from "./channels.ts";
import type { AuditLog } from "./audit.ts";
import type { WmsClient } from "./wms.ts";
import { driftFor, driftSummaryFor, explainDrift } from "./drift.ts";

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
  /**
   * The resolved session, or null for a public or service route. Routes that need to name the person
   * acting — impersonation does (ADR 0019) — read it from here rather than re-resolving the token.
   */
  readonly session: Session | null;
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

/** The operator console's impersonation request (ADR 0019). */
const impersonateBody = z.object({
  tenantId: z.string().min(1).max(64)
});

/**
 * The seller warehouse surface's bodies (docs/PLAN.md M6).
 *
 * These validate the *platform* edge, before anything is forwarded to a tenant instance. The
 * instance's own middlewares validate again — this is not a substitute for that, and must not be
 * treated as one — but rejecting a malformed quantity here keeps a bad request from crossing a
 * credential-bearing hop only to be refused there.
 */
const createWarehouseBody = z.object({
  name: z.string().min(1).max(200),
  stockLocationId: z.string().min(1).max(200).nullable().optional()
});

const createBinBody = z.object({
  warehouseId: z.string().min(1).max(200),
  code: z.string().min(1).max(100),
  kind: z.enum(["staging", "storage", "packing"])
});

const createPurchaseOrderBody = z.object({
  warehouseId: z.string().min(1).max(200),
  supplierReference: z.string().min(1).max(200).nullable().optional(),
  expectedAt: z.string().min(1).max(64).nullable().optional(),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1).max(200),
        title: z.string().min(1).max(300),
        orderedQuantity: z.number().int().positive()
      })
    )
    .min(1)
});

const receivePurchaseOrderBody = z.object({
  lines: z
    .array(
      z.object({
        sku: z.string().min(1).max(200),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

const putAwayBody = z.object({
  warehouseId: z.string().min(1).max(200),
  fromBinId: z.string().min(1).max(200),
  toBinId: z.string().min(1).max(200),
  sku: z.string().min(1).max(200),
  quantity: z.number().int().positive()
});

const createPickTaskBody = z.object({
  warehouseId: z.string().min(1).max(200),
  orderId: z.string().min(1).max(200),
  packingBinId: z.string().min(1).max(200),
  lines: z
    .array(
      z.object({
        sku: z.string().min(1).max(200),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

const scanPickLineBody = z.object({
  sku: z.string().min(1).max(200),
  barcode: z.string().min(1).max(300),
  quantity: z.number().int().positive()
});

const openStocktakeBody = z.object({
  warehouseId: z.string().min(1).max(200),
  binId: z.string().min(1).max(200),
  sku: z.string().min(1).max(200)
});

const applyStocktakeBody = z.object({
  countedQuantity: z.number().int().min(0)
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

/**
 * Releasing a claim a deferred attempt never used. No outcome field: an abandon is precisely the
 * absence of one, and accepting `outcome` here would let a caller turn it into a completion.
 */
const syncIdempotencyAbandonBody = z.object({
  tenantId: z.string().min(1).max(64),
  key: z.string().min(1).max(200)
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
  /** tenant → Medusa target (ADR 0012). Non-secret; the admin key is read from the secret store. */
  readonly medusaTargets: MedusaTargetStore;
  /** Bearer tokens the worker presents. Empty means the sync-state surface is closed. */
  readonly serviceTokens: readonly string[];
  /** Seller-facing commerce reads (ADR 0016). Reads the tenant's engine; stores nothing. */
  readonly sellerOrders: SellerOrderReader;
  /**
   * Channel connections (docs/PLAN.md M5). The control plane holds the seller session; the
   * integration plane holds the credential. This is the client that joins the two over the
   * service-token surface (ADR 0008).
   */
  readonly channelConnections: ChannelConnectionClient;
  /**
   * The impersonation audit trail (ADR 0019). An operator acting inside a tenant is recorded here,
   * because a log line is not a record a reviewer can query after the fact.
   */
  readonly auditLog: AuditLog;
  /**
   * The warehouse surface (docs/PLAN.md M6, ADR 0018). The WMS lives inside the tenant instance; the
   * seller's session lives here, so this client joins the two the same way the order read does.
   */
  readonly wms: WmsClient;
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
      path: "/v1/sync/order-refs/reopen",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncOrderRefBody.parse(body);
        return options.syncState.reopenOrderRef(
          parsed.tenantId,
          channelFromBody(body),
          parsed.externalOrderId,
          new Date().toISOString()
        );
      }
    },
    {
      method: "GET",
      path: "/v1/sync/order-refs/:tenantId/:channel",
      auth: { kind: "service" },
      handler: async ({ params, request }) => {
        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const status = query.get("status");
        const limit = query.get("limit");
        return {
          refs: await options.syncState.listOrderRefs({
            tenantId: params.tenantId ?? "",
            channel: channelParam(params),
            status: status === null ? undefined : orderRefStatus(status),
            limit: limit === null ? undefined : positiveInt(limit, "limit")
          })
        };
      }
    },
    {
      // The seller-facing sync health read (docs/PLAN.md M5: "failed syncs are visible with an
      // actionable explanation"). It reads only platform-owned sync state, so it needs no ADR: no
      // tenant commerce data is touched and no credential leaves this process.
      //
      // `tenant:read` is the capability because this is a read of the caller's own tenant, which is
      // exactly what `seller_viewer` already holds — a viewer can see that something is stuck without
      // being able to act on it. The tenant comes from the session (`scope: "self"`), never from a
      // path or query, so a seller cannot ask about another tenant by editing a URL.
      method: "GET",
      path: "/v1/sync/health",
      auth: { kind: "session", capability: "tenant:read", scope: "self" },
      handler: async ({ tenantId, request }) => {
        if (tenantId === null) {
          // An operator has no tenant of its own. The ops view is a different, audited surface that
          // names its target explicitly; this one must not guess a tenant for it.
          throw new PlatformError("FORBIDDEN", "Sync health is read for one tenant, and an operator has none.", {
            details: { hint: "Use the operator drift surface, which names its tenant." }
          });
        }

        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const raw = query.get("staleReservationSeconds");
        const staleReservationMs =
          raw === null ? DEFAULT_STALE_RESERVATION_MS : positiveInt(raw, "staleReservationSeconds") * 1_000;
        const maxRefsPerPass = positiveInt(query.get("limit") ?? "100", "limit");

        const channels = await Promise.all(
          CHANNEL_CODES.map(async (channel) => {
            const { summary, items } = await driftFor(options.syncState, {
              tenantId,
              channel,
              staleReservationMs,
              maxRefsPerPass
            });
            return {
              channel,
              unresolved: summary.total,
              observedAt: summary.observedAt,
              problems: items.map((item) => ({
                externalOrderId: item.externalOrderId,
                kind: item.kind,
                since: item.since,
                explanation: explainDrift(item.kind)
              }))
            };
          })
        );

        return {
          tenantId,
          // One entry per known channel, including healthy ones, so the UI can show "connected and
          // clear" without inferring absence.
          channels
        };
      }
    },
    {
      // The seller order list (docs/PLAN.md M5, docs/adr/0016). The tenant comes from the session,
      // never from the path, so a seller cannot read another tenant's orders by editing a URL.
      //
      // `order:read` is the capability a `seller_viewer` already holds: seeing orders must not
      // require the ability to change them.
      method: "GET",
      path: "/v1/seller/orders",
      auth: { kind: "session", capability: "order:read", scope: "self" },
      handler: async ({ tenantId, request }) => {
        if (tenantId === null) {
          // An operator has no tenant of its own, so this surface cannot serve it. The operator
          // view is separate and names its tenant explicitly.
          throw new PlatformError("FORBIDDEN", "Seller orders are read for one tenant, and an operator has none.", {
            details: { hint: "Operator reads name their tenant explicitly." }
          });
        }

        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const limit = Math.min(positiveInt(query.get("limit") ?? "20", "limit"), 100);
        const offset = nonNegativeInt(query.get("offset") ?? "0", "offset");
        const status = query.get("status");

        return options.sellerOrders.listOrders({
          tenantId,
          limit,
          offset,
          ...(status === null ? {} : { status })
        });
      }
    },
    {
      // One seller order, including its lines (docs/adr/0016). Same session-scoped tenant and the
      // same `order:read` capability as the list, so the two cannot drift on authorization.
      method: "GET",
      path: "/v1/seller/orders/:orderId",
      auth: { kind: "session", capability: "order:read", scope: "self" },
      handler: async ({ tenantId, params }) => {
        if (tenantId === null) {
          throw new PlatformError("FORBIDDEN", "Seller orders are read for one tenant, and an operator has none.", {
            details: { hint: "Operator reads name their tenant explicitly." }
          });
        }
        return options.sellerOrders.getOrder({ tenantId, orderId: params.orderId ?? "" });
      }
    },
    {
      // The channels a seller has connected (docs/PLAN.md M5). The tenant comes from the session,
      // never the path, exactly as the order reads do — there is no id for a seller to tamper with.
      method: "GET",
      path: "/v1/seller/channels",
      auth: { kind: "session", capability: "channel:read", scope: "self" },
      handler: async ({ tenantId }) => {
        if (tenantId === null) {
          throw new PlatformError("FORBIDDEN", "Seller channels are read for one tenant, and an operator has none.", {
            details: { hint: "Operator reads name their tenant explicitly." }
          });
        }
        const connections = await options.channelConnections.list(tenantId);
        // Every channel we serve is present, connected or not, so the screen can render a
        // "hubungkan" button without inferring absence from a missing row.
        return {
          tenantId,
          connections,
          availableChannels: CHANNEL_CODES
        };
      }
    },
    {
      // Begin a channel authorization. This is the "connect shop" click (ADR 0003): the platform
      // owns the app, the seller only authorizes.
      //
      // The response carries the marketplace URL to send the browser to and the OAuth state it was
      // issued for. The state is single-use and short-lived, and it is the only thing tying the
      // callback back to this tenant — so it is the seller's to hold for the length of the flow and
      // nothing more.
      method: "POST",
      path: "/v1/seller/channels/:channel/connect",
      auth: { kind: "session", capability: "channel:connect", scope: "self" },
      handler: async ({ tenantId, params, correlationId }) => {
        if (tenantId === null) {
          throw new PlatformError("FORBIDDEN", "A seller connects a channel for its own tenant.", {
            details: { hint: "Operators do not hold seller capabilities." }
          });
        }
        const channel = sellerChannelParam(params);
        const authorization = await options.channelConnections.beginAuthorization({ tenantId, channel });
        options.logger.info("channel.connect_started", { tenantId, channel, correlationId });
        return authorization;
      }
    },
    {
      // Revoke one channel's credential. `channel:disconnect` is a capability `seller_viewer` and
      // `seller_staff` do not hold, so a read-only seat cannot disconnect a shop.
      method: "POST",
      path: "/v1/seller/channels/:channel/disconnect",
      auth: { kind: "session", capability: "channel:disconnect", scope: "self" },
      handler: async ({ tenantId, params, correlationId }) => {
        if (tenantId === null) {
          throw new PlatformError("FORBIDDEN", "A seller disconnects a channel for its own tenant.", {
            details: { hint: "Operators do not hold seller capabilities." }
          });
        }
        const channel = sellerChannelParam(params);
        await options.channelConnections.disconnect({ tenantId, channel });
        options.logger.info("channel.disconnect_requested", { tenantId, channel, correlationId });
        return { disconnected: true, channel };
      }
    },

    // --- The seller warehouse surface (docs/PLAN.md M6, ADR 0018). Every route below takes its
    // tenant from the session and proxies the tenant instance's own `/admin/wms/*` routes, so the
    // ledger and the engine's inventory level stay the instance's business. Reads need `wms:read`,
    // which `seller_viewer` holds; writes need `wms:write`, which it does not — so an impersonated
    // support session can see the warehouse and cannot move a unit in it (ADR 0019). ---
    {
      method: "GET",
      path: "/v1/seller/wms/warehouses",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId }) => ({
        warehouses: await options.wms.listWarehouses(sellerTenant(tenantId, "read warehouses"))
      })
    },
    {
      method: "GET",
      path: "/v1/seller/wms/bins",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, request }) => {
        const warehouseId = optionalQuery(request, "warehouseId");
        return { bins: await options.wms.listBins(sellerTenant(tenantId, "read bins"), warehouseId) };
      }
    },
    {
      method: "GET",
      path: "/v1/seller/wms/bins/:binId/contents",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, params }) => {
        const binId = requiredParam(params, "binId");
        return options.wms.getBinContents(sellerTenant(tenantId, "read a bin"), binId);
      }
    },
    {
      method: "GET",
      path: "/v1/seller/wms/purchase-orders",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, request }) => {
        const warehouseId = optionalQuery(request, "warehouseId");
        return {
          purchaseOrders: await options.wms.listPurchaseOrders(sellerTenant(tenantId, "read purchase orders"), warehouseId)
        };
      }
    },
    {
      method: "GET",
      path: "/v1/seller/wms/pick-tasks",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, request }) => ({
        pickTasks: await options.wms.listPickTasks(sellerTenant(tenantId, "read pick tasks"), {
          warehouseId: optionalQuery(request, "warehouseId"),
          status: optionalQuery(request, "status")
        })
      })
    },
    {
      method: "GET",
      path: "/v1/seller/wms/stocktakes",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, request }) => ({
        stocktakes: await options.wms.listStocktakes(sellerTenant(tenantId, "read stocktakes"), {
          warehouseId: optionalQuery(request, "warehouseId"),
          status: optionalQuery(request, "status")
        })
      })
    },
    {
      // The ledger for one bin. This is the read that makes a stocktake auditable from the UI: the
      // `stocktake` movement carries the counted number and the two quantities either side of it.
      method: "GET",
      path: "/v1/seller/wms/stock-movements",
      auth: { kind: "session", capability: "wms:read", scope: "self" },
      handler: async ({ tenantId, request }) => {
        const binId = requiredQuery(request, "binId");
        return {
          movements: await options.wms.listStockMovements(sellerTenant(tenantId, "read the ledger"), {
            binId,
            sku: optionalQuery(request, "sku")
          })
        };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/warehouses",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, correlationId }) => {
        const parsed = createWarehouseBody.parse(body);
        const tenant = sellerTenant(tenantId, "create a warehouse");
        const warehouse = await options.wms.createWarehouse({
          tenantId: tenant,
          name: parsed.name,
          stockLocationId: parsed.stockLocationId ?? null
        });
        options.logger.info("wms.warehouse_created", { tenantId: tenant, warehouseId: warehouse.id, correlationId });
        return { warehouse };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/bins",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, correlationId }) => {
        const parsed = createBinBody.parse(body);
        const tenant = sellerTenant(tenantId, "create a bin");
        const bin = await options.wms.createBin({
          tenantId: tenant,
          warehouseId: parsed.warehouseId,
          code: parsed.code,
          kind: parsed.kind
        });
        options.logger.info("wms.bin_created", {
          tenantId: tenant,
          warehouseId: bin.warehouseId,
          binId: bin.id,
          correlationId
        });
        return { bin };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/purchase-orders",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, correlationId }) => {
        const parsed = createPurchaseOrderBody.parse(body);
        const tenant = sellerTenant(tenantId, "create a purchase order");
        const purchaseOrder = await options.wms.createPurchaseOrder({
          tenantId: tenant,
          warehouseId: parsed.warehouseId,
          supplierReference: parsed.supplierReference ?? null,
          expectedAt: parsed.expectedAt ?? null,
          lines: parsed.lines
        });
        options.logger.info("wms.purchase_order_created", {
          tenantId: tenant,
          purchaseOrderId: purchaseOrder.id,
          correlationId
        });
        return { purchaseOrder };
      }
    },
    {
      // Receiving is the M6 exit criterion's write: the instance posts the units into the staging
      // bin and raises the Medusa level at the warehouse's location in one workflow. The control
      // plane contributes the tenant and the actor, and nothing else.
      method: "POST",
      path: "/v1/seller/wms/purchase-orders/:purchaseOrderId/receive",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, params, body, session, correlationId }) => {
        const parsed = receivePurchaseOrderBody.parse(body);
        const purchaseOrderId = requiredParam(params, "purchaseOrderId");
        const tenant = sellerTenant(tenantId, "receive a purchase order");
        const receipt = await options.wms.receivePurchaseOrder({
          tenantId: tenant,
          purchaseOrderId,
          lines: parsed.lines,
          actor: wmsActor(session!)
        });
        options.logger.info("wms.purchase_order_received", { tenantId: tenant, purchaseOrderId, correlationId });
        return { receipt };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/put-away",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, session, correlationId }) => {
        const parsed = putAwayBody.parse(body);
        const tenant = sellerTenant(tenantId, "put stock away");
        const putAway = await options.wms.putAway({ ...parsed, tenantId: tenant, actor: wmsActor(session!) });
        options.logger.info("wms.put_away", {
          tenantId: tenant,
          fromBinId: putAway.fromBinId,
          toBinId: putAway.toBinId,
          correlationId
        });
        return { putAway };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/pick-tasks",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, correlationId }) => {
        const parsed = createPickTaskBody.parse(body);
        const tenant = sellerTenant(tenantId, "create a pick task");
        const pickTask = await options.wms.createPickTask({ ...parsed, tenantId: tenant });
        options.logger.info("wms.pick_task_created", {
          tenantId: tenant,
          pickTaskId: pickTask.id,
          orderId: pickTask.orderId,
          correlationId
        });
        return { pickTask };
      }
    },
    {
      // A scan that does not match the line's barcode is refused by the instance before any unit
      // moves, and the refusal's message names what was expected — so it is surfaced as a 422 rather
      // than swallowed into a generic failure.
      method: "POST",
      path: "/v1/seller/wms/pick-tasks/:pickTaskId/scans",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, params, body, session, correlationId }) => {
        const parsed = scanPickLineBody.parse(body);
        const pickTaskId = requiredParam(params, "pickTaskId");
        const tenant = sellerTenant(tenantId, "scan a pick line");
        const scan = await options.wms.scanPickLine({
          tenantId: tenant,
          pickTaskId,
          sku: parsed.sku,
          barcode: parsed.barcode,
          quantity: parsed.quantity,
          actor: wmsActor(session!)
        });
        options.logger.info("wms.pick_line_scanned", {
          tenantId: tenant,
          pickTaskId,
          sku: parsed.sku,
          status: scan.status,
          correlationId
        });
        return { scan };
      }
    },
    {
      method: "POST",
      path: "/v1/seller/wms/stocktakes",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, body, correlationId }) => {
        const parsed = openStocktakeBody.parse(body);
        const tenant = sellerTenant(tenantId, "open a stocktake");
        const stocktake = await options.wms.openStocktake({ ...parsed, tenantId: tenant });
        options.logger.info("wms.stocktake_opened", {
          tenantId: tenant,
          stocktakeId: stocktake.stocktakeId,
          systemQuantity: stocktake.systemQuantity,
          correlationId
        });
        return { stocktake };
      }
    },
    {
      // Applying a count records the variance as a signed `stocktake` movement and applies the same
      // delta to the engine's level. It is a delta, never an assignment, which is what makes the
      // correction auditable and reversible (docs/adr/0018).
      method: "POST",
      path: "/v1/seller/wms/stocktakes/:stocktakeId/apply",
      auth: { kind: "session", capability: "wms:write", scope: "self" },
      handler: async ({ tenantId, params, body, session, correlationId }) => {
        const parsed = applyStocktakeBody.parse(body);
        const stocktakeId = requiredParam(params, "stocktakeId");
        const tenant = sellerTenant(tenantId, "apply a stocktake");
        const stocktake = await options.wms.applyStocktake({
          tenantId: tenant,
          stocktakeId,
          countedQuantity: parsed.countedQuantity,
          countedBy: wmsActor(session!)
        });
        options.logger.info("wms.stocktake_applied", {
          tenantId: tenant,
          stocktakeId,
          variance: stocktake.variance,
          correlationId
        });
        return { stocktake };
      }
    },

    // --- Operator console surface (docs/PLAN.md M5, ADR 0019). `ops:*` capabilities are held by
    // `operator` alone, so a seller credential cannot reach any route below. ---
    {
      // The audited impersonation: an operator opens a short, read-only session for one tenant.
      //
      // Three things happen in this order, and the order matters: the session is minted first, then
      // the audit record is written with the expiry the session actually got, then both are
      // returned. If the audit write failed the request fails, because an impersonation that
      // happened but was not recorded is the one outcome that must not be possible.
      method: "POST",
      path: "/v1/ops/impersonate",
      auth: { kind: "session", capability: "ops:impersonate", scope: "tenant" },
      handler: async ({ session, body, correlationId }) => {
        const parsed = impersonateBody.parse(body);
        const tenantId = parsed.tenantId as TenantId;

        // The tenant must exist before a session is minted for it: a session pointing at a tenant
        // that was never provisioned would only fail later, with a message about a missing engine
        // rather than about a bad target.
        const tenant = await options.registry.getDetail(tenantId);

        const impersonated = await options.sessions.impersonate({ actor: session!, tenantId });

        const record = await options.auditLog.recordImpersonation({
          actorAccountId: impersonated.impersonation!.actorAccountId,
          actorEmail: impersonated.impersonation!.actorEmail,
          tenantId,
          startedAt: impersonated.issuedAt,
          expiresAt: impersonated.expiresAt
        });

        // The log line is a second copy for whoever is watching logs now; the record above is the
        // one a reviewer queries later. Both name the actor and the tenant.
        options.logger.info("ops.impersonation_started", {
          correlationId,
          actorAccountId: record.actorAccountId,
          actorEmail: record.actorEmail,
          tenantId,
          expiresAt: record.expiresAt
        });

        return {
          token: impersonated.token,
          role: impersonated.role,
          tenantId,
          expiresAt: impersonated.expiresAt,
          tenant: { id: tenant.tenant.id, displayName: tenant.tenant.displayName },
          actor: { accountId: record.actorAccountId, email: record.actorEmail }
        };
      }
    },
    {
      // The impersonation history (ADR 0019). A reviewer asks "who looked at this tenant" and gets
      // the records; `tenantId` narrows it, and an operator may read across tenants because the
      // whole point of the trail is oversight.
      method: "GET",
      path: "/v1/ops/impersonations",
      auth: { kind: "session", capability: "ops:read", scope: "tenant" },
      handler: async ({ request }) => {
        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const tenantId = query.get("tenantId");
        return {
          impersonations: await options.auditLog.listImpersonations(
            tenantId === null ? undefined : { tenantId }
          )
        };
      }
    },
    {
      // The drift dashboard read (docs/PLAN.md M4). Same classifier and threshold as the worker's
      // repair pass, so the number the dashboard shows is the number reconciliation acts on.
      method: "GET",
      path: "/v1/sync/drift/:tenantId/:channel",
      auth: { kind: "service" },
      handler: async ({ params, request }) => {
        const query = new URL(request.url ?? "/", "http://localhost").searchParams;
        const raw = query.get("staleReservationSeconds");
        const staleReservationMs =
          raw === null ? DEFAULT_STALE_RESERVATION_MS : positiveInt(raw, "staleReservationSeconds") * 1_000;
        return {
          drift: await driftSummaryFor(options.syncState, {
            tenantId: params.tenantId ?? "",
            channel: channelParam(params),
            staleReservationMs,
            maxRefsPerPass: positiveInt(query.get("limit") ?? "500", "limit")
          })
        };
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
      path: "/v1/sync/idempotency/abandon",
      auth: { kind: "service" },
      handler: async ({ body }) => {
        const parsed = syncIdempotencyAbandonBody.parse(body);
        return {
          record: await options.syncState.abandonIdempotency(parsed.tenantId, parsed.key, new Date().toISOString())
        };
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
    },

    // --- Worker-facing tenant target (ADR 0012). Service-token auth; the key is never returned. ---
    {
      method: "GET",
      path: "/v1/tenants/:tenantId/medusa-target",
      auth: { kind: "service" },
      handler: async ({ params }) => {
        const tenantId = params.tenantId ?? "";
        const target = await options.medusaTargets.get(tenantId);
        if (target === null) {
          // Absence is a hard answer, not a default: the worker must fail the tenant rather than
          // fall back to some other base URL. TENANT_NOT_FOUND maps to 404 and is not retryable.
          throw new PlatformError("TENANT_NOT_FOUND", "Tenant has no reachable commerce engine.", {
            details: { tenantId }
          });
        }
        return { target };
      }
    }
  ];
}

/**
 * `channel` and `entity` are read from the body but not constrained by the zod object above, so a
 * bad value becomes a clear 422 rather than silently narrowing to the wrong channel.
 *
 * Both are checked against the contract's own list rather than a copy of it. A hand-written copy is
 * what let `stock` be missing here after `SYNC_ENTITIES` gained it: the worker's stock reconciliation
 * could read its cursor but not advance it, so its pass failed on the first page and, because a unit
 * re-arms only when it completes, it never ran again. Deriving the check means a new member is
 * accepted the moment it is declared.
 */
function channelFromBody(body: unknown): ChannelCode {
  const channel = (body as { channel?: unknown }).channel;
  const known = typeof channel === "string" ? asChannelCode(channel) : null;
  if (known === null) {
    throw new PlatformError("VALIDATION_FAILED", "A known channel is required.", { details: { channel } });
  }
  return known;
}

function entityFromBody(body: unknown): SyncEntity {
  const entity = (body as { entity?: unknown }).entity;
  const known = (SYNC_ENTITIES as readonly string[]).includes(entity as string) ? (entity as SyncEntity) : null;
  if (known === null) {
    throw new PlatformError("VALIDATION_FAILED", "A known sync entity is required.", { details: { entity } });
  }
  return known;
}

function channelParam(params: Readonly<Record<string, string>>): ChannelCode {
  return channelFromBody({ channel: params.channel });
}

function entityParam(params: Readonly<Record<string, string>>): SyncEntity {
  return entityFromBody({ entity: params.entity });
}

/** A ref status from an untrusted query string, rejected rather than defaulted. */
function orderRefStatus(value: string): ChannelOrderRefStatus {
  if (value !== "reserved" && value !== "committed" && value !== "failed") {
    throw new PlatformError("VALIDATION_FAILED", "A known order ref status is required.", { details: { value } });
  }
  return value;
}

/** A positive integer query parameter. A NaN or `0` would silently change a limit's meaning. */
function positiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PlatformError("VALIDATION_FAILED", `${name} must be a positive integer.`, { details: { value } });
  }
  return parsed;
}

/** A zero-or-greater integer, for an offset where `0` is meaningful rather than a mistake. */
function nonNegativeInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new PlatformError("VALIDATION_FAILED", `${name} must be a non-negative integer.`, {
      details: { value }
    });
  }
  return parsed;
}

/**
 * The channel segment of a seller channel route, validated against the channels we serve.
 *
 * A path segment is caller input like any other, so it is narrowed rather than cast: an unknown
 * channel is a 404 here instead of a string that travels to the integration plane and fails there
 * with a less useful message.
 */
function sellerChannelParam(params: Readonly<Record<string, string>>): ChannelCode {
  const raw = params.channel;
  const channel = raw === undefined ? null : asChannelCode(raw);
  if (channel === null) {
    throw new PlatformError("NOT_FOUND", "Unknown channel.", { details: { channel: raw } });
  }
  return channel;
}

/**
 * The tenant of a seller warehouse route.
 *
 * The route's `scope: "self"` authorization has already refused an operator, which is the only role
 * with no tenant — so reaching here with `tenantId === null` would mean the scope check was bypassed.
 * It throws rather than defaulting, because a default would be some other tenant's warehouse.
 */
function sellerTenant(tenantId: TenantId | null, action: string): TenantId {
  if (tenantId === null) {
    throw new PlatformError("FORBIDDEN", `A seller must name a tenant to ${action}.`, {
      details: { hint: "Operators do not hold seller capabilities." }
    });
  }
  return tenantId;
}

/**
 * The actor recorded on a warehouse movement.
 *
 * A movement row's `actor` answers "who moved this", so it names the person: an operator acting
 * through an impersonated session is recorded as that operator, not as the tenant's own staff
 * (ADR 0019). A seller acting for themselves is recorded by their account, which the session's
 * `accountId` carries.
 */
function wmsActor(session: Session): string {
  return session.impersonation?.actorEmail ?? session.accountId;
}

/** A required path parameter. A route matched with an empty segment is a bad request, not a lookup. */
function requiredParam(params: Readonly<Record<string, string>>, name: string): string {
  const value = params[name];
  if (value === undefined || value === "") {
    throw new PlatformError("VALIDATION_FAILED", `${name} is required.`, { details: { name } });
  }
  return value;
}

function queryValue(request: IncomingMessage, name: string): string | null {
  const value = new URL(request.url ?? "/", "http://localhost").searchParams.get(name);
  return value === null || value === "" ? null : value;
}

function optionalQuery(request: IncomingMessage, name: string): string | undefined {
  return queryValue(request, name) ?? undefined;
}

/** A required query parameter. The ledger is read per bin, so an absent `binId` is a bad request. */
function requiredQuery(request: IncomingMessage, name: string): string {
  const value = queryValue(request, name);
  if (value === null) {
    throw new PlatformError("VALIDATION_FAILED", `${name} is required.`, { details: { name } });
  }
  return value;
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
        session,
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
