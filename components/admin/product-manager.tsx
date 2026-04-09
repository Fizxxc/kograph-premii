"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
};

export function ProductManager({ products }: { products: Product[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function deleteProduct(id: string) {
    const ok = window.confirm("Yakin ingin menghapus produk ini? Semua credential terkait juga akan ikut terhapus.");
    if (!ok) return;

    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal menghapus produk");

      toast.success("Produk berhasil dihapus.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus produk");
    }
  }

  return (
    <>
      <Card>
        <div className="mb-5 text-lg font-semibold text-white">Edit / Delete Produk</div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-3">Produk</th>
                <th className="pb-3">Kategori</th>
                <th className="pb-3">Harga</th>
                <th className="pb-3">Stock</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {products.map((product) => (
                <tr key={product.id} className="border-t border-white/10 align-top">
                  <td className="py-3">
                    <div className="font-medium text-white">{product.name}</div>
                    <div className="mt-1 max-w-sm text-xs text-slate-400">{product.description}</div>
                  </td>
                  <td className="py-3">{product.category}</td>
                  <td className="py-3">{formatRupiah(product.price)}</td>
                  <td className="py-3">{product.stock}</td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="h-9 px-3" onClick={() => setEditing(product)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="danger" className="h-9 px-3" onClick={() => deleteProduct(product.id)}>
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
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-premium">
            <div className="mb-4 flex items-center justify-between">
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
              <Input name="name" defaultValue={editing.name} required />
              <Input name="category" defaultValue={editing.category} required />
              <Input name="price" type="number" min="0" defaultValue={editing.price} required />
              <Input name="stock" type="number" min="0" defaultValue={editing.stock} required />
              <Input name="image_url" defaultValue={editing.image_url} placeholder="URL gambar baru (opsional)" />
              <Textarea name="description" defaultValue={editing.description} required />
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="featured" defaultChecked={editing.featured} />
                Featured product
              </label>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Perubahan"}</Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}