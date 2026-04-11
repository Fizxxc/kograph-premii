import Link from "next/link";
import { Bot, Gem, LayoutDashboard, MessageCircleMore, ServerCog, ShoppingBag, UserRound, Wallet } from "lucide-react";
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
    { href: "/", label: "Produk" },
    { href: "/panel", label: "Panel Bot" },
    { href: "/services", label: "Jasa Edit" },
    { href: "/orders", label: "Pesanan" },
    ...(user ? [{ href: "/chat", label: "Live Chat" }] : []),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : [])
  ];

  const mobileLinks = [
    { href: "/", label: "Produk", icon: ShoppingBag },
    { href: "/panel", label: "Panel", icon: ServerCog },
    { href: "/services", label: "Jasa", icon: MessageCircleMore },
    { href: "/orders", label: "Order", icon: ShoppingBag },
    ...(user ? [{ href: "/chat", label: "Chat", icon: MessageCircleMore }] : []),
    ...(user ? [{ href: "/profile", label: "Akun", icon: UserRound }] : []),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin", icon: LayoutDashboard }] : [])
  ];

  return (
    <header className="z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl md:sticky md:top-0">
      <div className="container-shell py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="min-w-0 flex-1 md:flex-none">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-600/15 p-2.5 text-brand-300">
                <Gem className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-2xl font-black tracking-tight text-white">{SITE.name}</div>
                <div className="truncate text-sm text-slate-400">Belanja akun premium, panel bot, dan jasa edit dengan alur yang lebih jelas dan manusiawi.</div>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {desktopLinks.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-2xl px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">
                {item.label}
              </Link>
            ))}
            <a href={`https://t.me/${SITE.autoOrderBotUsername}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-100 transition hover:bg-brand-500/20">Bot Auto Order</a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right">
                  <div className="text-xs text-slate-400">Saldo akun</div>
                  <div className="text-sm font-semibold text-white">{formatRupiah(Number(profile?.balance || 0))}</div>
                </div>
                <Link href="/profile" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">{profile?.full_name || "Akun saya"}</Link>
                <LogoutButton />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-300">Masuk</Link>
                <Link href="/register" className="rounded-2xl bg-brand-500 px-4 py-2 text-sm font-medium text-white">Daftar</Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 lg:hidden">
          {mobileLinks.map((item: any) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center text-xs text-slate-300">
                <Icon className="mb-2 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {!user && (
            <>
              <Link href="/login" className="col-span-2 flex min-h-[46px] items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300">Masuk</Link>
              <Link href="/register" className="col-span-2 flex min-h-[46px] items-center justify-center rounded-2xl bg-brand-500 px-4 py-3 text-sm font-medium text-white">Daftar</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
