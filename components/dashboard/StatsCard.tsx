import type { ReactNode } from "react";
import { clsx } from "clsx";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  /** Renders a pulsing live-indicator dot in the top-right corner */
  pulse?: boolean;
  className?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend = "neutral",
  pulse = false,
  className,
}: StatsCardProps) {
  const trendColor = {
    up: "text-[#3FB950]",
    down: "text-[#F85149]",
    neutral: "text-[#E6EDF3]",
  }[trend];

  return (
    <div
      className={clsx(
        "relative bg-[#161B22] border border-[#21262D] rounded-lg p-3 hover:border-[#388BFD]/50 transition",
        className
      )}
    >
      {pulse && (
        <span className="absolute top-2 right-2 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3FB950] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3FB950]" />
        </span>
      )}

      <div className="flex items-start justify-between mb-1">
        <span className="text-[11px] text-[#484F58] font-sans">
          {title}
        </span>
        {icon && <span className="text-[#484F58] ml-4">{icon}</span>}
      </div>

      <div
        className={clsx(
          "text-[20px] font-mono font-medium tabular-nums",
          trendColor
        )}
      >
        {value}
      </div>

      {subtitle && (
        <div className="mt-0.5 text-[11px] text-[#8B949E] font-sans">{subtitle}</div>
      )}
    </div>
  );
}
