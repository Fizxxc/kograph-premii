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

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { admin, error } = await ensureAdmin();
  if (error) return error;

  try {
    const body = await request.json().catch(() => ({}));
    const mode = String(body.mode || "").trim();
    const amount = Number(body.amount ?? 0);
    const nextStock = Number(body.stock ?? 0);

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, stock, service_type")
      .eq("id", params.id)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (product.service_type === "pterodactyl") {
      return NextResponse.json({ error: "Produk panel auto ready tidak memakai stok manual." }, { status: 400 });
    }

    let updatedStock = Number(product.stock || 0);

    if (mode === "increment") {
      if (!Number.isFinite(amount) || amount === 0) {
        return NextResponse.json({ error: "Jumlah perubahan stok tidak valid." }, { status: 400 });
      }

      const { error: incrementError } = await admin.rpc("increment_product_stock", {
        p_product_id: params.id,
        p_amount: amount
      });

      if (incrementError) {
        return NextResponse.json({ error: incrementError.message }, { status: 500 });
      }

      updatedStock = Math.max(0, updatedStock + amount);
    } else if (mode === "set") {
      if (!Number.isFinite(nextStock) || nextStock < 0) {
        return NextResponse.json({ error: "Nilai stok baru tidak valid." }, { status: 400 });
      }

      const { error: updateError } = await admin
        .from("products")
        .update({ stock: nextStock })
        .eq("id", params.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updatedStock = nextStock;
    } else {
      return NextResponse.json({ error: "Mode update stok tidak dikenali." }, { status: 400 });
    }

    const { data: refreshedProduct } = await admin
      .from("products")
      .select("stock")
      .eq("id", params.id)
      .maybeSingle();

    revalidateCatalog(params.id);

    return NextResponse.json({ success: true, stock: Number(refreshedProduct?.stock ?? updatedStock) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui stok." },
      { status: 500 }
    );
  }
}
