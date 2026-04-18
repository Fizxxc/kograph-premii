"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    } finally {
      setReady(true);
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("kp-theme", next);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ubah tema"
      className={compact
        ? "inline-flex h-11 items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-white/10"
        : "inline-flex h-11 items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-amber-400/40 dark:hover:bg-white/10"
      }
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs text-white dark:bg-amber-300 dark:text-slate-950">
        {ready && theme === "dark" ? "☾" : "☀"}
      </span>
      <span>{ready && theme === "dark" ? "Dark mode" : "Light mode"}</span>
    </button>
  );
}
