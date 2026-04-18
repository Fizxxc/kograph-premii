import Link from "next/link";
import ProductCard from "@/components/product-card";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";


export default async function HomePage() {
  const admin = createAdminSupabaseClient();
  const { data: products } = await admin
    .from("products")
    .select(`id, name, description, price, category, image_url, is_active, featured,
      product_variants ( id, price, is_active )`)
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(8);

  const activeProducts = (products || []).map((item: any) => ({
    ...item,
    product_variants: Array.isArray(item.product_variants) ? item.product_variants.filter((variant: any) => variant.is_active) : []
  }));

  return (
    <div className="pb-14">
      <section className="container pt-8 md:pt-12">
        <div className="surface-card overflow-hidden px-6 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-7">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50/80 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-300">
                Layanan digital terpercaya
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                  Tempat order digital yang terasa <span className="text-gradient">lebih tenang, lebih jelas, dan lebih profesional</span>.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg dark:text-slate-300">
                  Kograph Premium menghadirkan layanan digital dengan alur pemesanan yang rapi, pembayaran yang jelas, dan pemantauan pesanan yang mudah diakses. Dirancang untuk memberi pengalaman yang nyaman sekaligus meyakinkan sejak awal hingga transaksi selesai.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/products" className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                  Lihat semua produk
                </Link>
                <Link href="/cek-pesanan" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-amber-400/30 dark:hover:bg-white/10">
                  Cek pesanan tanpa login
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Pilihan terkurasi", "Setiap produk ditampilkan dengan struktur informasi yang jelas agar proses pemilihan terasa lebih mudah dan meyakinkan."],
                  ["Pembayaran terverifikasi", "QRIS dinamis dan status transaksi dipantau secara otomatis untuk membantu memastikan proses pembayaran berjalan dengan rapi."],
                  ["Akses pesanan yang praktis", "Status order dapat dipantau kembali menggunakan resi, sehingga informasi penting tetap mudah dijangkau kapan saja." ]
                ].map(([title, text]) => (
                  <div key={title} className="rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-black text-slate-950 dark:text-white">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[32px] border border-amber-200 bg-amber-300/85 p-6 text-slate-950 shadow-xl shadow-amber-200/30 dark:border-amber-300/20 dark:bg-gradient-to-br dark:from-amber-300 dark:to-yellow-200">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-900">Alur layanan</div>
                <ol className="mt-4 space-y-3 text-sm font-medium leading-7">
                  <li>1. Pilih produk atau paket sesuai kebutuhan Anda.</li>
                  <li>2. Lanjutkan ke pembayaran melalui QRIS dinamis yang tersedia.</li>
                  <li>3. Status transaksi diperbarui otomatis setelah pembayaran terverifikasi.</li>
                  <li>4. Gunakan resi pesanan untuk memantau progres layanan kapan pun diperlukan.</li>
                </ol>
              </div>

              <div className="rounded-[32px] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/30 dark:border-white/10 dark:bg-white/5 dark:shadow-black/20">
                <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Keunggulan layanan</div>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-black text-slate-950 dark:text-white">Presentasi yang profesional</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Bahasa visual, komposisi, dan struktur halaman disusun untuk memberi kesan yang lebih percaya diri, rapi, dan terpercaya.</p>
                  </div>
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="text-sm font-black text-slate-950 dark:text-white">Pengalaman yang nyaman</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Setiap halaman dibuat responsif dan mudah dibaca, baik saat diakses melalui desktop maupun perangkat mobile.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mt-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-700 dark:text-amber-300">Pilihan populer</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Produk yang paling sering dicari</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">Temukan layanan yang paling sesuai dengan kebutuhan Anda melalui katalog yang disusun lebih jelas, ringkas, dan mudah ditelusuri.</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-slate-700 underline decoration-amber-300 underline-offset-4 transition hover:text-slate-950 dark:text-slate-300 dark:hover:text-white">
            Lihat katalog lengkap
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {activeProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
