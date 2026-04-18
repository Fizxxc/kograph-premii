"use client";

import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const publicLinks = [
  { href: "/", label: "Beranda" },
  { href: "/products", label: "Produk" },
  { href: "/cek-pesanan", label: "Cek Pesanan" },
  { href: "/profile", label: "Top Up" }
];

type HeaderNavProps = {
  user: { id?: string; email?: string | null } | null;
  isAdmin: boolean;
};

export function HeaderNav({ user, isAdmin }: HeaderNavProps) {
  const [open, setOpen] = useState(false);

  const accountLinks = user
    ? [
        { href: "/profile", label: "Akun Saya" },
        { href: "/orders", label: "Pesanan Saya" },
        ...(isAdmin ? [{ href: "/admin", label: "Dashboard Admin" }] : [])
      ]
    : [
        { href: "/login", label: "Masuk" },
        { href: "/register", label: "Daftar" }
      ];

  return (
    <>
      <div className="hidden items-center gap-1 md:flex">
        {publicLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="hidden items-center gap-3 md:flex">
        {user ? (
          <Link
            href="/profile"
            className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-amber-400/30 dark:hover:bg-white/10"
          >
            {user.email || "Akun saya"}
          </Link>
        ) : (
          <>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white">
              Masuk
            </Link>
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200"
            >
              Mulai order
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-900 shadow-sm md:hidden dark:border-white/10 dark:bg-white/5 dark:text-white"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle navigation"
      >
        <span className="space-y-1.5">
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
          <span className="block h-0.5 w-5 rounded-full bg-current" />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/45 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute right-4 top-4 w-[min(90vw,360px)] overflow-hidden rounded-[30px] border border-slate-200/80 bg-[rgba(251,248,241,0.96)] p-5 shadow-2xl dark:border-white/10 dark:bg-[rgba(10,22,39,0.98)]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">Navigasi</div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Semua menu penting disatukan di sini supaya mobile tetap ringkas.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                Tutup
              </button>
            </div>

            <div className="mb-4">
              <ThemeToggle />
            </div>

            <div className="space-y-2">
              {[...publicLinks, ...accountLinks].map((link) => (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/75 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-amber-400/30 dark:hover:bg-white/10"
                >
                  <span>{link.label}</span>
                  <span aria-hidden>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
