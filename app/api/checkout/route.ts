import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createMidtransQrisTransaction, createMidtransSnapTransaction } from "@/lib/midtrans";
import { fulfillProductOrder } from "@/lib/fulfillment";
import { preparePterodactylServerConfig } from "@/lib/pterodactyl";
import { getDefaultWhatsappBotEnvironment, getPanelPresetByKey } from "@/lib/panel-packages";
import { isChatBasedService, isPanelService } from "@/lib/service-types";

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

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const productId = String(body.productId ?? "").trim();
    const couponCode = String(body.couponCode ?? "").trim().toUpperCase();
    const paymentMethod = String(body.paymentMethod ?? "midtrans").trim().toLowerCase();
    const panelUsername = String(body.panelUsername ?? "").trim();
    const panelPlanKey = String(body.panelPlanKey ?? "1gb").trim().toLowerCase();
    const roomId = String(body.roomId ?? "").trim() || null;

    if (!productId) {
      return NextResponse.json({ error: "productId wajib diisi" }, { status: 400 });
    }

    const { data: product } = await admin
      .from("products")
      .select("id, name, price, stock, service_type, is_active, pterodactyl_config, live_chat_enabled, support_admin_ids")
      .eq("id", productId)
      .single();

    if (!product || (product as { is_active?: boolean }).is_active === false) {
      return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const serviceType = (product as { service_type?: string | null }).service_type;
    const isPanel = isPanelService(serviceType);
    const isChatService = isChatBasedService(serviceType) || Boolean((product as any).live_chat_enabled);
    const needsStock = !isPanel && !isChatService;
    const panelPlan = isPanel ? getPanelPresetByKey(panelPlanKey) : null;

    if (needsStock && Number((product as { stock?: number }).stock || 0) <= 0) {
      return NextResponse.json({ error: "Stok produk sedang habis" }, { status: 400 });
    }

    if (needsStock) {
      const { count: availableCredentialCount } = await admin
        .from("app_credentials")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("is_used", false);

      if ((availableCredentialCount ?? 0) <= 0) {
        return NextResponse.json({ error: "Credential tidak tersedia" }, { status: 400 });
      }
    }

    if (isPanel && !panelUsername) {
      return NextResponse.json({ error: "Username panel wajib diisi untuk pembelian panel" }, { status: 400 });
    }

    if (isPanel) {
      const panelConfig = (product as any).pterodactyl_config || {};
      await preparePterodactylServerConfig({
        nest_id: Number(panelConfig.nest_id || process.env.PTERODACTYL_DEFAULT_NEST_ID || 1),
        egg_id: Number(panelConfig.egg_id || process.env.PTERODACTYL_DEFAULT_EGG_ID || 1),
        allocation_id: Number(panelConfig.allocation_id || process.env.PTERODACTYL_DEFAULT_ALLOCATION_ID || 1),
        location_id: Number(panelConfig.location_id || process.env.PTERODACTYL_DEFAULT_LOCATION_ID || 1),
        memory: Number(panelPlan?.memoryMb ?? panelConfig.memory ?? 1024),
        disk: Number(panelPlan?.diskMb ?? panelConfig.disk ?? 2048),
        cpu: Number(panelPlan?.cpuPercent ?? panelConfig.cpu ?? 40),
        databases: Number(panelConfig.databases || 1),
        backups: Number(panelConfig.backups || 1),
        allocations: Number(panelConfig.allocations || 1),
        startup: panelConfig.startup || undefined,
        docker_image: panelConfig.docker_image || process.env.PTERODACTYL_DEFAULT_DOCKER_IMAGE || undefined,
        environment: getDefaultWhatsappBotEnvironment(panelConfig.environment || {})
      });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, balance, telegram_id")
      .eq("id", user.id)
      .single();

    const amount = isPanel ? Number(panelPlan?.price || 0) : Number((product as { price: number }).price);
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
      const quotaAvailable = coupon?.quota == null || (coupon.used_count || 0) < coupon.quota;

      if (!coupon || !coupon.is_active || !isStarted || !isNotExpired || !quotaAvailable) {
        return NextResponse.json({ error: "Kupon tidak aktif atau sudah tidak berlaku" }, { status: 400 });
      }

      if (amount < Number(coupon.min_purchase ?? 0)) {
        return NextResponse.json({ error: "Minimal belanja untuk kupon belum terpenuhi" }, { status: 400 });
      }

      discountAmount = calculateDiscount({
        type: coupon.type as "fixed" | "percentage",
        value: Number(coupon.value),
        baseAmount: amount,
        maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null
      });

      appliedCouponCode = coupon.code;
    }

    const finalAmount = Math.max(0, amount - discountAmount);
    const orderId = `KGP-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const statusToken = crypto.randomBytes(8).toString("hex").toUpperCase();
    const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    const waitingUrl = appUrl ? `${appUrl}/waiting-payment/${orderId}` : `/waiting-payment/${orderId}`;

    const baseTransactionPayload = {
      order_id: orderId,
      user_id: user.id,
      product_id: (product as { id: string }).id,
      amount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      coupon_code: appliedCouponCode,
      status: "pending",
      status_token: statusToken,
      payment_method: paymentMethod,
      telegram_id: (profile as { telegram_id?: string | null } | null)?.telegram_id || null,
      fulfillment_data: {
        ...(isPanel
          ? {
              type: "pterodactyl_pending",
              requested_username: panelUsername,
              requested_from: roomId ? "live-chat" : "web",
              panel_plan_key: panelPlan?.key,
              panel_plan_label: panelPlan?.label,
              memory: panelPlan?.memoryMb,
              disk: panelPlan?.diskMb,
              cpu: panelPlan?.cpuPercent,
              disk_text: panelPlan?.diskMb === 0 ? "Unlimited" : `${Math.max(1, Math.round((panelPlan?.diskMb || 0) / 1024))}GB`,
              memory_text: panelPlan?.memoryMb === 0 ? "Unlimited" : `${Math.round((panelPlan?.memoryMb || 0) / 1024)}GB`,
              cpu_text: panelPlan?.cpuPercent === 0 ? "Unlimited" : `${panelPlan?.cpuPercent}%`,
              plan_price: panelPlan?.price,
              product_mode: "single-panel-multi-option"
            }
          : {}),
        ...(isChatService
          ? {
              type: "chat_service_pending",
              requested_from: roomId ? "live-chat" : "web",
              room_id: roomId,
              live_chat_enabled: Boolean((product as any).live_chat_enabled)
            }
          : {})
      }
    };

    if (paymentMethod === "balance") {
      const balance = Number((profile as { balance?: number | null } | null)?.balance || 0);
      if (balance < finalAmount) {
        return NextResponse.json({ error: "Saldo Anda tidak mencukupi" }, { status: 400 });
      }

      const { error: insertError } = await admin.from("transactions").insert({
        ...baseTransactionPayload,
        snap_token: "BALANCE_PAYMENT"
      });
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

      const { error: balanceError } = await admin.rpc("apply_wallet_adjustment", {
        p_user_id: user.id,
        p_amount: -finalAmount,
        p_type: "purchase",
        p_description: `Pembelian ${(product as { name: string }).name}${panelPlan ? ` paket ${panelPlan.label}` : ""} (${orderId}) via saldo`,
        p_admin_user_id: null
      });
      if (balanceError) return NextResponse.json({ error: balanceError.message }, { status: 500 });

      await fulfillProductOrder(orderId);
      return NextResponse.json({ success: true, orderId, redirectTo: `/waiting-payment/${orderId}` });
    }

    const itemName = isPanel && panelPlan
      ? `${String((product as { name: string }).name).slice(0, 34)} ${panelPlan.label}`
      : `🛒 ${String((product as { name: string }).name).slice(0, 46)}`;

    if (paymentMethod === "qris") {
      const qris = await createMidtransQrisTransaction({
        orderId,
        amount: finalAmount,
        itemDetails: [{
          id: (product as { id: string }).id,
          price: finalAmount,
          quantity: 1,
          name: itemName
        }],
        customerDetails: {
          first_name: (profile as { full_name?: string | null } | null)?.full_name || user.email?.split("@")[0] || "Customer",
          email: user.email || undefined
        }
      });

      const { error: insertError } = await admin.from("transactions").insert({
        ...baseTransactionPayload,
        payment_method: "qris",
        snap_token: qris.transactionId || qris.qrUrl || "QRIS_PENDING",
        fulfillment_data: {
          ...(baseTransactionPayload.fulfillment_data || {}),
          payment_type: "qris",
          payment_qr_url: qris.qrUrl || null,
          payment_actions: qris.actions || null,
          payment_fallback_url: waitingUrl
        }
      });

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

      return NextResponse.json({
        success: true,
        orderId,
        redirectUrl: `/waiting-payment/${orderId}`,
        paymentMethod: "qris",
        paymentQrUrl: qris.qrUrl || null
      });
    }

    const snap = await createMidtransSnapTransaction({
      orderId,
      amount: finalAmount,
      itemDetails: [{
        id: (product as { id: string }).id,
        price: finalAmount,
        quantity: 1,
        name: itemName.slice(0, 50)
      }],
      customerDetails: {
        first_name: (profile as { full_name?: string | null } | null)?.full_name || user.email?.split("@")[0] || "Customer",
        email: user.email || undefined
      },
      enabledPayments: ["qris", "gopay", "shopeepay", "bca_va", "bni_va", "permata_va"]
    });

    const { error: insertError } = await admin.from("transactions").insert({
      ...baseTransactionPayload,
      snap_token: snap.token,
      fulfillment_data: {
        ...(baseTransactionPayload.fulfillment_data || {}),
        payment_type: "snap",
        payment_redirect_url: snap.redirectUrl || null,
        payment_fallback_url: waitingUrl
      }
    });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      orderId,
      snapToken: snap.token,
      snapRedirectUrl: snap.redirectUrl,
      redirectUrl: `/waiting-payment/${orderId}`
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout gagal" },
      { status: 500 }
    );
  }
}
