import ccxt from 'ccxt'
import type { Exchange } from 'ccxt'
import { CcxtAdapter } from './ccxtAdapter'
import { getTier2Exchanges } from '../../registry/exchangeRegistry'
import { SYMBOLS } from '../../config/symbols'

type CcxtExchangeConstructor = new (opts: {
  enableRateLimit: boolean
  timeout: number
}) => Exchange

// HTX returns wrong prices for these symbols — exclude to prevent false arbitrage signals
// ACE/USDT: HTX shows $0.182 vs real $0.121 (~50% error)
const HTX_EXCLUDED_SYMBOLS = new Set(['ACE/USDT'])

export function createAllTier2Adapters(): CcxtAdapter[] {
  const exchanges = getTier2Exchanges()
  return exchanges.flatMap(config => {
    const id = config.id === 'gateio' ? 'gateio' : config.id
    const ccxtMap = ccxt as unknown as Record<string, CcxtExchangeConstructor | undefined>
    const ExchangeClass = ccxtMap[id]
    if (!ExchangeClass) {
      console.warn(`[CCXT] No ccxt class found for ${config.id}, skipping`)
      return []
    }
    const instance = new ExchangeClass({ enableRateLimit: true, timeout: 10_000 })
    const symbols = config.id === 'htx'
      ? SYMBOLS.filter(s => !HTX_EXCLUDED_SYMBOLS.has(s))
      : undefined
    return [new CcxtAdapter(config, instance, symbols)]
  })
}
