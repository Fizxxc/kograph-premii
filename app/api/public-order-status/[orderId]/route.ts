import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { syncMidtransOrderState } from "@/lib/payment-reconcile";
import { getMidtransTransactionStatus } from "@/lib/midtrans";

function resolveMidtransStatus(payload: any) {
  const transactionStatus = String(payload?.transaction_status || "").trim();
  const fraudStatus = String(payload?.fraud_status || "").trim();

  if (transactionStatus === "settlement") return "settlement";
  if (transactionStatus === "capture" && (!fraudStatus || fraudStatus === "accept")) return "settlement";
  if (["cancel", "deny", "expire", "failure"].includes(transactionStatus)) return "expire";
  return transactionStatus || "pending";
}

function extractQrisPayload(...sources: any[]) {
  for (const source of sources) {
    if (!source) continue;
    const actions = Array.isArray(source?.actions) ? source.actions : [];
    const qrUrl = String(actions.find((item: any) => item?.name === "generate-qr-code")?.url || source?.qr_url || source?.payment_qr_url || "");
    const qrString = String(source?.qr_string || source?.payment_qr_string || "");
    const deeplinkUrl = String(actions.find((item: any) => item?.name === "deeplink-redirect")?.url || source?.payment_deeplink_url || "");

    if (qrUrl || qrString || deeplinkUrl || actions.length) {
      return { qrUrl, qrString, deeplinkUrl, actions };
    }
  }

  return { qrUrl: "", qrString: "", deeplinkUrl: "", actions: [] as any[] };
}

async function getLiveMidtransStatus(orderId: string) {
  try {
    const payload = await getMidtransTransactionStatus(orderId);
    return { payload, error: null as string | null };
  } catch (error: any) {
    return { payload: null, error: String(error?.message || "Gagal mengambil status Midtrans.") };
  }
}

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

    const liveTopup = ["pending", "capture"].includes(String((fresh as any)?.status || ""))
      ? await getLiveMidtransStatus(orderId)
      : { payload: null, error: null as string | null };

    const topupQris = extractQrisPayload((fresh as any)?.gateway_payload, liveTopup.payload);
    const topupStatus = liveTopup.payload ? resolveMidtransStatus(liveTopup.payload) : String((fresh as any)?.status || "pending");

    if (liveTopup.payload) {
      await admin
        .from("wallet_topups")
        .update({
          status: topupStatus,
          gateway_payload: liveTopup.payload
        })
        .eq("id", (fresh as any)?.id);
    }

    if (topupStatus === "pending" && !topupQris.qrUrl && !topupQris.qrString) {
      return NextResponse.json({
        code: liveTopup.error ? "MIDTRANS_STATUS_ERROR" : "QRIS_NOT_ACTIVE",
        error: liveTopup.error ? "Status pembayaran Midtrans belum bisa dimuat." : "QRIS Belum Aktif",
        message: liveTopup.error
          ? `${liveTopup.error} Silakan cek konfigurasi MIDTRANS_SERVER_KEY dan aktivasi metode QRIS di akun Midtrans.`
          : "Midtrans belum mengembalikan data QRIS untuk transaksi ini. Pastikan metode QRIS pada akun Midtrans sudah aktif.",
        orderId,
        status: topupStatus
      }, { status: liveTopup.error ? 502 : 424 });
    }

    return NextResponse.json({
      type: "topup",
      orderId: (fresh as any)?.order_id,
      status: topupStatus,
      amount: Number((fresh as any)?.amount || 0),
      publicOrderCode: (fresh as any)?.public_order_code,
      qrUrl: topupQris.qrUrl,
      qrString: topupQris.qrString,
      deeplinkUrl: topupQris.deeplinkUrl,
      raw: liveTopup.payload || fresh
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

  const liveTransaction = ["pending", "capture"].includes(String((fresh as any)?.status || ""))
    ? await getLiveMidtransStatus(orderId)
    : { payload: null, error: null as string | null };

  const qrisData = extractQrisPayload(
    (fresh as any)?.fulfillment_data,
    (fresh as any)?.gateway_payload,
    liveTransaction.payload
  );

  const effectiveStatus = liveTransaction.payload ? resolveMidtransStatus(liveTransaction.payload) : String((fresh as any)?.status || "pending");

  if (liveTransaction.payload) {
    await admin
      .from("transactions")
      .update({
        status: effectiveStatus,
        gateway_payload: liveTransaction.payload,
        fulfillment_data: {
          ...((fresh as any)?.fulfillment_data || {}),
          payment_qr_url: qrisData.qrUrl || null,
          payment_qr_string: qrisData.qrString || null,
          payment_deeplink_url: qrisData.deeplinkUrl || null,
          payment_actions: qrisData.actions || []
        }
      })
      .eq("id", (fresh as any)?.id);
  }

  const product = Array.isArray((fresh as any)?.products) ? (fresh as any)?.products[0] : (fresh as any)?.products;
  const credential = Array.isArray((fresh as any)?.app_credentials) ? (fresh as any)?.app_credentials[0] : (fresh as any)?.app_credentials;

  if (effectiveStatus === "pending" && !qrisData.qrUrl && !qrisData.qrString) {
    return NextResponse.json({
      code: liveTransaction.error ? "MIDTRANS_STATUS_ERROR" : "QRIS_NOT_ACTIVE",
      error: liveTransaction.error ? "Status pembayaran Midtrans belum bisa dimuat." : "QRIS Belum Aktif",
      message: liveTransaction.error
        ? `${liveTransaction.error} Silakan cek konfigurasi MIDTRANS_SERVER_KEY dan aktivasi metode QRIS di akun Midtrans.`
        : "Midtrans belum mengembalikan data QRIS untuk transaksi ini. Pastikan metode QRIS pada akun Midtrans sudah aktif.",
      orderId,
      status: effectiveStatus
    }, { status: liveTransaction.error ? 502 : 424 });
  }

  return NextResponse.json({
    type: "transaction",
    orderId: (fresh as any)?.order_id,
    status: effectiveStatus,
    amount: Number((fresh as any)?.final_amount || (fresh as any)?.amount || 0),
    publicOrderCode: (fresh as any)?.public_order_code,
    qrUrl: qrisData.qrUrl,
    qrString: qrisData.qrString,
    deeplinkUrl: qrisData.deeplinkUrl,
    productName: String(product?.name || (fresh as any)?.product_snapshot?.product_name || "Produk"),
    productImage: String(product?.image_url || (fresh as any)?.product_snapshot?.product_image_url || ""),
    variantName: String((fresh as any)?.product_snapshot?.variant_name || ""),
    accountData: credential?.account_data || null,
    fulfillmentData: {
      ...((fresh as any)?.fulfillment_data || {}),
      payment_qr_url: qrisData.qrUrl || null,
      payment_qr_string: qrisData.qrString || null,
      payment_deeplink_url: qrisData.deeplinkUrl || null,
      payment_actions: qrisData.actions || []
    },
    raw: liveTransaction.payload || fresh
  });
}
