import { BaseExchangeAdapter, NetworkStatus } from '../adapters/cex/base'

export interface CoinNetworkStatus {
  exchangeId: string
  coin: string
  networks: NetworkStatus[]
  lastUpdated: number
}

type CacheKey = string // "exchangeId:coin"

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STALE_THRESHOLD_MS = 10 * 60 * 1000  // 10 minutes — treat as unknown after this

const cache = new Map<CacheKey, CoinNetworkStatus>()
let adapters = new Map<string, BaseExchangeAdapter>()
let refreshTimer: ReturnType<typeof setInterval> | null = null

function cacheKey(exchangeId: string, coin: string): CacheKey {
  return `${exchangeId}:${coin}`
}

/**
 * Check if withdrawals are enabled from `fromExchange` and deposits are
 * enabled on `toExchange` for a given coin on a specific network.
 *
 * Returns:
 * - { withdrawOk, depositOk, unknown } when data exists
 * - unknown=true when no data is cached for that exchange/coin
 */
export function checkTransferRoute(
  fromExchangeId: string,
  toExchangeId: string,
  coin: string,
  network: string
): { withdrawOk: boolean; depositOk: boolean; unknown: boolean } {
  const fromEntry = cache.get(cacheKey(fromExchangeId, coin))
  const toEntry = cache.get(cacheKey(toExchangeId, coin))

  // If either side has no data, return unknown
  if (!fromEntry || !toEntry) {
    return { withdrawOk: true, depositOk: true, unknown: true }
  }

  // If data is stale, treat as unknown
  const now = Date.now()
  if (now - fromEntry.lastUpdated > STALE_THRESHOLD_MS ||
      now - toEntry.lastUpdated > STALE_THRESHOLD_MS) {
    return { withdrawOk: true, depositOk: true, unknown: true }
  }

  const fromNet = fromEntry.networks.find(n => n.network === network)
  const toNet = toEntry.networks.find(n => n.network === network)

  // If the specific network isn't in the response, we can't confirm
  if (!fromNet || !toNet) {
    return { withdrawOk: true, depositOk: true, unknown: true }
  }

  return {
    withdrawOk: fromNet.withdrawEnabled,
    depositOk: toNet.depositEnabled,
    unknown: false,
  }
}

/**
 * Quick check: is there ANY open route for transferring `coin` from
 * `fromExchange` to `toExchange`? Returns false only when we have
 * confirmed data showing all routes are blocked.
 */
export function hasAnyOpenRoute(
  fromExchangeId: string,
  toExchangeId: string,
  coin: string
): { routable: boolean; unknown: boolean } {
  const fromEntry = cache.get(cacheKey(fromExchangeId, coin))
  const toEntry = cache.get(cacheKey(toExchangeId, coin))

  if (!fromEntry || !toEntry) {
    return { routable: true, unknown: true }
  }

  const now = Date.now()
  if (now - fromEntry.lastUpdated > STALE_THRESHOLD_MS ||
      now - toEntry.lastUpdated > STALE_THRESHOLD_MS) {
    return { routable: true, unknown: true }
  }

  // Find common networks where withdrawal is enabled on source AND deposit enabled on dest
  for (const fromNet of fromEntry.networks) {
    if (!fromNet.withdrawEnabled) continue
    const toNet = toEntry.networks.find(n => n.network === fromNet.network)
    if (toNet && toNet.depositEnabled) {
      return { routable: true, unknown: false }
    }
  }

  // We have data for both sides but no open route exists
  return { routable: false, unknown: false }
}

/**
 * Fetch network status for a set of coins from a single adapter.
 * Silently skips adapters that return empty (stubs).
 */
async function refreshAdapter(adapter: BaseExchangeAdapter, coins: string[]): Promise<void> {
  const exchangeId = adapter.config.id

  for (const coin of coins) {
    try {
      const networks = await adapter.fetchNetworkStatus(coin)
      if (networks.length > 0) {
        cache.set(cacheKey(exchangeId, coin), {
          exchangeId,
          coin,
          networks,
          lastUpdated: Date.now(),
        })
      }
    } catch {
      // Non-fatal — keep stale data
    }
  }
}

async function refreshAll(): Promise<void> {
  // Top traded coins — cover the most common arbitrage pairs
  const COINS = [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'LINK', 'DOT', 'DOGE',
    'MATIC', 'NEAR', 'UNI', 'ATOM', 'FTM', 'APE', 'ARB', 'OP', 'SUI', 'SEI',
    'INJ', 'TIA', 'PEPE', 'WIF', 'RENDER', 'FET', 'AAVE', 'COMP', 'MKR', 'SNX',
  ]

  const promises: Promise<void>[] = []
  for (const adapter of adapters.values()) {
    promises.push(refreshAdapter(adapter, COINS))
  }

  await Promise.allSettled(promises)
  console.log(`[NetworkStatusCache] Refreshed — ${cache.size} entries across ${adapters.size} exchanges`)
}

export function startNetworkStatusCache(adapterMap: Map<string, BaseExchangeAdapter>): void {
  adapters = adapterMap

  // Initial fetch after a short delay to let adapters connect first
  setTimeout(() => {
    refreshAll().catch(err =>
      console.error('[NetworkStatusCache] Initial refresh error:', err)
    )
  }, 30_000)

  refreshTimer = setInterval(() => {
    refreshAll().catch(err =>
      console.error('[NetworkStatusCache] Refresh error:', err)
    )
  }, REFRESH_INTERVAL_MS)

  console.log('[NetworkStatusCache] Started — refreshing every 5 minutes')
}

export function stopNetworkStatusCache(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

export function getNetworkStatusSummary(): Record<string, { coin: string; networks: NetworkStatus[]; lastUpdated: number }[]> {
  const result: Record<string, { coin: string; networks: NetworkStatus[]; lastUpdated: number }[]> = {}
  for (const entry of cache.values()) {
    if (!result[entry.exchangeId]) result[entry.exchangeId] = []
    result[entry.exchangeId].push({
      coin: entry.coin,
      networks: entry.networks,
      lastUpdated: entry.lastUpdated,
    })
  }
  return result
}
