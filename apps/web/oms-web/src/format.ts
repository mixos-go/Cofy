/**
 * Money at the display boundary (AGENTS.md §5).
 *
 * The API speaks integer sen; a screen speaks rupiah. This is the only place the conversion happens,
 * so a screen cannot invent its own and drift from the others. `amount` is sen, never a float
 * rupiah, which is why it is divided by 100 here and nowhere else.
 */

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  // Sen are not displayed: an IDR price is quoted in whole rupiah, and the fraction would only ever
  // be noise. The sen value is still the source of truth.
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export interface Money {
  readonly amount: number;
  readonly currency: string;
}

/** Formats integer sen as rupiah. A null total stays visibly absent rather than becoming Rp 0. */
export function formatMoney(money: Money | null): string {
  if (money === null) return "—";
  return IDR.format(money.amount / 100);
}

/** An ISO timestamp as a UTC date and time, which is the only form the API guarantees. */
export function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toISOString().replace("T", " ").slice(0, 16);
}

/**
 * Marketplace names as a seller knows them.
 *
 * The API speaks channel codes (`tiktok_tokopedia`); a screen speaks the marketplace's own name.
 * Kept in one table so no page invents its own label and drifts from the others.
 */
const CHANNEL_LABELS: Readonly<Record<string, string>> = {
  tiktok_tokopedia: "TikTok Shop / Tokopedia",
  shopee: "Shopee",
  lazada: "Lazada"
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

/**
 * A token expiry as a seller-facing sentence.
 *
 * A marketplace credential expiring is an operational fact the seller has to act on, so it is
 * phrased as a deadline rather than a timestamp. A null expiry means the marketplace does not
 * expire the credential, which is different from "expired" and must not read as such.
 */
export function formatExpiry(expiresAt: string | null, now: Date = new Date()): string {
  if (expiresAt === null) return "Tidak kedaluwarsa";
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return "—";

  const days = Math.floor((parsed - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "Sudah kedaluwarsa — sambungkan ulang";
  if (days === 0) return "Kedaluwarsa hari ini";
  if (days === 1) return "Kedaluwarsa besok";
  return `Kedaluwarsa dalam ${days} hari`;
}
