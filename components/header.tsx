import Link from "next/link";
import { Gem, LayoutDashboard, ShoppingBag, MessageCircleMore } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SITE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";

export async function Header() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { role?: string; full_name?: string } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/35 backdrop-blur-2xl">
      <div className="container-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-600/20 p-2 text-brand-300">
            <Gem className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold tracking-wide text-white">{SITE.name}</div>
            <div className="text-xs text-slate-400">Kograph premium account marketplace</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link href="/" className="rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/5">Home</Link>
          <Link href="/orders" className="rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/5">Orders</Link>
          <a
            href={`https://t.me/${SITE.botUsername}`}
            target="_blank"
            className="rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/5"
            rel="noreferrer"
          >
            Bot Status
          </a>
          {profile?.role === "admin" && (
            <Link href="/admin" className="rounded-full px-4 py-2 text-sm text-slate-200 hover:bg-white/5">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden text-right md:block">
                <div className="text-sm font-semibold text-white">{profile?.full_name || user.email}</div>
                <div className="text-xs text-slate-400">{profile?.role || "customer"}</div>
              </div>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login"><Button variant="ghost">Login</Button></Link>
              <Link href="/register"><Button>Register</Button></Link>
            </>
          )}
        </div>
      </div>

      <div className="container-shell pb-3 md:hidden">
        <div className="glass flex items-center justify-between rounded-2xl px-3 py-2 text-sm text-slate-200">
          <Link href="/" className="flex items-center gap-1"><ShoppingBag className="h-4 w-4" />Home</Link>
          <Link href="/orders" className="flex items-center gap-1"><ShoppingBag className="h-4 w-4" />Orders</Link>
          <a href={`https://t.me/${SITE.botUsername}`} className="flex items-center gap-1"><MessageCircleMore className="h-4 w-4" />Bot</a>
          {profile?.role === "admin" && (
            <Link href="/admin" className="flex items-center gap-1"><LayoutDashboard className="h-4 w-4" />Admin</Link>
          )}
        </div>
      </div>
    </header>
  );
}
