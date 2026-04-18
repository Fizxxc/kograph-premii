"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BadgeAlert, ImageIcon, Loader2, Megaphone, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type PopupItem = {
  id: string;
  title: string;
  message: string;
  image_url?: string | null;
  button_label?: string | null;
  button_href?: string | null;
  is_active?: boolean;
  updated_at?: string | null;
};

type AlertItem = {
  id: string;
  title: string;
  message: string;
  tone: "red" | "yellow" | "green";
  is_active?: boolean;
  updated_at?: string | null;
};

const popupInitial = {
  title: "",
  message: "",
  image_url: "",
  button_label: "",
  button_href: "",
  is_active: true
};

const alertInitial = {
  title: "",
  message: "",
  tone: "yellow",
  is_active: true
};

function toneClass(tone: string) {
  if (tone === "red") return "border-red-400/20 bg-red-400/10 text-red-200";
  if (tone === "green") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  return "border-amber-300/20 bg-amber-300/10 text-amber-200";
}

export default function SiteSettingsManager({ popups, alerts }: { popups: PopupItem[]; alerts: AlertItem[] }) {
  const router = useRouter();
  const [popupForm, setPopupForm] = useState(popupInitial);
  const [alertForm, setAlertForm] = useState(alertInitial);
  const [loading, setLoading] = useState(false);
  const [editingPopup, setEditingPopup] = useState<PopupItem | null>(null);
  const [editingAlert, setEditingAlert] = useState<AlertItem | null>(null);
  const [deleteType, setDeleteType] = useState<"popup" | "alert" | null>(null);
  const [deleteId, setDeleteId] = useState<string>("");
  const [deleteLabel, setDeleteLabel] = useState<string>("");

  async function submitPopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/admin/site-popups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(popupForm)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menyimpan popup."));
      toast.success("Popup promo berhasil disimpan.");
      setPopupForm(popupInitial);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan popup.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await fetch("/api/admin/site-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(alertForm)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menyimpan alert."));
      toast.success("Alert situs berhasil disimpan.");
      setAlertForm(alertInitial);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menyimpan alert.");
    } finally {
      setLoading(false);
    }
  }

  async function savePopup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPopup) return;
    try {
      setLoading(true);
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/site-popups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPopup.id,
          ...payload,
          is_active: payload.is_active === "on"
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal mengubah popup."));
      toast.success("Popup berhasil diperbarui.");
      setEditingPopup(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal mengubah popup.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingAlert) return;
    try {
      setLoading(true);
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch("/api/admin/site-alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAlert.id,
          ...payload,
          is_active: payload.is_active === "on"
        })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal mengubah alert."));
      toast.success("Alert berhasil diperbarui.");
      setEditingAlert(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal mengubah alert.");
    } finally {
      setLoading(false);
    }
  }

  async function removeItem() {
    if (!deleteType || !deleteId) return;
    try {
      setLoading(true);
      const endpoint = deleteType === "popup" ? "/api/admin/site-popups" : "/api/admin/site-alerts";
      const response = await fetch(`${endpoint}?id=${deleteId}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(json.error || "Gagal menghapus item."));
      toast.success(`${deleteType === "popup" ? "Popup" : "Alert"} berhasil dihapus.`);
      setDeleteId("");
      setDeleteType(null);
      setDeleteLabel("");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Gagal menghapus item.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(4,14,31,0.98)_0%,_rgba(9,24,49,0.97)_55%,_rgba(14,39,71,0.95)_100%)] p-5 text-white shadow-[0_30px_90px_-45px_rgba(2,6,23,0.9)] sm:p-6 lg:p-7">
        <div className="mb-6">
          <div className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-amber-200">
            Promo & alert situs
          </div>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-[2rem]">Kelola popup penawaran dan pemberitahuan penting dari dashboard.</h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            Popup cocok untuk promo atau pengumuman ringan. Alert dipakai untuk status situs: darurat merah, waspada kuning, atau normal hijau.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Popup promosi</div>
                <div className="mt-1 text-xl font-black text-white">Atur promo yang tampil saat halaman dibuka.</div>
              </div>
            </div>

            <form onSubmit={submitPopup} className="mt-5 grid gap-4">
              <Input value={popupForm.title} onChange={(e) => setPopupForm((s) => ({ ...s, title: e.target.value }))} placeholder="Judul popup" />
              <Textarea value={popupForm.message} onChange={(e) => setPopupForm((s) => ({ ...s, message: e.target.value }))} placeholder="Isi promo" rows={4} />
              <Input value={popupForm.image_url} onChange={(e) => setPopupForm((s) => ({ ...s, image_url: e.target.value }))} placeholder="Link gambar (opsional)" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input value={popupForm.button_label} onChange={(e) => setPopupForm((s) => ({ ...s, button_label: e.target.value }))} placeholder="Label tombol" />
                <Input value={popupForm.button_href} onChange={(e) => setPopupForm((s) => ({ ...s, button_href: e.target.value }))} placeholder="Link tombol" />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm text-slate-200">
                <input type="checkbox" checked={popupForm.is_active} onChange={(e) => setPopupForm((s) => ({ ...s, is_active: e.target.checked }))} />
                Jadikan popup aktif sekarang
              </label>
              <Button type="submit" disabled={loading || !popupForm.title || !popupForm.message} className="w-fit rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Menyimpan..." : "Simpan popup"}
              </Button>
            </form>

            <div className="mt-6 grid gap-3">
              {popups.map((popup) => (
                <div key={popup.id} className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-white">{popup.title}</div>
                        {popup.is_active ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">aktif</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{popup.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                        {popup.image_url ? <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" /> Ada gambar</span> : null}
                        {popup.button_label ? <span>Tombol: {popup.button_label}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-9 rounded-full px-4" onClick={() => setEditingPopup(popup)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="h-9 rounded-full px-4"
                        onClick={() => {
                          setDeleteType("popup");
                          setDeleteId(popup.id);
                          setDeleteLabel(popup.title);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-200">
                <BadgeAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Alert situs</div>
                <div className="mt-1 text-xl font-black text-white">Pilih mode darurat, waspada, atau normal.</div>
              </div>
            </div>

            <form onSubmit={submitAlert} className="mt-5 grid gap-4">
              <Input value={alertForm.title} onChange={(e) => setAlertForm((s) => ({ ...s, title: e.target.value }))} placeholder="Judul alert" />
              <Textarea value={alertForm.message} onChange={(e) => setAlertForm((s) => ({ ...s, message: e.target.value }))} placeholder="Isi alert" rows={4} />
              <select
                value={alertForm.tone}
                onChange={(e) => setAlertForm((s) => ({ ...s, tone: e.target.value as "red" | "yellow" | "green" }))}
                className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10"
              >
                <option className="bg-slate-900 text-white" value="red">Darurat - Merah</option>
                <option className="bg-slate-900 text-white" value="yellow">Waspada - Kuning</option>
                <option className="bg-slate-900 text-white" value="green">Normal - Hijau</option>
              </select>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm text-slate-200">
                <input type="checkbox" checked={alertForm.is_active} onChange={(e) => setAlertForm((s) => ({ ...s, is_active: e.target.checked }))} />
                Tampilkan alert aktif sekarang
              </label>
              <Button type="submit" disabled={loading || !alertForm.title || !alertForm.message} className="w-fit rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? "Menyimpan..." : "Simpan alert"}
              </Button>
            </form>

            <div className="mt-6 grid gap-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-[22px] border border-white/10 bg-slate-950/25 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-bold text-white">{alert.title}</div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass(alert.tone)}`}>{alert.tone}</span>
                        {alert.is_active ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">aktif</span> : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{alert.message}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="h-9 rounded-full px-4" onClick={() => setEditingAlert(alert)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        className="h-9 rounded-full px-4"
                        onClick={() => {
                          setDeleteType("alert");
                          setDeleteId(alert.id);
                          setDeleteLabel(alert.title);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {editingPopup ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(4,14,30,0.98)_0%,_rgba(8,23,51,0.97)_58%,_rgba(12,34,69,0.96)_100%)] p-5 text-white shadow-[0_40px_120px_-55px_rgba(0,0,0,0.95)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Edit popup</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-white">{editingPopup.title}</div>
              </div>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={() => setEditingPopup(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={savePopup} className="grid gap-4">
              <Input name="title" defaultValue={editingPopup.title} />
              <Textarea name="message" defaultValue={editingPopup.message} rows={4} />
              <Input name="image_url" defaultValue={editingPopup.image_url || ""} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="button_label" defaultValue={editingPopup.button_label || ""} />
                <Input name="button_href" defaultValue={editingPopup.button_href || ""} />
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm text-slate-200">
                <input type="checkbox" name="is_active" defaultChecked={editingPopup.is_active} />
                Jadikan popup aktif sekarang
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Menyimpan..." : "Simpan perubahan"}
                </Button>
                <Button type="button" variant="secondary" className="rounded-full px-6" onClick={() => setEditingPopup(null)}>
                  Tutup
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editingAlert ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(4,14,30,0.98)_0%,_rgba(8,23,51,0.97)_58%,_rgba(12,34,69,0.96)_100%)] p-5 text-white shadow-[0_40px_120px_-55px_rgba(0,0,0,0.95)] sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Edit alert</div>
                <div className="mt-2 text-2xl font-black tracking-tight text-white">{editingAlert.title}</div>
              </div>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white" onClick={() => setEditingAlert(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveAlert} className="grid gap-4">
              <Input name="title" defaultValue={editingAlert.title} />
              <Textarea name="message" defaultValue={editingAlert.message} rows={4} />
              <select name="tone" defaultValue={editingAlert.tone} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition focus:border-amber-300/40 focus:ring-2 focus:ring-amber-300/10">
                <option className="bg-slate-900 text-white" value="red">Darurat - Merah</option>
                <option className="bg-slate-900 text-white" value="yellow">Waspada - Kuning</option>
                <option className="bg-slate-900 text-white" value="green">Normal - Hijau</option>
              </select>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm text-slate-200">
                <input type="checkbox" name="is_active" defaultChecked={editingAlert.is_active} />
                Tampilkan alert aktif sekarang
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={loading} className="rounded-full bg-amber-300 px-6 text-slate-950 hover:bg-amber-200 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Menyimpan..." : "Simpan perubahan"}
                </Button>
                <Button type="button" variant="secondary" className="rounded-full px-6" onClick={() => setEditingAlert(null)}>
                  Tutup
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteType && deleteId)}
        title={`Hapus ${deleteType === "popup" ? "popup" : "alert"}`}
        description={`${deleteLabel || "Item"} akan dihapus permanen.`}
        confirmText="Ya, hapus"
        cancelText="Batal"
        onCancel={() => {
          setDeleteType(null);
          setDeleteId("");
          setDeleteLabel("");
        }}
        onConfirm={removeItem}
        loading={loading}
      />
    </>
  );
}
