import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function parsePterodactylConfig(raw: FormDataEntryValue | null) { const text = String(raw ?? "").trim(); if (!text) return null; try { return JSON.parse(text); } catch { throw new Error("Pterodactyl config harus berupa JSON yang valid."); } }

function revalidateCatalog(productId?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/panel");
  revalidatePath("/admin");
  if (productId) revalidatePath(`/products/${productId}`);
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = Number(formData.get("price") ?? 0);
    const featured = String(formData.get("featured") ?? "") === "true";
    const service_type = String(formData.get("service_type") ?? "credential").trim();
    const sold_count = Number(formData.get("sold_count") ?? 0);
    const stockInput = Number(formData.get("stock") ?? 0);
    const is_active = String(formData.get("is_active") ?? "true") !== "false";
    const pterodactyl_config = parsePterodactylConfig(formData.get("pterodactyl_config"));
    const support_admin_ids = String(formData.get("support_admin_ids") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const live_chat_enabled = formData.get("live_chat_enabled") != null;
    const external_link = String(formData.get("external_link") ?? "").trim() || null;
    const image = formData.get("image") as File | null;
    if (!name || !category || !description || !image || price < 0 || sold_count < 0 || stockInput < 0) return NextResponse.json({ error: "Data produk tidak valid" }, { status: 400 });

    const fileExt = image.name.split(".").pop() || "jpg";
    const fileName = `product-${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
    const fileBuffer = Buffer.from(await image.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("product-images").upload(fileName, fileBuffer, { contentType: image.type || "image/jpeg", upsert: false });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
    const { data: { publicUrl } } = admin.storage.from("product-images").getPublicUrl(fileName);

    const stock = service_type === "pterodactyl" ? 0 : stockInput;
    const { data: createdProduct, error: insertError } = await admin.from("products").insert({ name, category, description, price, stock, image_url: publicUrl, featured, service_type, sold_count, pterodactyl_config, is_active, live_chat_enabled, support_admin_ids, external_link }).select("id").single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    revalidateCatalog(createdProduct.id);
    return NextResponse.json({ success: true, productId: createdProduct.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat produk" }, { status: 500 }); }
}
