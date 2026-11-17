import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "clay" | "glass" | "bordered" | "highlight";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  const variants = {
    default:
      "rounded-3xl border border-[#EADECF] bg-[#FAF6F0] p-6 text-[#2D1807] shadow-[0_12px_28px_rgba(110,65,30,0.06)] transition-all",
    clay:
      "rounded-3xl border border-[#EADECF] bg-white/95 p-6 text-[#2D1807] shadow-clay-card hover:shadow-[0_20px_40px_rgba(110,65,30,0.12)] transition-all",
    glass:
      "rounded-3xl border border-white/60 bg-white/70 backdrop-blur-md p-6 text-[#2D1807] shadow-[0_8px_32px_rgba(110,65,30,0.06)] transition-all",
    bordered:
      "rounded-3xl border-2 border-[#EADECF] bg-[#FAF6F0]/80 p-6 text-[#2D1807] transition-all",
    highlight:
      "rounded-3xl border-2 border-[#E65A15] bg-[#FFF9F3] p-6 text-[#2D1807] shadow-[0_16px_36px_rgba(230,90,21,0.15)] transition-all"
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-serif text-xl sm:text-2xl font-bold leading-tight tracking-tight text-[#2D1807]",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-sm text-[#5C4D43] font-medium leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex-1", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("pt-4 flex items-center justify-between", className)}
      {...props}
    />
  );
}

// Compound component attachments (HeroUI v3 pattern)
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;
