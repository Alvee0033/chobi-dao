import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "primary"
    | "secondary"
    | "tertiary"
    | "danger"
    | "destructive"
    | "outline"
    | "ghost"
    | "link"
    | "gradient"
    | "clay"
    | "accent";
  size?: "default" | "sm" | "lg" | "xl" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", isLoading, children, disabled, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-bold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E65A15] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none cursor-pointer";

    const variants = {
      default:
        "bg-[#2D1807] text-[#FAF6F0] hover:bg-[#43260F] shadow-[0_4px_14px_rgba(45,24,7,0.18)] hover:shadow-[0_6px_20px_rgba(45,24,7,0.25)] hover:-translate-y-0.5",
      primary:
        "bg-gradient-to-r from-orange-500 via-[#E65A15] to-amber-500 hover:from-orange-600 hover:via-[#D14A0A] hover:to-amber-600 text-white shadow-[0_8px_20px_rgba(230,90,21,0.28)] hover:shadow-[0_10px_25px_rgba(230,90,21,0.38)] hover:-translate-y-0.5",
      gradient:
        "bg-gradient-to-r from-orange-500 via-[#E65A15] to-amber-500 hover:from-orange-600 hover:via-[#D14A0A] hover:to-amber-600 text-white shadow-[0_8px_20px_rgba(230,90,21,0.28)] hover:shadow-[0_10px_25px_rgba(230,90,21,0.38)] hover:-translate-y-0.5",
      clay:
        "bg-white/95 hover:bg-white text-[#2D1807] shadow-clay-card border border-[#EADECF] hover:shadow-[0_16px_36px_rgba(110,65,30,0.12)] hover:-translate-y-0.5",
      accent:
        "bg-[#E65A15] text-white hover:bg-[#D14A0A] shadow-[0_6px_18px_rgba(230,90,21,0.3)] hover:-translate-y-0.5",
      danger:
        "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:-translate-y-0.5",
      destructive:
        "bg-red-500 text-white hover:bg-red-600 shadow-sm hover:-translate-y-0.5",
      outline:
        "border-2 border-[#EADECF] bg-white/80 hover:bg-white text-[#2D1807] hover:border-[#E65A15]/40 shadow-sm hover:-translate-y-0.5",
      secondary:
        "bg-[#F3E8DB] text-[#2D1807] hover:bg-[#EADBC8] border border-[#E5D7C5] shadow-xs",
      tertiary:
        "hover:bg-[#F3E8DB]/70 text-[#5C4D43] hover:text-[#2D1807]",
      ghost:
        "hover:bg-[#F3E8DB]/70 text-[#2D1807] hover:text-[#E65A15]",
      link:
        "text-[#E65A15] underline-offset-4 hover:underline p-0 h-auto font-semibold"
    };

    const sizes = {
      default: "h-11 px-5 py-2.5",
      sm: "h-9 rounded-xl px-3.5 text-xs font-semibold",
      lg: "h-13 rounded-2xl px-7 py-3 text-base font-bold",
      xl: "h-14 rounded-2xl px-8 py-4 text-base sm:text-lg font-black tracking-tight",
      icon: "h-10 w-10 rounded-xl"
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
