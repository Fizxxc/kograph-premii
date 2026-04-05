"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CreateProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/products", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal membuat produk");

      alert("Produk berhasil dibuat.");
      formRef.current?.reset();
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal membuat produk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-5">
        <div className="text-lg font-semibold text-white">Tambah Produk Manual</div>
        <p className="mt-1 text-sm text-slate-300">Upload gambar ke Supabase Storage dan simpan produk baru.</p>
      </div>

      <form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          await submit(new FormData(form));
        }}
        className="space-y-4"
      >
        <Input name="name" placeholder="Nama produk" required />
        <Input name="category" placeholder="Kategori" required />
        <Input name="price" type="number" min="0" placeholder="Harga" required />
        <Textarea name="description" placeholder="Deskripsi produk" required />
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" name="featured" value="true" />
          Jadikan featured
        </label>
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
            <ImagePlus className="h-4 w-4 text-brand-300" />
            Upload cover produk
            <input name="image" type="file" accept="image/*" className="hidden" required />
          </label>
        </div>

        <Button className="w-full" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Produk"}</Button>
      </form>
    </Card>
  );
}
