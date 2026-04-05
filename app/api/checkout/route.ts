import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { midtransSnap } from "@/lib/midtrans";

function calculateDiscount(input: {
  type: "fixed" | "percentage";
  value: number;
  baseAmount: number;
  maxDiscount: number | null;
}) {
  let discount = 0;

  if (input.type === "fixed") {
    discount = input.value;
  } else {
    discount = Math.floor((input.baseAmount * input.value) / 100);
  }

  if (input.maxDiscount && discount > input.maxDiscount) {
    discount = input.maxDiscount;
  }

  return Math.max(0, Math.min(discount, input.baseAmount));
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const admin = createAdminSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const couponCode = String(body.couponCode ?? "").trim().toUpperCase();

    if (!productId) {
      return NextResponse.json({ error: "productId wajib diisi" }, { status: 400 });
    }

    const { data: product } = await admin
      .from("products")
      .select("id, name, price, stock")
      .eq("id", productId)
      .single();

    if (!product) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

    const { count: availableCredentialCount } = await admin
      .from("app_credentials")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("is_used", false);

    if (product.stock <= 0 || (availableCredentialCount ?? 0) <= 0) {
      return NextResponse.json({ error: "Stok atau credential tidak tersedia" }, { status: 400 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const amount = Number(product.price);
    let discountAmount = 0;
    let appliedCouponCode: string | null = null;

    if (couponCode) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("id, code, type, value, min_purchase, max_discount, quota, used_count, is_active, starts_at, ends_at")
        .eq("code", couponCode)
        .single();

      const now = new Date();
      const isStarted = !coupon?.starts_at || new Date(coupon.starts_at) <= now;
      const isNotExpired = !coupon?.ends_at || new Date(coupon.ends_at) >= now;
      const quotaAvailable = coupon?.quota == null || coupon.used_count < coupon.quota;

      if (!coupon || !coupon.is_active || !isStarted || !isNotExpired || !quotaAvailable) {
        return NextResponse.json({ error: "Kupon tidak aktif atau sudah tidak berlaku" }, { status: 400 });
      }

      if (amount < Number(coupon.min_purchase ?? 0)) {
        return NextResponse.json({ error: "Minimal belanja untuk kupon belum terpenuhi" }, { status: 400 });
      }

      discountAmount = calculateDiscount({
        type: coupon.type,
        value: Number(coupon.value),
        baseAmount: amount,
        maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null
      });

      appliedCouponCode = coupon.code;
    }

    const finalAmount = Math.max(0, amount - discountAmount);
    const orderId = `KGP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const statusToken = crypto.randomBytes(8).toString("hex").toUpperCase();

    const snapPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalAmount
      },
      item_details: [
        {
          id: product.id,
          price: finalAmount,
          quantity: 1,
          name: product.name
        }
      ],
      customer_details: {
        first_name: profile?.full_name || user.email?.split("@")[0] || "Customer",
        email: user.email || undefined
      }
    };

    const snapResponse = await midtransSnap.createTransaction(snapPayload);

    const { error: insertError } = await admin.from("transactions").insert({
      order_id: orderId,
      user_id: user.id,
      product_id: product.id,
      amount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      coupon_code: appliedCouponCode,
      status: "pending",
      snap_token: snapResponse.token,
      status_token: statusToken
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      snapToken: snapResponse.token,
      redirectUrl: snapResponse.redirect_url
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout gagal" },
      { status: 500 }
    );
  }
}
