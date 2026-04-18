import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    default: "bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-600/20",
    secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    outline: "border border-white/15 bg-transparent text-white hover:bg-white/5",
    ghost: "bg-transparent text-white hover:bg-white/5",
    danger: "bg-rose-600 text-white hover:bg-rose-500"
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
