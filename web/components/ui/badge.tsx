import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "glow"
    | "accent"
    | "success"
    | "warning";
  size?: "sm" | "default" | "lg";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  size = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide transition-all select-none";

  const variants = {
    default:
      "bg-[#E65A15] text-white shadow-[0_2px_8px_rgba(230,90,21,0.25)]",
    accent:
      "bg-amber-500 text-white shadow-xs",
    secondary:
      "bg-[#F3E8DB] text-[#2D1807] border border-[#EADECF]",
    outline:
      "text-[#5C4D43] border border-[#EADECF] bg-white/80 backdrop-blur-sm",
    glow:
      "bg-orange-500/10 text-[#E65A15] border border-orange-500/25 backdrop-blur-sm shadow-[0_0_12px_rgba(230,90,21,0.12)]",
    success:
      "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 backdrop-blur-sm",
    warning:
      "bg-amber-500/10 text-amber-800 border border-amber-500/20 backdrop-blur-sm"
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-[10px]",
    default: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm"
  };

  return (
    <div className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            variant === "glow" || variant === "default"
              ? "bg-[#E65A15]"
              : variant === "success"
              ? "bg-emerald-500"
              : variant === "warning"
              ? "bg-amber-500"
              : "bg-current"
          )}
        />
      )}
      {children}
    </div>
  );
}
