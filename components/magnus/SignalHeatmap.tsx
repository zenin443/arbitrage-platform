'use client'

/**
 * SignalHeatmap — exchange × strategy grid showing signal density
 * Each cell shows: how many profitable signals exist for that exchange + strategy type
 * Color intensity = signal count (dark = 0, bright = many)
 */

interface HeatmapEntry {
  exchange: string
  strategy: string
  count: number
  avgSpread: number
}

interface Props {
  data: HeatmapEntry[]
  exchanges?: string[]
  strategies?: string[]
}

const DEFAULT_EXCHANGES = ['binance', 'okx', 'bybit', 'coinbase', 'kucoin', 'gateio', 'bitget', 'mexc', 'htx']
const DEFAULT_STRATEGIES = ['cex_cex', 'dex_cex', 'spot_futures', 'triangular', 'cross_chain', 'pairs', 'funding', 'stablecoin']
const STRATEGY_LABELS: Record<string, string> = {
  cex_cex:      'CEX-CEX',
  dex_cex:      'DEX-CEX',
  spot_futures:  'Spot-Fut.',
  triangular:    'Triangular',
  cross_chain:   'X-Chain',
  pairs:         'Pairs',
  funding:       'Funding',
  stablecoin:    'Stable',
}

function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return 'rgba(17, 24, 39, 0.8)'  // gray-900
  const intensity = Math.min(1, count / max)
  // blue → cyan → green gradient
  const r = Math.round(6 + (34 - 6) * (1 - intensity))
  const g = Math.round(182 + (197 - 182) * intensity)
  const b = Math.round(212 + (94 - 212) * (1 - intensity))
  return `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.70})`
}

export default function SignalHeatmap({ data, exchanges = DEFAULT_EXCHANGES, strategies = DEFAULT_STRATEGIES }: Props) {
  // Build lookup: exchange:strategy → {count, avgSpread}
  const lookup = new Map<string, HeatmapEntry>()
  for (const entry of data) {
    lookup.set(`${entry.exchange}:${entry.strategy}`, entry)
  }
  const maxCount = Math.max(1, ...data.map(d => d.count))

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-gray-500 font-medium w-24">Exchange</th>
            {strategies.map(s => (
              <th key={s} className="px-2 py-2 text-center text-gray-500 font-medium whitespace-nowrap">
                {STRATEGY_LABELS[s] ?? s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {exchanges.map(ex => (
            <tr key={ex} className="border-t border-gray-800/40">
              <td className="px-3 py-2 text-gray-400 font-medium capitalize whitespace-nowrap">{ex}</td>
              {strategies.map(strat => {
                const cell = lookup.get(`${ex}:${strat}`)
                const count = cell?.count ?? 0
                const spread = cell?.avgSpread ?? 0
                return (
                  <td key={strat} className="px-1 py-1 text-center">
                    <div
                      className="rounded-md mx-auto w-12 h-8 flex flex-col items-center justify-center transition-all"
                      style={{ background: cellColor(count, maxCount) }}
                      title={count > 0 ? `${count} signals · avg ${spread.toFixed(3)}% spread` : 'No signals'}
                    >
                      {count > 0 ? (
                        <>
                          <span className="text-white font-bold text-xs leading-none">{count}</span>
                          <span className="text-white/60 text-[9px] leading-none mt-0.5">{spread.toFixed(2)}%</span>
                        </>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
