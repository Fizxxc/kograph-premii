import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { fulfillProductOrder, settleWalletTopup } from "@/lib/fulfillment";
import { sendTopupPaidEmail, sendTransactionPaidEmail } from "@/lib/transaction-emails";

const PAID_STATUSES = new Set(["settlement", "capture"]);
const FAILED_STATUSES = new Set(["expire", "cancel", "deny", "failure"]);

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const orderId = String(payload?.order_id || "").trim();
    const transactionStatus = String(payload?.transaction_status || "").trim().toLowerCase();
    const fraudStatus = String(payload?.fraud_status || "").trim().toLowerCase();

    if (!orderId) return NextResponse.json({ error: "order_id wajib ada." }, { status: 400 });

    const signatureValid = verifyMidtransSignature({
      order_id: orderId,
      status_code: String(payload?.status_code || ""),
      gross_amount: String(payload?.gross_amount || ""),
      signature_key: String(payload?.signature_key || "")
    });

    if (!signatureValid) {
      return NextResponse.json({ error: "Signature Midtrans tidak valid." }, { status: 403 });
    }

    const normalizedStatus = PAID_STATUSES.has(transactionStatus) && fraudStatus !== "deny"
      ? "settlement"
      : FAILED_STATUSES.has(transactionStatus)
        ? transactionStatus
        : transactionStatus || "pending";

    const admin = createAdminSupabaseClient();
    const { data: tx } = await admin.from("transactions").select("id, order_id, status").eq("order_id", orderId).maybeSingle();
    const { data: topup } = await admin.from("wallet_topups").select("id, order_id, status").eq("order_id", orderId).maybeSingle();

    if (!tx && !topup) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (tx) {
      const updatePayload: Record<string, unknown> = {
        status: normalizedStatus,
        gateway_reference: String(payload?.transaction_id || payload?.transaction_id ?? "") || null,
        gateway_payload: payload
      };
      if (normalizedStatus === "settlement") updatePayload.paid_at = new Date().toISOString();
      await admin.from("transactions").update(updatePayload).eq("id", (tx as any).id);

      if (normalizedStatus === "settlement" && (tx as any).status !== "settlement") {
        await fulfillProductOrder(orderId);
        await sendTransactionPaidEmail(orderId).catch((error) => {
          console.error("EMAIL_TRANSACTION_FAILED", error);
        });
      }
    }

    if (topup) {
      const updatePayload: Record<string, unknown> = {
        status: normalizedStatus,
        gateway_reference: String(payload?.transaction_id || payload?.transaction_id ?? "") || null,
        gateway_payload: payload
      };
      if (normalizedStatus === "settlement") updatePayload.paid_at = new Date().toISOString();
      await admin.from("wallet_topups").update(updatePayload).eq("id", (topup as any).id);

      if (normalizedStatus === "settlement" && (topup as any).status !== "settlement") {
        await settleWalletTopup(orderId);
        await sendTopupPaidEmail(orderId).catch((error) => {
          console.error("EMAIL_TOPUP_FAILED", error);
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Webhook Midtrans gagal diproses." }, { status: 500 });
  }
}
