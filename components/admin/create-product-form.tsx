"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, ServerCog, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const panelConfigExample = `{
  "nest_id": 1,
  "egg_id": 1,
  "allocation_id": 1,
  "location_id": 1,
  "memory": 2048,
  "disk": 10240,
  "cpu": 150,
  "databases": 1,
  "backups": 1,
  "allocations": 1,
  "docker_image": "ghcr.io/pterodactyl/yolks:nodejs_18"
}`;

export function CreateProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<"credential" | "pterodactyl">("credential");

  async function submit(formData: FormData) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/products", { method: "POST", body: formData });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal membuat produk");

      toast.success("Produk berhasil dibuat.");
      formRef.current?.reset();
      setServiceType("credential");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat produk");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="mb-5">
        <div className="text-lg font-semibold text-white">Tambah Produk Manual</div>
        <p className="mt-1 text-sm text-slate-300">
          Tambahkan akun premium biasa atau menu panel Pterodactyl tanpa mengganggu flow toko yang sudah berjalan.
        </p>
      </div>

      <form
        ref={formRef}
        onSubmit={async (e) => {
          e.preventDefault();
          await submit(new FormData(e.currentTarget));
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="Nama produk" required />
          <Input name="category" placeholder="Kategori" required />
          <Input name="price" type="number" min="0" placeholder="Harga" required />
          <select
            name="service_type"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as "credential" | "pterodactyl")}
            className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none"
          >
            <option value="credential" className="bg-slate-900">
              Akun / Credential
            </option>
            <option value="pterodactyl" className="bg-slate-900">
              Panel Pterodactyl
            </option>
          </select>
          <Input name="sold_count" type="number" min="0" placeholder="Jumlah terjual awal" defaultValue={0} />
          <Input
            name="stock"
            type="number"
            min="0"
            placeholder={serviceType === "pterodactyl" ? "Biarkan 0, panel auto ready" : "Stok awal"}
            defaultValue={serviceType === "pterodactyl" ? 0 : 0}
          />
        </div>

        <Textarea name="description" placeholder="Deskripsi produk" required />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="featured" value="true" />
            Jadikan featured
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="is_active" value="true" defaultChecked />
            Produk aktif & tampil di katalog
          </label>
        </div>

        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
            <ImagePlus className="h-4 w-4 text-brand-300" />
            Upload cover produk
            <input name="image" type="file" accept="image/*" className="hidden" required />
          </label>
        </div>

        {serviceType === "pterodactyl" && (
          <div className="space-y-3 rounded-3xl border border-brand-500/20 bg-brand-500/10 p-5">
            <div className="flex items-center gap-2 text-white">
              <ServerCog className="h-4 w-4 text-brand-300" />
              <div className="font-semibold">Konfigurasi Panel Pterodactyl</div>
            </div>
            <p className="text-sm leading-6 text-slate-300">
              Isi JSON resource panel agar webhook bisa membuat server secara otomatis setelah pembayaran settle. Field docker_image juga sebaiknya diisi agar tidak gagal saat provisioning.
            </p>
            <Textarea
              name="pterodactyl_config"
              rows={12}
              defaultValue={panelConfigExample}
              placeholder={panelConfigExample}
            />
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-slate-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
              Produk panel akan tampil sebagai auto ready di katalog. User hanya memasukkan username panel, lalu email login dan password login dibuat otomatis.
            </div>
          </div>
        )}

        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Produk"}
        </Button>
      </form>
    </Card>
  );
}
