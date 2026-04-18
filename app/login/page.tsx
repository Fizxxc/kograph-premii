"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.refresh();
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-10 md:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <section className="surface-card hidden min-h-[560px] overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5">
              <img src="/logo.png" alt="Kograph Premium" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Akses akun</div>
              <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white">Masuk ke akunmu dan lanjutkan order tanpa ribet.</h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">Semua dibuat lebih rapi supaya kamu bisa langsung fokus ke produk, pembayaran, dan status pesanan.</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">Lebih nyaman dipakai</div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Tampilan login dibuat lebih bersih, tidak ramai, dan tetap enak dibuka di desktop maupun mobile.</p>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-8">
          <div className="mx-auto max-w-xl space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5">
                  <img src="/logo.png" alt="Kograph Premium" className="h-9 w-9 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Akses akun</div>
                  <div className="text-lg font-black text-slate-950 dark:text-white">Login</div>
                </div>
              </div>

              <div className="hidden lg:block">
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">Selamat datang kembali</div>
                <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Masuk untuk melanjutkan pesananmu.</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Gunakan email dan password yang sudah terdaftar.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                <Input type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <Input type="password" placeholder="Masukkan password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <Button className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200" onClick={submit} disabled={loading}>
              {loading ? "Masuk..." : "Masuk ke akun"}
            </Button>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-slate-950 underline underline-offset-4 dark:text-amber-300">
                Buat akun sekarang
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
