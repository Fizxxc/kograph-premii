import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

async function ensureAdmin() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      admin,
      user: null
    };
  }

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), admin, user };
  }

  return { admin, user, error: null };
}

function revalidateCatalog(productId: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/panel");
  revalidatePath("/admin");
  revalidatePath(`/products/${productId}`);
}

function parsePterodactylConfig(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Pterodactyl config harus berupa JSON yang valid.");
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const formData = await request.formData();
    const serviceType = String(formData.get("service_type") ?? "credential").trim();
    const stockInput = Number(formData.get("stock") ?? 0);

    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      stock: serviceType === "pterodactyl" ? 0 : stockInput,
      sold_count: Number(formData.get("sold_count") ?? 0),
      image_url: String(formData.get("image_url") ?? "").trim(),
      featured: formData.get("featured") ? true : false,
      service_type: serviceType,
      is_active: String(formData.get("is_active") ?? "true") !== "false",
      pterodactyl_config: parsePterodactylConfig(formData.get("pterodactyl_config")),
      live_chat_enabled: formData.get("live_chat_enabled") != null,
      support_admin_ids: String(formData.get("support_admin_ids") ?? "").split(",").map((x) => x.trim()).filter(Boolean),
      external_link: String(formData.get("external_link") ?? "").trim() || null
    };

    if (
      !payload.name ||
      !payload.category ||
      !payload.description ||
      payload.price < 0 ||
      payload.stock < 0 ||
      payload.sold_count < 0
    ) {
      return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      name: payload.name,
      category: payload.category,
      description: payload.description,
      price: payload.price,
      stock: payload.stock,
      sold_count: payload.sold_count,
      featured: payload.featured,
      service_type: payload.service_type,
      is_active: payload.is_active,
      pterodactyl_config: payload.pterodactyl_config,
      live_chat_enabled: payload.live_chat_enabled,
      support_admin_ids: payload.support_admin_ids,
      external_link: payload.external_link
    };

    if (payload.image_url) updatePayload.image_url = payload.image_url;

    const { error: updateError } = await admin.from("products").update(updatePayload).eq("id", params.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    revalidateCatalog(params.id);
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

    revalidateCatalog(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete gagal" },
      { status: 500 }
    );
  }
}
