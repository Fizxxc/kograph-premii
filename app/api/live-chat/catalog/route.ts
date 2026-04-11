import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isStockManagedService } from "@/lib/service-types";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: products, error } = await admin
    .from("products")
    .select("id, name, price, stock, service_type, is_active")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = (products || []).filter((item: any) => isStockManagedService(item.service_type) && Number(item.stock || 0) > 0);
  return NextResponse.json({ products: items });
}
