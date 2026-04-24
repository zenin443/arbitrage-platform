import { clsx } from "clsx";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-gray-300",
  success: "bg-green-900/50 text-green-400 border border-green-800",
  warning: "bg-yellow-900/50 text-yellow-400 border border-yellow-800",
  danger: "bg-red-900/50 text-red-400 border border-red-800",
  info: "bg-blue-900/50 text-blue-400 border border-blue-800",
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
