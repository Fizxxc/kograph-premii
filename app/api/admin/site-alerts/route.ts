import { NextResponse } from "next/server";
import { requireAdminApi } from "@/app/api/admin/helpers";

export async function POST(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const body = await request.json();
    const payload = {
      title: String(body.title || "").trim(),
      message: String(body.message || "").trim(),
      tone: ["red", "yellow", "green"].includes(String(body.tone || "")) ? String(body.tone) : "yellow",
      is_active: Boolean(body.is_active)
    };
    if (!payload.title || !payload.message) return NextResponse.json({ error: "Judul dan pesan alert wajib diisi." }, { status: 400 });
    if (payload.is_active) await admin.from("site_alerts").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    const { data, error } = await admin.from("site_alerts").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal menyimpan alert." }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const body = await request.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "ID alert wajib diisi." }, { status: 400 });
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : undefined;
    if (isActive) await admin.from("site_alerts").update({ is_active: false }).neq("id", id);
    const updatePayload: Record<string, unknown> = {};
    ["title", "message", "tone"].forEach((key) => {
      if (body[key] !== undefined) updatePayload[key] = String(body[key] || "").trim() || null;
    });
    if (isActive !== undefined) updatePayload.is_active = isActive;
    const { data, error } = await admin.from("site_alerts").update(updatePayload).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal mengubah alert." }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const { admin } = await requireAdminApi();
    const url = new URL(request.url);
    const id = String(url.searchParams.get("id") || "").trim();
    if (!id) return NextResponse.json({ error: "ID alert wajib diisi." }, { status: 400 });
    const { error } = await admin.from("site_alerts").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error?.message === "UNAUTHORIZED" ? 401 : error?.message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: error?.message || "Gagal menghapus alert." }, { status });
  }
}
