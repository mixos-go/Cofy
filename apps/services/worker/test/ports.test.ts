/**
 * Outbound-port tests.
 *
 * The integration plane answers a throttled call with `429` and `CHANNEL_RATE_LIMITED`. The worker
 * rebuilds that error from the HTTP response, and if it derived retryability from the status alone
 * it would mark the call terminal — so this is the seam where the governor's decision can be lost.
 * These tests pin the mapping.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import { HttpChannelGateway } from "../src/ports.ts";

/** A fetch that returns one canned error response, so the mapping is the only thing under test. */
function errorTransport(status: number, code: string): typeof fetch {
  return (async () =>
    ({
      ok: false,
      status,
      text: async () => JSON.stringify({ error: { code, message: "denied", details: {} } })
    }) as Response) as unknown as typeof fetch;
}

const gateway = (transport: typeof fetch): HttpChannelGateway =>
  new HttpChannelGateway({ baseUrl: "https://planes.example.test", serviceToken: "svc", transport });

test("a 429 CHANNEL_RATE_LIMITED is retryable, even though 429 is not a 5xx", async () => {
  const error = await gateway(errorTransport(429, "CHANNEL_RATE_LIMITED"))
    .fetchOrders({ tenantId: "tnt-a", channel: "shopee", cursor: null })
    .then(
      () => null,
      (caught: unknown) => caught
    );

  assert.ok(error instanceof PlatformError);
  assert.equal(error.code, "CHANNEL_RATE_LIMITED");
  assert.equal(error.retryable, true);
});

test("a 404 is terminal, so a missing route is not retried forever", async () => {
  const error = await gateway(errorTransport(404, "NOT_FOUND"))
    .fetchOrders({ tenantId: "tnt-a", channel: "shopee", cursor: null })
    .then(
      () => null,
      (caught: unknown) => caught
    );

  assert.ok(error instanceof PlatformError);
  assert.equal(error.retryable, false);
});
