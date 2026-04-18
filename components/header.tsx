import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { HeaderNav } from "@/components/header-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function Header() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.id) {
    const { data: adminRow } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    isAdmin = adminRow?.role === "admin";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[rgba(251,248,241,0.78)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(7,17,31,0.78)]">
      <div className="container flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm dark:border-white/10 dark:bg-white/5">
            <img src="/logo.png" alt="Kograph Premium" className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white">Kograph Premium</div>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Tempat order digital yang rapi, jelas, dan nyaman dipakai.</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <ThemeToggle compact />
          </div>
          <HeaderNav user={user ? { id: user.id, email: user.email } : null} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
