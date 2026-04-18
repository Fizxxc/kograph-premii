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
    default: "bg-slate-950 text-white hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200",
    secondary: "bg-white/80 text-slate-900 hover:bg-white border border-slate-200/80 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:border-white/10",
    outline: "border border-slate-200/80 bg-transparent text-slate-900 hover:bg-white/60 dark:border-white/15 dark:text-white dark:hover:bg-white/5",
    ghost: "bg-transparent text-slate-900 hover:bg-white/60 dark:text-white dark:hover:bg-white/5",
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
