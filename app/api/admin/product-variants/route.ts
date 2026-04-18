import { NextResponse } from "next/server";
import { requireAdminApi } from "@/app/api/admin/helpers";

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const body = await request.json();
    const payload = {
      product_id: String(body.product_id || "").trim(),
      name: String(body.name || "").trim(),
      price: Number(body.price || 0),
      compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : null,
      duration_label: String(body.duration_label || "").trim() || null,
      short_description: String(body.short_description || "").trim() || null,
      sort_order: Number(body.sort_order || 0),
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
      is_active: body.is_active !== false
    };
    if (!payload.product_id || !payload.name || payload.price <= 0) {
      return NextResponse.json({ error: "Produk, nama varian, dan harga wajib valid." }, { status: 400 });
    }

    const { data, error } = await admin.from("product_variants").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal menambah varian." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID varian wajib diisi." }, { status: 400 });

    const updatePayload: Record<string, unknown> = {};
    ["name", "duration_label", "short_description"].forEach((key) => {
      if (body[key] !== undefined) updatePayload[key] = String(body[key] || "").trim() || null;
    });
    ["price", "compare_at_price", "sort_order"].forEach((key) => {
      if (body[key] !== undefined && body[key] !== "") updatePayload[key] = Number(body[key]);
    });
    if (body.is_active !== undefined) updatePayload.is_active = Boolean(body.is_active);
    if (body.metadata !== undefined) updatePayload.metadata = body.metadata;

    const { data, error } = await admin.from("product_variants").update(updatePayload).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal mengubah varian." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "ID varian wajib diisi." }, { status: 400 });
    const { error } = await admin.from("product_variants").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal menghapus varian." }, { status });
  }
}
