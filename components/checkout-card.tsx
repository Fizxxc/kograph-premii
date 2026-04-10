"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  ExternalLink,
  Loader2,
  ServerCog,
  ShieldCheck,
  Tag,
  UserRound,
  Wallet
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SITE } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils";

type CheckoutProduct = {
  id: string;
  price: number;
  stock: number;
  service_type?: string | null;
  sold_count?: number | null;
};

export function CheckoutCard({
  product,
  isAuthenticated,
  userBalance = 0
}: {
  product: CheckoutProduct;
  isAuthenticated: boolean;
  userBalance?: number;
}) {
  const router = useRouter();
  const isPanel = (product.service_type || "credential") === "pterodactyl";

  const [stock, setStock] = useState(product.stock);
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"midtrans" | "balance">("midtrans");
  const [panelUsername, setPanelUsername] = useState("");

  const stockLabel = useMemo(() => {
    if (isPanel) return "Auto Ready • dibuat otomatis setelah pembayaran berhasil";
    if (stock <= 0) return "Stok habis";
    if (stock <= 5) return `Sisa ${stock} item`;
    return `Stok tersedia: ${stock}`;
  }, [isPanel, stock]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`product-stock-${product.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `id=eq.${product.id}`
        },
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

    if (isPanel && !panelUsername.trim()) {
      toast.error("Untuk pembelian panel, masukkan username panel yang ingin dipakai.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          couponCode: couponCode.trim(),
          paymentMethod,
          panelUsername: panelUsername.trim()
        })
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Checkout gagal");

      if (json.redirectTo) {
        router.push(json.redirectTo);
        return;
      }

      if (json.redirectUrl?.startsWith("/")) {
        router.push(json.redirectUrl);
        return;
      }

      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }

      router.push(`/waiting-payment/${json.orderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout gagal");
    } finally {
      setLoading(false);
    }
  }

  const buttonDisabled =
    loading ||
    (!isPanel && stock <= 0) ||
    (paymentMethod === "balance" && userBalance < product.price);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="space-y-5">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Secure Checkout</div>
          <div className="mt-2 text-3xl font-bold text-white">{formatRupiah(product.price)}</div>
          <div className={`mt-2 text-sm ${isPanel || stock > 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {stockLabel}
          </div>
          <div className="mt-2 text-xs text-slate-400">Sudah terjual {product.sold_count || 0} kali</div>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Pembayaran aman dan otomatis
          </div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-fuchsia-300" />
            Dukungan kupon promo aktif
          </div>
          {isPanel ? (
            <div className="flex items-center gap-2">
              <ServerCog className="h-4 w-4 text-brand-300" />
              Panel Pterodactyl dibuat otomatis, tidak mengambil stok akun manual seperti produk premium biasa
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-300" />
              Akun atau credential tampil otomatis setelah settlement
            </div>
          )}
        </div>

        {isPanel && (
          <div className="space-y-2 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4">
            <label className="text-sm font-medium text-white">Username panel</label>
            <Input
              placeholder="Contoh: kographpanel1"
              value={panelUsername}
              onChange={(e) => setPanelUsername(e.target.value)}
            />
            <div className="flex items-start gap-2 text-xs leading-6 text-slate-300">
              <UserRound className="mt-0.5 h-4 w-4 text-brand-300" />
              Cukup isi username. Sistem akan membuat username login, email login, dan password panel secara otomatis saat pembayaran berhasil.
            </div>
          </div>
        )}

        <a
          href={`https://t.me/${SITE.autoOrderBotUsername}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
        >
          <span>Atau buat order lewat bot auto order @{SITE.autoOrderBotUsername}</span>
          <ExternalLink className="h-4 w-4" />
        </a>

        <div className="space-y-2">
          <label className="text-sm text-slate-300">Kode kupon (opsional)</label>
          <Input
            placeholder="Contoh: WELCOME10"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-300">Pilih pembayaran</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod("midtrans")}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                paymentMethod === "midtrans"
                  ? "border-brand-400 bg-brand-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              <div className="font-semibold">Midtrans</div>
              <div className="mt-1 text-xs text-slate-400">QRIS, e-wallet, virtual account</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("balance")}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                paymentMethod === "balance"
                  ? "border-emerald-400 bg-emerald-500/10 text-white"
                  : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Wallet className="h-4 w-4" />
                Saldo
              </div>
              <div className="mt-1 text-xs text-slate-400">Saldo tersedia {formatRupiah(userBalance)}</div>
            </button>
          </div>
        </div>

        <Button className="w-full" disabled={buttonDisabled} onClick={handleCheckout}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : paymentMethod === "balance" ? (
            "Bayar dengan Saldo"
          ) : isPanel ? (
            "Buat Panel Sekarang"
          ) : stock <= 0 ? (
            "Stok Habis"
          ) : (
            "Beli Sekarang"
          )}
        </Button>
      </Card>
    </motion.div>
  );
}
