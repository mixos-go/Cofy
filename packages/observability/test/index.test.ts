/**
 * Logging tests.
 *
 * The logger is shared by every service, so a leak here leaks everywhere. The redaction rules are
 * the security-relevant part and are tested directly: a field named like a secret must not reach
 * the sink, at any nesting depth.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { createLogger, redact } from "../src/index.ts";

function capture(level: "debug" | "info" | "warn" | "error" = "debug"): {
  logger: ReturnType<typeof createLogger>;
  lines: string[];
} {
  const lines: string[] = [];
  const logger = createLogger(level, {}, (line) => lines.push(line));
  return { logger, lines };
}

test("a sensitive-looking field is redacted at the top level", () => {
  const redacted = redact({ accessToken: "act.123", tenantId: "tnt-a" }) as Record<string, unknown>;
  assert.equal(redacted.accessToken, "[redacted]");
  assert.equal(redacted.tenantId, "tnt-a");
});

test("redaction reaches nested objects and arrays", () => {
  const redacted = redact({
    credential: { accessToken: "act.123", context: { shopCipher: "c" } },
    list: [{ refreshToken: "rft.456" }]
  }) as Record<string, unknown>;

  // A key named like a secret is replaced wholesale, so a credential object does not leak a
  // nested token the redactor had not been told about.
  assert.equal(redacted.credential, "[redacted]");
  // Inside an array, the same rule applies per key.
  assert.deepEqual(redacted.list, [{ refreshToken: "[redacted]" }]);
});

test("a logged secret field never reaches the sink", () => {
  const { logger, lines } = capture();
  logger.info("channel.authorized", { tenantId: "tnt-a", accessToken: "act.123" });

  assert.equal(lines.length, 1);
  const line = lines[0] ?? "";
  assert.ok(!line.includes("act.123"), "the token must not appear in the log line");
  assert.ok(line.includes("[redacted]"));
});

test("the level threshold suppresses lines below it", () => {
  const { logger, lines } = capture("warn");
  logger.debug("quiet", {});
  logger.info("quiet", {});
  assert.equal(lines.length, 0);

  logger.warn("loud", {});
  assert.equal(lines.length, 1);
});

test("child fields are present on every subsequent line", () => {
  const { logger, lines } = capture();
  const child = logger.child({ tenantId: "tnt-a" });
  child.info("first", { correlationId: "req-1" });

  const line = JSON.parse(lines[0] ?? "{}") as Record<string, unknown>;
  assert.equal(line.tenantId, "tnt-a");
  assert.equal(line.correlationId, "req-1");
  assert.equal(line.event, "first");
});
