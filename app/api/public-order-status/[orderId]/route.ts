import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncMidtransOrderState } from "@/lib/payment-reconcile";

export async function GET(request: Request, { params }: { params: { orderId: string } }) {
  const orderId = String(params.orderId || "").trim();
  const url = new URL(request.url);
  const resi = String(url.searchParams.get("resi") || "").trim();
  const type = String(url.searchParams.get("type") || "transaction").trim();

  if (!orderId) return NextResponse.json({ error: "Order ID wajib diisi." }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (type === "topup") {
    let query = admin
      .from("wallet_topups")
      .select("id, order_id, user_id, amount, status, snap_token, public_order_code, gateway_payload, paid_at, created_at")
      .eq("order_id", orderId)
      .limit(1);

    if (user) query = query.eq("user_id", user.id);
    else query = query.eq("public_order_code", resi);

    const { data } = await query.maybeSingle();
    if (!data) return NextResponse.json({ error: "Transaksi top up tidak ditemukan." }, { status: 404 });

    if (["pending", "capture"].includes(String((data as any).status || ""))) {
      await syncMidtransOrderState(orderId).catch(() => null);
    }

    const { data: fresh } = await admin
      .from("wallet_topups")
      .select("id, order_id, user_id, amount, status, snap_token, public_order_code, gateway_payload, paid_at, created_at")
      .eq("id", (data as any).id)
      .maybeSingle();

    return NextResponse.json({
      type: "topup",
      orderId: (fresh as any)?.order_id,
      status: (fresh as any)?.status,
      amount: Number((fresh as any)?.amount || 0),
      publicOrderCode: (fresh as any)?.public_order_code,
      qrUrl: String((fresh as any)?.gateway_payload?.actions?.find?.((item: any) => item?.name === "generate-qr-code")?.url || (fresh as any)?.gateway_payload?.qr_url || ""),
      qrString: String((fresh as any)?.gateway_payload?.qr_string || ""),
      deeplinkUrl: String((fresh as any)?.gateway_payload?.actions?.find?.((item: any) => item?.name === "deeplink-redirect")?.url || ""),
      raw: fresh
    });
  }

  let query = admin
    .from("transactions")
    .select(`
      id,
      order_id,
      user_id,
      status,
      amount,
      discount_amount,
      final_amount,
      payment_method,
      public_order_code,
      fulfillment_data,
      gateway_payload,
      paid_at,
      created_at,
      buyer_name,
      buyer_email,
      product_snapshot,
      products ( id, name, image_url, category )
    `)
    .eq("order_id", orderId)
    .limit(1);

  if (user) query = query.eq("user_id", user.id);
  else query = query.eq("public_order_code", resi);

  const { data } = await query.maybeSingle();
  if (!data) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  if (["pending", "capture"].includes(String((data as any).status || ""))) {
    await syncMidtransOrderState(orderId).catch(() => null);
  }

  const { data: fresh } = await admin
    .from("transactions")
    .select(`
      id,
      order_id,
      user_id,
      status,
      amount,
      discount_amount,
      final_amount,
      payment_method,
      public_order_code,
      fulfillment_data,
      gateway_payload,
      paid_at,
      created_at,
      buyer_name,
      buyer_email,
      product_snapshot,
      products ( id, name, image_url, category ),
      app_credentials ( account_data )
    `)
    .eq("id", (data as any).id)
    .maybeSingle();

  const product = Array.isArray((fresh as any)?.products) ? (fresh as any)?.products[0] : (fresh as any)?.products;
  const credential = Array.isArray((fresh as any)?.app_credentials) ? (fresh as any)?.app_credentials[0] : (fresh as any)?.app_credentials;

  return NextResponse.json({
    type: "transaction",
    orderId: (fresh as any)?.order_id,
    status: (fresh as any)?.status,
    amount: Number((fresh as any)?.final_amount || (fresh as any)?.amount || 0),
    publicOrderCode: (fresh as any)?.public_order_code,
    qrUrl: String((fresh as any)?.fulfillment_data?.payment_qr_url || (fresh as any)?.gateway_payload?.actions?.find?.((item: any) => item?.name === "generate-qr-code")?.url || ""),
    qrString: String((fresh as any)?.fulfillment_data?.payment_qr_string || (fresh as any)?.gateway_payload?.qr_string || ""),
    deeplinkUrl: String((fresh as any)?.fulfillment_data?.payment_deeplink_url || (fresh as any)?.gateway_payload?.actions?.find?.((item: any) => item?.name === "deeplink-redirect")?.url || ""),
    productName: String(product?.name || (fresh as any)?.product_snapshot?.product_name || "Produk"),
    productImage: String(product?.image_url || (fresh as any)?.product_snapshot?.product_image_url || ""),
    variantName: String((fresh as any)?.product_snapshot?.variant_name || ""),
    accountData: credential?.account_data || null,
    fulfillmentData: (fresh as any)?.fulfillment_data || {},
    raw: fresh
  });
}
