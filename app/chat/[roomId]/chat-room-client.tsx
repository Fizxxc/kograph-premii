"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Link2, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ChatRoomClient({ roomId }: { roomId: string }) {
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch(`/api/live-chat/messages?roomId=${roomId}`, { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Gagal memuat chat');
    setData(json);
  }
  useEffect(()=>{ load().catch((e)=>toast.error(e.message)); const id=setInterval(()=>load().catch(()=>null),5000); return ()=>clearInterval(id); },[roomId]);
  useEffect(()=>{ listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); },[data?.messages?.length]);

  async function send(imageUrl?: string) {
    if (!message.trim() && !linkUrl.trim() && !imageUrl) return;
    setSending(true);
    try {
      const res = await fetch('/api/live-chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, message, linkUrl, imageUrl }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal kirim');
      setMessage(''); setLinkUrl('');
      await load();
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Gagal kirim'); }
    finally { setSending(false); }
  }

  async function upload(file?: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/live-chat/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload gagal');
      await send(json.url);
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Upload gagal'); }
    finally { setUploading(false); }
  }

  const roomTitle = useMemo(()=>data?.room ? (Array.isArray(data.room.products)?data.room.products[0]?.name:data.room.products?.name) : 'Live chat', [data]);
  return <div className="space-y-4"><div className="rounded-3xl border border-white/10 bg-white/5 p-5"><div className="text-sm uppercase tracking-[0.2em] text-slate-400">Room aktif</div><h1 className="mt-2 text-2xl font-bold text-white">{data?.room?.title || roomTitle}</h1><p className="mt-2 text-sm text-slate-300">Link di chat bisa dibuka langsung di modal browser internal tanpa pindah halaman utama.</p></div><div ref={listRef} className="max-h-[60vh] space-y-3 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/60 p-4">{data?.messages?.map((item:any)=><div key={item.id} className={`max-w-[88%] rounded-3xl border p-4 ${item.sender_role==='admin' ? 'ml-auto border-brand-500/20 bg-brand-500/10' : 'border-white/10 bg-white/5'}`}><div className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.sender_role} • {new Date(item.created_at).toLocaleString('id-ID')}</div>{item.message && <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-100">{item.message}</div>}{item.image_url && <img src={item.image_url} alt="chat image" className="mt-3 max-h-72 rounded-2xl object-cover" />}{item.link_url && <button className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-200" onClick={()=>setPreviewUrl(item.link_url)}>{item.link_url}</button>}</div>)}</div><div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4"><Textarea rows={4} placeholder="Tulis pesan ke admin..." value={message} onChange={(e)=>setMessage(e.target.value)} /><div className="flex gap-2"><div className="relative flex-1"><Link2 className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Tempel link jika ada referensi" value={linkUrl} onChange={(e)=>setLinkUrl(e.target.value)} /></div><label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-white/15 px-4 text-white"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" onChange={(e)=>upload(e.target.files?.[0] || null)} /></label><Button onClick={()=>send()} disabled={sending || uploading}>{sending || uploading ? 'Mengirim...' : <Send className="h-4 w-4" />}</Button></div></div>{previewUrl && <div className="fixed inset-0 z-50 bg-slate-950/80 p-4"><div className="mx-auto flex h-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-slate-950"><div className="flex items-center justify-between border-b border-white/10 p-3"><div className="text-sm text-slate-300 break-all">{previewUrl}</div><button className="rounded-2xl border border-white/10 p-2 text-white" onClick={()=>setPreviewUrl(null)}><X className="h-4 w-4" /></button></div><iframe src={previewUrl} className="h-full w-full rounded-b-3xl" /></div></div>}</div>;
}
