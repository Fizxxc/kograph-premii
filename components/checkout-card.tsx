"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Tag, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRupiah } from "@/lib/utils";

export function CheckoutCard({
  product,
  isAuthenticated
}: {
  product: { id: string; price: number; stock: number };
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [stock, setStock] = useState(product.stock);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);

  const stockLabel = useMemo(() => {
    if (stock <= 0) return "Stok habis";
    if (stock <= 5) return `Sisa ${stock} item`;
    return `Stok tersedia: ${stock}`;
  }, [stock]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`product-stock-${product.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${product.id}` },
        (payload) => {
          const nextStock = Number((payload.new as { stock?: number }).stock ?? 0);
          setStock(nextStock);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  async function handleCheckout() {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          couponCode: couponCode.trim()
        })
      });

      const json = await response.json();

      if (!response.ok) throw new Error(json.error || "Checkout gagal");
      router.push(`/waiting-payment/${json.orderId}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Checkout gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="space-y-5">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Secure Checkout</div>
          <div className="mt-2 text-3xl font-bold text-white">{formatRupiah(product.price)}</div>
          <div className={`mt-2 text-sm ${stock > 0 ? "text-emerald-300" : "text-rose-300"}`}>{stockLabel}</div>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Pembayaran aman dan otomatis
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-300" />
            Credential/Akun tampil otomatis setelah settlement
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-fuchsia-300" />
            Dukungan kupon promo aktif
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-300">Kode kupon (opsional)</label>
          <Input
            placeholder="Contoh: WELCOME10"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
        </div>

        <Button className="w-full" disabled={loading || stock <= 0} onClick={handleCheckout}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Membuat transaksi...
            </>
          ) : stock <= 0 ? "Stok Habis" : "Beli Sekarang"}
        </Button>
      </Card>
    </motion.div>
  );
}
