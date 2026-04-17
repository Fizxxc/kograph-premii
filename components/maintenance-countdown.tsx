"use client";

import { useEffect, useMemo, useState } from "react";

const TARGET_ISO = "2026-04-22T22:00:00+07:00";

function getTimeLeft() {
  const target = new Date(TARGET_ISO).getTime();
  const now = Date.now();
  const diff = Math.max(target - now, 0);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { diff, days, hours, minutes, seconds };
}

export function MaintenanceCountdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const items = useMemo(
    () => [
      { label: "Hari", value: timeLeft.days },
      { label: "Jam", value: timeLeft.hours },
      { label: "Menit", value: timeLeft.minutes },
      { label: "Detik", value: timeLeft.seconds }
    ],
    [timeLeft]
  );

  if (timeLeft.diff <= 0) {
    return (
      <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5 text-center text-sm text-emerald-100">
        Maintenance telah berakhir. Website dijadwalkan kembali normal.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center backdrop-blur-xl">
          <div className="text-3xl font-black text-white sm:text-4xl">{String(item.value).padStart(2, "0")}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
