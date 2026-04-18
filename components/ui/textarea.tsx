import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-300/40 dark:focus:ring-amber-300/10",
        className
      )}
      {...props}
    />
  );
}
