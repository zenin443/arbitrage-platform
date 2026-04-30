'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  /** Secondary text below the value */
  sub?: string;

  /** Positive/negative/neutral coloring (Magnus-style shorthand) */
  positive?: boolean;
  /** Explicit Tailwind color class for the value, overrides `positive` */
  valueColor?: string;

  /** Glow background class (e.g. "bg-[#3FB950]/5") */
  glow?: string;
  /** Hover border class */
  glowBorder?: string;
  /** Show animated pulse dot */
  pulse?: boolean;
  /** Hex color for pulse dot */
  pulseColor?: string;

  /** Left accent border color (concepts-style) */
  accentColor?: string;

  className?: string;
}

export default function StatCard({
  label,
  value,
  sub,
  positive,
  valueColor,
  glow,
  glowBorder,
  pulse,
  pulseColor,
  accentColor,
  className,
}: StatCardProps) {
  const resolvedValueColor =
    valueColor ??
    (positive === true ? 'text-[#3FB950]' : positive === false ? 'text-[#F85149]' : 'text-[#E6EDF3]');

  const hasGlow = glow || glowBorder || pulse;

  return (
    <div
      className={cn(
        'rounded-lg border border-[#21262D] bg-[#161B22] p-3 relative overflow-hidden transition-colors',
        hasGlow && 'bg-gradient-to-br from-[#161B22] to-[#0D1117]',
        glowBorder,
        className,
      )}
      style={accentColor ? { borderLeftWidth: 2, borderLeftColor: accentColor } : undefined}
    >
      {glow && (
        <div className={cn('absolute top-0 right-0 w-12 h-12 rounded-full blur-xl pointer-events-none', glow)} />
      )}
      {pulse && pulseColor && (
        <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: pulseColor }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: pulseColor }} />
        </span>
      )}
      <div className="text-[10px] text-[#484F58] mb-1 uppercase tracking-wider font-mono">{label}</div>
      <div className={cn('text-[20px] font-medium font-mono tabular-nums', resolvedValueColor)}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-[#484F58] mt-0.5 font-mono truncate">{sub}</div>}
    </div>
  );
}
