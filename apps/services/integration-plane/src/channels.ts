/**
 * Channel lookup.
 *
 * The service needs to turn a `ChannelCode` into the connector that serves it. Keeping this in one
 * small function means "unknown channel" has exactly one behaviour everywhere, rather than each
 * route inventing its own error.
 */

import type { ChannelConnector } from "@platform/channel-sdk";
import { PlatformError } from "@platform/contracts";
import type { ChannelCode } from "@platform/contracts";
import type { RegisteredChannel } from "./types.ts";

export class ChannelRegistry {
  readonly #byChannel = new Map<ChannelCode, ChannelConnector>();

  constructor(channels: readonly RegisteredChannel[]) {
    for (const entry of channels) {
      if (this.#byChannel.has(entry.channel)) {
        // Two connectors claiming one channel would make behaviour depend on registration order.
        throw new PlatformError("CONFLICT", "Two connectors are registered for the same channel.", {
          details: { channel: entry.channel }
        });
      }
      this.#byChannel.set(entry.channel, entry.connector);
    }
  }

  /** The connector for a channel, or a non-retryable error when we do not serve it. */
  require(channel: ChannelCode): ChannelConnector {
    const connector = this.#byChannel.get(channel);
    if (connector === undefined) {
      throw new PlatformError("NOT_FOUND", "No connector is registered for this channel.", {
        details: { channel }
      });
    }
    return connector;
  }

  /** The channels this plane can serve, in registration order. */
  channels(): readonly ChannelCode[] {
    return [...this.#byChannel.keys()];
  }
}
