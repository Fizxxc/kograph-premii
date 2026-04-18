"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRupiah } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  duration_label?: string | null;
  short_description?: string | null;
};

type CheckoutCardProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    price: number;
    service_type?: string | null;
  };
  variants: Variant[];
  user: {
    email?: string | null;
    full_name?: string | null;
  } | null;
};

export default function CheckoutCard({ product, variants, user }: CheckoutCardProps) {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id || "");
  const [buyerName, setBuyerName] = useState(user?.full_name || "");
  const [buyerEmail, setBuyerEmail] = useState(user?.email || "");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = useMemo(() => variants.find((item) => item.id === selectedVariantId) || null, [selectedVariantId, variants]);
  const amount = Number(selectedVariant?.price || product.price || 0);
  const compareAt = Number(selectedVariant?.compare_at_price || 0);

  async function handleCheckout() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant?.id || null,
          buyerName,
          buyerEmail,
          buyerPhone,
          couponCode,
          note: notes,
          paymentMethod: "qris"
        })
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Checkout gagal diproses."));
      router.push(String(json.redirectUrl || `/waiting-payment/${json.orderId}`));
    } catch (error: any) {
      setError(error?.message || "Checkout gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[rgba(11,20,40,0.75)] dark:shadow-[0_30px_100px_-50px_rgba(0,0,0,0.85)]">
      <CardHeader className="space-y-4 pb-2">
        <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50/90 px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">
          Checkout cepat
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Pilih paket lalu lanjut ke pembayaran</CardTitle>
        <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
          Silakan lengkapi data pesanan, pilih paket yang sesuai, lalu lanjutkan ke pembayaran melalui QRIS dinamis dengan proses yang ringkas dan jelas.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {variants.length > 0 ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Pilih tipe paket</div>
            <div className="grid gap-3">
              {variants.map((variant) => {
                const active = variant.id === selectedVariantId;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`group rounded-[24px] border p-4 text-left transition duration-200 ${
                      active
                        ? "border-amber-300 bg-amber-50 shadow-[0_20px_50px_-32px_rgba(250,204,21,0.65)] dark:border-amber-300/40 dark:bg-amber-300/10"
                        : "border-slate-200/80 bg-white/80 hover:border-amber-300 hover:bg-amber-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:border-amber-300/30 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-slate-950 dark:text-white">{variant.name}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{variant.short_description || variant.duration_label || "Pilihan paket yang tersedia untuk kebutuhan layanan Anda."}</p>
                      </div>
                      <div className="text-right">
                        {variant.compare_at_price ? <div className="text-xs font-semibold text-slate-400 line-through dark:text-slate-500">{formatRupiah(Number(variant.compare_at_price))}</div> : null}
                        <div className="text-lg font-black text-slate-950 dark:text-white">{formatRupiah(Number(variant.price || 0))}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nama pembeli</label>
            <Input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email aktif</label>
            <Input value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} placeholder="email@anda.com" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nomor WhatsApp / Telegram</label>
            <Input value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} placeholder="Opsional" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Kode promo</label>
            <Input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Opsional" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">Catatan tambahan</label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Contoh: tolong proses ke email tertentu atau tambahkan catatan singkat lainnya." className="min-h-[110px] rounded-3xl" />
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span>Paket terpilih</span>
            <span className="font-semibold text-slate-900 dark:text-white">{selectedVariant?.name || product.name}</span>
          </div>
          {compareAt > amount ? (
            <div className="mt-2 flex items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>Harga normal</span>
              <span className="line-through">{formatRupiah(compareAt)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Bayar sekarang</div>
              <div className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{formatRupiah(amount)}</div>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">QRIS Midtrans</div>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">{error}</div> : null}

        <Button onClick={handleCheckout} disabled={loading} className="h-14 w-full rounded-full text-base font-semibold shadow-[0_18px_40px_-24px_rgba(250,204,21,0.65)]">
          {loading ? "Membuat QRIS..." : "Lanjut ke pembayaran"}
        </Button>
        <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">Pesanan akan diproses setelah sistem menerima konfirmasi pembayaran yang valid agar setiap transaksi tercatat dengan lebih rapi dan aman.</p>
      </CardContent>
    </Card>
  );
}
