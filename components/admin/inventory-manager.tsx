"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Boxes, Minus, PackagePlus, RefreshCcw, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type InventoryProduct = {
  id: string;
  name: string;
  category?: string | null;
  stock: number;
  sold_count?: number | null;
  is_active?: boolean | null;
  service_type?: string | null;
};

export default function InventoryManager({ products }: { products: InventoryProduct[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const stockableProducts = useMemo(
    () => products.filter((item) => item.service_type !== "pterodactyl"),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return stockableProducts;
    return stockableProducts.filter((item) =>
      [item.name, item.category, item.service_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [query, stockableProducts]);

  const stats = useMemo(() => {
    const totalStock = stockableProducts.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const lowStock = stockableProducts.filter((item) => Number(item.stock || 0) <= 5).length;
    const emptyStock = stockableProducts.filter((item) => Number(item.stock || 0) <= 0).length;
    return { totalStock, lowStock, emptyStock };
  }, [stockableProducts]);

  async function updateStock(productId: string, payload: { mode: "increment" | "set"; amount?: number; stock?: number }) {
    setLoadingId(productId);
    try {
      const response = await fetch(`/api/admin/products/${productId}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal memperbarui stok."));
      toast.success(`Stok berhasil diperbarui menjadi ${json.stock}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui stok.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-200">
              Inventori & stok
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">
              Tambah stok, kurangi stok, atau set ulang jumlah stok dari satu panel yang lebih cepat.
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Panel ini khusus untuk produk non-panel. Jadi admin bisa koreksi stok manual, restock akun premium,
              dan mengecek item yang mulai menipis tanpa harus buka form edit penuh.
            </p>
          </div>

          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk stok manual"
              className="pl-11"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Total stok</div>
            <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{stats.totalStock}</div>
          </div>
          <div className="rounded-[24px] border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-300/15 dark:bg-amber-300/10">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-200">Mulai menipis</div>
            <div className="mt-2 text-3xl font-black text-amber-900 dark:text-amber-100">{stats.lowStock}</div>
          </div>
          <div className="rounded-[24px] border border-rose-200/80 bg-rose-50/90 p-4 dark:border-rose-300/15 dark:bg-rose-300/10">
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-700 dark:text-rose-200">Stok habis</div>
            <div className="mt-2 text-3xl font-black text-rose-900 dark:text-rose-100">{stats.emptyStock}</div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          {filteredProducts.map((product) => {
            const currentDraft = drafts[product.id] ?? String(product.stock ?? 0);
            const busy = loadingId === product.id;
            const currentStock = Number(product.stock || 0);
            const lowStock = currentStock <= 5;
            const emptyStock = currentStock <= 0;

            return (
              <div
                key={product.id}
                className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-black text-slate-950 dark:text-white">{product.name}</div>
                      {!product.is_active ? (
                        <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                          Nonaktif
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {product.category || "Tanpa kategori"}
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] ${
                      emptyStock
                        ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-200"
                        : lowStock
                          ? "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200"
                    }`}
                  >
                    {emptyStock ? <ShieldAlert className="h-3.5 w-3.5" /> : <Boxes className="h-3.5 w-3.5" />}
                    {emptyStock ? "Stok habis" : lowStock ? "Stok rendah" : "Stok aman"}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Stok sekarang</div>
                    <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{currentStock}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Sold count</div>
                    <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{Number(product.sold_count || 0)}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Tipe</div>
                    <div className="mt-2 text-base font-bold text-slate-950 dark:text-white">{product.service_type || "credential"}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[1, 5, 10].map((amount) => (
                    <Button
                      key={`add-${amount}`}
                      variant="secondary"
                      className="h-10 rounded-full px-4"
                      disabled={busy}
                      onClick={() => updateStock(product.id, { mode: "increment", amount })}
                    >
                      <PackagePlus className="mr-2 h-4 w-4" /> +{amount}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    className="h-10 rounded-full px-4"
                    disabled={busy || currentStock <= 0}
                    onClick={() => updateStock(product.id, { mode: "increment", amount: -1 })}
                  >
                    <Minus className="mr-2 h-4 w-4" /> -1
                  </Button>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr,auto]">
                  <Input
                    type="number"
                    min="0"
                    value={currentDraft}
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [product.id]: event.target.value }))}
                    placeholder="Set stok baru"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-full px-5"
                      disabled={busy}
                      onClick={() => {
                        const nextStock = Number(drafts[product.id] ?? product.stock ?? 0);
                        if (!Number.isFinite(nextStock) || nextStock < 0) {
                          toast.error("Masukkan angka stok yang valid.");
                          return;
                        }
                        updateStock(product.id, { mode: "set", stock: nextStock });
                      }}
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" /> Set stok
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 px-5 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            Tidak ada produk stok manual yang cocok dengan pencarian Anda.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
