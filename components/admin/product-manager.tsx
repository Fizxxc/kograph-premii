"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Pencil, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  image_url: string;
  featured: boolean;
  sold_count?: number;
  service_type?: string | null;
  pterodactyl_config?: Record<string, unknown> | null;
  is_active?: boolean;
  live_chat_enabled?: boolean;
  support_admin_ids?: string[] | null;
  external_link?: string | null;
};

function serviceLabel(value?: string | null) {
  if (value === "pterodactyl") return "Panel";
  if (value === "design") return "Jasa";
  return "Credential";
}

function ProductBadge({ active, children }: { active?: boolean; children: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
        active
          ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {children}
    </span>
  );
}

export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [product.name, product.category, product.description, product.service_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [products, query]);

  const stats = useMemo(() => {
    const active = products.filter((item) => item.is_active !== false).length;
    const featured = products.filter((item) => item.featured).length;
    const liveChat = products.filter((item) => item.live_chat_enabled).length;
    const panels = products.filter((item) => item.service_type === "pterodactyl").length;
    return { active, featured, liveChat, panels };
  }, [products]);

  async function deleteProduct() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menghapus produk."));
      toast.success("Produk berhasil dihapus.");
      setDeleteTarget(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menghapus produk.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        body: formData
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menyimpan perubahan."));
      toast.success("Perubahan produk berhasil disimpan.");
      setEditing(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan perubahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(3,12,26,0.98)_0%,_rgba(7,24,50,0.96)_60%,_rgba(10,35,71,0.95)_100%)] p-5 text-white shadow-[0_30px_90px_-45px_rgba(2,6,23,0.9)] sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-sky-200">
                Kelola produk
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-[2rem]">Semua produk aktif, nonaktif, dan featured ada di satu tabel yang lebih enak dibaca.</h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                Cari produk lebih cepat, cek harga dan status, lalu edit langsung tanpa kehilangan fokus. Tampilan mobile juga dibuat lebih ringkas.
              </p>
            </div>

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama produk, kategori, atau tipe layanan" className="pl-11" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Produk aktif</div>
              <div className="mt-2 text-3xl font-black text-white">{stats.active}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Featured</div>
              <div className="mt-2 text-3xl font-black text-white">{stats.featured}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Live chat</div>
              <div className="mt-2 text-3xl font-black text-white">{stats.liveChat}</div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tipe panel</div>
              <div className="mt-2 text-3xl font-black text-white">{stats.panels}</div>
            </div>
          </div>

          <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/35 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-slate-300">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Produk</th>
                    <th className="px-4 py-4 font-semibold">Tipe</th>
                    <th className="px-4 py-4 font-semibold">Harga</th>
                    <th className="px-4 py-4 font-semibold">Stok</th>
                    <th className="px-4 py-4 font-semibold">Status</th>
                    <th className="px-4 py-4 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isActive = product.is_active !== false;
                    return (
                      <tr key={product.id} className="border-t border-white/10 align-top text-slate-200">
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-white/10 bg-white/5">
                              {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-bold text-white">{product.name}</div>
                                {product.featured ? <ProductBadge active>featured</ProductBadge> : null}
                                {product.live_chat_enabled ? <ProductBadge active>live chat</ProductBadge> : null}
                              </div>
                              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.category}</div>
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{product.description}</p>
                              {product.external_link ? (
                                <a href={product.external_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-200 hover:underline">
                                  Link eksternal <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">{serviceLabel(product.service_type)}</td>
                        <td className="px-4 py-4 font-bold text-white">{formatRupiah(product.price)}</td>
                        <td className="px-4 py-4">{product.service_type === "pterodactyl" ? "Auto ready" : product.stock}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <ProductBadge active={isActive}>{isActive ? "aktif" : "nonaktif"}</ProductBadge>
                            <ProductBadge>{`terjual ${product.sold_count || 0}`}</ProductBadge>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" className="h-9 rounded-full px-4" onClick={() => setEditing(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button variant="danger" className="h-9 rounded-full px-4" onClick={() => setDeleteTarget(product)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:hidden">
            {filteredProducts.map((product) => {
              const isActive = product.is_active !== false;
              return (
                <div key={product.id} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-[22px] border border-white/10 bg-white/5">
                      {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold text-white">{product.name}</div>
                        <ProductBadge active={isActive}>{isActive ? "aktif" : "nonaktif"}</ProductBadge>
                      </div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{product.category}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{product.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Harga</div>
                      <div className="mt-1 font-bold text-white">{formatRupiah(product.price)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Tipe</div>
                      <div className="mt-1 font-bold text-white">{serviceLabel(product.service_type)}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" className="h-10 rounded-full px-4" onClick={() => setEditing(product)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="danger" className="h-10 rounded-full px-4" onClick={() => setDeleteTarget(product)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-6 text-sm text-slate-400">
              Tidak ada produk yang cocok dengan kata kunci itu.
            </div>
          ) : null}
        </div>
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(3,12,26,0.98)_0%,_rgba(8,24,52,0.97)_58%,_rgba(12,34,68,0.96)_100%)] p-5 text-white shadow-[0_40px_120px_-55px_rgba(0,0,0,0.95)] sm:p-6 lg:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Edit produk
                </div>
                <div className="mt-3 text-2xl font-black tracking-tight text-white">{editing.name}</div>
                <p className="mt-2 text-sm text-slate-300">Perubahan di sini langsung memengaruhi katalog dan checkout.</p>
              </div>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={() => setEditing(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="grid gap-6 xl:grid-cols-[0.72fr,1fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/25">
                  {editing.image_url ? <img src={editing.image_url} alt={editing.name} className="aspect-square w-full object-cover" /> : <div className="aspect-square" />}
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Harga saat ini</div>
                    <div className="mt-1 text-2xl font-black text-white">{formatRupiah(editing.price)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Status</div>
                    <div className="mt-1 font-bold text-white">{editing.is_active !== false ? "Aktif tampil" : "Tidak tampil"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nama produk</label>
                    <Input name="name" defaultValue={editing.name} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Kategori</label>
                    <Input name="category" defaultValue={editing.category} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Tipe layanan</label>
                    <select name="service_type" defaultValue={editing.service_type || "credential"} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10">
                      <option className="bg-slate-900 text-white" value="credential">Credential / Akun</option>
                      <option className="bg-slate-900 text-white" value="design">Jasa / Design</option>
                      <option className="bg-slate-900 text-white" value="pterodactyl">Panel / Auto provisioning</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harga</label>
                    <Input name="price" type="number" min="0" defaultValue={editing.price} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Stok</label>
                    <Input name="stock" type="number" min="0" defaultValue={editing.stock} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sold count</label>
                    <Input name="sold_count" type="number" min="0" defaultValue={editing.sold_count || 0} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Link eksternal</label>
                    <Input name="external_link" defaultValue={editing.external_link || ""} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Image URL</label>
                    <Input name="image_url" defaultValue={editing.image_url || ""} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Deskripsi</label>
                    <Textarea name="description" defaultValue={editing.description} rows={5} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Support admin IDs</label>
                    <Input name="support_admin_ids" defaultValue={editing.support_admin_ids?.join(",") || ""} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pterodactyl config (JSON)</label>
                    <Textarea name="pterodactyl_config" defaultValue={editing.pterodactyl_config ? JSON.stringify(editing.pterodactyl_config, null, 2) : ""} rows={5} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <input type="checkbox" name="featured" defaultChecked={editing.featured} />
                    Featured
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <input type="checkbox" name="live_chat_enabled" defaultChecked={editing.live_chat_enabled} />
                    Live chat aktif
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                    <input type="checkbox" name="is_active" defaultChecked={editing.is_active !== false} />
                    Tampilkan produk
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button type="submit" disabled={loading} className="rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {loading ? "Menyimpan..." : "Simpan perubahan"}
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full px-6" onClick={() => setEditing(null)}>
                    Tutup
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus produk"
        description={`Produk ${deleteTarget?.name || "ini"} akan dihapus permanen dari daftar produk.`}
        confirmText="Ya, hapus"
        cancelText="Batal"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteProduct}
        loading={loading}
      />
    </>
  );
}
