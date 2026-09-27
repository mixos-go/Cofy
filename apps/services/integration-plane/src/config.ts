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
  readonly tiktok: { readonly appKey: string; readonly appSecret: string } | null;
  readonly shopee: {
    readonly partnerId: number;
    readonly partnerKey: string;
    readonly webhookUrl: string;
  } | null;
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
    tiktok,
    shopee
  };
}
