import assert from "node:assert/strict";
import { test } from "node:test";

import { channelLabel, formatExpiry, formatMoney, formatTimestamp } from "../src/format.ts";
import {
  binKindLabel,
  formatDelta,
  formatVariance,
  fulfillmentStatusLabel,
  movementKindLabel,
  pickTaskStatusLabel,
  purchaseOrderStatusLabel,
  safeLinkUrl,
  shipmentArrangementLabel,
  shipmentStatusLabel,
  stocktakeStatusLabel
} from "../src/format.ts";

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

test("a channel code is shown as the marketplace's own name", () => {
  assert.equal(channelLabel("tiktok_tokopedia"), "TikTok Shop / Tokopedia");
  assert.equal(channelLabel("shopee"), "Shopee");
  // An unknown code falls back to itself rather than to a blank: showing the raw code is ugly but
  // honest, and hiding it would make a new channel look like a rendering bug.
  assert.equal(channelLabel("mystery"), "mystery");
});

test("an expiry is phrased as a deadline a seller can act on", () => {
  const now = new Date("2026-09-26T00:00:00.000Z");

  // A credential the marketplace does not expire is not "expired" and must not read as such.
  assert.equal(formatExpiry(null, now), "Tidak kedaluwarsa");
  assert.equal(formatExpiry("2026-09-26T12:00:00.000Z", now), "Kedaluwarsa hari ini");
  assert.equal(formatExpiry("2026-09-27T12:00:00.000Z", now), "Kedaluwarsa besok");
  assert.equal(formatExpiry("2026-09-30T00:00:00.000Z", now), "Kedaluwarsa dalam 4 hari");
  assert.equal(formatExpiry("2026-09-25T00:00:00.000Z", now), "Sudah kedaluwarsa — sambungkan ulang");
  assert.equal(formatExpiry("not-a-date", now), "—");
});

test("warehouse codes are shown as the words a warehouse worker uses", () => {
  assert.equal(binKindLabel("staging"), "Area terima");
  assert.equal(binKindLabel("storage"), "Penyimpanan");
  assert.equal(binKindLabel("packing"), "Area kemas");
  assert.equal(movementKindLabel("receipt"), "Penerimaan");
  assert.equal(movementKindLabel("put_away"), "Pindah rak");
  assert.equal(movementKindLabel("pick"), "Pengambilan");
  assert.equal(movementKindLabel("stocktake"), "Stok opname");

  assert.equal(purchaseOrderStatusLabel("ordered"), "Dipesan");
  assert.equal(purchaseOrderStatusLabel("partially_received"), "Diterima sebagian");
  assert.equal(pickTaskStatusLabel("open"), "Terbuka");
  assert.equal(stocktakeStatusLabel("applied"), "Diterapkan");

  // An unknown code falls back to itself, for the same reason channelLabel does.
  assert.equal(binKindLabel("mystery"), "mystery");
  assert.equal(movementKindLabel("mystery"), "mystery");
});

test("a ledger delta keeps its sign, because the sign is the meaning", () => {
  // A receipt and a correction must not render the same: the sign is what tells them apart.
  assert.equal(formatDelta(10), "+10");
  assert.equal(formatDelta(-3), "-3");
  assert.equal(formatDelta(0), "0");
});

test("a variance is phrased as over, short, or matching — not as a bare number", () => {
  assert.equal(formatVariance(0), "Sesuai");
  assert.equal(formatVariance(2), "Lebih 2");
  assert.equal(formatVariance(-3), "Kurang 3");
  // An uncounted row has no variance yet, which is not the same as a variance of zero.
  assert.equal(formatVariance(null), "—");
});

test("shipment codes are shown as the words a seller uses", () => {
  assert.equal(shipmentStatusLabel("created"), "Dibuat");
  assert.equal(shipmentStatusLabel("in_transit"), "Dalam perjalanan");
  assert.equal(shipmentStatusLabel("delivered"), "Terkirim");
  assert.equal(shipmentArrangementLabel("channel"), "Dipesan kanal");
  assert.equal(shipmentArrangementLabel("courier"), "Dipesan kurir kami");
  assert.equal(fulfillmentStatusLabel("shipped"), "Dikirim");
  assert.equal(fulfillmentStatusLabel("partially_shipped"), "Dikirim sebagian");

  // An unknown code falls back to itself, so a status added to the contract is visible rather than
  // silently blank.
  assert.equal(shipmentStatusLabel("mystery"), "mystery");
  assert.equal(shipmentArrangementLabel("mystery"), "mystery");
  assert.equal(fulfillmentStatusLabel("mystery"), "mystery");
});

test("only an http(s) URL is rendered as a link, because tracking URLs come off-platform", () => {
  assert.equal(safeLinkUrl("https://track.example.test/ABC"), "https://track.example.test/ABC");
  assert.equal(safeLinkUrl("http://track.example.test/ABC"), "http://track.example.test/ABC");
  // The dangerous schemes a courier or marketplace could put in a tracking URL.
  assert.equal(safeLinkUrl("javascript:alert(1)"), null);
  assert.equal(safeLinkUrl("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeLinkUrl("not a url"), null);
  // An absent URL is absent, not a broken link.
  assert.equal(safeLinkUrl(null), null);
});
