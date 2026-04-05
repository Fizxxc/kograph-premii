import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/midtrans";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Midtrans webhook endpoint is alive. Use POST for notifications."
  });
}

export async function POST(request: Request) {
  try {
    const admin = createAdminSupabaseClient();
    const payload = await request.json();

    const orderId = String(payload.order_id ?? "").trim();
    const transactionStatus = String(payload.transaction_status ?? "").trim();
    const transactionId = String(payload.transaction_id ?? "").trim();
    const statusCode = String(payload.status_code ?? "").trim();
    const grossAmount = String(payload.gross_amount ?? "").trim();
    const signatureKey = String(payload.signature_key ?? "").trim();
    const fraudStatus = String(payload.fraud_status ?? "").trim();
    const paymentType = String(payload.payment_type ?? "").trim();

    console.log("[MIDTRANS_WEBHOOK] Incoming notification", {
      orderId,
      transactionId,
      transactionStatus,
      statusCode,
      grossAmount,
      fraudStatus,
      paymentType
    });

    if (!orderId || !transactionStatus || !statusCode || !grossAmount || !signatureKey) {
      console.error("[MIDTRANS_WEBHOOK] Invalid payload", payload);

      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const isSignatureValid = verifyMidtransSignature({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey
    });

    if (!isSignatureValid) {
      console.error("[MIDTRANS_WEBHOOK] Invalid signature", {
        orderId,
        transactionId
      });

      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    const { data: existingTransaction, error: existingTransactionError } = await admin
      .from("transactions")
      .select("id, order_id, status, product_id, user_id")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingTransactionError) {
      console.error("[MIDTRANS_WEBHOOK] Failed to query transaction", {
        orderId,
        error: existingTransactionError.message
      });

      return NextResponse.json(
        { error: existingTransactionError.message },
        { status: 500 }
      );
    }

    if (!existingTransaction) {
      console.error("[MIDTRANS_WEBHOOK] Transaction not found", { orderId });

      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    const isSettlement =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    if (isSettlement) {
      const { data: fulfillment, error: fulfillError } = await admin.rpc(
        "fulfill_transaction",
        {
          p_order_id: orderId
        }
      );

      if (fulfillError) {
        console.error("[MIDTRANS_WEBHOOK] fulfill_transaction failed", {
          orderId,
          error: fulfillError.message
        });

        return NextResponse.json(
          { error: fulfillError.message },
          { status: 500 }
        );
      }

      console.log("[MIDTRANS_WEBHOOK] Settlement processed", {
        orderId,
        fulfillment
      });

      return NextResponse.json({
        success: true,
        message: "Settlement processed",
        fulfillment
      });
    }

    if (transactionStatus === "pending") {
      const { error: updatePendingError } = await admin
        .from("transactions")
        .update({ status: "pending" })
        .eq("order_id", orderId);

      if (updatePendingError) {
        console.error("[MIDTRANS_WEBHOOK] Failed update pending", {
          orderId,
          error: updatePendingError.message
        });

        return NextResponse.json(
          { error: updatePendingError.message },
          { status: 500 }
        );
      }

      console.log("[MIDTRANS_WEBHOOK] Pending stored", { orderId });

      return NextResponse.json({
        success: true,
        message: "Pending stored"
      });
    }

    if (
      ["expire", "cancel", "deny"].includes(transactionStatus) ||
      (transactionStatus === "capture" && fraudStatus === "deny")
    ) {
      const { error: updateExpireError } = await admin
        .from("transactions")
        .update({ status: "expire" })
        .eq("order_id", orderId);

      if (updateExpireError) {
        console.error("[MIDTRANS_WEBHOOK] Failed update expire", {
          orderId,
          error: updateExpireError.message
        });

        return NextResponse.json(
          { error: updateExpireError.message },
          { status: 500 }
        );
      }

      console.log("[MIDTRANS_WEBHOOK] Expire stored", { orderId });

      return NextResponse.json({
        success: true,
        message: "Expired stored"
      });
    }

    console.log("[MIDTRANS_WEBHOOK] Ignored status", {
      orderId,
      transactionStatus
    });

    return NextResponse.json({
      success: true,
      message: `Ignored status: ${transactionStatus}`
    });
  } catch (error) {
    console.error("[MIDTRANS_WEBHOOK] Unhandled error", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook error"
      },
      { status: 500 }
    );
  }
}