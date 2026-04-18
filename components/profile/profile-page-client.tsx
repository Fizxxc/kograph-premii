"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function ProfilePageClient({
  profile,
  userEmail,
  reports,
  mutations
}: {
  profile: any;
  userEmail: string;
  reports: any[];
  mutations: any[];
}) {
  const [saving, setSaving] = useState(false);

  async function saveProfile(formData: FormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", body: formData });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Gagal simpan");
      toast.success("Profil berhasil diperbarui.");
      location.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal simpan");
    } finally {
      setSaving(false);
    }
  }

  async function topup(amount: number) {
    const res = await fetch("/api/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    const j = await res.json();
    if (!res.ok) return toast.error(j.error || "Top up gagal");
    location.href = j.redirectUrl;
  }

  async function sendReport(title: string, description: string) {
    const res = await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(j.error || "Gagal kirim report");
    toast.success("Report berhasil dikirim.");
    location.reload();
  }

  async function changePassword(password: string) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error(error.message);
    toast.success("Password berhasil diperbarui.");
  }

  return (
    <div className="space-y-8 reveal-up">
      <div>
        <div className="text-sm uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Akun saya</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Profil, keamanan, dan saldo</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">Semua pengaturan utama dikumpulkan di satu halaman supaya lebih mudah diurus tanpa bikin tampilan terasa sesak.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <img src={profile.avatar_url || "/logo.png"} alt={profile.full_name || "Profile"} className="h-20 w-20 rounded-3xl border border-slate-200/80 object-cover dark:border-white/10" />
            <div>
              <div className="text-xl font-black text-slate-950 dark:text-white">{profile.full_name || userEmail}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Email tidak bisa diubah dari sini untuk menjaga keamanan akun.</div>
            </div>
          </div>

          <form onSubmit={async (e) => { e.preventDefault(); await saveProfile(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nama lengkap</label>
                <Input name="full_name" defaultValue={profile.full_name || ""} required />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email</label>
                <Input value={userEmail} disabled />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nomor telepon</label>
                <Input name="phone_number" defaultValue={profile.phone_number || ""} placeholder="08xxxxxxxxxx" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">ID Telegram</label>
                <Input name="telegram_id" defaultValue={profile.telegram_id || ""} placeholder="Masukkan ID Telegram" />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">URL foto profil</label>
              <Input name="avatar_url" defaultValue={profile.avatar_url || ""} placeholder="https://..." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Upload foto profil</label>
              <Input name="avatar" type="file" accept="image/*" />
            </div>
            <Button className="w-full rounded-full" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan profil"}</Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6 sm:p-7">
            <div className="text-sm text-slate-500 dark:text-slate-400">Saldo tersedia</div>
            <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Rp {Intl.NumberFormat("id-ID").format(Number(profile.balance || 0))}</div>
            <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Saldo tersimpan per akun agar tidak tertukar antar user.</div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Input id="topup-amount" type="number" min="10000" placeholder="Nominal top up" />
              <Button className="rounded-full px-6" onClick={() => topup(Number((document.getElementById("topup-amount") as HTMLInputElement)?.value || 0))}>Top up</Button>
            </div>
          </Card>

          <Card className="p-6 sm:p-7">
            <div className="text-lg font-black text-slate-950 dark:text-white">Ganti password</div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Gunakan password baru yang lebih kuat untuk menjaga akun tetap aman.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input id="new-password" type="password" placeholder="Password baru" />
              <Button className="rounded-full px-6" onClick={() => changePassword((document.getElementById("new-password") as HTMLInputElement)?.value || "")}>Simpan</Button>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6 sm:p-7">
          <div className="text-lg font-black text-slate-950 dark:text-white">Laporkan masalah saldo</div>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Kalau ada saldo yang terasa tidak sesuai, kirim laporan dari sini supaya admin bisa cek lebih cepat.</p>
          <div className="mt-4 space-y-4">
            <Input id="report-title" placeholder="Judul laporan" />
            <Textarea id="report-description" placeholder="Jelaskan kronologi, saldo sebelum/sesudah, dan waktu kejadian" rows={6} />
            <Button className="w-full rounded-full" onClick={() => sendReport((document.getElementById("report-title") as HTMLInputElement)?.value || "", (document.getElementById("report-description") as HTMLTextAreaElement)?.value || "")}>Kirim laporan</Button>
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <div className="text-lg font-black text-slate-950 dark:text-white">Mutasi saldo</div>
          <div className="mt-4 space-y-3">
            {mutations.length ? mutations.map((item: any) => (
              <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-4">
                  <div className="font-semibold text-slate-950 dark:text-white">{item.description}</div>
                  <div className={Number(item.amount) >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}>
                    Rp {Intl.NumberFormat("id-ID").format(Number(item.amount || 0))}
                  </div>
                </div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{item.type}</div>
              </div>
            )) : <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Belum ada mutasi saldo.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-6 sm:p-7">
        <div className="text-lg font-black text-slate-950 dark:text-white">Riwayat laporan</div>
        <div className="mt-4 space-y-3">
          {reports.length ? reports.map((item: any) => (
            <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-between gap-4">
                <div className="font-semibold text-slate-950 dark:text-white">{item.title}</div>
                <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">{item.status}</div>
              </div>
              <div className="mt-2 leading-7 text-slate-600 dark:text-slate-300">{item.description}</div>
              {item.admin_note && <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">Catatan admin: {item.admin_note}</div>}
            </div>
          )) : <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">Belum ada laporan yang dikirim.</div>}
        </div>
      </Card>
    </div>
  );
}
