import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = {
  children: ReactNode;
  primary?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function ClayButton({ children, primary = true, className = "", disabled, ...rest }: Props) {
  const base = "inline-flex items-center justify-center gap-2 font-bold font-heading rounded-[16px] transition-all duration-200 active:scale-[0.94] active:shadow-clay-pressed h-11 px-5 text-sm";
  const primaryStyle = "bg-gradient-to-br from-orange-400 to-orange-500 text-white shadow-clay-btn hover:-translate-y-0.5";
  const secondaryStyle = "bg-white text-charcoal shadow-clay-btn hover:-translate-y-0.5 border border-orange-50";
  const disabledStyle = disabled ? "opacity-60 cursor-not-allowed active:scale-100" : "";

  return (
    <button className={`${base} ${primary ? primaryStyle : secondaryStyle} ${disabledStyle} ${className}`.trim()} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
