import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createMidtransQrisTransaction } from "@/lib/midtrans";
import { createOrderId, createPublicOrderCode, createStatusToken, buildPublicOrderUrl } from "@/lib/orders";

function calculateDiscount(input: {
  type: "fixed" | "percentage";
  value: number;
  baseAmount: number;
  maxDiscount: number | null;
}) {
  let discount = input.type === "fixed" ? input.value : Math.floor((input.baseAmount * input.value) / 100);
  if (input.maxDiscount && discount > input.maxDiscount) discount = input.maxDiscount;
  return Math.max(0, Math.min(discount, input.baseAmount));
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const productId = String(body.productId || "").trim();
    const variantId = String(body.variantId || "").trim() || null;
    const couponCode = String(body.couponCode || "").trim().toUpperCase() || null;
    const telegramId = String(body.telegramId || "").trim() || null;
    const roomId = String(body.roomId || "").trim() || null;
    const buyerName = String(body.buyerName || "").trim();
    const buyerEmail = String(body.buyerEmail || "").trim().toLowerCase();
    const buyerPhone = String(body.buyerPhone || "").trim() || null;
    const paymentMethod = "qris";

    if (!productId) {
      return NextResponse.json({ error: "Produk wajib dipilih." }, { status: 400 });
    }

    if (!user && (!buyerName || !buyerEmail)) {
      return NextResponse.json({ error: "Nama dan email wajib diisi agar pesanan guest tetap bisa dilacak dan menerima bukti transaksi." }, { status: 400 });
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, description, price, stock, category, image_url, service_type, is_active, pterodactyl_config, live_chat_enabled")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product || !product.is_active) {
      return NextResponse.json({ error: "Produk tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
    }

    const { data: variants } = await admin
      .from("product_variants")
      .select("id, name, price, compare_at_price, duration_label, short_description, metadata, is_active")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const selectedVariant = variantId ? (variants || []).find((item: any) => item.id === variantId) || null : null;

    const baseAmount = Number(selectedVariant?.price || product.price || 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      return NextResponse.json({ error: "Harga produk belum valid." }, { status: 400 });
    }

    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("code, type, value, min_purchase, max_discount, quota, used_count, is_active, starts_at, ends_at")
        .eq("code", couponCode)
        .maybeSingle();

      const now = new Date();
      const isStarted = !coupon?.starts_at || new Date(coupon.starts_at) <= now;
      const isNotExpired = !coupon?.ends_at || new Date(coupon.ends_at) >= now;
      const quotaAvailable = coupon?.quota == null || Number(coupon.used_count || 0) < Number(coupon.quota);

      if (!coupon || !coupon.is_active || !isStarted || !isNotExpired || !quotaAvailable) {
        return NextResponse.json({ error: "Kupon tidak aktif atau sudah berakhir." }, { status: 400 });
      }
      if (baseAmount < Number(coupon.min_purchase || 0)) {
        return NextResponse.json({ error: "Minimal pembelian untuk kupon belum terpenuhi." }, { status: 400 });
      }

      discountAmount = calculateDiscount({
        type: coupon.type as "fixed" | "percentage",
        value: Number(coupon.value),
        baseAmount,
        maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null
      });
      appliedCouponCode = coupon.code;
    }

    const finalAmount = Math.max(0, baseAmount - discountAmount);
    const orderId = createOrderId("KGP");
    const statusToken = createStatusToken();
    const publicOrderCode = createPublicOrderCode();
    const publicOrderUrl = buildPublicOrderUrl(orderId, publicOrderCode);

    const buyerIdentity = {
      name: buyerName || String((user as any)?.user_metadata?.full_name || "Customer"),
      email: buyerEmail || String(user?.email || ""),
      phone: buyerPhone
    };

    const productSnapshot = {
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      product_image_url: product.image_url,
      service_type: product.service_type,
      variant_id: selectedVariant?.id || null,
      variant_name: selectedVariant?.name || null,
      variant_duration_label: selectedVariant?.duration_label || null,
      variant_description: selectedVariant?.short_description || null,
      variant_metadata: selectedVariant?.metadata || null
    };

    const baseInsert = {
      order_id: orderId,
      user_id: user?.id || null,
      product_id: product.id,
      variant_id: selectedVariant?.id || null,
      amount: baseAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      coupon_code: appliedCouponCode,
      status: "pending",
      status_token: statusToken,
      public_order_code: publicOrderCode,
      payment_method: paymentMethod,
      payment_channel: "midtrans_qris",
      telegram_id: telegramId,
      snap_token: "PENDING",
      guest_name: user ? null : buyerIdentity.name,
      guest_email: user ? null : buyerIdentity.email,
      guest_phone: user ? null : buyerIdentity.phone,
      product_snapshot: productSnapshot,
      fulfillment_data: {
        requested_from: user ? "website-auth" : "website-guest",
        room_id: roomId,
        public_order_code: publicOrderCode,
        public_order_url: publicOrderUrl
      }
    } as any;

    const itemName = `${product.name}${selectedVariant?.name ? ` • ${selectedVariant.name}` : ""}`.slice(0, 50);
    const qris = await createMidtransQrisTransaction({
      orderId,
      amount: finalAmount,
      itemDetails: [{ id: selectedVariant?.id || product.id, name: itemName, price: finalAmount, quantity: 1 }],
      customerDetails: {
        first_name: buyerIdentity.name.slice(0, 40) || "Customer",
        email: buyerIdentity.email || undefined,
        phone: buyerIdentity.phone || undefined
      },
      expiryMinutes: 15
    });

    const { error: txError } = await admin.from("transactions").insert({
      ...baseInsert,
      payment_method: "qris",
      snap_token: qris.transactionId || qris.qrUrl || "QRIS_PENDING",
      gateway_reference: qris.transactionId || null,
      gateway_payload: qris.raw,
      fulfillment_data: {
        ...(baseInsert.fulfillment_data || {}),
        payment_type: "qris",
        payment_qr_url: qris.qrUrl || null,
        payment_deeplink_url: qris.deeplinkUrl || null,
        payment_actions: qris.actions || [],
        payment_qr_string: qris.qrString || null,
        qr_expires_in_minutes: 15
      }
    });

    if (txError) throw new Error(txError.message);

    return NextResponse.json({
      success: true,
      orderId,
      publicOrderCode,
      redirectUrl: `/waiting-payment/${orderId}?resi=${encodeURIComponent(publicOrderCode)}`,
      paymentMethod: "qris",
      paymentQrUrl: qris.qrUrl,
      paymentDeeplinkUrl: qris.deeplinkUrl,
      paymentActions: qris.actions,
      amount: finalAmount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan saat memproses checkout." }, { status: 500 });
  }
}
