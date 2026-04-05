import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/midtrans";

export async function POST(request: Request) {
  try {
    const admin = createAdminSupabaseClient();
    const payload = await request.json();

    const orderId = String(payload.order_id ?? "");
    const transactionStatus = String(payload.transaction_status ?? "");
    const statusCode = String(payload.status_code ?? "");
    const grossAmount = String(payload.gross_amount ?? "");
    const signatureKey = String(payload.signature_key ?? "");
    const fraudStatus = String(payload.fraud_status ?? "");

    if (
      !verifyMidtransSignature({
        order_id: orderId,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey
      })
    ) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const isSuccess =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    if (isSuccess) {
      const { data: fulfillment, error: fulfillError } = await admin.rpc("fulfill_transaction", {
        p_order_id: orderId
      });

      if (fulfillError) {
        return NextResponse.json({ error: fulfillError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Settlement processed", fulfillment });
    }

    if (transactionStatus === "pending") {
      await admin.from("transactions").update({ status: "pending" }).eq("order_id", orderId);
      return NextResponse.json({ success: true, message: "Pending stored" });
    }

    if (["expire", "cancel", "deny"].includes(transactionStatus)) {
      await admin.from("transactions").update({ status: "expire" }).eq("order_id", orderId);
      return NextResponse.json({ success: true, message: "Expired stored" });
    }

    return NextResponse.json({ success: true, message: `Unhandled status ignored: ${transactionStatus}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook error" },
      { status: 500 }
    );
  }
}
