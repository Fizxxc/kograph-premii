import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function ensureAdmin() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), admin, user: null };

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), admin, user };
  }

  return { admin, user, error: null };
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      stock: Number(formData.get("stock") ?? 0),
      image_url: String(formData.get("image_url") ?? "").trim(),
      featured: formData.get("featured") ? true : false
    };

    if (!payload.name || !payload.category || !payload.description || payload.price < 0 || payload.stock < 0) {
      return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      stock: payload.stock,
      featured: payload.featured
    };

    if (payload.image_url) updatePayload.image_url = payload.image_url;

    const { error: updateError } = await admin
      .from("products")
      .update(updatePayload)
      .eq("id", params.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update gagal" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const { error: deleteError } = await admin.from("products").delete().eq("id", params.id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete gagal" },
      { status: 500 }
    );
  }
}
