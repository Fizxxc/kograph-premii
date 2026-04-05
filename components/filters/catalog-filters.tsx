"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { NAV_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CatalogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [inStock, setInStock] = useState(searchParams.get("inStock") === "true");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");

  const hasFilters = useMemo(() => {
    return Boolean(search || category || inStock || minPrice || maxPrice || sort !== "newest");
  }, [search, category, inStock, minPrice, maxPrice, sort]);

  function apply() {
    const params = new URLSearchParams(searchParams.toString());

    const setValue = (key: string, value: string | boolean) => {
      if (value === "" || value === false) params.delete(key);
      else params.set(key, String(value));
    };

    setValue("search", search.trim());
    setValue("category", category);
    setValue("sort", sort);
    setValue("inStock", inStock);
    setValue("minPrice", minPrice);
    setValue("maxPrice", maxPrice);

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function reset() {
    setSearch("");
    setCategory("");
    setSort("newest");
    setInStock(false);
    setMinPrice("");
    setMaxPrice("");
    router.push(pathname, { scroll: false });
  }

  return (
    <div className="premium-card space-y-4 p-5">
      <div className="flex items-center gap-2 text-white">
        <SlidersHorizontal className="h-4 w-4 text-brand-300" />
        <span className="font-semibold">Search & Filter</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr_1fr_0.9fr_0.9fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <Input className="pl-10" placeholder="Cari produk premium..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
        >
          <option value="" className="bg-slate-900">Semua kategori</option>
          {NAV_CATEGORIES.map((item) => (
            <option key={item} value={item} className="bg-slate-900">{item}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
        >
          <option value="newest" className="bg-slate-900">Terbaru</option>
          <option value="price_asc" className="bg-slate-900">Harga termurah</option>
          <option value="price_desc" className="bg-slate-900">Harga tertinggi</option>
          <option value="stock_desc" className="bg-slate-900">Stok terbanyak</option>
        </select>

        <Input type="number" min="0" placeholder="Min harga" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
        <Input type="number" min="0" placeholder="Max harga" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />

        <div className="flex gap-2">
          <Button onClick={apply} className="flex-1">Terapkan</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          Hanya yang stok tersedia
        </label>

        {hasFilters && (
          <Button variant="ghost" onClick={reset}>
            <X className="mr-2 h-4 w-4" />
            Reset filter
          </Button>
        )}
      </div>
    </div>
  );
}
