import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { notifyUsers } from "@/lib/push";

async function getAuth() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, admin, role: null };
  const { data: profile } = await admin.from("profiles").select("role, full_name").eq("id", user.id).single();
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

    const { data: room } = await auth.admin.from("live_chat_rooms").select("id, customer_user_id, product_id, title").eq("id", roomId).single();
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

    await auth.admin.from("live_chat_rooms").update({ last_message_at: new Date().toISOString(), assigned_admin_id: auth.role === "admin" ? auth.user.id : undefined }).eq("id", roomId);
    const { data: admins } = await auth.admin.from("live_chat_room_admins").select("admin_user_id").eq("room_id", roomId);
    const notifyTo = auth.role === "admin" ? [room.customer_user_id] : (admins || []).map((x: any) => x.admin_user_id);
    await notifyUsers(notifyTo, auth.role === "admin" ? "Balasan admin baru" : "Pesan customer baru", message || (imageUrl ? "Mengirim gambar" : linkUrl), `/chat/${roomId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal kirim pesan" }, { status: 500 });
  }
}
