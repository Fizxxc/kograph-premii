import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function ensureAdmin() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { admin, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { admin, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  return { admin, error: null };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { error: updateError } = await admin.from("coupons").update(body).eq("id", params.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update kupon gagal" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const { error: deleteError } = await admin.from("coupons").delete().eq("id", params.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete kupon gagal" },
      { status: 500 }
    );
  }
}
