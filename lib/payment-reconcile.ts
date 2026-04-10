import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getMidtransTransactionStatus } from "@/lib/midtrans";
import { fulfillProductOrder, settleWalletTopup } from "@/lib/fulfillment";

function resolveStatus(payload: any) {
  const transactionStatus = String(payload?.transaction_status || "").trim();
  const fraudStatus = String(payload?.fraud_status || "").trim();

  if (transactionStatus === "settlement") return "settlement";
  if (transactionStatus === "capture" && fraudStatus === "accept") return "settlement";
  if (["cancel", "deny", "expire", "failure"].includes(transactionStatus)) return "expire";
  return "pending";
}

export async function syncMidtransOrderState(orderId: string) {
  if (!orderId.startsWith("KGP-")) return null;

  const admin = createAdminSupabaseClient();
  const statusPayload = await getMidtransTransactionStatus(orderId).catch(() => null);
  if (!statusPayload) return null;

  const status = resolveStatus(statusPayload);

  if (status === "settlement") {
    const { data: topup } = await admin.from("wallet_topups").select("id").eq("order_id", orderId).maybeSingle();
    if (topup) {
      await settleWalletTopup(orderId);
      return { type: "topup", status };
    }

    const { data: tx } = await admin.from("transactions").select("id").eq("order_id", orderId).maybeSingle();
    if (tx) {
      await fulfillProductOrder(orderId);
      return { type: "transaction", status };
    }
  }

  if (status === "pending") {
    await admin.from("transactions").update({ status: "pending" }).eq("order_id", orderId);
    await admin.from("wallet_topups").update({ status: "pending" }).eq("order_id", orderId);
    return { type: "unknown", status };
  }

  await admin.from("transactions").update({ status: "expire" }).eq("order_id", orderId);
  await admin.from("wallet_topups").update({ status: "expire" }).eq("order_id", orderId);
  return { type: "unknown", status };
}
