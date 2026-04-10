"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { getPanelPresetPriceRange } from "@/lib/panel-packages";

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  description: string;
  featured?: boolean;
  sold_count?: number;
  service_type?: string | null;
};

export function ProductCard({ product }: { product: Product }) {
  const isPanel = (product.service_type || "credential") === "pterodactyl";
  const stockText = isPanel ? "Auto Ready 24/7" : product.stock > 0 ? `Stock ${product.stock}` : "Sold Out";
  const panelPriceRange = getPanelPresetPriceRange();
  const priceText = isPanel
    ? `${formatRupiah(panelPriceRange.min)} - ${formatRupiah(panelPriceRange.max)}`
    : formatRupiah(product.price);

  return (
    <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
      <Link href={`/products/${product.id}`}>
        <Card className="overflow-hidden p-0">
          <div className="aspect-[4/3] overflow-hidden">
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <Badge>{product.category}</Badge>
              <Badge className={isPanel || product.stock > 0 ? "text-emerald-300" : "text-rose-300"}>{stockText}</Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="text-brand-200">{isPanel ? "Panel Bot WA" : "Akun / Credential"}</Badge>
              <Badge className="text-slate-300">Terjual {product.sold_count || 0}</Badge>
              {isPanel && <Badge className="text-amber-300">1 produk • banyak pilihan paket</Badge>}
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{product.name}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-slate-300">{product.description}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-bold text-white">{priceText}</div>
                <div className="text-xs text-slate-400">{isPanel ? "Pilih RAM, CPU, dan disk saat checkout" : product.featured ? "Featured pick" : ""}</div>
              </div>
              <div className="text-sm text-brand-300">Lihat detail →</div>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
