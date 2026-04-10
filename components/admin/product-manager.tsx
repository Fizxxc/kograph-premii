"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
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
};

export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter((product) =>
      [product.name, product.category, product.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [products, query]);

  async function saveEdit(formData: FormData) {
    if (!editing) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        body: formData
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal update produk");

      toast.success("Produk berhasil diupdate.");
      setEditing(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal update produk");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menghapus produk");

      toast.success("Produk berhasil dihapus.");
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus produk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-white">Kelola Produk</div>
            <p className="mt-1 text-sm text-slate-300">
              Admin dapat mengubah produk akun premium maupun panel, stok, jumlah terjual, status aktif, dan konfigurasi panel.
            </p>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari produk"
            className="max-w-xs"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Produk</th>
                <th className="pb-3">Tipe</th>
                <th className="pb-3">Harga</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Terjual</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-white/10 align-top">
                  <td className="py-3">
                    <div className="font-medium text-white">{product.name}</div>
                    <div className="mt-1 max-w-sm text-xs text-slate-400">{product.description}</div>
                  </td>
                  <td className="py-3">{(product.service_type || "credential") === "pterodactyl" ? "Panel" : "Credential"}</td>
                  <td className="py-3">{formatRupiah(product.price)}</td>
                  <td className="py-3">{product.stock}</td>
                  <td className="py-3">{product.sold_count || 0}</td>
                  <td className="py-3">{product.is_active === false ? "Nonaktif" : "Aktif"}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-9 px-3" onClick={() => setEditing(product)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="danger" className="h-9 px-3" onClick={() => setDeleteTarget(product)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-premium">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-white">Edit Produk</div>
                <div className="text-sm text-slate-400">{editing.name}</div>
              </div>
              <Button variant="ghost" onClick={() => setEditing(null)}>Tutup</Button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await saveEdit(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input name="name" defaultValue={editing.name} required />
                <Input name="category" defaultValue={editing.category} required />
                <Input name="price" type="number" min="0" defaultValue={editing.price} required />
                <Input name="stock" type="number" min="0" defaultValue={editing.stock} required />
                <Input name="sold_count" type="number" min="0" defaultValue={editing.sold_count || 0} required />
                <select
                  name="service_type"
                  defaultValue={editing.service_type || "credential"}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
                >
                  <option value="credential" className="bg-slate-900">Akun / Credential</option>
                  <option value="pterodactyl" className="bg-slate-900">Panel Pterodactyl</option>
                </select>
              </div>
              <Input name="image_url" defaultValue={editing.image_url} placeholder="URL gambar baru (opsional)" />
              <Textarea name="description" defaultValue={editing.description} required />
              <Textarea
                name="pterodactyl_config"
                rows={10}
                defaultValue={editing.pterodactyl_config ? JSON.stringify(editing.pterodactyl_config, null, 2) : ""}
                placeholder='{"memory":2048,"disk":10240,"cpu":150}'
              />
              <div className="grid gap-3 md:grid-cols-2">
                <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <input type="checkbox" name="featured" defaultChecked={editing.featured} />
                  Featured product
                </label>
                <label className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                  <input type="checkbox" name="is_active" defaultChecked={editing.is_active !== false} />
                  Produk aktif di katalog
                </label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Perubahan"}</Button>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus produk ini?"
        description="Produk akan dihapus dari katalog. Gunakan ini hanya jika Anda benar-benar ingin menonaktifkan produk secara permanen."
        confirmText="Ya, hapus"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteProduct}
        loading={loading}
      />
    </>
  );
}
