"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Link2, Send, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/utils";

export function ChatRoomClient({ roomId }: { roomId: string }) {
  const [data, setData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/live-chat/messages?roomId=${roomId}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Gagal memuat chat");
    setData(json);
  }

  async function loadCatalog() {
    const res = await fetch("/api/live-chat/catalog", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setCatalog(json.products || []);
  }

  useEffect(() => {
    load().catch((e) => toast.error(e.message));
    loadCatalog().catch(() => null);
    const id = setInterval(() => load().catch(() => null), 5000);
    return () => clearInterval(id);
  }, [roomId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [data?.messages?.length]);

  async function send(imageUrl?: string) {
    if (!message.trim() && !linkUrl.trim() && !imageUrl) return;
    setSending(true);
    try {
      const res = await fetch("/api/live-chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, message, linkUrl, imageUrl })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal kirim");
      setMessage("");
      setLinkUrl("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal kirim");
    } finally {
      setSending(false);
    }
  }

  async function upload(file?: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/live-chat/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload gagal");
      await send(json.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setUploading(false);
    }
  }

  async function orderFromChat(productId: string) {
    const paymentMethod = "qris" as const;
    setOrdering(`${productId}:${paymentMethod}`);
    try {
      const res = await fetch("/api/live-chat/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, productId, paymentMethod })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat order");
      toast.success("QRIS pembayaran sudah dikirim ke room chat.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat order");
    } finally {
      setOrdering(null);
    }
  }

  const roomTitle = useMemo(
    () => (data?.room ? (Array.isArray(data.room.products) ? data.room.products[0]?.name : data.room.products?.name) : "Live chat"),
    [data]
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Room aktif</div>
          <h1 className="mt-2 text-2xl font-bold text-white">{data?.room?.title || roomTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Semua admin bisa melihat room ini. Anda bisa briefing, kirim referensi, upload gambar, lalu lanjut order langsung dari chat saat sudah siap.
          </p>
        </div>

        <div className="rounded-[28px] border border-brand-500/20 bg-brand-500/10 p-5">
          <div className="flex items-center gap-2 text-white"><ShoppingCart className="h-4 w-4 text-brand-200" />Order langsung dari live chat</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">Hanya produk yang ready stock yang ditampilkan di sini supaya checkout lebih cepat dan jelas.</p>
          <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {catalog.length ? catalog.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-white">🛒 {item.name}</div>
                    <div className="mt-1 text-sm text-slate-300">{formatRupiah(item.price)} • stok {item.stock}</div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  <Button disabled={ordering !== null} onClick={() => orderFromChat(item.id)}>
                    {ordering === `${item.id}:qris` ? "Memproses..." : "Bayar via QRIS dinamis"}
                  </Button>
                </div>
              </div>
            )) : <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Belum ada produk ready stock untuk order cepat dari chat.</div>}
          </div>
        </div>
      </div>

      <div ref={listRef} className="max-h-[60vh] space-y-3 overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/60 p-4">
        {data?.messages?.map((item: any) => {
          const isAdmin = item.sender_role === "admin";
          const isSystem = item.sender_role === "system";
          return (
            <div key={item.id} className={`max-w-[88%] rounded-[24px] border p-4 ${isAdmin ? "ml-auto border-brand-500/20 bg-brand-500/10" : isSystem ? "mx-auto border-emerald-500/20 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
              <div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.sender_role} • {new Date(item.created_at).toLocaleString("id-ID")}</div>
              {item.message && <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">{item.message}</div>}
              {item.image_url && <img src={item.image_url} alt="chat image" className="mt-3 max-h-72 rounded-2xl object-cover" />}
              {item.link_url && (
                <button className="mt-3 flex items-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200" onClick={() => setPreviewUrl(item.link_url)}>
                  <ExternalLink className="h-4 w-4" />Buka link / pembayaran
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
        <Textarea rows={4} placeholder="Tulis pesan ke admin..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[240px] flex-1">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Tempel link jika ada referensi" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            </div>
          </div>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-white/15 px-4 text-white">
            <ImagePlus className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0] || null)} />
          </label>
          <Button onClick={() => send()} disabled={sending || uploading}>{sending || uploading ? "Mengirim..." : <Send className="h-4 w-4" />}</Button>
        </div>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-4">
          <div className="mx-auto flex h-full max-w-5xl flex-col rounded-[28px] border border-white/10 bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div className="break-all text-sm text-slate-300">{previewUrl}</div>
              <button className="rounded-2xl border border-white/10 p-2 text-white" onClick={() => setPreviewUrl(null)}><X className="h-4 w-4" /></button>
            </div>
            <iframe src={previewUrl} className="h-full w-full rounded-b-[28px]" />
          </div>
        </div>
      )}
    </div>
  );
}
