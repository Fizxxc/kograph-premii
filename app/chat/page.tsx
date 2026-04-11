import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ChatRoomsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  let query = supabase
    .from("live_chat_rooms")
    .select("id, title, status, last_message_at, products(name), customer_user_id")
    .order("last_message_at", { ascending: false });
  if (profile?.role !== "admin") query = query.eq("customer_user_id", user.id);
  const { data: rooms } = await query;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Live Chat</div>
        <h1 className="mt-2 text-3xl font-bold text-white">Percakapan bantuan & jasa edit</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">Di sini Anda bisa melihat seluruh room aktif. Admin dapat membalas dari web atau lewat reply Telegram bot auto order. Customer cukup lanjut dari room yang sama.</p>
      </div>
      <div className="grid gap-4">
        {rooms?.length ? rooms.map((room: any) => (
          <Link key={room.id} href={`/chat/${room.id}`}>
            <Card className="hover:bg-white/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">{room.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{Array.isArray(room.products) ? room.products[0]?.name : room.products?.name}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div className="uppercase tracking-[0.2em] text-brand-200">{room.status}</div>
                  <div className="mt-1">{new Date(room.last_message_at).toLocaleString("id-ID")}</div>
                </div>
              </div>
            </Card>
          </Link>
        )) : <Card>Belum ada room live chat.</Card>}
      </div>
    </div>
  );
}
