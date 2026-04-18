import ProductCard from "@/components/product-card";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export default async function ProductsPage() {
  const admin = createAdminSupabaseClient();
  const { data: products } = await admin
    .from("products")
    .select(`id, name, description, price, category, image_url, is_active, featured,
      product_variants ( id, price, is_active )`)
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const list = (products || []).map((item: any) => ({
    ...item,
    product_variants: Array.isArray(item.product_variants) ? item.product_variants.filter((variant: any) => variant.is_active) : []
  }));

  return (
    <div className="container py-8 md:py-10">
      <section className="surface-card shine-border overflow-hidden px-6 py-8 sm:px-8 lg:px-10 reveal-up">
        <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">
              Katalog produk
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl dark:text-white">
              Pilih produk dan paket yang paling <span className="text-gradient">pas buat kebutuhanmu</span>
            </h1>
            <p className="max-w-3xl text-sm leading-8 text-slate-600 md:text-base dark:text-slate-300">
              Semua produk ditata lebih rapi supaya gampang dibandingkan. Kalau satu produk punya beberapa pilihan durasi atau tipe, semuanya bisa langsung kamu lihat tanpa bikin halaman terasa padat.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-black text-slate-950 dark:text-white">Paket lebih jelas</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Harga awal, tipe paket, dan detail singkat ditampilkan lebih rapi supaya user lebih yakin saat memilih.</p>
            </div>
            <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="text-sm font-black text-slate-950 dark:text-white">Admin tetap fleksibel</div>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Varian paket masih bisa ditambah dan diatur dari dashboard tanpa mengubah struktur utama yang sudah ada.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {list.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>
    </div>
  );
}
