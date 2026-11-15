import type { ReactNode, HTMLAttributes } from "react";

interface ClayCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  animate?: boolean;
}

export function ClayCard({ children, className = "", animate = false, ...props }: ClayCardProps) {
  return (
    <div 
      {...props}
      className={`bg-white/85 backdrop-blur-md rounded-[24px] shadow-clay-card border border-white p-5 ${animate ? "hover:-translate-y-1 transition-transform duration-300" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
