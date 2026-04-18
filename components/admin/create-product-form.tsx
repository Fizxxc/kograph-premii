"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MessageCircleMore, ServerCog, ShieldCheck, Sparkles } from "lucide-react";
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
  "docker_image": "ghcr.io/pterodactyl/yolks:nodejs_18",
  "startup": "npm start"
}`;

export function CreateProductForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [serviceType, setServiceType] = useState<"credential" | "pterodactyl" | "design">("credential");

  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/products", { method: "POST", body: formData });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal membuat produk"));
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
    <Card className="overflow-hidden border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5 sm:p-6 lg:p-7">
      <div className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr] xl:items-start">
        <div className="space-y-5">
          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-200">
            Produk baru
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">Tambah produk manual dari dashboard</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              Buat akun premium, panel Pterodactyl, atau jasa desain tanpa ubah struktur lama. Form ini sengaja dibuat lebih bersih supaya admin gampang isi data dan cepat publish.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <div className="font-bold">Credential</div>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Cocok untuk akun premium, subscription, atau item digital instan.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                <ServerCog className="h-4 w-4 text-sky-500" />
                <div className="font-bold">Pterodactyl</div>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Auto ready setelah pembayaran settle dan server berhasil dibuat.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04] sm:col-span-2">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                <MessageCircleMore className="h-4 w-4 text-emerald-500" />
                <div className="font-bold">Design / Jasa</div>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Bisa diarahkan ke live chat admin untuk briefing, revisi, dan proses pengerjaan.</p>
            </div>
          </div>
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
              onChange={(e) => setServiceType(e.target.value as any)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <option value="credential">Akun / Credential</option>
              <option value="pterodactyl">Panel Pterodactyl</option>
              <option value="design">Desain / Jasa Edit</option>
            </select>
            <Input name="sold_count" type="number" min="0" placeholder="Jumlah terjual awal" defaultValue={0} />
            <Input
              name="stock"
              type="number"
              min="0"
              placeholder={
                serviceType === "pterodactyl"
                  ? "Biarkan 0, panel auto ready"
                  : serviceType === "design"
                    ? "Slot aktif / kapasitas layanan"
                    : "Stok awal"
              }
              defaultValue={0}
            />
          </div>

          <Textarea name="description" placeholder="Deskripsi produk" required rows={5} />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <input type="checkbox" name="featured" value="true" />
              Jadikan featured
            </label>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <input type="checkbox" name="is_active" value="true" defaultChecked />
              Produk aktif & tampil di katalog
            </label>
          </div>

          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              <ImagePlus className="h-4 w-4 text-amber-500" />
              Upload cover produk
              <input name="image" type="file" accept="image/*" className="hidden" required />
            </label>
          </div>

          {serviceType === "design" ? (
            <div className="space-y-3 rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 dark:border-emerald-400/15 dark:bg-emerald-400/8">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                <MessageCircleMore className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                <div className="font-bold">Pengaturan live chat jasa</div>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Masukkan UUID admin yang bertanggung jawab. Pisahkan dengan koma jika lebih dari satu admin.
              </p>
              <Input name="support_admin_ids" placeholder="UUID admin 1, UUID admin 2" />
              <Input name="external_link" placeholder="Link portofolio / brief form (opsional)" />
              <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-emerald-500/20 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-300">
                <input type="checkbox" name="live_chat_enabled" value="true" defaultChecked />
                Aktifkan live chat untuk produk ini
              </label>
            </div>
          ) : null}

          {serviceType === "pterodactyl" ? (
            <div className="space-y-3 rounded-[28px] border border-sky-500/20 bg-sky-500/10 p-5 dark:border-sky-400/15 dark:bg-sky-400/8">
              <div className="flex items-center gap-2 text-slate-950 dark:text-white">
                <ServerCog className="h-4 w-4 text-sky-600 dark:text-sky-300" />
                <div className="font-bold">Konfigurasi panel Pterodactyl</div>
              </div>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                Isi JSON resource panel supaya sistem bisa membuat server otomatis setelah pembayaran sukses.
              </p>
              <Textarea name="pterodactyl_config" rows={12} defaultValue={panelConfigExample} placeholder={panelConfigExample} />
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-slate-700 dark:text-slate-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                Produk panel akan tampil sebagai auto ready di katalog.
              </div>
            </div>
          ) : null}

          <Button className="w-full rounded-full" type="submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan produk"}
          </Button>
        </form>
      </div>
    </Card>
  );
}