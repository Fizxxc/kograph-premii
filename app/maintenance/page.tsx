import { ArrowUpRight, Mail, MessageCircleWarning, RefreshCcw, ShieldAlert } from "lucide-react";
import { MaintenanceRedirect } from "@/components/maintenance-redirect";

export const metadata = {
  title: "Maintenance | Kograph Premium"
};

export default function MaintenancePage() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-12 shadow-premium md:px-10 md:py-16">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-4xl flex-col gap-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-sm text-amber-100">
          <ShieldAlert className="h-4 w-4" />
          Maintenance mode aktif
        </div>

        <div className="space-y-4">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Kograph Premium</div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">
            Website lama sedang dialihkan ke <span className="gradient-text">website terbaru</span>
          </h1>
          <p className="max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Saat ini mode maintenance diaktifkan agar pengunjung tidak masuk ke versi lama. Semua akses akan diarahkan otomatis ke versi terbaru website untuk pengalaman yang lebih stabil dan lebih rapi.
          </p>
        </div>

        <MaintenanceRedirect />

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <RefreshCcw className="h-4 w-4 text-brand-300" />
              Kenapa diarahkan?
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Karena website utama sudah dipindahkan ke link terbaru agar traffic, update, dan akses pengguna tetap terpusat di satu versi yang aktif.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <ArrowUpRight className="h-4 w-4 text-emerald-300" />
              Link terbaru
            </div>
            <a
              href="https://kographpremiapp.vercel.app"
              className="mt-3 block break-all text-sm leading-7 text-white hover:text-brand-200"
            >
              https://kographpremiapp.vercel.app
            </a>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <MessageCircleWarning className="h-4 w-4 text-amber-300" />
              Butuh report?
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Jika redirect tidak berjalan, halaman bermasalah, atau ada kendala lain, silakan langsung hubungi kontak report di bawah.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <a
            href="https://wa.me/6288991114939"
            target="_blank"
            rel="noreferrer"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="text-sm text-slate-400">Report via WhatsApp</div>
            <div className="mt-2 text-xl font-bold text-white">6288991114939</div>
            <div className="mt-2 text-sm text-slate-400">Gunakan nomor ini untuk laporan cepat atau kendala redirect.</div>
          </a>

          <a
            href="mailto:kographh@gmail.com"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:bg-white/10"
          >
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Mail className="h-4 w-4 text-fuchsia-300" />
              Report via Email
            </div>
            <div className="mt-2 text-xl font-bold text-white">kographh@gmail.com</div>
            <div className="mt-2 text-sm text-slate-400">Bisa dipakai untuk laporan detail, screenshot error, atau permintaan bantuan lainnya.</div>
          </a>
        </section>
      </div>
    </div>
  );
}
