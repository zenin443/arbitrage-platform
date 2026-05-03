'use client'

/**
 * SignalScoreGauge — animated radial gauge showing signal quality 0–100
 * Color zones: red (0–39), amber (40–64), green (65–100)
 * Shows score, action, and key breakdown dimensions
 */

interface ScoreBreakdown {
  spreadQuality:    number
  executionProb:    number
  liquidityDepth:   number
  historicalWinPct: number
  volatilityRisk:   number
  timeOfDay:        number
}

interface Props {
  score: number
  action?: 'execute' | 'reduce' | 'skip'
  breakdown?: ScoreBreakdown
  size?: 'sm' | 'md' | 'lg'
  showBreakdown?: boolean
  label?: string
}

const DIMS: Array<{ key: keyof ScoreBreakdown; label: string; weight: string }> = [
  { key: 'spreadQuality',    label: 'Spread Quality',    weight: '25%' },
  { key: 'executionProb',    label: 'Exec. Probability', weight: '20%' },
  { key: 'liquidityDepth',   label: 'Liquidity',         weight: '20%' },
  { key: 'historicalWinPct', label: 'Win Rate',          weight: '15%' },
  { key: 'volatilityRisk',   label: 'Vol. Risk',         weight: '10%' },
  { key: 'timeOfDay',        label: 'Time of Day',       weight: '10%' },
]

function getZoneColor(score: number): { ring: string; text: string; bg: string; badge: string } {
  if (score >= 65) return {
    ring: '#22c55e',  // green-500
    text: 'text-green-400',
    bg:   'bg-green-500/10',
    badge: 'bg-green-500/20 text-green-300 border-green-500/30',
  }
  if (score >= 40) return {
    ring: '#f59e0b',  // amber-500
    text: 'text-amber-400',
    bg:   'bg-amber-500/10',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  }
  return {
    ring: '#ef4444',  // red-500
    text: 'text-red-400',
    bg:   'bg-red-500/10',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
  }
}

function ArcGauge({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 64 : size === 'lg' ? 120 : 88
  const stroke = size === 'sm' ? 5 : 7
  const r = (dim - stroke * 2) / 2
  const cx = dim / 2
  const cy = dim / 2

  // Arc: 240° sweep (start at 150°, end at 390° = -150° to 90° going clockwise)
  const startAngle = -210   // degrees
  const totalSweep = 240
  const pct = Math.max(0, Math.min(100, score)) / 100
  const sweepAngle = totalSweep * pct

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(start: number, end: number, r: number): string {
    const s = polarToXY(start, r)
    const e = polarToXY(end, r)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const { ring } = getZoneColor(score)
  const circumference = 2 * Math.PI * r

  return (
    <svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
      {/* Track */}
      <path
        d={arcPath(startAngle, startAngle + totalSweep, r)}
        fill="none"
        stroke="#1f2937"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Value arc */}
      {pct > 0 && (
        <path
          d={arcPath(startAngle, startAngle + sweepAngle, r)}
          fill="none"
          stroke={ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${ring}60)` }}
        />
      )}
      {/* Score text */}
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill={ring}
        fontSize={size === 'sm' ? 13 : size === 'lg' ? 24 : 18}
        fontWeight="700"
        fontFamily="monospace"
      >
        {score}
      </text>
    </svg>
  )
}

export default function SignalScoreGauge({
  score,
  action,
  breakdown,
  size = 'md',
  showBreakdown = false,
  label,
}: Props) {
  const colors = getZoneColor(score)
  const actionLabel = action === 'execute' ? 'EXECUTE' : action === 'reduce' ? 'REDUCE' : 'SKIP'

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <span className="text-xs text-gray-500 uppercase tracking-widest">{label}</span>
      )}
      <div className={`rounded-full p-1 ${colors.bg}`}>
        <ArcGauge score={score} size={size} />
      </div>
      {action && (
        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${colors.badge}`}>
          {actionLabel}
        </span>
      )}
      {showBreakdown && breakdown && (
        <div className="w-full mt-1 space-y-1">
          {DIMS.map(d => (
            <div key={d.key} className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-28 shrink-0">{d.label}</span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(breakdown[d.key] * 100).toFixed(0)}%`,
                    background: breakdown[d.key] > 0.65 ? '#22c55e' : breakdown[d.key] > 0.4 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="text-gray-500 w-8 text-right">{d.weight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
