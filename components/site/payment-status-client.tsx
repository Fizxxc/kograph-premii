"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";

type StatusPayload = {
  orderId: string;
  status: string;
  amount: number;
  publicOrderCode?: string;
  qrUrl?: string;
  productName?: string;
  variantName?: string;
  type: string;
};

function statusTone(status: string) {
  switch (status) {
    case "settlement":
      return {
        shell: "from-emerald-200/80 via-emerald-50 to-white dark:from-emerald-950 dark:via-slate-950 dark:to-slate-950",
        badge: "bg-emerald-500 text-white",
        card: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-400/10",
        title: "Pembayaran berhasil",
        subtitle: "Status sudah tervalidasi dari Midtrans dan aman diproses."
      };
    case "expire":
    case "cancel":
    case "deny":
    case "failure":
      return {
        shell: "from-rose-200/80 via-rose-50 to-white dark:from-rose-950 dark:via-slate-950 dark:to-slate-950",
        badge: "bg-rose-500 text-white",
        card: "border-rose-200 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-400/10",
        title: "Pembayaran belum berhasil",
        subtitle: "Silakan ulangi pembayaran agar pesanan bisa diproses."
      };
    default:
      return {
        shell: "from-amber-200/80 via-amber-50 to-white dark:from-amber-950 dark:via-slate-950 dark:to-slate-950",
        badge: "bg-amber-400 text-slate-950",
        card: "border-amber-200 bg-amber-50/70 dark:border-amber-300/20 dark:bg-amber-300/10",
        title: "Menunggu pembayaran",
        subtitle: "Silakan scan QRIS di bawah ini. Status akan berubah otomatis setelah pembayaran masuk."
      };
  }
}

const LordIcon = "lord-icon" as any;

export default function PaymentStatusClient({ orderId, resi, type = "transaction" }: { orderId: string; resi?: string; type?: string }) {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (resi) params.set("resi", resi);
      if (type) params.set("type", type);
      const response = await fetch(`/api/public-order-status/${orderId}?${params.toString()}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Status pembayaran belum bisa dimuat."));
      setData(json);
      setError(null);
    } catch (error: any) {
      setError(error?.message || "Status pembayaran belum bisa dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 8000);
    return () => window.clearInterval(timer);
  }, [orderId, resi, type]);

  const tone = useMemo(() => statusTone(String(data?.status || "pending")), [data?.status]);
  const settled = String(data?.status || "pending") === "settlement";

  return (
    <>
      <Script src="https://cdn.lordicon.com/lordicon.js" strategy="afterInteractive" />
      <div className={`min-h-[calc(100vh-160px)] bg-gradient-to-br ${tone.shell} transition-colors duration-500`}>
        <div className="container py-8 md:py-12">
          <div className="mx-auto max-w-5xl space-y-6 reveal-up">
            <div className="surface-card overflow-hidden px-6 py-7 sm:px-8">
              <div className="grid gap-8 lg:grid-cols-[1fr,0.9fr] lg:items-center">
                <div className="space-y-5">
                  <div className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.28em] ${tone.badge}`}>
                    {loading ? "Memuat status" : tone.title}
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl dark:text-white">{tone.title}</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 md:text-base dark:text-slate-300">{tone.subtitle}</p>
                  </div>
                  <div className={`rounded-[28px] border p-5 ${tone.card}`}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Order ID</div>
                        <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{orderId}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Resi</div>
                        <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{data?.publicOrderCode || resi || "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Produk</div>
                        <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{data?.productName || (type === "topup" ? "Top up saldo" : "Pesanan Anda")}</div>
                        {data?.variantName ? <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{data.variantName}</div> : null}
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Total</div>
                        <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{formatRupiah(Number(data?.amount || 0))}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/cek-pesanan?resi=${encodeURIComponent(data?.publicOrderCode || resi || "")}`} className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                      Cek pesanan dengan resi
                    </Link>
                    <button onClick={load} className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/10">
                      Refresh status
                    </button>
                  </div>
                  {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">{error}</div> : null}
                </div>

                <div className={`rounded-[32px] border p-6 shadow-sm ${settled ? "border-emerald-200/80 bg-white/80 dark:border-emerald-400/20 dark:bg-emerald-400/10" : "border-amber-200/80 bg-white/80 dark:border-amber-300/20 dark:bg-amber-300/10"}`}>
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    {settled ? (
                      <>
                        <div className="success-glow float-soft rounded-full bg-emerald-100 p-4 dark:bg-emerald-400/15">
                          <LordIcon
                            src="https://cdn.lordicon.com/nocovwne.json"
                            trigger="loop"
                            colors="primary:#16a34a,secondary:#bbf7d0"
                            style={{ width: "120px", height: "120px" }}
                          />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-slate-950 dark:text-white">Pembayaran sudah masuk</div>
                          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Bukti transaksi akan dikirim otomatis setelah status sukses tervalidasi. Jadi prosesnya lebih aman dan lebih meyakinkan.</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="pending-glow float-soft rounded-full bg-amber-100 p-5 dark:bg-amber-300/15">
                          <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-300 border-t-amber-600 animate-spin dark:border-amber-300/30 dark:border-t-amber-300" />
                        </div>
                        <div>
                          <div className="text-2xl font-black text-slate-950 dark:text-white">QRIS siap dipindai</div>
                          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Begitu pembayaran berhasil, halaman ini akan otomatis berubah ke status sukses tanpa perlu buka halaman lain.</p>
                        </div>
                        {data?.qrUrl ? (
                          <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/95">
                            <img src={data.qrUrl} alt="QRIS" className="mx-auto h-64 w-64 rounded-2xl object-contain" />
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
