import assert from "node:assert/strict";
import { test } from "node:test";

import { formatRemaining, formatTimestamp } from "../src/format.ts";

test("a timestamp is rendered as a UTC date and time", () => {
  assert.equal(formatTimestamp("2026-09-26T17:12:22.614Z"), "2026-09-26 17:12");
  assert.equal(formatTimestamp("not-a-date"), "—");
});

test("the remaining time is shown as a duration, rounded down", () => {
  const now = new Date("2026-09-26T00:00:00.000Z");

  // Rounded down: showing "1 menit" with 30 seconds left would promise time that is not there.
  assert.equal(formatRemaining("2026-09-26T00:29:30.000Z", now), "29 menit");
  assert.equal(formatRemaining("2026-09-26T00:01:00.000Z", now), "1 menit");

  // The boundary: exactly at expiry reads as over, not as "0 menit".
  assert.equal(formatRemaining("2026-09-26T00:00:00.000Z", now), "berakhir");
  assert.equal(formatRemaining("2026-09-25T23:59:59.000Z", now), "berakhir");

  // Hours appear once the duration is an hour or more.
  assert.equal(formatRemaining("2026-09-26T02:00:00.000Z", now), "2 jam");
  assert.equal(formatRemaining("2026-09-26T01:30:00.000Z", now), "1 jam 30 menit");

  assert.equal(formatRemaining("not-a-date", now), "—");
});
