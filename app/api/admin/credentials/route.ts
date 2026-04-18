import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isValidCredentialFormat } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const accounts = Array.isArray(body.accounts) ? body.accounts : [];

    const validAccounts = Array.from(
      new Set(
        accounts.map((value: unknown) => String(value).trim()).filter((v: string) => v && isValidCredentialFormat(v))
      )
    );

    if (!productId || validAccounts.length === 0) {
      return NextResponse.json({ error: "Tidak ada credential valid" }, { status: 400 });
    }

    const { data: product } = await admin
      .from("products")
      .select("id, service_type")
      .eq("id", productId)
      .maybeSingle();

    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    if (product.service_type === "pterodactyl") {
      return NextResponse.json({ error: "Produk panel auto ready tidak memakai credential manual." }, { status: 400 });
    }

    const payload = validAccounts.map((account) => ({
      product_id: productId,
      account_data: account,
      is_used: false
    }));

    const { error: insertError } = await admin.from("app_credentials").insert(payload);
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const { error: stockError } = await admin.rpc("increment_product_stock", {
      p_product_id: productId,
      p_amount: validAccounts.length
    });

    if (stockError) return NextResponse.json({ error: stockError.message }, { status: 500 });

    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/panel");
    revalidatePath("/admin");
    revalidatePath(`/products/${productId}`);

    return NextResponse.json({ success: true, inserted: validAccounts.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk upload gagal" },
      { status: 500 }
    );
  }
}
