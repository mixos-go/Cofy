/**
 * Integration plane configuration, read from the environment.
 *
 * Parsing lives here so `main.ts` is wiring and nothing else, and so a bad value fails at startup
 * with a named field rather than as `undefined` reaching a connector at request time.
 *
 * Secrets (app keys, service tokens) are read here and passed to the objects that need them.
 * This module never logs them, and nothing returns a value that is safe to log by accident.
 */

import { PlatformError } from "@platform/contracts";
import type { ChannelCode, CourierCode } from "@platform/contracts";
import type { RateLimitBudget } from "@platform/rate-governor";

/**
 * Fallback app budgets, used when a channel has no explicit configuration.
 *
 * These are **placeholders**, not measured limits: the point is that an unconfigured channel gets a
 * real, conservative budget rather than an unlimited one. The governor never treats "no budget" as
 * "no limit", so a missing entry here would block the channel outright. Real per-channel values are
 * set with `RATE_LIMIT_APP_BUDGETS` once each marketplace's published limit is confirmed.
 */
const DEFAULT_APP_BUDGETS: Readonly<Partial<Record<ChannelCode | CourierCode, RateLimitBudget>>> = {
  tiktok_tokopedia: { capacity: 10, refillPerSecond: 2 },
  shopee: { capacity: 10, refillPerSecond: 2 },
  // Couriers are governed on the same kind of budget (docs/adr/0020). These are placeholders like
  // the channel ones: a courier with no budget would be blocked outright, so a real value matters.
  jne: { capacity: 10, refillPerSecond: 2 },
  jnt: { capacity: 10, refillPerSecond: 2 },
  sicepat: { capacity: 10, refillPerSecond: 2 },
  anteraja: { capacity: 10, refillPerSecond: 2 },
  rajaongkir: { capacity: 10, refillPerSecond: 2 }
};

export interface IntegrationPlaneConfig {
  readonly port: number;
  /**
   * Public origin this service is reachable at. Required: the OAuth redirect URI must match what
   * is registered with each marketplace app, so it cannot be guessed from a request header (the
   * sender controls headers).
   */
  readonly publicBaseUrl: string;
  /** Bearer tokens the control plane and worker present. Never empty; the service fails closed. */
  readonly serviceTokens: readonly string[];
  /**
   * Per-resource app budgets. Read here so the governor cannot be built with an empty map by
   * accident — an empty map is "block every call", which would be a silent outage rather than a
   * configuration error.
   */
  readonly rateBudgets: Readonly<Partial<Record<ChannelCode | CourierCode, RateLimitBudget>>>;
  readonly tiktok: { readonly appKey: string; readonly appSecret: string } | null;
  readonly shopee: {
    readonly partnerId: number;
    readonly partnerKey: string;
    readonly webhookUrl: string;
  } | null;
  /**
   * Platform-owned courier keys (ADR 0003, docs/adr/0020). A courier with no key here is not
   * registered, so an unconfigured courier fails as "unknown courier" rather than at request time.
   */
  readonly courierKeys: Readonly<Partial<Record<CourierCode, string>>>;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new PlatformError("VALIDATION_FAILED", `Missing required environment variable ${name}.`, {
      details: { variable: name }
    });
  }
  return value;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new PlatformError("VALIDATION_FAILED", "Port must be an integer between 1 and 65535.", {
      details: { value: raw }
    });
  }
  return port;
}

/**
 * Parse per-channel app budgets from `RATE_LIMIT_APP_BUDGETS`, a JSON object.
 *
 * Deliberately strict: a malformed budget must stop startup, because the alternative is a governor
 * that silently falls back to the placeholder for a channel whose real limit is different — which
 * is the exact overspending this governor exists to prevent.
 */
