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

async function getAuthed() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { user: null, admin, role: null, profile: null };
  const { data: profile } = await admin.from("profiles").select("role, full_name, telegram_id").eq("id", user.id).single();
  return { user, admin, role: profile?.role || "customer", profile };
}

export async function GET() {
  const auth = await getAuthed();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let query = auth.admin
    .from("live_chat_rooms")
    .select("id, title, status, product_id, customer_user_id, assigned_admin_id, last_message_at, created_at, products(name)")
    .order("last_message_at", { ascending: false });
  if (auth.role !== "admin") query = query.eq("customer_user_id", auth.user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rooms: data || [], role: auth.role });
}

export async function POST(request: Request) {
  const auth = await getAuthed();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const productId = String(body.productId || "").trim();
    const openerMessage = String(body.message || "").trim();
    if (!productId || openerMessage.length < 3) return NextResponse.json({ error: "Produk dan pesan wajib diisi" }, { status: 400 });

    const { data: product } = await auth.admin
      .from("products")
      .select("id, name, live_chat_enabled, support_admin_ids")
      .eq("id", productId)
      .single();
    if (!product || !product.live_chat_enabled) return NextResponse.json({ error: "Live chat belum aktif untuk produk ini" }, { status: 400 });

    const { data: room, error: roomError } = await auth.admin
      .from("live_chat_rooms")
      .insert({
        product_id: product.id,
        customer_user_id: auth.user.id,
        telegram_chat_id: auth.profile?.telegram_id || null,
        title: `Chat ${product.name}`,
        status: "open"
      })
      .select("id")
      .single();
    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });

    let adminIds = Array.isArray(product.support_admin_ids) ? product.support_admin_ids.filter(Boolean) : [];
    if (!adminIds.length) {
      const { data: allAdmins } = await auth.admin.from("profiles").select("id").eq("role", "admin");
      adminIds = (allAdmins || []).map((item: any) => item.id);
    }

    if (adminIds.length) {
      const { error: roomAdminsError } = await auth.admin.from("live_chat_room_admins").insert(
        adminIds.map((adminId: string) => ({ room_id: room.id, admin_user_id: adminId }))
      );
      if (roomAdminsError) console.error("Failed to insert live chat room admins:", roomAdminsError);
    }

    await auth.admin.from("live_chat_messages").insert({
      room_id: room.id,
      sender_user_id: auth.user.id,
      sender_role: auth.role,
      message: openerMessage
    });

    await notifyUsers(adminIds, `Chat baru: ${product.name}`, openerMessage, `/chat/${room.id}`);

    const webUrl = `${String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/chat/${room.id}`;
    const telegramNotice = [
      `💬 <b>Room chat baru masuk</b>`,
      `#ROOM:${room.id}`,
      "",
      `<b>Produk</b>: ${product.name}`,
      `<b>Nama customer</b>: ${auth.profile?.full_name || "Customer"}`,
      `<b>Pesan awal</b>: ${openerMessage}`,
      "",
      `Balas pesan ini untuk membalas customer dari Telegram, atau buka web: ${webUrl}`
    ].join("\n");

    for (const chatId of parseTelegramAdminIds()) {
      await sendTelegramMessage(chatId, telegramNotice, { bot: "auto", disable_web_page_preview: false }).catch(() => null);
    }

    return NextResponse.json({ success: true, roomId: room.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuka room chat" }, { status: 500 });
  }
}
