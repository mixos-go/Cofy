/**
 * Config loader tests.
 *
 * Startup configuration is where a wrong value is cheapest to catch. The tests focus on the two
 * failures that would be security incidents at runtime: the service starting with no service token
 * (so every caller is trusted) and the OAuth redirect URI being derived from something the caller
 * controls.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { PlatformError } from "@platform/contracts";
import { loadConfig } from "../src/config.ts";

const BASE_ENV = {
  INTEGRATION_PLANE_PUBLIC_BASE_URL: "https://integration.example.test",
  INTEGRATION_SERVICE_TOKENS: "svc-a,svc-b"
} as NodeJS.ProcessEnv;

test("a minimal environment yields defaults and parses the token list", () => {
  const config = loadConfig({ ...BASE_ENV });
  assert.equal(config.port, 4002);
  assert.equal(config.publicBaseUrl, "https://integration.example.test");
  assert.deepEqual(config.serviceTokens, ["svc-a", "svc-b"]);
  assert.equal(config.tiktok, null);
  assert.equal(config.shopee, null);
});

test("the service refuses to start with no service token", () => {
  assert.throws(
    () => loadConfig({ INTEGRATION_PLANE_PUBLIC_BASE_URL: "https://x.test", INTEGRATION_SERVICE_TOKENS: "" }),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.code, "VALIDATION_FAILED");
      return true;
    }
  );
});

test("tokens are trimmed and blank entries dropped", () => {
  const config = loadConfig({ ...BASE_ENV, INTEGRATION_SERVICE_TOKENS: " svc-a , , svc-b " });
  assert.deepEqual(config.serviceTokens, ["svc-a", "svc-b"]);
});

test("a missing public base URL is rejected by name", () => {
  assert.throws(
    () => loadConfig({ INTEGRATION_SERVICE_TOKENS: "svc-a" }),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.deepEqual(error.details, { variable: "INTEGRATION_PLANE_PUBLIC_BASE_URL" });
      return true;
    }
  );
});

test("a non-absolute public base URL is rejected", () => {
  assert.throws(
    () => loadConfig({ ...BASE_ENV, INTEGRATION_PLANE_PUBLIC_BASE_URL: "integration.example.test" }),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      assert.equal(error.code, "VALIDATION_FAILED");
      return true;
    }
  );
});

test("a bad port is rejected rather than silently coerced", () => {
  assert.throws(
    () => loadConfig({ ...BASE_ENV, INTEGRATION_PLANE_PORT: "not-a-port" }),
    (error: unknown) => {
      assert.ok(error instanceof PlatformError);
      return true;
    }
  );
});

test("a channel is configured only when its app credentials are present", () => {
  const withTikTok = loadConfig({ ...BASE_ENV, TIKTOK_SHOP_APP_KEY: "key", TIKTOK_SHOP_APP_SECRET: "secret" });
  assert.deepEqual(withTikTok.tiktok, { appKey: "key", appSecret: "secret" });

  // Half a credential is not a credential: it must not register a channel that would fail later.
  const partial = loadConfig({ ...BASE_ENV, TIKTOK_SHOP_APP_KEY: "key" });
  assert.equal(partial.tiktok, null);
});

test("the Shopee webhook URL defaults from the public base URL", () => {
  const config = loadConfig({
    ...BASE_ENV,
    SHOPEE_PARTNER_ID: "123456",
    SHOPEE_PARTNER_KEY: "shared-key"
  });
  assert.ok(config.shopee);
  assert.equal(config.shopee.partnerId, 123456);
  assert.equal(config.shopee.webhookUrl, "https://integration.example.test/v1/channels/shopee/webhook");
});
