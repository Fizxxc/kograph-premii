"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MessageCircleMore,
  ServerCog,
  Wallet
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatDate, formatRupiah, normalizeStatus } from "@/lib/utils";
import { getMidtransSnapScriptUrl } from "@/lib/midtrans-client";
import { SITE } from "@/lib/constants";
import { RealtimeStatusBadge } from "@/components/status/realtime-status-badge";
import { toast } from "sonner";

type FulfillmentData = {
  type?: string;
  panel_url?: string | null;
  panel_email?: string | null;
  server_uuid?: string | null;
};

type WaitingPaymentClientProps = {
  transaction: {
    id: string;
    order_id: string;
    amount: number;
    discount_amount: number;
    final_amount: number;
    status: string;
    snap_token: string;
    created_at: string;
    product_name: string;
    status_token: string;
    payment_method: string;
    service_type: string;
    fulfillment_data: FulfillmentData | null;
  };
  initialAccountData: string | null;
};

export function WaitingPaymentClient({
  transaction,
  initialAccountData
}: WaitingPaymentClientProps) {
  const [status, setStatus] = useState(transaction.status);
  const [accountData, setAccountData] = useState(initialAccountData);
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(transaction.fulfillment_data);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [openingSnap, setOpeningSnap] = useState(false);
  const [showSuccess, setShowSuccess] = useState(Boolean(initialAccountData || transaction.fulfillment_data));
  const isPanel = transaction.service_type === "pterodactyl";
  const hasDeliveredData = Boolean(accountData || fulfillmentData);

  useEffect(() => {
    if (transaction.payment_method === "balance") {
      setIsScriptReady(false);
      return;
    }

    const snapUrl = getMidtransSnapScriptUrl();
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

    if (!clientKey) {
      console.error("[MIDTRANS] NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak ditemukan.");
      setIsScriptReady(false);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans="snap"]');

    if (existing) {
      const existingSrc = existing.getAttribute("src") ?? "";
      const existingClientKey = existing.getAttribute("data-client-key") ?? "";

      const isSameScript = existingSrc === snapUrl && existingClientKey === clientKey;

      if (isSameScript && typeof window !== "undefined" && window.snap) {
        setIsScriptReady(true);
        return;
      }

      existing.remove();
    }

    setIsScriptReady(false);

    const script = document.createElement("script");
    script.src = snapUrl;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans", "snap");

    script.onload = () => {
      setIsScriptReady(true);
    };

    script.onerror = () => {
      setIsScriptReady(false);
    };

    document.body.appendChild(script);
  }, [transaction.payment_method]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const txChannel = supabase
      .channel(`tx-${transaction.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${transaction.id}`
        },
        async (payload) => {
          const nextStatus = String((payload.new as { status?: string }).status ?? "pending");
          const nextFulfillment = (payload.new as { fulfillment_data?: FulfillmentData | null }).fulfillment_data ?? null;
          setStatus(nextStatus);
          setFulfillmentData(nextFulfillment);

          if (nextStatus === "settlement") {
            await fetchCredential();
            if (nextFulfillment) setShowSuccess(true);
          }
        }
      )
      .subscribe();

    const credentialChannel = supabase
      .channel(`credential-${transaction.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "app_credentials",
          filter: `transaction_id=eq.${transaction.id}`
        },
        (payload) => {
          const nextAccountData = String((payload.new as { account_data?: string }).account_data ?? "");

          if (nextAccountData) {
            setAccountData(nextAccountData);
            setShowSuccess(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(credentialChannel);
    };
  }, [transaction.id]);

  async function fetchCredential() {
    const supabase = createBrowserSupabaseClient();

    const { data } = await supabase
      .from("app_credentials")
      .select("account_data")
      .eq("transaction_id", transaction.id)
      .maybeSingle();

    if (data?.account_data) {
      setAccountData(data.account_data);
      setShowSuccess(true);
    }
  }

  async function openSnap() {
    if (transaction.payment_method === "balance") {
      toast.success("Order ini dibayar dengan saldo akun. Tidak perlu membuka Snap.");
      return;
    }

    if (typeof window === "undefined" || !window.snap || !isScriptReady) {
      toast.error("Midtrans Snap belum siap. Coba refresh halaman lalu ulangi.");
      return;
    }

    if (!transaction.snap_token) {
      toast.error("Snap token tidak tersedia.");
      return;
    }

    setOpeningSnap(true);

    try {
      window.snap.pay(transaction.snap_token, {
        onSuccess: async () => {
          await fetchCredential();
        },
        onPending: () => {
          console.log("[MIDTRANS] Payment pending");
        },
        onError: (result: unknown) => {
          console.error("[MIDTRANS] Payment error:", result);
          toast.error("Terjadi kendala saat membuka pembayaran Midtrans.");
        },
        onClose: () => {
          console.log("[MIDTRANS] Snap popup closed");
        }
      });
    } finally {
      setOpeningSnap(false);
    }
  }

  async function copyCredential() {
    if (!accountData) return;
    await navigator.clipboard.writeText(accountData);
    toast.success("Credential berhasil disalin.");
  }

  async function copyStatusToken() {
    await navigator.clipboard.writeText(transaction.status_token);
    toast.success("Token status berhasil disalin.");
  }

  async function copyPanelInfo() {
    const text = [
      `Panel URL: ${fulfillmentData?.panel_url || "-"}`,
      `Email: ${fulfillmentData?.panel_email || "-"}`,
      `Server UUID: ${fulfillmentData?.server_uuid || "-"}`
    ].join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Informasi panel berhasil disalin.");
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-6">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Waiting Payment</div>
            <h1 className="mt-2 text-3xl font-bold text-white">{transaction.product_name}</h1>
            <p className="mt-3 text-sm text-slate-300">
              {isPanel
                ? "Setelah pembayaran settle, sistem akan membuat panel Pterodactyl otomatis dan data panel akan tampil di halaman ini."
                : "Setelah webhook Midtrans mengonfirmasi settlement, halaman ini akan otomatis menampilkan credential tanpa refresh."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Order ID</div>
              <div className="mt-2 break-all text-sm font-semibold text-white">{transaction.order_id}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</div>
              <div className="mt-2">
                <RealtimeStatusBadge transactionId={transaction.id} initialStatus={status} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Base Amount</div>
              <div className="mt-2 text-sm font-semibold text-white">{formatRupiah(transaction.amount)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Final Amount</div>
              <div className="mt-2 text-sm font-semibold text-white">{formatRupiah(transaction.final_amount)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Created At</div>
              <div className="mt-2 text-sm font-semibold text-white">{formatDate(transaction.created_at)}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Token Status Bot</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="break-all text-sm font-semibold text-white">{transaction.status_token}</div>
                <Button variant="ghost" className="h-9 px-3" onClick={copyStatusToken}>Copy</Button>
              </div>
            </div>
          </div>

          {status === "settlement" && accountData && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Pembayaran berhasil</span>
              </div>

              <div className="rounded-2xl bg-slate-950/80 p-4 font-mono text-sm text-white">{accountData}</div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={copyCredential}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Credential
                </Button>
                <a href={`/api/invoice/${transaction.order_id}`} target="_blank" rel="noreferrer">
                  <Button>
                    <Download className="mr-2 h-4 w-4" />
                    Download Invoice PDF
                  </Button>
                </a>
              </div>
            </div>
          )}

          {status === "settlement" && isPanel && fulfillmentData && (
            <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-brand-200">
                <ServerCog className="h-5 w-5" />
                <span className="font-semibold">Panel berhasil dibuat</span>
              </div>
              <div className="grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Panel URL</div>
                  <div className="mt-2 break-all text-white">{fulfillmentData.panel_url || "-"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Email Login</div>
                  <div className="mt-2 break-all text-white">{fulfillmentData.panel_email || "-"}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 md:col-span-2">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Server UUID</div>
                  <div className="mt-2 break-all text-white">{fulfillmentData.server_uuid || "-"}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={copyPanelInfo}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Info Panel
                </Button>
                {fulfillmentData.panel_url && (
                  <a href={fulfillmentData.panel_url} target="_blank" rel="noreferrer">
                    <Button>Buka Panel</Button>
                  </a>
                )}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="text-lg font-semibold text-white">Status Sinkronisasi</div>

            <Badge
              className={
                status === "settlement"
                  ? "text-emerald-300"
                  : status === "expire"
                    ? "text-rose-300"
                    : "text-amber-300"
              }
            >
              {normalizeStatus(status)}
            </Badge>

            <div className="text-sm text-slate-300">
              Cek juga via Telegram bot <span className="font-semibold text-white">@{SITE.botUsername}</span> dengan command:
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-sm text-white">
              /status {transaction.status_token}
            </div>
          </Card>

          <motion.div drag dragMomentum={false} dragElastic={0.08} className="cursor-grab active:cursor-grabbing">
            <Card className="space-y-4 border-brand-500/30 bg-gradient-to-br from-brand-600/20 to-slate-950/90">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-600/20 p-3 text-brand-200">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-white">Metode Pembayaran</div>
                  <div className="text-sm text-slate-300">
                    {transaction.payment_method === "balance"
                      ? "Dibayar langsung dari saldo akun"
                      : "QRIS, GoPay, bank transfer, dan channel Midtrans lainnya"}
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={openSnap}
                disabled={transaction.payment_method === "balance" || !isScriptReady || status === "settlement" || openingSnap}
              >
                {transaction.payment_method === "balance" ? (
                  "Pembayaran lewat saldo"
                ) : openingSnap ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuka Snap...
                  </>
                ) : status === "settlement" ? (
                  "Sudah Dibayar"
                ) : (
                  "Bayar Disini"
                )}
              </Button>
            </Card>
          </motion.div>

          <Card>
            <div className="flex items-center gap-3">
              <MessageCircleMore className="h-5 w-5 text-brand-300" />
              <div className="font-semibold text-white">Bot & Support</div>
            </div>

            <div className="mt-3 text-sm text-slate-300">
              Gunakan bot cek order untuk melihat status pesanan, dan bot auto order untuk membuat order serta top up saldo langsung dari Telegram.
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm">
              <a href={`https://t.me/${SITE.botUsername}`} target="_blank" rel="noreferrer" className="font-semibold text-brand-300">
                Buka @{SITE.botUsername}
              </a>
              <a href={`https://t.me/${SITE.autoOrderBotUsername}`} target="_blank" rel="noreferrer" className="font-semibold text-fuchsia-300">
                Buka @{SITE.autoOrderBotUsername}
              </a>
            </div>
          </Card>
        </div>
      </div>

      {showSuccess && hasDeliveredData && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-slate-950 p-6 shadow-premium"
          >
            <div className="mb-4 flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="h-6 w-6" />
              <div>
                <div className="text-lg font-bold text-white">Pembayaran Berhasil</div>
                <div className="text-sm text-slate-300">
                  {isPanel ? "Panel Anda sudah dibuat dan siap diakses." : "Credential Anda sudah aktif dan siap dipakai."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white">
              {isPanel ? (
                <div className="space-y-2">
                  <div>Panel URL: {fulfillmentData?.panel_url || "-"}</div>
                  <div>Email Login: {fulfillmentData?.panel_email || "-"}</div>
                  <div>Server UUID: {fulfillmentData?.server_uuid || "-"}</div>
                </div>
              ) : (
                <div className="font-mono">{accountData}</div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <Button className="flex-1" onClick={isPanel ? copyPanelInfo : copyCredential}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button className="flex-1" variant="secondary" onClick={() => setShowSuccess(false)}>
                Tutup
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
