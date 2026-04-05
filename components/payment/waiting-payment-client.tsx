"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, Download, Loader2, MessageCircleMore, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { formatDate, formatRupiah, normalizeStatus } from "@/lib/utils";
import { getMidtransSnapScriptUrl } from "@/lib/midtrans-client";
import { SITE } from "@/lib/constants";
import { RealtimeStatusBadge } from "@/components/status/realtime-status-badge";

export function WaitingPaymentClient({
  transaction,
  initialAccountData
}: {
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
  };
  initialAccountData: string | null;
}) {
  const [status, setStatus] = useState(transaction.status);
  const [accountData, setAccountData] = useState(initialAccountData);
  const [isScriptReady, setIsScriptReady] = useState(false);
  const [openingSnap, setOpeningSnap] = useState(false);
  const [showSuccess, setShowSuccess] = useState(Boolean(initialAccountData));

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans="snap"]');

    if (existing) {
      setIsScriptReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = getMidtransSnapScriptUrl();
    script.setAttribute("data-client-key", process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!);
    script.setAttribute("data-midtrans", "snap");
    script.onload = () => setIsScriptReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const txChannel = supabase
      .channel(`tx-${transaction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${transaction.id}` },
        async (payload) => {
          const nextStatus = String((payload.new as { status?: string }).status ?? "pending");
          setStatus(nextStatus);
          if (nextStatus === "settlement") await fetchCredential();
        }
      )
      .subscribe();

    const credentialChannel = supabase
      .channel(`credential-${transaction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_credentials", filter: `transaction_id=eq.${transaction.id}` },
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
    if (!window.snap || !isScriptReady) {
      alert("Midtrans Snap belum siap. Refresh halaman lalu coba lagi.");
      return;
    }

    setOpeningSnap(true);

    try {
      window.snap.pay(transaction.snap_token, {
        onSuccess: async () => {
          await fetchCredential();
        }
      });
    } finally {
      setOpeningSnap(false);
    }
  }

  async function copyCredential() {
    if (!accountData) return;
    await navigator.clipboard.writeText(accountData);
    alert("Credential berhasil disalin.");
  }

  async function copyStatusToken() {
    await navigator.clipboard.writeText(transaction.status_token);
    alert("Token status berhasil disalin.");
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="space-y-6">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Waiting Payment</div>
            <h1 className="mt-2 text-3xl font-bold text-white">{transaction.product_name}</h1>
            <p className="mt-3 text-sm text-slate-300">
              Setelah webhook Midtrans mengonfirmasi settlement, halaman ini akan otomatis menampilkan credential tanpa refresh.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Order ID</div>
              <div className="mt-2 break-all text-sm font-semibold text-white">{transaction.order_id}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</div>
              <div className="mt-2"><RealtimeStatusBadge transactionId={transaction.id} initialStatus={status} /></div>
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
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="text-lg font-semibold text-white">Status Sinkronisasi</div>
            <Badge className={status === "settlement" ? "text-emerald-300" : status === "expire" ? "text-rose-300" : "text-amber-300"}>
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
                <div className="rounded-2xl bg-brand-600/20 p-3 text-brand-200"><Wallet className="h-5 w-5" /></div>
                <div>
                  <div className="font-semibold text-white">Draggable Snap Launcher</div>
                  <div className="text-sm text-slate-300">Geser kartu ini sesuka Anda, lalu klik bayar.</div>
                </div>
              </div>

              <Button className="w-full" onClick={openSnap} disabled={!isScriptReady || status === "settlement" || openingSnap}>
                {openingSnap ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuka Snap...
                  </>
                ) : status === "settlement" ? "Sudah Dibayar" : "Bayar via Midtrans Snap"}
              </Button>
            </Card>
          </motion.div>

          <Card>
            <div className="flex items-center gap-3">
              <MessageCircleMore className="h-5 w-5 text-brand-300" />
              <div className="font-semibold text-white">Bot Support</div>
            </div>
            <div className="mt-3 text-sm text-slate-300">
              Bot akan menampilkan status dengan tampilan chat premium dan customer bisa cek pesanan dari Telegram.
            </div>
            <a href={`https://t.me/${SITE.botUsername}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-brand-300">
              Buka @{SITE.botUsername}
            </a>
          </Card>
        </div>
      </div>

      {showSuccess && accountData && (
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
                <div className="text-sm text-slate-300">Credential Anda sudah aktif dan siap dipakai.</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm text-white">
              {accountData}
            </div>

            <div className="mt-5 flex gap-3">
              <Button className="flex-1" onClick={copyCredential}><Copy className="mr-2 h-4 w-4" />Copy</Button>
              <Button className="flex-1" variant="secondary" onClick={() => setShowSuccess(false)}>Tutup</Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
