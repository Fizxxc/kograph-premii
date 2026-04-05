import { CatalogFilters } from "@/components/filters/catalog-filters";
import { HeroBanner } from "@/components/hero-banner";
import { ProductCard } from "@/components/product-card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("products")
    .select("id, name, price, category, image_url, stock, description, featured")
    .order("created_at", { ascending: false });

  const search = String(searchParams.search ?? "").trim();
  const category = String(searchParams.category ?? "").trim();
  const sort = String(searchParams.sort ?? "newest").trim();
  const inStock = String(searchParams.inStock ?? "") === "true";
  const minPrice = Number(searchParams.minPrice ?? 0);
  const maxPrice = Number(searchParams.maxPrice ?? 0);

  if (search) query = query.ilike("name", `%${search}%`);
  if (category) query = query.eq("category", category);
  if (inStock) query = query.gt("stock", 0);
  if (minPrice > 0) query = query.gte("price", minPrice);
  if (maxPrice > 0) query = query.lte("price", maxPrice);

  if (sort === "price_asc") query = query.order("price", { ascending: true });
  else if (sort === "price_desc") query = query.order("price", { ascending: false });
  else if (sort === "stock_desc") query = query.order("stock", { ascending: false });

  const { data: products } = await query;

  return (
    <div className="space-y-10">
      <HeroBanner />

      <section id="catalog" className="space-y-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Catalog</div>
            <h2 className="mt-2 text-3xl font-bold text-white">Produk Premium</h2>
          </div>
          <div className="text-sm text-slate-400">{products?.length ?? 0} produk ditemukan</div>
        </div>

        <CatalogFilters />

        {products?.length ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product as never} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-300">
            Tidak ada produk yang cocok dengan filter saat ini.
          </div>
        )}
      </section>
    </div>
  );
}
