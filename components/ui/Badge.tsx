import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-th-hover text-th-primary",
  success: "bg-th-green/15 text-th-green border border-th-green/30",
  warning: "bg-th-yellow/15 text-th-yellow border border-th-yellow/30",
  danger:  "bg-th-red/15 text-th-red border border-th-red/30",
  info:    "bg-th-accent/15 text-th-accent border border-th-accent/30",
};

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
