import assert from "node:assert/strict";
import { test } from "node:test";

import { formatMoney, formatTimestamp } from "../src/format.ts";

test("sen are converted to whole rupiah at the display boundary", () => {
  // Rp 20.000 is 2_000_000 sen. The separator is a period in id-ID, and the space after "Rp" is
  // U+00A0 (NBSP), not a regular space — asserting it literally would pass on a wrong character.
  assert.equal(formatMoney({ amount: 2_000_000, currency: "IDR" }), "Rp\u00a020.000");
});

test("a total that is absent is not shown as zero", () => {
  assert.equal(formatMoney(null), "—");
  assert.equal(formatMoney({ amount: 0, currency: "IDR" }), "Rp\u00a00");
});

test("an unusable timestamp is shown as absent, not as an invalid date", () => {
  assert.equal(formatTimestamp(""), "—");
  assert.equal(formatTimestamp("not-a-date"), "—");
  assert.equal(formatTimestamp("2026-09-26T17:12:22.614Z"), "2026-09-26 17:12");
});
