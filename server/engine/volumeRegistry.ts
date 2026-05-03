/**
 * Volume Registry — 24h volume cache shared across signal engines.
 *
 * Exchange adapters or REST polling jobs call `updateVolume()` whenever
 * they receive ticker data that includes 24h volume.  The engines call
 * `getVolume()` to gate signals; when volume is unknown the registry
 * returns null so callers can choose fail-open behaviour.
 *
 * Key format: "<symbol>" (e.g. "BTC/USDT") — aggregated across all
 * exchanges that reported data for that symbol in the last TTL window.
 */

const TTL_MS = 5 * 60 * 1000  // stale after 5 minutes

interface VolumeEntry {
  volumeUsd: number   // 24h quote volume in USD
  updatedAt: number   // unix ms
}

// Per-exchange volume: exchangeId:symbol → entry
const perExchangeVolume = new Map<string, VolumeEntry>()

function exchangeKey(exchangeId: string, symbol: string): string {
  return `${exchangeId}:${symbol}`
}

/** Called by adapters when they receive 24h volume data for a symbol. */
export function updateVolume(exchangeId: string, symbol: string, volumeUsd: number): void {
  perExchangeVolume.set(exchangeKey(exchangeId, symbol), {
    volumeUsd,
    updatedAt: Date.now(),
  })
}

/**
 * Returns the aggregated 24h USD volume for a symbol (summed across all
 * exchanges that reported within the TTL window), or null if no data is
 * available.  Callers should treat null as "unknown" and fail-open.
 */
export function getVolume(symbol: string): number | null {
  const cutoff = Date.now() - TTL_MS
  let total = 0
  let found = false

  for (const [key, entry] of perExchangeVolume) {
    if (!key.endsWith(`:${symbol}`)) continue
    if (entry.updatedAt < cutoff) continue
    total += entry.volumeUsd
    found = true
  }

  return found ? total : null
}

/**
 * Returns the single-exchange volume for a specific exchange+symbol, or
 * null if not available / stale.
 */
export function getExchangeVolume(exchangeId: string, symbol: string): number | null {
  const entry = perExchangeVolume.get(exchangeKey(exchangeId, symbol))
  if (!entry) return null
  if (Date.now() - entry.updatedAt > TTL_MS) return null
  return entry.volumeUsd
}

/** Prune entries older than 2× TTL to avoid unbounded growth. */
export function pruneVolumeRegistry(): void {
  const cutoff = Date.now() - TTL_MS * 2
  for (const [key, entry] of perExchangeVolume) {
    if (entry.updatedAt < cutoff) perExchangeVolume.delete(key)
  }
}
