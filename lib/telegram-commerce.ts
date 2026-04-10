import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createMidtransQrisTransaction } from "@/lib/midtrans";
import { fulfillProductOrder } from "@/lib/fulfillment";

function calculateDiscount(input: {
  type: "fixed" | "percentage";
  value: number;
  baseAmount: number;
  maxDiscount: number | null;
}) {
  let discount =
    input.type === "fixed"
      ? input.value
      : Math.floor((input.baseAmount * input.value) / 100);
  if (input.maxDiscount && discount > input.maxDiscount) discount = input.maxDiscount;
  return Math.max(0, Math.min(discount, input.baseAmount));
}

export async function getProfileByTelegramId(telegramId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("profiles")
    .select("id, full_name, balance, telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data;
}

export async function createTelegramProductOrder(input: {
  userId: string;
  telegramId: string;
  productId: string;
  couponCode?: string;
  paymentMethod?: "midtrans" | "balance";
}) {
  const admin = createAdminSupabaseClient();
  const { data: product } = await admin
    .from("products")
    .select("id, name, price, stock, service_type")
    .eq("id", input.productId)
    .single();

  if (!product) throw new Error("Produk tidak ditemukan.");

  const isPanel = (product.service_type || "credential") === "pterodactyl";
  if (!isPanel && Number(product.stock || 0) <= 0) throw new Error("Stok produk sedang habis.");

  if (!isPanel) {
    const { count } = await admin
      .from("app_credentials")
      .select("*", { count: "exact", head: true })
      .eq("product_id", product.id)
      .eq("is_used", false);
    if ((count ?? 0) <= 0) throw new Error("Credential produk sedang kosong.");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, balance")
    .eq("id", input.userId)
    .single();

  let discountAmount = 0;
  let appliedCouponCode: string | null = null;
  const amount = Number(product.price || 0);

  if (input.couponCode) {
    const code = input.couponCode.trim().toUpperCase();
    const { data: coupon } = await admin
      .from("coupons")
      .select(
        "code, type, value, min_purchase, max_discount, quota, used_count, is_active, starts_at, ends_at"
      )
      .eq("code", code)
      .maybeSingle();

    const now = new Date();
    const isStarted = !coupon?.starts_at || new Date(coupon.starts_at) <= now;
    const isNotExpired = !coupon?.ends_at || new Date(coupon.ends_at) >= now;
    const quotaAvailable =
      coupon?.quota == null || Number(coupon.used_count || 0) < Number(coupon.quota);

    if (!coupon || !coupon.is_active || !isStarted || !isNotExpired || !quotaAvailable) {
      throw new Error("Kupon tidak aktif atau sudah berakhir.");
    }
    if (amount < Number(coupon.min_purchase || 0)) {
      throw new Error("Minimal pembelian untuk kupon belum terpenuhi.");
    }

    discountAmount = calculateDiscount({
      type: coupon.type as "fixed" | "percentage",
      value: Number(coupon.value || 0),
      baseAmount: amount,
      maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null
    });
    appliedCouponCode = coupon.code;
  }

  const finalAmount = Math.max(0, amount - discountAmount);
  const orderId = `KGP-TG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const statusToken = crypto.randomBytes(8).toString("hex").toUpperCase();
  const paymentMethod = input.paymentMethod || "midtrans";

  const basePayload = {
    order_id: orderId,
    user_id: input.userId,
    product_id: product.id,
    amount,
    discount_amount: discountAmount,
    final_amount: finalAmount,
    coupon_code: appliedCouponCode,
    status: "pending",
    status_token: statusToken,
    payment_method: paymentMethod === "balance" ? "balance" : "qris",
    telegram_id: input.telegramId,
    fulfillment_data: isPanel
      ? {
          type: "pterodactyl_pending",
          requested_username: `tg${String(input.telegramId).replace(/\D/g, "")}`.slice(0, 12),
          requested_from: "telegram"
        }
      : null
  };

  if (paymentMethod === "balance") {
    if (Number(profile?.balance || 0) < finalAmount) {
      throw new Error("Saldo user tidak mencukupi untuk pembayaran via Telegram.");
    }

    const { error: insertError } = await admin.from("transactions").insert({
      ...basePayload,
      snap_token: "BALANCE_PAYMENT"
    });
    if (insertError) throw new Error(insertError.message);

    const { error: walletError } = await admin.rpc("apply_wallet_adjustment", {
      p_user_id: input.userId,
      p_amount: -finalAmount,
      p_type: "purchase",
      p_description: `Pembelian ${product.name} via auto order bot (${orderId})`,
      p_admin_user_id: null
    });
    if (walletError) throw new Error(walletError.message);

    await fulfillProductOrder(orderId);
    return {
      orderId,
      paymentUrl: null,
      paymentQrUrl: null,
      finalAmount,
      statusToken,
      paymentMethod,
      redirectPath: `/waiting-payment/${orderId}`
    };
  }

  const qris = await createMidtransQrisTransaction({
    orderId,
    amount: finalAmount,
    itemDetails: [
      { id: product.id, price: finalAmount, quantity: 1, name: String(product.name).slice(0, 50) }
    ],
    customerDetails: {
      first_name: profile?.full_name || `user_${input.telegramId}`,
      email: `telegram-${input.userId}@local.kograph`
    }
  });

  const { error: insertError } = await admin.from("transactions").insert({
    ...basePayload,
    snap_token: qris.transactionId || qris.qrUrl || "QRIS_PENDING",
    fulfillment_data: {
      ...(basePayload.fulfillment_data || {}),
      payment_type: "qris",
      payment_qr_url: qris.qrUrl || null
    }
  });
  if (insertError) throw new Error(insertError.message);

  return {
    orderId,
    paymentUrl: qris.qrUrl,
    paymentQrUrl: qris.qrUrl,
    finalAmount,
    statusToken,
    paymentMethod: "qris",
    redirectPath: `/waiting-payment/${orderId}`
  };
}

export async function createTelegramTopup(input: {
  userId: string;
  amount: number;
  telegramId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  if (!Number.isFinite(input.amount) || input.amount < 10000) throw new Error("Minimal top up Rp10.000.");

  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", input.userId).single();
  const orderId = `KGP-TOPUP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  const qris = await createMidtransQrisTransaction({
    orderId,
    amount: input.amount,
    itemDetails: [{ id: orderId, price: input.amount, quantity: 1, name: "Top Up Saldo Telegram Kograph" }],
    customerDetails: {
      first_name: profile?.full_name || "Telegram User",
      email: `telegram-${input.userId}@local.kograph`
    }
  });

  const { error } = await admin.from("wallet_topups").insert({
    order_id: orderId,
    user_id: input.userId,
    amount: input.amount,
    status: "pending",
    snap_token: qris.transactionId || qris.qrUrl || "QRIS_PENDING"
  });
  if (error) throw new Error(error.message);

  return { orderId, amount: input.amount, paymentUrl: qris.qrUrl, paymentQrUrl: qris.qrUrl };
}

export async function adjustWalletByTelegramAdmin(input: {
  targetTelegramId: string;
  amount: number;
  description: string;
  adminUserId?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const target = await getProfileByTelegramId(input.targetTelegramId);
  if (!target) throw new Error("User dengan Telegram ID tersebut tidak ditemukan.");

  const { error } = await admin.rpc("apply_wallet_adjustment", {
    p_user_id: target.id,
    p_amount: input.amount,
    p_type: input.amount > 0 ? "admin_credit" : "admin_debit",
    p_description: input.description,
    p_admin_user_id: input.adminUserId ?? null
  });
  if (error) throw new Error(error.message);

  return target;
}
