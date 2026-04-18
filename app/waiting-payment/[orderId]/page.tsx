import PaymentStatusClient from "@/components/site/payment-status-client";

export default function WaitingPaymentPage({
  params,
  searchParams
}: {
  params: { orderId: string };
  searchParams: { resi?: string; type?: string };
}) {
  return <PaymentStatusClient orderId={params.orderId} resi={searchParams.resi} type={searchParams.type} />;
}
