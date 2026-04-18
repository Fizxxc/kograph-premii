"use client";

import { useEffect, useMemo, useState } from "react";

const REDIRECT_URL = "https://kographpremiapp.vercel.app";

export function MaintenanceRedirect() {
  const [secondsLeft, setSecondsLeft] = useState(6);

  useEffect(() => {
    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    const redirectTimer = window.setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, 6000);

    return () => {
      window.clearInterval(countdownTimer);
      window.clearTimeout(redirectTimer);
    };
  }, []);

  const countdownText = useMemo(() => {
    if (secondsLeft <= 0) return "Mengalihkan sekarang...";
    return `Redirect otomatis dalam ${secondsLeft} detik...`;
  }, [secondsLeft]);

  return (
    <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
      <div className="font-semibold text-white">Website utama sudah dipindahkan ke domain terbaru.</div>
      <div className="mt-2 text-emerald-100/90">{countdownText}</div>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={REDIRECT_URL}
          className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
        >
          Buka Website Terbaru
        </a>
        <button
          type="button"
          onClick={() => {
            window.location.href = REDIRECT_URL;
          }}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Redirect Sekarang
        </button>
      </div>
    </div>
  );
}
