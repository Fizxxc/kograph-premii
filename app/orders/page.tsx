import Link from "next/link";
import { Download, ExternalLink, ServerCog, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RealtimeStatusBadge } from "@/components/status/realtime-status-badge";
import { formatDate, formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  const { data: orders } = await supabase
    .from("transactions")
    .select(
      `
      id,
      order_id,
      status,
      amount,
      discount_amount,
      final_amount,
      coupon_code,
      status_token,
      payment_method,
      fulfillment_data,
      created_at,
      products ( id, name, category, image_url, service_type ),
      app_credentials ( account_data )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400">My Purchases</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Pesanan Saya</h1>
      </div>

      {orders?.length ? (
        <div className="space-y-5">
          {orders.map((order) => {
            const product = Array.isArray(order.products) ? order.products[0] : order.products;
            const credential = Array.isArray(order.app_credentials) ? order.app_credentials[0] : order.app_credentials;
            const fulfillmentData = (order as any).fulfillment_data || {};
            const isPanel = (product as any)?.service_type === "pterodactyl";

            return (
              <Card key={order.id} className="grid gap-5 lg:grid-cols-[140px_1fr_auto]">
                <img src={product?.image_url || "/placeholder.png"} alt={product?.name || "Product"} className="h-36 w-full rounded-2xl object-cover" />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{product?.category || "Produk"}</Badge>
                    <Badge className={isPanel ? "text-brand-200" : "text-slate-300"}>{isPanel ? "Panel Pterodactyl" : "Akun / Credential"}</Badge>
                    <Badge className={(order as any).payment_method === "balance" ? "text-emerald-300" : "text-amber-300"}>
                      {(order as any).payment_method === "balance" ? "Bayar dengan saldo" : "Bayar dengan Midtrans"}
                    </Badge>
                    <RealtimeStatusBadge transactionId={order.id} initialStatus={order.status} />
                  </div>

                  <div>
                    <div className="text-xl font-semibold text-white">{product?.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{order.order_id}</div>
                  </div>

                  <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <div>Base: {formatRupiah(order.amount)}</div>
                    <div>Diskon: {formatRupiah(order.discount_amount ?? 0)}</div>
                    <div>Total: {formatRupiah(order.final_amount ?? order.amount)}</div>
                    <div>Kupon: {order.coupon_code || "-"}</div>
                    <div>{formatDate(order.created_at)}</div>
                    <div>Token: {order.status_token}</div>
                    {isPanel && fulfillmentData.panel_plan_label && <div>Paket: {fulfillmentData.panel_plan_label}</div>}
                    {isPanel && fulfillmentData.memory_text && <div>RAM {fulfillmentData.memory_text} • Disk {fulfillmentData.disk_text || '-'} • CPU {fulfillmentData.cpu_text || '-'}</div>}
                  </div>

                  {credential?.account_data && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-mono text-sm text-white whitespace-pre-wrap">
                      {credential.account_data}
                    </div>
                  )}

                  {isPanel && fulfillmentData && (order.status === 'settlement' || fulfillmentData.panel_url) && (
                    <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-4 text-sm text-slate-200">
                      <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                        <ServerCog className="h-4 w-4 text-brand-300" />
                        Detail panel yang berhasil dibuat
                      </div>
                      <div>Paket: {fulfillmentData.panel_plan_label || '-'}</div>
                      <div>Panel URL: {fulfillmentData.panel_url || '-'}</div>
                      <div>Username Login: {fulfillmentData.panel_username || '-'}</div>
                      <div>Email Login: {fulfillmentData.panel_email || '-'}</div>
                      <div>Password Login: {fulfillmentData.panel_password || '-'}</div>
                      <div>Server UUID: {fulfillmentData.server_uuid || '-'}</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-3">
                  {order.status === "pending" ? (
                    <Link href={`/waiting-payment/${order.order_id}`}>
                      <Button className="w-full">Lanjut Pembayaran</Button>
                    </Link>
                  ) : (
                    <Link href={`/products/${product?.id}`}>
                      <Button variant="secondary" className="w-full">Lihat Produk</Button>
                    </Link>
                  )}

                  {(order as any).payment_method === "balance" && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-slate-200">
                      <div className="mb-1 flex items-center gap-2 font-semibold text-white">
                        <Wallet className="h-4 w-4 text-emerald-300" />
                        Pembayaran saldo
                      </div>
                      Order ini diproses langsung dari saldo akun Anda.
                    </div>
                  )}

                  {(order as any).payment_method === "qris" && order.status === 'pending' && (fulfillmentData.payment_fallback_url || fulfillmentData.payment_qr_url) && (
                    <a href={fulfillmentData.payment_fallback_url || fulfillmentData.payment_qr_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Link Bayar Backup
                      </Button>
                    </a>
                  )}

                  <a href={`/api/invoice/${order.order_id}`} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Invoice PDF
                    </Button>
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="text-slate-300">Belum ada transaksi.</div>
        </Card>
      )}
    </div>
  );
}
