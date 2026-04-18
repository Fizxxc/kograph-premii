import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncMidtransOrderState } from "@/lib/payment-reconcile";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resi = String(url.searchParams.get("resi") || "").trim();
  if (!resi) return NextResponse.json({ error: "Resi wajib diisi." }, { status: 400 });

  const admin = createAdminSupabaseClient();
  const { data: tx } = await admin
    .from("transactions")
    .select(`id, order_id, status, final_amount, public_order_code, paid_at, created_at, product_snapshot, products ( name )`)
    .eq("public_order_code", resi)
    .maybeSingle();

  if (tx) {
    if (["pending", "capture"].includes(String((tx as any).status || ""))) {
      await syncMidtransOrderState(String((tx as any).order_id)).catch(() => null);
    }
    const { data: fresh } = await admin
      .from("transactions")
      .select(`id, order_id, status, final_amount, public_order_code, paid_at, created_at, product_snapshot, products ( name )`)
      .eq("id", (tx as any).id)
      .maybeSingle();

    const product = Array.isArray((fresh as any)?.products) ? (fresh as any)?.products[0] : (fresh as any)?.products;
    return NextResponse.json({
      type: "transaction",
      orderId: (fresh as any)?.order_id,
      status: (fresh as any)?.status,
      amount: Number((fresh as any)?.final_amount || 0),
      publicOrderCode: (fresh as any)?.public_order_code,
      productName: String(product?.name || (fresh as any)?.product_snapshot?.product_name || "Produk"),
      variantName: String((fresh as any)?.product_snapshot?.variant_name || ""),
      createdAt: (fresh as any)?.created_at
    });
  }

  const { data: topup } = await admin
    .from("wallet_topups")
    .select("id, order_id, status, amount, public_order_code, paid_at, created_at")
    .eq("public_order_code", resi)
    .maybeSingle();

  if (topup) {
    if (["pending", "capture"].includes(String((topup as any).status || ""))) {
      await syncMidtransOrderState(String((topup as any).order_id)).catch(() => null);
    }
    const { data: fresh } = await admin
      .from("wallet_topups")
      .select("id, order_id, status, amount, public_order_code, paid_at, created_at")
      .eq("id", (topup as any).id)
      .maybeSingle();

    return NextResponse.json({
      type: "topup",
      orderId: (fresh as any)?.order_id,
      status: (fresh as any)?.status,
      amount: Number((fresh as any)?.amount || 0),
      publicOrderCode: (fresh as any)?.public_order_code,
      productName: "Top up saldo",
      createdAt: (fresh as any)?.created_at
    });
  }

  return NextResponse.json({ error: "Resi tidak ditemukan." }, { status: 404 });
}
