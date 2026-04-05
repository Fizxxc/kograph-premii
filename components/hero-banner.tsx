import { ArrowRight, MessageCircleMore, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { SITE } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-hero-premium p-8 shadow-premium md:p-12">
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-200">
            Bot Telegram Support • Realtime Payment • 24/7 Support
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
            <span className="gradient-text">Kograph Premium</span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
            Kograph Premium adalah marketplace digital premium untuk kebutuhan akun aplikasi, tools produktivitas, hiburan, dan layanan digital lainnya dengan proses pembelian cepat, pembayaran aman, serta pengiriman credential yang realtime.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="#catalog"><Button>Mulai Belanja <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <a href={`https://t.me/${SITE.botUsername}`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><MessageCircleMore className="mr-2 h-4 w-4" />Cek Status via Bot</Button>
            </a>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="glass rounded-3xl p-4">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div className="mt-2 font-semibold text-white">Secure</div>
              <div className="mt-1 text-sm text-slate-300">Transaksi aman, pengiriman cepat, support responsif.</div>
            </div>
            <div className="glass rounded-3xl p-4">
              <Zap className="h-5 w-5 text-brand-300" />
              <div className="mt-2 font-semibold text-white">Realtime</div>
              <div className="mt-1 text-sm text-slate-300">Payment Realtime & Pengiriman instan</div>
            </div>
            <div className="glass rounded-3xl p-4">
              <MessageCircleMore className="h-5 w-5 text-fuchsia-300" />
              <div className="mt-2 font-semibold text-white">Support & Status</div>
              <div className="mt-1 text-sm text-slate-300">
                Cek status pesanan lewat Telegram bot dan hubungi support dengan lebih mudah.
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 self-end">
          <div className="glass rounded-[30px] p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Kograph Support</div>
            <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
              <div className="text-lg font-semibold text-white">Fast Support Line</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>WA: {SITE.support.whatsapp}</div>
                <div>Email: {SITE.support.email}</div>
                <div>Telegram: {SITE.support.telegram}</div>
                <div>Bot Username: {SITE.botUsername}</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-[30px] p-5">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
              Pengalaman Belanja
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              <div>• Pembayaran cepat dan aman melalui Midtrans Snap</div>
              <div>• Data akun dikirim otomatis setelah pembayaran berhasil</div>
              <div>• Invoice transaksi bisa langsung diunduh kapan saja</div>
              <div>• Status pesanan dapat dicek dengan mudah lewat bot Telegram</div>
            </div>
          </div>
        </div>
      </div>
    </section >
  );
}
