import ccxt from 'ccxt'
import type { Exchange } from 'ccxt'
import { CcxtAdapter } from './ccxtAdapter'
import { getTier2Exchanges } from '../../registry/exchangeRegistry'

type CcxtExchangeConstructor = new (opts: {
  enableRateLimit: boolean
  timeout: number
}) => Exchange

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
    return [new CcxtAdapter(config, instance)]
  })
}
