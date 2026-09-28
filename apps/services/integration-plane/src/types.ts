/**
 * Integration plane configuration and the runtime shape it is built from.
 *
 * The integration plane is the only service that talks to marketplaces. It holds connectors and
 * platform-owned app keys (docs/adr/0003) and never reaches into a tenant's data plane.
 *
 * Connectors are **constructed in `main.ts` and passed in**, not built here: this module stays
 * free of marketplace-specific imports so a new channel is a wiring change, not a change to the
 * service's core. The service depends only on the `ChannelConnector` interface.
 */

import type { ChannelConnector } from "@platform/channel-sdk";
import type { ChannelCode } from "@platform/contracts";
import type { RateLimitGovernor } from "@platform/rate-governor";
import type { CredentialStore } from "@platform/secrets";
import type { Logger } from "@platform/observability";
import type { OAuthStateStore } from "./oauth-state.ts";

/** A connector, keyed by the channel it serves. */
export interface RegisteredChannel {
  readonly channel: ChannelCode;
  readonly connector: ChannelConnector;
}

export interface IntegrationPlaneOptions {
  /** Where seller credentials live (docs/adr/0003). Shared with the control plane's secret store. */
  readonly credentials: CredentialStore;
  readonly channels: readonly RegisteredChannel[];
  /**
   * The public origin this service is reachable at. The OAuth redirect URI is derived from it, so
   * the value registered with every marketplace app comes from one place.
   */
  readonly publicBaseUrl: string;
  readonly oauthStates: OAuthStateStore;
  /** Bearer tokens the control plane and worker use to call this service (services never import). */
  readonly serviceTokens: readonly string[];
  /**
   * The shared rate-limit governor this plane enforces before every marketplace read/write
   * (ADR 0002). It lives here rather than in the worker because this is the only service holding
   * the app keys and the only one that ever calls a marketplace — one budget, one place to spend it.
   */
  readonly governor: RateLimitGovernor;
  readonly logger: Logger;
  readonly now?: () => Date;
}
