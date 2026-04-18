import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";

export default function ProductCard({ product }: { product: any }) {
  const lowestVariantPrice = Array.isArray(product.product_variants) && product.product_variants.length > 0
    ? Math.min(...product.product_variants.map((item: any) => Number(item.price || product.price || 0)))
    : Number(product.price || 0);

  return (
    <div className="group surface-card overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(15,23,42,0.35)] dark:hover:shadow-[0_28px_70px_-30px_rgba(0,0,0,0.55)]">
      <div className="relative overflow-hidden">
        <img
          src={product.image_url || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"}
          alt={product.name}
          className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="rounded-full bg-white/90 text-slate-900">{product.category || "Digital"}</Badge>
          {Array.isArray(product.product_variants) && product.product_variants.length > 0 ? (
            <Badge className="rounded-full bg-amber-300 text-slate-950">{product.product_variants.length} pilihan paket</Badge>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{product.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{product.description || "Pilih paket yang paling cocok, lanjutkan pembayaran, lalu pantau statusnya dengan alur yang jelas."}</p>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Mulai dari</div>
            <div className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{formatRupiah(lowestVariantPrice)}</div>
          </div>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200"
          >
            Lihat detail
          </Link>
        </div>
      </div>
    </div>
  );
}
