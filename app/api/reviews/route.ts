import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildTelegramTestimonialMessage, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const rating = Number(body.rating ?? 0);
    const comment = String(body.comment ?? "").trim();

    if (!productId || rating < 1 || rating > 5 || comment.length < 3) {
      return NextResponse.json({ error: "Data review tidak valid" }, { status: 400 });
    }

    const { data: settledTransaction } = await admin
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .eq("status", "settlement")
      .limit(1)
      .maybeSingle();

    if (!settledTransaction) {
      return NextResponse.json({ error: "Anda hanya bisa review setelah transaksi settlement" }, { status: 403 });
    }

    const { data: existingReview } = await admin
      .from("reviews")
      .select("id")
      .eq("product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json({ error: "Anda sudah mereview produk ini" }, { status: 409 });
    }

    const { error } = await admin.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const [{ data: product }, { data: profile }] = await Promise.all([
      admin.from("products").select("name").eq("id", productId).single(),
      admin.from("profiles").select("full_name").eq("id", user.id).single()
    ]);

    const channelId = process.env.TELEGRAM_TESTIMONIAL_CHANNEL_ID;
    if (channelId) {
      try {
        await sendTelegramMessage(
          channelId,
          buildTelegramTestimonialMessage({
            productName: product?.name || "Produk Premium",
            customerName: profile?.full_name || "Verified Buyer",
            rating,
            comment
          })
        );
      } catch (e) {
        console.error("Telegram testimonial failed", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal kirim review" },
      { status: 500 }
    );
  }
}
