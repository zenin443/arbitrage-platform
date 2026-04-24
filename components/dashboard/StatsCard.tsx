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
    up: "text-green-400",
    down: "text-red-400",
    neutral: "text-gray-100",
  }[trend];

  return (
    <div
      className={clsx(
        "relative rounded-lg border border-gray-800 bg-gray-900 p-4",
        className
      )}
    >
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
      )}

      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </span>
        {icon && <span className="text-gray-600 ml-4">{icon}</span>}
      </div>

      <div
        className={clsx(
          "text-2xl font-bold font-mono tabular-nums",
          trendColor
        )}
      >
        {value}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-gray-600 font-mono">{subtitle}</div>
      )}
    </div>
  );
}
