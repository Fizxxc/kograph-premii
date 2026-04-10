import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { setTelegramWebhook } from "@/lib/telegram";

export async function POST() {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL belum diisi" }, { status: 400 });
    const resultCheck = await setTelegramWebhook(`${appUrl}/api/telegram/webhook`, "check");
    let resultAuto: unknown = null;
    if (process.env.TELEGRAM_AUTO_ORDER_BOT_TOKEN) resultAuto = await setTelegramWebhook(`${appUrl}/api/telegram/auto-order-webhook`, "auto");
    return NextResponse.json({ success: true, resultCheck, resultAuto });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Set webhook gagal" }, { status: 500 });
  }
}