function parseRateBudgets(raw: string | undefined): Readonly<Partial<Record<ChannelCode | CourierCode, RateLimitBudget>>> {
  if (raw === undefined || raw === "") return DEFAULT_APP_BUDGETS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new PlatformError("VALIDATION_FAILED", "RATE_LIMIT_APP_BUDGETS is not valid JSON.", {
      details: { variable: "RATE_LIMIT_APP_BUDGETS" }
    });
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PlatformError("VALIDATION_FAILED", "RATE_LIMIT_APP_BUDGETS must be a JSON object.", {
      details: { variable: "RATE_LIMIT_APP_BUDGETS" }
    });
  }

  const budgets: Partial<Record<ChannelCode | CourierCode, RateLimitBudget>> = {};
  for (const [resource, value] of Object.entries(parsed as Record<string, unknown>)) {
    const entry = value as { capacity?: unknown; refillPerSecond?: unknown };
    const capacity = entry?.capacity;
    const refillPerSecond = entry?.refillPerSecond;
    if (
      typeof capacity !== "number" ||
      capacity <= 0 ||
      typeof refillPerSecond !== "number" ||
      refillPerSecond <= 0
    ) {
      throw new PlatformError("VALIDATION_FAILED", `RATE_LIMIT_APP_BUDGETS entry for ${resource} is invalid.`, {
        details: { resource }
      });
    }
    budgets[resource as ChannelCode | CourierCode] = { capacity, refillPerSecond };
  }
  return budgets;
}

/**
 * Read the platform-owned courier keys from the environment.
 *
 * One variable per courier, and a courier with no key is simply absent: `main.ts` registers only the
 * couriers it has keys for, so an unconfigured courier is "unknown" rather than a runtime failure
 * deep inside a provider. The keys never leave this object.
 */
function parseCourierKeys(env: NodeJS.ProcessEnv): Readonly<Partial<Record<CourierCode, string>>> {
  const keys: Partial<Record<CourierCode, string>> = {};
  const variables: Readonly<Record<CourierCode, string>> = {
    jne: "JNE_API_KEY",
    jnt: "JNT_API_KEY",
    sicepat: "SICEPAT_API_KEY",
    anteraja: "ANTERAJA_API_KEY",
    rajaongkir: "RAJAONGKIR_API_KEY"
  };
  for (const [courier, variable] of Object.entries(variables) as [CourierCode, string][]) {
    const value = env[variable];
    if (value !== undefined && value !== "") keys[courier] = value;
  }
  return keys;
}

export function loadConfig(env: NodeJS.ProcessEnv): IntegrationPlaneConfig {
  const publicBaseUrl = required(env, "INTEGRATION_PLANE_PUBLIC_BASE_URL");
  if (!publicBaseUrl.startsWith("https://") && !publicBaseUrl.startsWith("http://")) {
    throw new PlatformError("VALIDATION_FAILED", "INTEGRATION_PLANE_PUBLIC_BASE_URL must be an absolute URL.", {
      details: { value: publicBaseUrl }
    });
  }

  const serviceTokens = (env.INTEGRATION_SERVICE_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "");

  // Fail closed. A service with no tokens would either reject every caller (useless) or, worse,
  // accept any caller if the check were written the other way. Refusing to start is the only safe
  // default.
  if (serviceTokens.length === 0) {
    throw new PlatformError(
      "VALIDATION_FAILED",
      "INTEGRATION_SERVICE_TOKENS must list at least one token; the service refuses to start without one.",
      { details: { variable: "INTEGRATION_SERVICE_TOKENS" } }
    );
  }

  const tiktokAppKey = env.TIKTOK_SHOP_APP_KEY;
  const tiktokAppSecret = env.TIKTOK_SHOP_APP_SECRET;
  const tiktok =
    tiktokAppKey !== undefined && tiktokAppKey !== "" && tiktokAppSecret !== undefined && tiktokAppSecret !== ""
      ? { appKey: tiktokAppKey, appSecret: tiktokAppSecret }
      : null;

  const shopeePartnerId = env.SHOPEE_PARTNER_ID;
  const shopeePartnerKey = env.SHOPEE_PARTNER_KEY;
  const shopee =
    shopeePartnerId !== undefined &&
    shopeePartnerId !== "" &&
    shopeePartnerKey !== undefined &&
    shopeePartnerKey !== ""
      ? {
          partnerId: Number(shopeePartnerId),
          partnerKey: shopeePartnerKey,
          webhookUrl: env.SHOPEE_WEBHOOK_URL ?? `${publicBaseUrl}/v1/channels/shopee/webhook`
        }
      : null;

  return {
    port: parsePort(env.INTEGRATION_PLANE_PORT, 4002),
    publicBaseUrl,
    serviceTokens,
    rateBudgets: parseRateBudgets(env.RATE_LIMIT_APP_BUDGETS),
    tiktok,
    shopee,
    courierKeys: parseCourierKeys(env)
  };
}
