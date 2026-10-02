/**
 * Display helpers for the ops console.
 *
 * The impersonation surface has exactly one thing to format that the seller UI does not: a
 * time-box. It is shown as a remaining duration, because "when does this stop" is the question an
 * operator has, and a wall-clock timestamp answers a different one.
 */

/** An ISO timestamp as a UTC date and time. */
export function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return "—";
  return new Date(parsed).toISOString().replace("T", " ").slice(0, 16);
}

/**
 * How long an impersonation has left, in minutes.
 *
 * Rounded down, so it reads "0 menit" only when the session is genuinely about to end — rounding up
 * would show time that is not there.
 */
export function formatRemaining(expiresAt: string, now: Date = new Date()): string {
  const parsed = Date.parse(expiresAt);
  if (Number.isNaN(parsed)) return "—";
  const minutes = Math.floor((parsed - now.getTime()) / (60 * 1000));
  if (minutes <= 0) return "berakhir";
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}
