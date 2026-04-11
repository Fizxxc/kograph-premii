"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function LiveChatLauncher({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("Halo admin, saya tertarik dengan jasa ini. Saya ingin konsultasi dulu.");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function createRoom() {
    setLoading(true);
    try {
      const res = await fetch('/api/live-chat/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, message }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gagal membuka live chat');
      toast.success('Live chat berhasil dibuka.');
      router.push(`/chat/${json.roomId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuka live chat');
    } finally { setLoading(false); }
  }

  return <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300"><MessageCircleMore className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white">Live chat dengan admin produk</div>
        <p className="mt-1 text-sm leading-6 text-slate-300">Cocok untuk jasa desain atau edit. Room akan otomatis diteruskan ke admin yang bertanggung jawab pada produk ini.</p>
      </div>
    </div>
    {open ? <div className="mt-4 space-y-3"><Textarea rows={4} value={message} onChange={(e)=>setMessage(e.target.value)} /><div className="grid gap-2 sm:grid-cols-2"><Button variant="secondary" onClick={()=>setOpen(false)}>Tutup</Button><Button onClick={createRoom} disabled={loading}>{loading ? 'Membuka...' : 'Mulai chat sekarang'}</Button></div></div> : <Button className="mt-4 w-full" onClick={()=>setOpen(true)}>Buka live chat</Button>}
  </div>;
}
