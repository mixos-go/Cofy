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
