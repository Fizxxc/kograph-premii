import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size <= 0) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    const ext = file.name.split('.').pop() || 'png';
    const filename = `chat-${user.id}-${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("chat-images").upload(filename, buffer, { contentType: file.type || 'image/png', upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data } = admin.storage.from("chat-images").getPublicUrl(filename);
    return NextResponse.json({ success: true, url: data.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload gagal" }, { status: 500 });
  }
}
