/**
 * Integration plane entry point.
 *
 * Wiring lives here and nothing else: read config, construct the connectors we have app keys for,
 * build the credential store, start the server. A channel with no app key configured is simply not
 * registered, so an unconfigured channel fails as "unknown channel" rather than as a runtime error
 * deep inside a connector.
 *
 * The secret store defaults to the in-memory implementation, matching the control plane, so the
 * service starts with no infrastructure. The KMS-backed implementation is dropped in here when the
 * production provider is chosen; nothing above this line changes.
 */

import { CredentialStore, InMemorySecretStore } from "@platform/secrets";
import type { SecretStore } from "@platform/secrets";
import { RateLimitGovernor } from "@platform/rate-governor";
import { createLogger } from "@platform/observability";
import type { LogLevel } from "@platform/observability";
import { TikTokConnector, defaultTikTokConfig } from "@platform/connector-tiktok-tokopedia";
import { ShopeeConnector, defaultShopeeConfig } from "@platform/connector-shopee";
import { loadConfig } from "./config.ts";
import { InMemoryOAuthStateStore } from "./oauth-state.ts";
import { createIntegrationPlaneServer } from "./http.ts";
import type { CourierKeyResolver, RegisteredChannel, RegisteredCourier } from "./types.ts";

async function main(): Promise<void> {
  const logger = createLogger((process.env.LOG_LEVEL as LogLevel | undefined) ?? "info");
  const config = loadConfig(process.env);

  // One secret store backs every channel's credentials. In production this is the KMS-backed
  // adapter; the interface is the same, so only this line changes.
  const secrets: SecretStore = new InMemorySecretStore();
  const credentials = new CredentialStore(secrets);

  const channels: RegisteredChannel[] = [];

  if (config.tiktok !== null) {
    channels.push({
      channel: "tiktok_tokopedia",
      connector: new TikTokConnector(defaultTikTokConfig(config.tiktok))
    });
  }

  if (config.shopee !== null) {
    channels.push({
      channel: "shopee",
      connector: new ShopeeConnector(
        defaultShopeeConfig(
          { partnerId: config.shopee.partnerId, partnerKey: config.shopee.partnerKey },
          config.shopee.webhookUrl
        )
      )
    });
  }

  // Courier providers are wired here like connectors (docs/adr/0020). A courier with a key but no
  // provider is a configuration gap, not a silent absence, so it is logged. Providers themselves
  // land as their vendored SDKs are sourced (ADR 0007); until then this list is empty and the
  // courier surface answers honestly that it serves none.
  const couriers: RegisteredCourier[] = [];
  const configuredCouriers = Object.keys(config.courierKeys);
  if (configuredCouriers.length > 0) {
    logger.warn("startup.couriers_without_provider", { couriers: configuredCouriers });
  }

  const courierKeys: CourierKeyResolver = {
    get: (courier) => {
      const apiKey = config.courierKeys[courier];
      return apiKey === undefined
        ? null
        : { courier, apiKey, context: {} };
    }
  };

  const server = createIntegrationPlaneServer({
    credentials,
    channels,
    couriers,
    courierKeys,
    publicBaseUrl: config.publicBaseUrl,
    oauthStates: new InMemoryOAuthStateStore(),
    serviceTokens: config.serviceTokens,
    // One governor for the whole process, shared across tenants, channels and couriers: the
    // limit is per app key and we own one app each (ADR 0002, docs/adr/0020). In-memory is correct
    // for a single instance; the Redis-backed state lands behind the same interface before scaling out.
    governor: new RateLimitGovernor({ appBudgets: config.rateBudgets }),
    logger
  });

  server.listen(config.port, () => {
    logger.info("startup.listening", {
      port: config.port,
      channels: channels.map((c) => c.channel),
      couriers: couriers.map((c) => c.courier)
    });
  });

  const shutdown = (): void => {
    logger.info("shutdown.begin", {});
    server.close();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

await main();
