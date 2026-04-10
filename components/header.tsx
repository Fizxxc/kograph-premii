import Link from "next/link";
import {
  Bot,
  Gem,
  LayoutDashboard,
  ServerCog,
  ShoppingBag,
  UserRound,
  Wallet
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { formatRupiah } from "@/lib/utils";

export async function Header() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let profile: { role?: string; full_name?: string; balance?: number | null } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role, full_name, balance").eq("id", user.id).single();
    profile = (data as { role?: string; full_name?: string; balance?: number | null } | null) ?? null;
  }

  const desktopLinks = [
    { href: "/", label: "Home" },
    { href: "/panel", label: "Panel" },
    { href: "/orders", label: "Orders" },
    ...(user ? [{ href: "/profile", label: "Profile" }] : []),
    { href: `https://t.me/${SITE.botUsername}`, label: "Bot Cek", external: true },
    { href: `https://t.me/${SITE.autoOrderBotUsername}`, label: "Bot Auto", external: true },
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  const mobileLinks = [
    { href: "/", label: "Home", icon: ShoppingBag },
    { href: "/panel", label: "Panel", icon: ServerCog },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    ...(user ? [{ href: "/profile", label: "Profile", icon: UserRound }] : []),
    { href: `https://t.me/${SITE.botUsername}`, label: "Bot Cek", icon: Bot, external: true },
    { href: `https://t.me/${SITE.autoOrderBotUsername}`, label: "Bot Auto", icon: Bot, external: true },
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }] : [])
  ];

  return (
    <header className="z-50 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl md:sticky md:top-0">
      <div className="container-shell py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="min-w-0 flex-1 md:flex-none">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-600/20 p-2 text-brand-300">
                <Gem className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-bold tracking-wide text-white md:text-2xl">{SITE.name}</div>
                <div className="truncate text-xs text-slate-400 md:text-sm">Premium account, panel bot WA, dan saldo deposit</div>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {desktopLinks.map((item) =>
              item.external ? (
                <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} href={item.href} className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-white/5">
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                  Saldo {formatRupiah(Number(profile?.balance || 0))}
                </div>
                <LogoutButton />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 space-y-3 md:hidden">
          {user && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Saldo User</div>
                <div className="mt-1 font-semibold text-white">{formatRupiah(Number(profile?.balance || 0))}</div>
              </div>
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
          )}

          <div className="hide-scrollbar -mx-1 overflow-x-auto pb-1">
            <div className="grid min-w-[720px] grid-cols-6 gap-2 px-1">
              {mobileLinks.map((item) => {
                const Icon = item.icon;
                const commonClassName =
                  "flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center text-[12px] text-slate-100 transition hover:bg-white/10";

                return item.external ? (
                  <a key={item.label} href={item.href} target="_blank" rel="noreferrer" className={commonClassName}>
                    <Icon className="h-4 w-4" />
                    <span className="leading-tight">{item.label}</span>
                  </a>
                ) : (
                  <Link key={item.label} href={item.href} className={commonClassName}>
                    <Icon className="h-4 w-4" />
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {user ? (
            <LogoutButton />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <Link href="/login" className="flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                Login
              </Link>
              <Link href="/register" className="col-span-2 flex min-h-[46px] items-center justify-center rounded-2xl bg-brand-500 px-4 py-3 text-sm font-medium text-white">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
