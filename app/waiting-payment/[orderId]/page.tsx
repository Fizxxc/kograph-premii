import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WaitingPaymentClient } from "@/components/payment/waiting-payment-client";

export const dynamic = "force-dynamic";

export default async function WaitingPaymentPage({ params }: { params: { orderId: string } }) {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select(`
      id,
      order_id,
      amount,
      discount_amount,
      final_amount,
      status,
      snap_token,
      created_at,
      status_token,
      payment_method,
      fulfillment_data,
      products ( name, service_type )
    `)
    .eq("order_id", params.orderId)
    .eq("user_id", user.id)
    .single();

  if (!transaction) notFound();

  const { data: credential } = await supabase
    .from("app_credentials")
    .select("account_data")
    .eq("transaction_id", transaction.id)
    .maybeSingle();

  const productValue = Array.isArray(transaction.products) ? transaction.products[0] : transaction.products;

  return (
    <WaitingPaymentClient
      transaction={{
        id: transaction.id,
        order_id: transaction.order_id,
        amount: Number(transaction.amount),
        discount_amount: Number(transaction.discount_amount ?? 0),
        final_amount: Number(transaction.final_amount ?? transaction.amount),
        status: transaction.status,
        snap_token: transaction.snap_token,
        created_at: transaction.created_at,
        product_name: productValue?.name || "Produk Premium",
        status_token: transaction.status_token,
        payment_method: (transaction as any).payment_method || "midtrans",
        service_type: (productValue as any)?.service_type || "credential",
        fulfillment_data: (transaction as any).fulfillment_data ?? null
      }}
      initialAccountData={credential?.account_data ?? null}
    />
  );
}
