import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { fulfillProductOrder, settleWalletTopup } from "@/lib/fulfillment";

export const runtime = "nodejs";

function resolveStatus(payload: { transaction_status?: string; fraud_status?: string }) {
  const transactionStatus = String(payload.transaction_status ?? "").trim();
  const fraudStatus = String(payload.fraud_status ?? "").trim();

  if (transactionStatus === "settlement") return "settlement";
  if (transactionStatus === "capture" && fraudStatus === "accept") return "settlement";
  if (["cancel", "deny", "expire", "failure"].includes(transactionStatus)) return "expire";
  return "pending";
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Midtrans webhook endpoint is alive. Use POST for notifications." });
}

export async function POST(request: Request) {
  try {
    const admin = createAdminSupabaseClient();
    const payload = await request.json();
    const orderId = String(payload.order_id ?? "").trim();
    const transactionStatus = String(payload.transaction_status ?? "").trim();
    const statusCode = String(payload.status_code ?? "").trim();
    const grossAmount = String(payload.gross_amount ?? "").trim();
    const signatureKey = String(payload.signature_key ?? "").trim();

    if (!orderId || !transactionStatus || !statusCode || !grossAmount || !signatureKey) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const isSignatureValid = verifyMidtransSignature({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey
    });
    if (!isSignatureValid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

    const resolvedStatus = resolveStatus(payload);

    if (resolvedStatus === "settlement") {
      const { data: topup } = await admin.from("wallet_topups").select("id").eq("order_id", orderId).maybeSingle();
      if (topup) {
        const result = await settleWalletTopup(orderId);
        return NextResponse.json({ success: true, type: "topup", result });
      }

      const { data: tx } = await admin.from("transactions").select("id").eq("order_id", orderId).maybeSingle();
      if (!tx) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
      const result = await fulfillProductOrder(orderId);
      return NextResponse.json({ success: true, type: "product", result });
    }

    if (resolvedStatus === "pending") {
      await admin.from("transactions").update({ status: "pending" }).eq("order_id", orderId);
      await admin.from("wallet_topups").update({ status: "pending" }).eq("order_id", orderId);
      return NextResponse.json({ success: true, message: "Pending stored" });
    }

    await admin.from("transactions").update({ status: "expire" }).eq("order_id", orderId);
    await admin.from("wallet_topups").update({ status: "expire" }).eq("order_id", orderId);
    return NextResponse.json({ success: true, message: "Expired stored" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook error" }, { status: 500 });
  }
}
