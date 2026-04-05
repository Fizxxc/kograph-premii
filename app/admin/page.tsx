import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CreateProductForm } from "@/components/admin/create-product-form";
import { BulkCredentialUpload } from "@/components/admin/bulk-credential-upload";
import { ExportButton } from "@/components/admin/export-button";
import { ProductManager } from "@/components/admin/product-manager";
import { CouponManager } from "@/components/admin/coupon-manager";
import { BroadcastPanel } from "@/components/admin/broadcast-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, description, price, stock, image_url, featured")
    .order("created_at", { ascending: false });

  const { data: coupons } = await supabase
    .from("coupons")
    .select("id, code, type, value, min_purchase, max_discount, quota, used_count, is_active")
    .order("created_at", { ascending: false });

  const { count: totalTransactions } = await supabase.from("transactions").select("*", { count: "exact", head: true });
  const { count: pendingTransactions } = await supabase.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: telegramSubscribers } = await supabase.from("telegram_users").select("*", { count: "exact", head: true });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Admin Control</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Dashboard Admin V2</h1>
        </div>
        <ExportButton />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-400">Total Produk</div>
          <div className="mt-2 text-3xl font-bold text-white">{products?.length ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Total Transaksi</div>
          <div className="mt-2 text-3xl font-bold text-white">{totalTransactions ?? 0}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-400">Pending / Telegram User</div>
          <div className="mt-2 text-3xl font-bold text-white">{pendingTransactions ?? 0} / {telegramSubscribers ?? 0}</div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CreateProductForm />
        <BulkCredentialUpload products={(products || []).map((p) => ({ id: p.id, name: p.name }))} />
      </div>

      <ProductManager products={(products || []) as never} />
      <CouponManager coupons={(coupons || []) as never} />
      <BroadcastPanel />
    </div>
  );
}
