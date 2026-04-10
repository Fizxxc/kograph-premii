"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  MessageCircleMore,
  QrCode,
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
  panel_username?: string | null;
  panel_email?: string | null;
  panel_password?: string | null;
  server_uuid?: string | null;
  requested_username?: string | null;
  payment_qr_url?: string | null;
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

export function WaitingPaymentClient({ transaction, initialAccountData }: WaitingPaymentClientProps) {
  const [status, setStatus] = useState(transaction.status);
  const [accountData, setAccountData] = useState(initialAccountData);
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData | null>(
    transaction.fulfillment_data
  );
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [openingSnap, setOpeningSnap] = useState(false);
  const [showSuccess, setShowSuccess] = useState(Boolean(initialAccountData || transaction.fulfillment_data));

  const isPanel = transaction.service_type === "pterodactyl";
  const isQrisOnly = transaction.payment_method === "qris";
  const paymentQrUrl = useMemo(
    () => fulfillmentData?.payment_qr_url || (isQrisOnly && transaction.snap_token?.startsWith("http") ? transaction.snap_token : null),
    [fulfillmentData?.payment_qr_url, isQrisOnly, transaction.snap_token]
  );

  useEffect(() => {
    if (transaction.payment_method === "balance" || isQrisOnly) {
      setIsScriptReady(false);
      return;
    }

    const snapUrl = getMidtransSnapScriptUrl();
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
    if (!clientKey) return;

    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans="snap"]');
    if (existing && window.snap) {
      setIsScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = snapUrl;
    script.async = true;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans", "snap");
    script.onload = () => setIsScriptReady(true);
    script.onerror = () => setIsScriptReady(false);
    document.body.appendChild(script);
  }, [transaction.payment_method, isQrisOnly]);

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
          const nextFulfillment = (payload.new as { fulfillment_data?: FulfillmentData | null })
            .fulfillment_data;

          setStatus(nextStatus);
          setFulfillmentData(nextFulfillment ?? null);

          if (nextStatus === "settlement") {
            await fetchCredential();
            setShowSuccess(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
    };
  }, [transaction.id]);

  async function fetchCredential() {
    const supabase = createBrowserSupabaseClient();
    const { data } = await supabase
      .from("app_credentials")
      .select("account_data")
      .eq("transaction_id", transaction.id)
      .maybeSingle();

    if (data?.account_data) setAccountData(data.account_data);
  }

  async function openSnap() {
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
          setShowSuccess(true);
        },
        onPending: () => {
          toast.message("Pembayaran Anda masih menunggu konfirmasi.");
        },
        onError: () => {
          toast.error("Terjadi kendala saat membuka pembayaran Midtrans.");
        },
        onClose: () => {
          toast.message("Popup pembayaran ditutup.");
        }
      });
    } finally {
      setOpeningSnap(false);
    }
  }

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} berhasil disalin.`);
  }

  const panelInfoText = fulfillmentData
    ? [
        `Panel URL: ${fulfillmentData.panel_url || "-"}`,
        `Username: ${fulfillmentData.panel_username || "-"}`,
        `Email: ${fulfillmentData.panel_email || "-"}`,
        `Password: ${fulfillmentData.panel_password || "-"}`,
        `Server UUID: ${fulfillmentData.server_uuid || "-"}`
      ].join("\n")
    : "";

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-6">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Waiting Payment</div>
            <h1 className="mt-2 text-3xl font-bold text-white">{transaction.product_name}</h1>
            <p className="mt-3 text-sm text-slate-300">
              {isPanel
                ? "Setelah pembayaran terverifikasi, panel akan dibuat otomatis dan detail login akan muncul di halaman ini tanpa perlu refresh manual."
                : "Setelah webhook Midtrans mengonfirmasi settlement, halaman ini akan otomatis menampilkan credential tanpa refresh."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBox label="Order ID" value={transaction.order_id} />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</div>
              <div className="mt-2">
                <RealtimeStatusBadge transactionId={transaction.id} initialStatus={status} />
              </div>
            </div>
            <InfoBox label="Base Amount" value={formatRupiah(transaction.amount)} />
            <InfoBox label="Final Amount" value={formatRupiah(transaction.final_amount)} />
            <InfoBox label="Created At" value={formatDate(transaction.created_at)} />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Token Status Bot</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="break-all text-sm font-semibold text-white">{transaction.status_token}</div>
                <Button variant="ghost" className="h-9 px-3" onClick={() => copyText(transaction.status_token, "Token status") }>
                  Copy
                </Button>
              </div>
            </div>
          </div>

          {isQrisOnly && paymentQrUrl && status !== "settlement" && (
            <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-brand-200">
                <QrCode className="h-5 w-5" />
                <span className="font-semibold">QRIS dinamis siap dibayar</span>
              </div>
              <div className="rounded-3xl bg-white p-4">
                <img src={paymentQrUrl} alt="QRIS Dinamis" className="mx-auto aspect-square w-full max-w-sm object-contain" />
              </div>
              <div className="mt-4 text-sm text-slate-300">
                Scan QRIS ini dari e-wallet atau mobile banking. Setelah settlement masuk dari Midtrans, status order akan berubah otomatis.
              </div>
            </div>
          )}

          {!isPanel && status === "settlement" && accountData && (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Pembayaran berhasil</span>
              </div>

              <div className="rounded-2xl bg-slate-950/80 p-4 font-mono text-sm text-white">{accountData}</div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => copyText(accountData, "Credential") }>
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

          {isPanel && status === "settlement" && fulfillmentData && (
            <div className="rounded-3xl border border-brand-500/30 bg-brand-500/10 p-5">
              <div className="mb-3 flex items-center gap-2 text-brand-200">
                <ServerCog className="h-5 w-5" />
                <span className="font-semibold">Panel berhasil dibuat otomatis</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoBox label="Panel URL" value={fulfillmentData.panel_url || "-"} />
                <InfoBox label="Username Login" value={fulfillmentData.panel_username || "-"} />
                <InfoBox label="Email Login" value={fulfillmentData.panel_email || "-"} />
                <InfoBox label="Password Login" value={fulfillmentData.panel_password || "-"} />
                <InfoBox label="Server UUID" value={fulfillmentData.server_uuid || "-"} />
                <InfoBox label="Username yang diminta" value={fulfillmentData.requested_username || "-"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => copyText(panelInfoText, "Info panel") }>
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
              Cek juga via Telegram bot <span className="font-semibold text-white">@{SITE.botUsername}</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 font-mono text-sm text-white">
              /status {transaction.status_token}
            </div>
          </Card>

          <Card className="space-y-4 border-brand-500/30 bg-gradient-to-br from-brand-600/20 to-slate-950/90">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand-600/20 p-3 text-brand-200">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-white">Metode Pembayaran</div>
                <div className="text-sm text-slate-300">
                  {transaction.payment_method === "balance"
                    ? "Order ini diproses dari saldo yang tersimpan di web"
                    : transaction.payment_method === "qris"
                      ? "QRIS dinamis | realtime notification"
                      : "QRIS, e-wallet, virtual account | automatic payment"}
                </div>
              </div>
            </div>

            {!isQrisOnly && transaction.payment_method !== "balance" && (
              <Button
                className="w-full"
                onClick={openSnap}
                disabled={!isScriptReady || status === "settlement" || openingSnap}
              >
                {openingSnap ? (
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
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-3">
              <MessageCircleMore className="h-5 w-5 text-brand-300" />
              <div className="font-semibold text-white">Bot & Support</div>
            </div>

            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div>Cek order di @{SITE.botUsername}</div>
              <div>Auto order di @{SITE.autoOrderBotUsername}</div>
              <div>Hubungi admin di @{SITE.support.telegram}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
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

      {showSuccess && (accountData || fulfillmentData) && (
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
                  {isPanel ? "Detail login panel Anda sudah siap." : "Credential Anda sudah aktif dan siap dipakai."}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm whitespace-pre-wrap text-white">
              {isPanel ? panelInfoText : accountData}
            </div>

            <div className="mt-5 flex gap-3">
              <Button className="flex-1" onClick={() => copyText(isPanel ? panelInfoText : accountData || "", isPanel ? "Info panel" : "Credential") }>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 break-all text-sm font-semibold text-white">{value}</div>
    </div>
  );
}
