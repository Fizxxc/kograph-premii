import Link from "next/link";
import { MessageCircleMore, TimerReset } from "lucide-react";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/card";

function formatStatus(status?: string | null) {
  switch (status) {
    case "pending":
      return { label: "pending", className: "border-amber-300/20 bg-amber-300/10 text-amber-200" };
    case "closed":
      return { label: "closed", className: "border-white/10 bg-white/5 text-slate-300" };
    default:
      return { label: "open", className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" };
  }
}

export default async function LiveChatAdminPanel() {
  const admin = createAdminSupabaseClient();
  const { data: rooms } = await admin
    .from("live_chat_rooms")
    .select("id, room_code, customer_name, status, created_at, last_message_at")
    .order("last_message_at", { ascending: false })
    .limit(8);

  return (
    <Card className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,_rgba(4,14,30,0.98)_0%,_rgba(8,24,50,0.97)_58%,_rgba(13,38,73,0.96)_100%)] p-5 text-white shadow-[0_30px_90px_-45px_rgba(2,6,23,0.9)] sm:p-6 lg:p-7">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
              <MessageCircleMore className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Live chat ringkas</div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-[2rem]">Room terbaru yang perlu dipantau</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                Saat buyer masih tanya detail order atau briefing jasa, admin bisa cek room aktif dari sini lalu lanjut ke halaman chat penuh.
              </p>
            </div>
          </div>

          <Link href="/chat" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10">
            Buka semua room
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(rooms || []).length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
              Belum ada room aktif.
            </div>
          ) : null}

          {(rooms || []).map((room: any) => {
            const status = formatStatus(room.status);
            const lastTime = room.last_message_at || room.created_at;
            return (
              <Link key={room.id} href={`/chat/${room.id}`} className="group rounded-[28px] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:border-amber-300/20 hover:bg-white/[0.06]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-lg font-black text-white transition group-hover:text-amber-200">{room.customer_name || room.room_code || room.id}</div>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Room code: {room.room_code || room.id}</div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                  <TimerReset className="h-4 w-4 text-slate-400" />
                  Terakhir aktif: {lastTime ? new Date(lastTime).toLocaleString("id-ID") : "-"}
                </div>
                <div className="mt-4 inline-flex items-center text-sm font-semibold text-amber-200">Masuk ke room</div>
              </Link>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
