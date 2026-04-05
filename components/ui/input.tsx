import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...props}
    />
  );
}
