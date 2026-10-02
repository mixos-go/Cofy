/**
 * Channel connections, as the seller sees them (docs/PLAN.md M5).
 *
 * The control plane owns the seller's session and the integration plane owns the credential. So
 * "connect a channel" is a conversation between the two, over the service-token surface of ADR 0008
 * — never an import (AGENTS.md §3), and never the seller's browser talking to the integration plane
 * directly.
 *
 * What crosses this boundary is deliberately narrow:
 *
 * - **Outbound:** a tenant id and a channel code. Never a credential.
 * - **Inbound:** an authorize URL to hand the browser, and non-secret connection summaries for the
 *   list screen. A token has no reason to enter the control plane at all, and this module could not
 *   return one if it tried: the integration plane's list route is the summary projection.
 *
 * A missing or dead integration plane must not look like "no channels connected". The list route
 * therefore fails rather than degrading to empty — the same rule the seller order read follows.
 */

import { PlatformError } from "@platform/contracts";
import type { ChannelCode, TenantId } from "@platform/contracts";
import type { Logger } from "./logging.ts";

/**
 * The transport seam, shaped like the worker's and the seller read's. Tests install their own so the
 * client is exercised without a live integration plane; production uses global `fetch`.
 */
export type ChannelConnectionTransport = (
  url: string,
  init: RequestInit
) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

/** One connected channel, as the UI lists it. Mirrors the integration plane's summary projection. */
export interface ChannelConnection {
  readonly tenantId: TenantId;
  readonly channel: ChannelCode;
  readonly expiresAt: string | null;
  readonly context: Readonly<Record<string, string>>;
}

/** What the seller's browser needs to start an authorization, and nothing more. */
export interface ChannelAuthorization {
  readonly authorizeUrl: string;
  readonly expiresAt: string;
}

export interface ChannelConnectionClient {
  list(tenantId: TenantId): Promise<readonly ChannelConnection[]>;
  beginAuthorization(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
  }): Promise<ChannelAuthorization>;
  disconnect(input: { readonly tenantId: TenantId; readonly channel: ChannelCode }): Promise<void>;
}

export interface HttpChannelConnectionClientOptions {
  readonly baseUrl: string;
  /** The token the integration plane accepts (ADR 0008). Never logged. */
  readonly serviceToken: string;
  readonly transport?: ChannelConnectionTransport;
  readonly logger: Logger;
}

export class HttpChannelConnectionClient implements ChannelConnectionClient {
  readonly #options: HttpChannelConnectionClientOptions;

  constructor(options: HttpChannelConnectionClientOptions) {
    this.#options = options;
  }

  async #post(path: string, payload: Record<string, unknown>): Promise<unknown> {
    const transport = this.#options.transport ?? fetch;
    const url = `${this.#options.baseUrl.replace(/\/$/, "")}${path}`;

    let response;
    try {
      response = await transport(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.#options.serviceToken}`
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      // The integration plane being unreachable is an outage, not an empty channel list.
      this.#options.logger.error("channel_connection.transport_failed", {
        path,
        errorMessage: error instanceof Error ? error.message : "unknown"
      });
      throw new PlatformError("UPSTREAM_ERROR", "Could not reach the channel service.", {
        retryable: true,
        details: { path }
      });
    }

    const text = await response.text();
    const body: unknown = text === "" ? null : JSON.parse(text);

    if (!response.ok) {
      const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
      // Rebuild the platform error so a caller decides on the code, not the status number. An
      // unparseable body is upstream, never success.
      const code = (error?.code as PlatformError["code"] | undefined) ?? "UPSTREAM_ERROR";
      throw new PlatformError(code, error?.message ?? `Channel service failed with status ${response.status}.`, {
        retryable: response.status >= 500,
        details: (error?.details as Record<string, unknown>) ?? {}
      });
    }
    return body;
  }

  async list(tenantId: TenantId): Promise<readonly ChannelConnection[]> {
    const body = (await this.#post("/v1/channels/connections", { tenantId })) as {
      readonly connections: readonly ChannelConnection[];
    };
    return body.connections;
  }

  async beginAuthorization(input: {
    readonly tenantId: TenantId;
    readonly channel: ChannelCode;
  }): Promise<ChannelAuthorization> {
    const body = (await this.#post(`/v1/channels/${input.channel}/authorize`, {
      tenantId: input.tenantId
    })) as { readonly authorizeUrl: string; readonly expiresAt: string };
    return { authorizeUrl: body.authorizeUrl, expiresAt: body.expiresAt };
  }

  async disconnect(input: { readonly tenantId: TenantId; readonly channel: ChannelCode }): Promise<void> {
    await this.#post(`/v1/channels/${input.channel}/disconnect`, { tenantId: input.tenantId });
  }
}
