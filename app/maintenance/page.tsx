import { AlertTriangle, Clock3, Sparkles, Wrench } from "lucide-react";
import { MaintenanceCountdown } from "@/components/maintenance-countdown";

export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <div className="grid-bg relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/40 p-6 shadow-premium md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(236,72,153,0.10),transparent_22%)]" />

      <div className="relative mx-auto flex min-h-[72vh] max-w-5xl flex-col justify-center gap-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-2 text-sm text-brand-100">
          <Wrench className="h-4 w-4" />
          Maintenance Mode Aktif
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.24em] text-slate-400">
              <Sparkles className="h-4 w-4 text-brand-300" />
              Sementara Ditutup
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
              Website sedang dalam proses pemeliharaan.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Kami sedang melakukan penyesuaian sistem agar layanan kembali berjalan lebih stabil dan lebih rapi. Semua tampilan utama tetap dipertahankan, dan website diperkirakan kembali dibuka pada <span className="font-semibold text-white">22 April 2026, pukul 22.00 WIB</span>.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-300" />Estimasi buka kembali</div>
                <div className="mt-1 font-semibold text-white">Rabu, 22 April 2026 • 22:00 WIB</div>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100 backdrop-blur-xl">
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Mohon cek kembali beberapa saat lagi</div>
              </div>
            </div>
          </div>

          <div className="premium-card p-5 md:p-6">
            <div className="mb-4 text-sm uppercase tracking-[0.22em] text-slate-400">Countdown</div>
            <MaintenanceCountdown />
          </div>
        </div>
      </div>
    </div>
  );
}
