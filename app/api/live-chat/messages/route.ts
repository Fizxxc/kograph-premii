import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push";
import { sendTelegramMessage } from "@/lib/telegram";

function parseTelegramAdminIds() {
  return String(process.env.TELEGRAM_ADMIN_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getAuth() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { user: null, admin, role: null, profile: null };
  const { data: profile } = await admin.from("profiles").select("role, full_name, telegram_id").eq("id", user.id).single();
  return { user, admin, role: profile?.role || "customer", profile };
}

export async function GET(request: Request) {
  const auth = await getAuth();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const roomId = String(searchParams.get("roomId") || "").trim();
  if (!roomId) return NextResponse.json({ error: "roomId wajib" }, { status: 400 });
  const { data: room } = await auth.admin.from("live_chat_rooms").select("id, customer_user_id, assigned_admin_id, title, status, products(name)").eq("id", roomId).single();
  if (!room) return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  if (auth.role !== "admin" && room.customer_user_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: messages, error } = await auth.admin.from("live_chat_messages").select("id, sender_user_id, sender_role, message, image_url, link_url, created_at, profiles(full_name)").eq("room_id", roomId).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ room, messages: messages || [], role: auth.role });
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const roomId = String(body.roomId || "").trim();
    const message = String(body.message || "").trim();
    const imageUrl = String(body.imageUrl || "").trim();
    const linkUrl = String(body.linkUrl || "").trim();
    if (!roomId || (!message && !imageUrl && !linkUrl)) return NextResponse.json({ error: "Pesan kosong" }, { status: 400 });

    const { data: room } = await auth.admin
      .from("live_chat_rooms")
      .select("id, customer_user_id, product_id, title, products(name), live_chat_room_admins(admin_user_id)")
      .eq("id", roomId)
      .single();
    if (!room) return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
    if (auth.role !== "admin" && room.customer_user_id !== auth.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await auth.admin.from("live_chat_messages").insert({
      room_id: roomId,
      sender_user_id: auth.user.id,
      sender_role: auth.role,
      message: message || null,
      image_url: imageUrl || null,
      link_url: linkUrl || null
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const roomUpdate: Record<string, string> = { last_message_at: new Date().toISOString() };
    if (auth.role === "admin") roomUpdate.assigned_admin_id = auth.user.id;
    await auth.admin.from("live_chat_rooms").update(roomUpdate).eq("id", roomId);

    const roomAdmins = Array.isArray((room as any).live_chat_room_admins) ? (room as any).live_chat_room_admins : [];
    const notifyTo = auth.role === "admin" ? [room.customer_user_id] : roomAdmins.map((x: any) => x.admin_user_id);
    await notifyUsers(notifyTo, auth.role === "admin" ? "Balasan admin baru" : "Pesan customer baru", message || (imageUrl ? "Mengirim gambar" : linkUrl), `/chat/${roomId}`);

    if (auth.role !== "admin") {
      const tgText = [
        `💬 <b>Pesan baru dari customer</b>`,
        `#ROOM:${roomId}`,
        "",
        `<b>Produk</b>: ${Array.isArray((room as any).products) ? (room as any).products[0]?.name : (room as any).products?.name || room.title}`,
        `<b>Nama</b>: ${auth.profile?.full_name || "Customer"}`,
        message ? `<b>Pesan</b>: ${message}` : imageUrl ? `<b>Pesan</b>: Mengirim gambar` : `<b>Pesan</b>: ${linkUrl}`,
        "",
        `Reply pesan ini untuk membalas customer dari Telegram.`
      ].join("\n");

      for (const chatId of parseTelegramAdminIds()) {
        await sendTelegramMessage(chatId, tgText, { bot: "auto", disable_web_page_preview: false }).catch(() => null);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal kirim pesan" }, { status: 500 });
  }
}
