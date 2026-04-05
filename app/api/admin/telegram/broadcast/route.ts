import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildTelegramBroadcastMessage, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const message = String(body.message ?? "").trim();
    if (message.length < 5) return NextResponse.json({ error: "Pesan terlalu pendek" }, { status: 400 });

    const { data: users } = await admin
      .from("telegram_users")
      .select("chat_id")
      .eq("is_blocked", false);

    let sentCount = 0;

    for (const item of users || []) {
      try {
        await sendTelegramMessage(item.chat_id, buildTelegramBroadcastMessage(message));
        sentCount += 1;
      } catch (error) {
        console.error("broadcast failed", item.chat_id, error);
      }
    }

    await admin.from("telegram_broadcasts").insert({
      admin_user_id: user.id,
      message,
      sent_count: sentCount
    });

    return NextResponse.json({ success: true, sentCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Broadcast gagal" },
      { status: 500 }
    );
  }
}
