/**
 * Formats a price number to a fixed number of decimal places.
 * Defaults to 8 decimal places to preserve full monetary precision.
 */
export function formatPrice(value: number, decimals = 8): string {
  return value.toFixed(decimals);
}

/**
 * Formats a spread/percentage value for display, e.g. "1.2340%".
 */
export function formatSpread(value: number, decimals = 4): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formats a USDT profit value with 2 decimal places, e.g. "$12.34".
 */
export function formatProfit(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Formats a Unix timestamp (ms) to a human-readable time string.
 */
export function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(ts));
}

/**
 * Formats a score (0–100) to a rounded integer string.
 */
export function formatScore(score: number): string {
  return Math.round(score).toString();
}
