import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AlertTriangle, LayoutDashboard, MessageCircleMore, Package2, Sparkles } from "lucide-react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductManager } from "@/components/admin/product-manager";
import { CreateProductForm } from "@/components/admin/create-product-form";
import { CouponManager } from "@/components/admin/coupon-manager";
import { ExportButton } from "@/components/admin/export-button";
import { BroadcastPanel } from "@/components/admin/broadcast-panel";
import { BulkCredentialUpload } from "@/components/admin/bulk-credential-upload";
import InventoryManager from "@/components/admin/inventory-manager";
import VariantManager from "@/components/admin/variant-manager";
import SiteSettingsManager from "@/components/admin/site-settings-manager";
import LiveChatAdminPanel from "@/components/live-chat/live-chat-admin-panel";

function StatCard({
  icon,
  label,
  value,
  note
}: {
  icon: ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</div>
          <div className="mt-3 text-4xl font-black tracking-tight text-white">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-200">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{note}</p>
    </div>
  );
}

export default async function AdminPage() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await admin.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const [
    { data: products },
    { data: variants },
    { data: popups },
    { data: alerts },
    { data: coupons },
    { count: pendingTransactions },
    { count: openChats },
    { count: totalProducts },
    { count: activeProducts },
    { count: activeVariants }
  ] = await Promise.all([
    admin
      .from("products")
      .select(
        "id, name, category, description, price, stock, image_url, featured, sold_count, service_type, pterodactyl_config, is_active, live_chat_enabled, support_admin_ids, external_link"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("product_variants")
      .select("id, product_id, name, price, compare_at_price, duration_label, short_description, sort_order, is_active")
      .order("sort_order", { ascending: true }),
    admin
      .from("site_popups")
      .select("id, title, message, image_url, button_label, button_href, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    admin
      .from("site_alerts")
      .select("id, title, message, tone, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6),
    admin
      .from("coupons")
      .select("id, code, type, value, min_purchase, max_discount, quota, used_count, is_active")
      .order("created_at", { ascending: false }),
    admin.from("transactions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("live_chat_rooms").select("id", { count: "exact", head: true }).or("status.eq.open,status.eq.pending"),
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("products").select("id", { count: "exact", head: true }).neq("is_active", false),
    admin.from("product_variants").select("id", { count: "exact", head: true }).neq("is_active", false)
  ]);

  const adminName = String(profile?.full_name || user.email || "Admin");

  return (
    <div className="container py-8 md:py-10">
      <div className="space-y-6 lg:space-y-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,_rgba(2,8,23,0.98)_0%,_rgba(8,24,52,0.97)_55%,_rgba(13,42,79,0.96)_100%)] p-6 shadow-[0_30px_90px_-45px_rgba(2,6,23,0.85)] sm:p-8 lg:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.14),_transparent_28%)]" />
          <div className="relative grid gap-6 xl:grid-cols-[1.1fr,0.9fr] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Dashboard admin
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                Halo, {adminName}. Semua yang penting sekarang lebih rapi dan enak dipantau.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                Halaman ini dibuat supaya kerja admin terasa lebih cepat: tambah produk, atur varian paket, nyalakan promo,
                cek alert situs, lalu lanjut balas room yang masih aktif tanpa bolak-balik halaman.
              </p>

              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Fokus ke operasional harian</div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Desain lebih bersih di desktop & mobile</div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-200">Tetap pakai API dan tabel lama</div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <ExportButton />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Transaksi pending"
                value={pendingTransactions || 0}
                note="Masih menunggu status final dari Midtrans atau proses verifikasi server."
              />
              <StatCard
                icon={<MessageCircleMore className="h-5 w-5" />}
                label="Chat aktif"
                value={openChats || 0}
                note="Room yang masih butuh jawaban admin atau tindak lanjut pengerjaan."
              />
              <StatCard
                icon={<Package2 className="h-5 w-5" />}
                label="Produk aktif"
                value={activeProducts || 0}
                note={`Aktif ${activeProducts || 0} dari total ${totalProducts || 0} produk yang tersimpan.`}
              />
              <StatCard
                icon={<LayoutDashboard className="h-5 w-5" />}
                label="Varian aktif"
                value={activeVariants || 0}
                note="Paket yang sedang tampil ke buyer pada halaman detail dan checkout."
              />
            </div>
          </div>
        </section>

        <CreateProductForm />
        <InventoryManager products={(products || []) as any} />
        <BulkCredentialUpload products={((products || []).filter((item: any) => item.service_type !== "pterodactyl")) as any} />
        <ProductManager products={(products || []) as any} />
        <VariantManager products={(products || []) as any} variants={(variants || []) as any} />
        <CouponManager coupons={(coupons || []) as any} />
        <BroadcastPanel />
        <SiteSettingsManager popups={(popups || []) as any} alerts={(alerts || []) as any} />
        <LiveChatAdminPanel />
      </div>
    </div>
  );
}
