"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatRupiah } from "@/lib/utils";

const statusBadge: Record<string, string> = {
  settlement: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300",
  capture: "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300",
  expire: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  cancel: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
  deny: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
};

export default function OrderLookupPage() {
  const searchParams = useSearchParams();
  const [resi, setResi] = useState(searchParams.get("resi") || "");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(currentResi: string) {
    if (!currentResi) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/public-order-lookup?resi=${encodeURIComponent(currentResi)}`, { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Resi tidak ditemukan."));
      setResult(json);
      setError(null);
    } catch (error: any) {
      setResult(null);
      setError(error?.message || "Resi tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const initial = searchParams.get("resi") || "";
    if (initial) lookup(initial);
  }, [searchParams]);

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-5xl space-y-6 reveal-up">
        <div className="surface-card overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr,0.92fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">
                Cek order tanpa login
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl dark:text-white">Masukkan resi untuk lihat status order</h1>
                <p className="mt-3 max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300">
                  Buat guest maupun member, semuanya tetap bisa cek pesanan dari satu halaman yang simpel. Tidak perlu login dulu kalau cuma ingin memastikan status order sudah sampai mana.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={resi}
                  onChange={(event) => setResi(event.target.value.toUpperCase())}
                  placeholder="Contoh: RESI-AB12CD34"
                  className="h-14 flex-1 rounded-full border border-slate-200/80 bg-white/80 px-5 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-300 focus:ring-2 focus:ring-amber-200/50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-amber-300/40 dark:focus:ring-amber-300/10"
                />
                <button
                  type="button"
                  onClick={() => lookup(resi)}
                  disabled={loading}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-slate-950 px-7 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200"
                >
                  {loading ? "Mencari..." : "Cek status"}
                </button>
              </div>
              {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">{error}</div> : null}
            </div>

            <div className="rounded-[32px] border border-slate-200/80 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Langkah cepat</div>
              <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                <li>1. Ambil resi dari halaman pembayaran atau email bukti transaksi.</li>
                <li>2. Masukkan resi pada kolom di sebelah kiri.</li>
                <li>3. Sistem akan menampilkan status terbaru dari server secara langsung.</li>
              </ol>
            </div>
          </div>
        </div>

        {result ? (
          <div className="surface-card p-6 sm:p-8 reveal-up">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className={`inline-flex rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.24em] ${statusBadge[String(result.status || "pending")] || statusBadge.pending}`}>
                  {String(result.status || "pending")}
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{result.productName}</h2>
                {result.variantName ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{result.variantName}</p> : null}
              </div>
              <Link href={`/waiting-payment/${result.orderId}?resi=${encodeURIComponent(result.publicOrderCode)}&type=${encodeURIComponent(result.type)}`} className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-amber-300/30 dark:hover:bg-white/10">
                Buka detail pembayaran
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Order ID</div>
                <div className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{result.orderId}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Resi</div>
                <div className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{result.publicOrderCode}</div>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Total</div>
                <div className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{formatRupiah(Number(result.amount || 0))}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
