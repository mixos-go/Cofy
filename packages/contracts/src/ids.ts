/**
 * Stable identifiers shared across every layer.
 *
 * These are the vocabulary of the platform. Changing an existing member is a breaking change
 * across apps and requires an ADR (AGENTS.md §8).
 */

/** A tenant is one seller organisation. Every row of tenant data is owned by exactly one. */
export type TenantId = string;

/** A sales channel we integrate with. */
export type ChannelCode = "tiktok_tokopedia" | "shopee" | "lazada";

/**
 * Every channel, for code that must validate a channel it received as a string (an environment
 * variable, a stored row, an operator request). A type union cannot be checked at runtime, so this
 * is the one place the list exists — a second copy elsewhere would drift the moment a channel is
 * added, and validation against a stale list rejects a channel we actually serve.
 */
export const CHANNEL_CODES = ["tiktok_tokopedia", "shopee", "lazada"] as const;

/** Narrow an untrusted string to a `ChannelCode`, or null. */
export function asChannelCode(value: string): ChannelCode | null {
  return (CHANNEL_CODES as readonly string[]).includes(value) ? (value as ChannelCode) : null;
}

/** A marketplace's own identifier for an order. Unique only within a channel. */
export type ExternalOrderId = string;

/** Our identifier for an order inside a tenant's data plane. */
export type OrderId = string;

/** ISO-8601 instant, always UTC. */
export type Instant = string;

/** Money in integer minor units (sen for IDR), with the currency it is denominated in. */
export interface Money {
  readonly amount: number;
  readonly currency: "IDR";
}
