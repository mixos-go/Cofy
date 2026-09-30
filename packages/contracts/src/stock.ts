import type { ChannelCode } from "./ids.ts";

/**
 * A stock level as a marketplace reports it (docs/adr/0015).
 *
 * This is the read that makes a corrupted stock level detectable. A push tells the marketplace a
 * number; this asks what the marketplace currently thinks, so reconciliation can compare the two and
 * repair a disagreement (ADR 0002's "corrupt a stock level" drift).
 *
 * Like `ChannelListing`, it is a channel-reported shape and nothing outside a connector may know a
 * marketplace's raw field names (AGENTS.md §4).
 */
export interface ChannelStockLevel {
  readonly channel: ChannelCode;
  /**
   * The marketplace's identifier for the variant. Carried for diagnostics only: the repair does not
   * address a push with it, because the stored listing mapping is what addresses a push (ADR 0009,
   * ADR 0010). An unmapped SKU cannot be repaired no matter what this read returns.
   */
  readonly externalSkuId: string;
  /**
   * The seller SKU as the marketplace reports it — the join key back to our catalogue. `null` when
   * the marketplace has none, which is a real state and is never coerced to `""`. A level without a
   * SKU cannot be compared to our catalogue and is never repaired.
   */
  readonly sku: string | null;
  /** Units the marketplace says are available. Whole units, never negative. */
  readonly available: number;
}

/** How a stock level can drift. One kind today; a union so adding one is a visible edit. */
export const STOCK_DRIFT_KINDS = ["stock_mismatch"] as const;

export type StockDriftKind = (typeof STOCK_DRIFT_KINDS)[number];

/**
 * Classify one comparison between a channel's reported level and our local level, or null when they
 * agree (docs/adr/0015).
 *
 * Pure and shared on ADR 0014's rule: whatever counts stock drift must not be defined twice. It is a
 * plain equality because an absolute level is what a push sets — a difference of any size is a
 * disagreement, not a threshold to tune.
 */
export function classifyStockDrift(input: {
  readonly channelAvailable: number;
  readonly localAvailable: number;
}): StockDriftKind | null {
  return input.channelAvailable === input.localAvailable ? null : "stock_mismatch";
}

/** One compared variant. `kind` is null when the channel and our catalogue agree. */
export interface StockComparison {
  readonly sku: string;
  readonly externalSkuId: string;
  readonly channelAvailable: number;
  readonly localAvailable: number;
  readonly kind: StockDriftKind | null;
}

/**
 * A level the channel reported that cannot be compared to our catalogue.
 *
 * Kept separate from drift on purpose: no push can clear it (there is no SKU to address), so folding
 * it into the drift count would produce a number that never returns to zero and that operators would
 * learn to ignore. It is reported as its own count instead.
 */
export interface UncomparableStockLevel {
  readonly externalSkuId: string;
  readonly reason: "missing_sku" | "unknown_sku";
}
