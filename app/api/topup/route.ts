import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createMidtransQrisTransaction } from "@/lib/midtrans";
import { createOrderId, createPublicOrderCode } from "@/lib/orders";

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount || 0);
    if (!Number.isFinite(amount) || amount < 10000) {
      return NextResponse.json({ error: "Minimal top up Rp10.000." }, { status: 400 });
    }

    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const orderId = createOrderId("KGP-TOPUP");
    const publicOrderCode = createPublicOrderCode();
    const qris = await createMidtransQrisTransaction({
      orderId,
      amount,
      itemDetails: [{ id: orderId, price: amount, quantity: 1, name: "Top Up Saldo Kograph Premium" }],
      customerDetails: {
        first_name: String(profile?.full_name || user.email || "Customer").slice(0, 40),
        email: user.email || undefined
      },
      expiryMinutes: 15
    });

    const { error } = await admin.from("wallet_topups").insert({
      order_id: orderId,
      user_id: user.id,
      amount,
      status: "pending",
      snap_token: qris.transactionId || qris.qrUrl || "QRIS_PENDING",
      public_order_code: publicOrderCode,
      gateway_reference: qris.transactionId || null,
      gateway_payload: qris.raw
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({
      success: true,
      orderId,
      publicOrderCode,
      redirectUrl: `/waiting-payment/${orderId}?resi=${encodeURIComponent(publicOrderCode)}&type=topup`,
      paymentMethod: "qris",
      paymentQrUrl: qris.qrUrl,
      paymentDeeplinkUrl: qris.deeplinkUrl,
      paymentActions: qris.actions,
      amount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal membuat transaksi top up." }, { status: 500 });
  }
}
