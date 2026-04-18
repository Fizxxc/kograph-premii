"use client";

import { useEffect, useMemo, useState } from "react";

export type PromoPopupPayload = {
  id: string;
  title: string;
  message: string;
  image_url?: string | null;
  button_label?: string | null;
  button_href?: string | null;
};

export default function PromoPopup({ popup }: { popup: PromoPopupPayload | null }) {
  const [open, setOpen] = useState(false);
  const storageKey = useMemo(() => `promo-popup-dismissed-${popup?.id || "none"}`, [popup?.id]);

  useEffect(() => {
    if (!popup) return;
    const dismissed = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
    if (!dismissed) {
      const timer = window.setTimeout(() => setOpen(true), 900);
      return () => window.clearTimeout(timer);
    }
  }, [popup, storageKey]);

  if (!popup || !open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 px-4 py-6" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-10 max-w-xl overflow-hidden rounded-[32px] border border-yellow-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        {popup.image_url ? (
          <img src={popup.image_url} alt={popup.title} className="h-56 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center bg-gradient-to-br from-yellow-300 via-amber-300 to-yellow-100 text-center text-slate-950">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.35em] text-yellow-700">Promo pilihan</div>
              <div className="mt-2 text-3xl font-black">Lebih hemat, lebih cepat</div>
            </div>
          </div>
        )}
        <div className="space-y-4 p-6">
          <div>
            <div className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-yellow-700">
              Penawaran hari ini
            </div>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{popup.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{popup.message}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {popup.button_href ? (
              <a href={popup.button_href} className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                {popup.button_label || "Lihat detail"}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.localStorage.setItem(storageKey, "1");
                setOpen(false);
              }}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Nanti saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
