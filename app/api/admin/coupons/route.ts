import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const type = String(formData.get("type") ?? "percentage") as "fixed" | "percentage";
    const value = Number(formData.get("value") ?? 0);
    const min_purchase = Number(formData.get("min_purchase") ?? 0);
    const max_discount_raw = String(formData.get("max_discount") ?? "").trim();
    const quota_raw = String(formData.get("quota") ?? "").trim();
    const is_active = formData.get("is_active") != null;

    if (!code || !["fixed", "percentage"].includes(type) || value <= 0) {
      return NextResponse.json({ error: "Data kupon tidak valid" }, { status: 400 });
    }

    const { error: insertError } = await admin.from("coupons").insert({
      code,
      type,
      value,
      min_purchase,
      max_discount: max_discount_raw ? Number(max_discount_raw) : null,
      quota: quota_raw ? Number(quota_raw) : null,
      is_active
    });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat kupon" },
      { status: 500 }
    );
  }
}
