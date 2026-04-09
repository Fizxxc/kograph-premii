"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketPercent, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  type: "fixed" | "percentage";
  value: number;
  min_purchase: number;
  max_discount: number | null;
  quota: number | null;
  used_count: number;
  is_active: boolean;
};

export function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function createCoupon(formData: FormData) {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        body: formData
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Gagal membuat kupon");

      toast.success("Kupon berhasil dibuat.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat kupon");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCoupon(id: string, nextActive: boolean) {
    const response = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: nextActive })
    });

    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error || "Gagal update kupon");
      return;
    }

    router.refresh();
  }

  async function deleteCoupon(id: string) {
    const ok = window.confirm("Hapus kupon ini?");
    if (!ok) return;

    const response = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    const json = await response.json();

    if (!response.ok) {
      toast.error(json.error || "Gagal hapus kupon");
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <div className="mb-4 flex items-center gap-2 text-white">
          <TicketPercent className="h-5 w-5 text-brand-300" />
          <span className="font-semibold">Buat Kupon</span>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await createCoupon(new FormData(e.currentTarget));
          }}
          className="space-y-4"
        >
          <Input name="code" placeholder="Kode kupon, contoh: WELCOME10" required />
          <select name="type" className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none">
            <option value="percentage" className="bg-slate-900">Percentage</option>
            <option value="fixed" className="bg-slate-900">Fixed</option>
          </select>
          <Input name="value" type="number" min="0" placeholder="Nilai diskon" required />
          <Input name="min_purchase" type="number" min="0" placeholder="Minimal belanja" defaultValue={0} />
          <Input name="max_discount" type="number" min="0" placeholder="Max diskon (opsional)" />
          <Input name="quota" type="number" min="1" placeholder="Kuota (opsional)" />
          <label className="inline-flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            Aktifkan sekarang
          </label>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Kupon"}</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-5 text-lg font-semibold text-white">Daftar Kupon</div>
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{coupon.code}</div>
                  <div className="mt-1 text-sm text-slate-300">
                    {coupon.type === "percentage" ? `${coupon.value}%` : `Rp ${Intl.NumberFormat("id-ID").format(coupon.value)}`}
                    {" • "}min belanja Rp {Intl.NumberFormat("id-ID").format(coupon.min_purchase)}
                    {" • "}terpakai {coupon.used_count}
                    {coupon.quota ? `/${coupon.quota}` : ""}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" className="h-9 px-3" onClick={() => toggleCoupon(coupon.id, !coupon.is_active)}>
                    {coupon.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="danger" className="h-9 px-3" onClick={() => deleteCoupon(coupon.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {coupons.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Belum ada kupon.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}