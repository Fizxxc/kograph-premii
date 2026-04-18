import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const roomId = String(body.roomId || "").trim();
  const productId = String(body.productId || "").trim();
  const paymentMethod = String(body.paymentMethod || "midtrans").trim().toLowerCase();
  if (!roomId || !productId) return NextResponse.json({ error: "roomId dan productId wajib diisi" }, { status: 400 });

  const origin = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const checkoutResponse = await fetch(`${origin}/api/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: request.headers.get("cookie") || ""
    },
    body: JSON.stringify({ productId, paymentMethod, roomId })
  });
  const json = await checkoutResponse.json();
  if (!checkoutResponse.ok) return NextResponse.json(json, { status: checkoutResponse.status });

  const paymentUrl = json.snapRedirectUrl || json.paymentQrUrl || `${origin}${json.redirectUrl || `/waiting-payment/${json.orderId}`}`;
  await admin.from("live_chat_messages").insert({
    room_id: roomId,
    sender_user_id: null,
    sender_role: "system",
    message: `🛒 Order dibuat untuk produk ini. Silakan lanjutkan pembayaran dari tombol atau link yang tersedia.\n\nOrder ID: ${json.orderId}\nMetode: ${paymentMethod.toUpperCase()}`,
    link_url: paymentUrl
  });
  await admin.from("live_chat_rooms").update({ last_message_at: new Date().toISOString() }).eq("id", roomId);

  return NextResponse.json({ success: true, ...json, paymentUrl });
}
