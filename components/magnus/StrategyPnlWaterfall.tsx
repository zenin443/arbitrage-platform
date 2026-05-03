'use client'

/**
 * StrategyPnlWaterfall — stacked bar showing PnL contribution per strategy/bot
 * Visual language: green bars going up (profit), red bars going down (loss)
 * Each bar represents one bot's contribution to the total fleet PnL
 */

interface StrategyBar {
  id: string
  label: string
  pnl: number
  trades: number
  color: string
}

interface Props {
  bars: StrategyBar[]
}

const COLOR_PALETTE: Record<string, { bar: string; text: string }> = {
  'magnus-beta-1k':      { bar: '#06b6d4', text: 'text-cyan-400' },
  'magnus-beta-10k':     { bar: '#3b82f6', text: 'text-blue-400' },
  'magnus-alpha':        { bar: '#8b5cf6', text: 'text-violet-400' },
  'magnus-futures':      { bar: '#f59e0b', text: 'text-amber-400' },
  'magnus-rate-harvest': { bar: '#22c55e', text: 'text-green-400' },
  'magnus-pairs':        { bar: '#a855f7', text: 'text-purple-400' },
  'magnus-cascade':      { bar: '#f97316', text: 'text-orange-400' },
  'magnus-calendar':     { bar: '#14b8a6', text: 'text-teal-400' },
  'magnus-listing':      { bar: '#ec4899', text: 'text-pink-400' },
}

export default function StrategyPnlWaterfall({ bars }: Props) {
  if (bars.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-600 text-sm">
        Loading strategy performance…
      </div>
    )
  }

  const maxAbs = Math.max(1, ...bars.map(b => Math.abs(b.pnl)))
  const totalPnl = bars.reduce((s, b) => s + b.pnl, 0)

  return (
    <div className="space-y-3">
      {/* Total bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-24 shrink-0">Fleet Total</span>
        <div className="flex-1 h-5 bg-gray-800 rounded-full overflow-hidden relative">
          {totalPnl >= 0 ? (
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(totalPnl / maxAbs / bars.length) * 100}%`, boxShadow: '0 0 8px #22c55e60' }}
            />
          ) : (
            <div
              className="h-full rounded-full bg-red-500 absolute right-0 transition-all"
              style={{ width: `${(Math.abs(totalPnl) / maxAbs / bars.length) * 100}%` }}
            />
          )}
        </div>
        <span className={`text-xs font-mono font-bold w-20 text-right ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {totalPnl >= 0 ? '+' : ''}${Math.abs(totalPnl).toFixed(2)}
        </span>
      </div>

      {/* Per-strategy bars */}
      {bars.map(bar => {
        const palette = COLOR_PALETTE[bar.id]
        const pct = (Math.abs(bar.pnl) / maxAbs) * 100
        const isPositive = bar.pnl >= 0
        return (
          <div key={bar.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-24 shrink-0 truncate">{bar.label}</span>
            <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden relative">
              {isPositive ? (
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: palette?.bar ?? '#06b6d4',
                    boxShadow: `0 0 6px ${palette?.bar ?? '#06b6d4'}60`,
                  }}
                />
              ) : (
                <div
                  className="h-full rounded-full absolute right-0 bg-red-500/70 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
            <div className="flex items-center gap-1 w-28 justify-end">
              <span className="text-[10px] text-gray-600">{bar.trades}T</span>
              <span className={`text-xs font-mono ${isPositive ? (palette?.text ?? 'text-cyan-400') : 'text-red-400'}`}>
                {isPositive ? '+' : ''}${Math.abs(bar.pnl).toFixed(2)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
