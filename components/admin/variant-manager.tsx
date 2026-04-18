"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Layers3, Loader2, Pencil, Plus, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Product = {
  id: string;
  name: string;
  price: number;
  category?: string | null;
};

type Variant = {
  id: string;
  product_id: string;
  name: string;
  price: number;
  compare_at_price?: number | null;
  duration_label?: string | null;
  short_description?: string | null;
  sort_order?: number | null;
  is_active?: boolean;
};

const emptyForm = {
  product_id: "",
  name: "",
  price: "",
  compare_at_price: "",
  duration_label: "",
  short_description: "",
  sort_order: "0",
  is_active: true
};

export default function VariantManager({ products, variants }: { products: Product[]; variants: Variant[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Variant | null>(null);

  const groupedVariants = useMemo(() => {
    return products.map((product) => ({
      ...product,
      variants: variants.filter((item) => item.product_id === product.id)
    }));
  }, [products, variants]);

  const stats = useMemo(() => {
    const active = variants.filter((item) => item.is_active !== false).length;
    const discounted = variants.filter((item) => Number(item.compare_at_price || 0) > Number(item.price || 0)).length;
    return { total: variants.length, active, discounted };
  }, [variants]);

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/admin/product-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price || 0),
          compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
          sort_order: Number(form.sort_order || 0),
          is_active: form.is_active
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menambah varian."));
      toast.success("Varian berhasil ditambahkan.");
      setForm(emptyForm);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menambah varian.");
    } finally {
      setLoading(false);
    }
  }

  async function updateVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    try {
      setLoading(true);
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/product-variants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          name: body.name,
          price: Number(body.price || 0),
          compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : null,
          duration_label: body.duration_label,
          short_description: body.short_description,
          sort_order: Number(body.sort_order || 0),
          is_active: body.is_active === "on"
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menyimpan varian."));
      toast.success("Varian berhasil diperbarui.");
      setEditing(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan varian.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVariant() {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/product-variants?id=${deleteTarget.id}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menghapus varian."));
      toast.success("Varian berhasil dihapus.");
      setDeleteTarget(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menghapus varian.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(5,16,35,0.97)_0%,_rgba(8,26,54,0.96)_55%,_rgba(13,39,76,0.95)_100%)] p-5 text-white shadow-[0_30px_90px_-45px_rgba(2,6,23,0.9)] sm:p-6 lg:p-7">
        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">
              Variasi paket
            </div>
            <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-[2rem]">Atur paket, durasi, dan harga dari admin.</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Cocok untuk paket 1 bulan, 3 bulan, lifetime, atau jenis layanan lain. Buyer akan melihat pilihan ini saat membuka detail produk.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                <Layers3 className="h-5 w-5 text-sky-300" />
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Total varian</div>
                <div className="mt-1 text-2xl font-black text-white">{stats.total}</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                <Tags className="h-5 w-5 text-emerald-300" />
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Aktif</div>
                <div className="mt-1 text-2xl font-black text-white">{stats.active}</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                <Clock3 className="h-5 w-5 text-amber-300" />
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">Harga coret</div>
                <div className="mt-1 text-2xl font-black text-white">{stats.discounted}</div>
              </div>
            </div>

            <form onSubmit={createVariant} className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Produk tujuan</label>
                <select
                  value={form.product_id}
                  onChange={(e) => setForm((s) => ({ ...s, product_id: e.target.value }))}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
                >
                  <option value="" className="bg-slate-900 text-white">Pilih produk</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id} className="bg-slate-900 text-white">
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nama varian</label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Contoh: 1 Bulan / 30 Hari / Lifetime" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Label durasi</label>
                <Input value={form.duration_label} onChange={(e) => setForm((s) => ({ ...s, duration_label: e.target.value }))} placeholder="Misal: Aktif 30 hari" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harga</label>
                <Input type="number" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} placeholder="15000" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harga coret</label>
                <Input type="number" min="0" value={form.compare_at_price} onChange={(e) => setForm((s) => ({ ...s, compare_at_price: e.target.value }))} placeholder="Opsional" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Urutan tampil</label>
                <Input type="number" min="0" value={form.sort_order} onChange={(e) => setForm((s) => ({ ...s, sort_order: e.target.value }))} placeholder="0" />
              </div>
              <div className="flex items-end">
                <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} />
                  Tampilkan varian ini
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Deskripsi singkat</label>
                <Textarea value={form.short_description} onChange={(e) => setForm((s) => ({ ...s, short_description: e.target.value }))} placeholder="Contoh: Cocok untuk pemakaian bulanan, garansi 3 hari, anti ribet." rows={4} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={loading || !form.product_id || !form.name || !form.price} className="rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {loading ? "Menyimpan..." : "Tambah varian"}
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
            <div className="mb-4">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Daftar varian</div>
              <h4 className="mt-2 text-xl font-black text-white">Semua paket yang tersimpan per produk.</h4>
            </div>
            <div className="grid gap-4">
              {groupedVariants.map((product) => (
                <div key={product.id} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{product.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{product.category || "Tanpa kategori"}</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                      {product.variants.length} varian
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {product.variants.length ? (
                      product.variants.map((variant) => (
                        <div key={variant.id} className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="font-bold text-white">{variant.name}</div>
                                <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${variant.is_active !== false ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border border-white/10 bg-white/5 text-slate-300"}`}>
                                  {variant.is_active !== false ? "aktif" : "nonaktif"}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
                                <span className="font-bold text-white">{formatRupiah(variant.price)}</span>
                                {variant.compare_at_price ? <span className="text-slate-500 line-through">{formatRupiah(variant.compare_at_price)}</span> : null}
                                {variant.duration_label ? <span>{variant.duration_label}</span> : null}
                                <span>Sort {variant.sort_order || 0}</span>
                              </div>
                              {variant.short_description ? <p className="mt-2 text-sm leading-6 text-slate-300">{variant.short_description}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="secondary" className="h-9 rounded-full px-4" onClick={() => setEditing(variant)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button variant="danger" className="h-9 rounded-full px-4" onClick={() => setDeleteTarget(variant)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-slate-400">
                        Belum ada varian untuk produk ini.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {editing ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(4,14,30,0.98)_0%,_rgba(8,23,51,0.97)_58%,_rgba(12,34,69,0.96)_100%)] p-5 text-white shadow-[0_40px_120px_-55px_rgba(0,0,0,0.95)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Edit varian</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-white">{editing.name}</div>
              </div>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={() => setEditing(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={updateVariant} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Nama varian</label>
                <Input name="name" defaultValue={editing.name} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Label durasi</label>
                <Input name="duration_label" defaultValue={editing.duration_label || ""} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harga</label>
                <Input name="price" type="number" min="0" defaultValue={editing.price} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Harga coret</label>
                <Input name="compare_at_price" type="number" min="0" defaultValue={editing.compare_at_price || ""} />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Urutan tampil</label>
                <Input name="sort_order" type="number" min="0" defaultValue={editing.sort_order || 0} />
              </div>
              <div className="flex items-end">
                <label className="flex h-12 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200">
                  <input type="checkbox" name="is_active" defaultChecked={editing.is_active !== false} />
                  Tampilkan varian ini
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-slate-400">Deskripsi singkat</label>
                <Textarea name="short_description" defaultValue={editing.short_description || ""} rows={4} />
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Menyimpan..." : "Simpan perubahan"}
                </Button>
                <Button type="button" variant="secondary" className="rounded-full px-6" onClick={() => setEditing(null)}>
                  Tutup
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus varian"
        description={`Varian ${deleteTarget?.name || "ini"} akan dihapus permanen.`}
        confirmText="Ya, hapus"
        cancelText="Batal"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteVariant}
        loading={loading}
      />
    </>
  );
}
