"use client";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationPermission() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === 'default') setShow(true);
  }, []);

  async function enable() {
    try {
      await navigator.serviceWorker.register('/sw.js');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: undefined as any }).catch(() => null);
      if (sub) await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
      setShow(false);
    } catch {
      setShow(false);
    }
  }

  if (!show) return null;
  return <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-3xl border border-brand-500/20 bg-slate-950/95 p-5 shadow-2xl"><div className="flex items-start gap-3"><div className="rounded-2xl bg-brand-500/15 p-3 text-brand-300"><BellRing className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="font-semibold text-white">Aktifkan notifikasi</div><p className="mt-1 text-sm leading-6 text-slate-300">Notifikasi penting supaya Anda langsung tahu saat pembayaran sukses, admin membalas live chat, atau order panel sudah jadi. Ini membantu agar transaksi tidak terlewat.</p></div><button onClick={()=>setShow(false)} className="text-slate-400"><X className="h-4 w-4" /></button></div><div className="mt-4 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={()=>setShow(false)}>Nanti saja</Button><Button onClick={enable}>Izinkan</Button></div></div>;
}
