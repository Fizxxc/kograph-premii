import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { exportTransactionsToExcel } from "@/lib/export-to-excel";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: transactions } = await admin
      .from("transactions")
      .select(`
        order_id,
        amount,
        discount_amount,
        final_amount,
        coupon_code,
        status,
        created_at,
        products ( name ),
        profiles ( full_name )
      `)
      .order("created_at", { ascending: false });

    const rows = transactions?.map((row) => {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;
      const customer = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

      return {
        orderId: row.order_id,
        productName: product?.name || "-",
        customerName: customer?.full_name || "-",
        amount: Number(row.amount),
        discountAmount: Number(row.discount_amount ?? 0),
        finalAmount: Number(row.final_amount ?? row.amount),
        couponCode: row.coupon_code || "-",
        status: row.status,
        createdAt: row.created_at
      };
    }) ?? [];

    const buffer = await exportTransactionsToExcel(rows);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kograph-transactions-${Date.now()}.xlsx"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export gagal" },
      { status: 500 }
    );
  }
}
