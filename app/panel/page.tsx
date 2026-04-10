import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/product-card";
import { Card } from "@/components/ui/card";
import { SITE } from "@/lib/constants";
import { PANEL_RAM_PRESETS } from "@/lib/panel-packages";
import { formatRupiah } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const supabase = createServerSupabaseClient();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, category, image_url, stock, description, featured, sold_count, service_type")
    .eq("service_type", "pterodactyl")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Panel Menu</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Panel Pterodactyl Bot WA</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
          Halaman ini khusus untuk layanan panel bot WhatsApp. Modelnya dibuat sebagai satu produk panel dengan banyak pilihan paket di dalamnya. User cukup memasukkan username panel saat checkout, lalu sistem akan membuat username login, email login, password login, dan server secara otomatis setelah pembayaran berhasil.
        </p>
      </div>

      <Card className="grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-sm text-slate-400">Produk panel aktif</div>
          <div className="mt-2 text-3xl font-bold text-white">{products?.length ?? 0}</div>
        </div>
        <div>
          <div className="text-sm text-slate-400">Auto order Telegram</div>
          <div className="mt-2 text-sm leading-7 text-slate-300">
            Tersedia lewat @{SITE.autoOrderBotUsername} untuk pembuatan order dan top up saldo lebih cepat.
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400">Model stok panel</div>
          <div className="mt-2 text-sm leading-7 text-slate-300">
            Produk panel ditampilkan sebagai auto ready 24/7 karena server dibuat otomatis, bukan mengambil stok akun premium manual.
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-lg font-semibold text-white">List paket panel bot WA yang paling sering dipilih</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PANEL_RAM_PRESETS.map((item) => (
            <div key={item.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-bold text-white">{item.label}</div>
                <div className="text-sm font-semibold text-brand-200">{formatRupiah(item.price)}</div>
              </div>
              <div className="mt-1 text-sm text-slate-400">{item.tagline}</div>
              <div className="mt-3 text-xs leading-6 text-slate-300">
                RAM {item.memoryMb === 0 ? "Unlimited" : `${Math.round(item.memoryMb / 1024)}GB`}<br />
                Disk {item.diskMb === 0 ? "Unlimited" : `${Math.max(1, Math.round(item.diskMb / 1024))}GB`}<br />
                CPU {item.cpuPercent === 0 ? "Unlimited" : `${item.cpuPercent}%`}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {products?.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product as never} />
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-slate-300">Belum ada produk panel aktif saat ini.</div>
        </Card>
      )}
    </div>
  );
}
