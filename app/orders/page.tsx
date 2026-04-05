import Link from "next/link";
import { Download } from "lucide-react";
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
    .select(`
      id,
      order_id,
      status,
      amount,
      discount_amount,
      final_amount,
      coupon_code,
      status_token,
      created_at,
      products ( id, name, category, image_url ),
      app_credentials ( account_data )
    `)
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

            return (
              <Card key={order.id} className="grid gap-5 lg:grid-cols-[140px_1fr_auto]">
                <img src={product?.image_url || "/placeholder.png"} alt={product?.name || "Product"} className="h-36 w-full rounded-2xl object-cover" />

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{product?.category || "Produk"}</Badge>
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
                  </div>

                  {credential?.account_data && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 font-mono text-sm text-white">
                      {credential.account_data}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-3">
                  {order.status === "pending" ? (
                    <Link href={`/waiting-payment/${order.order_id}`}>
                      <Button className="w-full">Bayar</Button>
                    </Link>
                  ) : (
                    <Link href={`/products/${product?.id}`}>
                      <Button variant="secondary" className="w-full">Lihat Produk</Button>
                    </Link>
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
        <Card><div className="text-slate-300">Belum ada transaksi.</div></Card>
      )}
    </div>
  );
}
