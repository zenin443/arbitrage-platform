/**
 * Shared number formatting utilities for the Arbitrance terminal.
 *
 * All functions handle null, undefined, NaN, and Infinity gracefully
 * by returning '--' as the fallback sentinel value.
 *
 * Design rules:
 * - formatPercent: always shows the '%' suffix, 3 decimal places by default
 * - formatPrice:   auto-detects decimal precision based on magnitude
 * - formatNumber:  locale-aware thousands separator
 * - formatDuration: human-readable ms → "4m 32s"
 */

function isInvalidNumber(value: unknown): boolean {
  return value === null || value === undefined || typeof value !== 'number' || isNaN(value) || !isFinite(value)
}

/**
 * Formats a spread/percentage value for display.
 * @example formatPercent(0.245) → "0.245%"
 * @example formatPercent(1.2, 2) → "1.20%"
 */
export function formatPercent(value: number, decimals = 3): string {
  if (isInvalidNumber(value)) return '--'
  return `${value.toFixed(decimals)}%`
}

/**
 * Formats a price or monetary value with auto-detected decimal precision.
 * Handles negative values by prefixing with "-$".
 * @example formatPrice(94523.12) → "$94,523.12"
 * @example formatPrice(1.23)     → "$1.23"
 * @example formatPrice(0.00045)  → "$0.000450"
 * @example formatPrice(-1.23)    → "-$1.23"
 */
export function formatPrice(value: number, decimals?: number): string {
  if (isInvalidNumber(value)) return '--'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (decimals !== undefined) return `${sign}$${abs.toFixed(decimals)}`
  if (abs >= 1000) {
    return `${sign}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (abs >= 1)    return `${sign}$${abs.toFixed(2)}`
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`
  return `${sign}$${abs.toFixed(6)}`
}

/**
 * Formats a number with locale-aware thousands separators.
 * @example formatNumber(5247) → "5,247"
 */
export function formatNumber(value: number): string {
  if (isInvalidNumber(value)) return '--'
  return value.toLocaleString()
}

/**
 * Formats a duration in milliseconds to a human-readable string.
 * @example formatDuration(272000) → "4m 32s"
 * @example formatDuration(16000)  → "16s"
 * @example formatDuration(0)      → "<1s"
 */
export function formatDuration(ms: number): string {
  if (isInvalidNumber(ms) || ms <= 0) return '<1s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
