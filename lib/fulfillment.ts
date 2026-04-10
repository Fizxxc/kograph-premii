import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  createPterodactylServer,
  createPterodactylUser,
  preparePterodactylServerConfig
} from "@/lib/pterodactyl";
import { sendTelegramMessage } from "@/lib/telegram";

function safeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || `user${Date.now().toString().slice(-6)}`;
}

function buildPanelCredentials(preferredUsername?: string | null) {
  const seed = crypto.randomBytes(3).toString("hex");
  const username = `${safeUsername(preferredUsername || "panel")}${seed}`.slice(0, 16);
  const emailDomain = process.env.PTERODACTYL_LOGIN_DOMAIN?.trim() || "panel.kograph.local";
  const email = `${username}@${emailDomain}`;
  const password = `KgP!${crypto.randomBytes(6).toString("base64url")}`;
  return { username, email, password };
}

async function notifyTelegramProduct(tx: any, productName: string, fulfillmentData: any) {
  if (!tx.telegram_id) return;

  const lines = [
    `✅ <b>Pembayaran berhasil terverifikasi</b>`,
    "",
    `<b>Order ID</b>: <code>${tx.order_id}</code>`,
    `<b>Produk</b>: ${productName}`,
    `<b>Status</b>: settlement`
  ];

  if (fulfillmentData?.type === "pterodactyl") {
    lines.push(
      "",
      `<b>Panel URL</b>: ${fulfillmentData.panel_url || "-"}`,
      `<b>Username</b>: <code>${fulfillmentData.panel_username || "-"}</code>`,
      `<b>Email</b>: <code>${fulfillmentData.panel_email || "-"}</code>`,
      `<b>Password</b>: <code>${fulfillmentData.panel_password || "-"}</code>`
    );
  }

  await sendTelegramMessage(tx.telegram_id, lines.join("\n"), {
    bot: "auto",
    disable_web_page_preview: false
  }).catch(() => null);
}

async function notifyTelegramTopup(userId: string, orderId: string, amount: number) {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("telegram_id, balance")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.telegram_id) return;

  await sendTelegramMessage(
    profile.telegram_id,
    [
      `✅ <b>Top up berhasil masuk</b>`,
      "",
      `<b>Order ID</b>: <code>${orderId}</code>`,
      `<b>Nominal</b>: Rp ${Intl.NumberFormat("id-ID").format(amount)}`,
      `<b>Saldo sekarang</b>: Rp ${Intl.NumberFormat("id-ID").format(Number(profile.balance || 0))}`
    ].join("\n"),
    { bot: "auto" }
  ).catch(() => null);
}

export async function fulfillProductOrder(orderId: string) {
  const admin = createAdminSupabaseClient();

  const { data: tx, error } = await admin
    .from("transactions")
    .select(
      `id, order_id, user_id, product_id, status, coupon_code, telegram_id, payment_method, fulfillment_data,
       products ( id, name, service_type, pterodactyl_config, sold_count, stock )`
    )
    .eq("order_id", orderId)
    .single();

  if (error || !tx) throw new Error(error?.message || "Transaksi tidak ditemukan");

  const product = Array.isArray((tx as any).products) ? (tx as any).products[0] : (tx as any).products;
  if (!product) throw new Error("Produk transaksi tidak ditemukan");

  const isPanel = (product.service_type || "credential") === "pterodactyl";

  if (!isPanel && (tx as any).status === "settlement") {
    return { already_settled: true };
  }

  if (!isPanel) {
    const { data, error: rpcError } = await admin.rpc("fulfill_transaction", { p_order_id: orderId });
    if (rpcError) throw new Error(rpcError.message);

    await admin
      .from("products")
      .update({ sold_count: Number(product.sold_count || 0) + 1 })
      .eq("id", product.id);

    await notifyTelegramProduct(tx, product.name, null);
    return data;
  }

  if ((tx as any).status === "settlement" && (tx as any).fulfillment_data?.panel_email) {
    return { already_settled: true, fulfillment_data: (tx as any).fulfillment_data };
  }

  const panelConfig = product.pterodactyl_config || {};
  const pendingFulfillment = (tx as any).fulfillment_data || {};
  const preferredUsername = pendingFulfillment.requested_username || (tx as any).telegram_id || "panel";
  const credentials = buildPanelCredentials(preferredUsername);

  const { data: userRow, error: userError } = await admin.auth.admin.getUserById((tx as any).user_id);
  if (userError) throw new Error(userError.message);

  const fullName = String(userRow.user?.user_metadata?.full_name || preferredUsername || "Customer Premium");

  const preparedConfig = await preparePterodactylServerConfig({
    nest_id: Number(panelConfig.nest_id || process.env.PTERODACTYL_DEFAULT_NEST_ID || 1),
    egg_id: Number(panelConfig.egg_id || process.env.PTERODACTYL_DEFAULT_EGG_ID || 1),
    allocation_id: Number(
      panelConfig.allocation_id || process.env.PTERODACTYL_DEFAULT_ALLOCATION_ID || 1
    ),
    location_id: Number(panelConfig.location_id || process.env.PTERODACTYL_DEFAULT_LOCATION_ID || 1),
    memory: Number(panelConfig.memory || 1024),
    disk: Number(panelConfig.disk || 10240),
    cpu: Number(panelConfig.cpu || 100),
    databases: Number(panelConfig.databases || 1),
    backups: Number(panelConfig.backups || 1),
    allocations: Number(panelConfig.allocations || 1),
    startup: panelConfig.startup || undefined,
    docker_image:
      panelConfig.docker_image || process.env.PTERODACTYL_DEFAULT_DOCKER_IMAGE || undefined,
    environment: panelConfig.environment || {}
  });

  const panelUser = await createPterodactylUser({
    email: credentials.email,
    username: credentials.username,
    first_name: fullName.split(" ")[0],
    last_name: fullName.split(" ").slice(1).join(" ") || "Premium",
    password: credentials.password
  });

  const server = await createPterodactylServer({
    name: `${product.name} - ${credentials.username}`,
    user_id: panelUser.id,
    external_id: orderId,
    config: preparedConfig
  });

  const fulfillmentData = {
    type: "pterodactyl",
    telegram_id: (tx as any).telegram_id || null,
    requested_username: preferredUsername,
    panel_url: process.env.PTERODACTYL_PANEL_URL || null,
    panel_username: credentials.username,
    panel_email: credentials.email,
    panel_password: credentials.password,
    panel_user_id: panelUser.id,
    server_id: server.id,
    server_uuid: server.uuid,
    server_identifier: server.identifier,
    note: "Login panel sudah dibuat otomatis. Simpan email dan password panel Anda dengan baik."
  };

  const { error: txUpdateError } = await admin
    .from("transactions")
    .update({ status: "settlement", fulfillment_data: fulfillmentData })
    .eq("id", (tx as any).id);
  if (txUpdateError) throw new Error(txUpdateError.message);

  await admin
    .from("products")
    .update({ sold_count: Number(product.sold_count || 0) + 1 })
    .eq("id", product.id);

  if ((tx as any).coupon_code) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("used_count")
      .eq("code", (tx as any).coupon_code)
      .maybeSingle();

    if (coupon) {
      await admin
        .from("coupons")
        .update({ used_count: Number((coupon as any).used_count || 0) + 1 })
        .eq("code", (tx as any).coupon_code);
    }
  }

  await notifyTelegramProduct(tx, product.name, fulfillmentData);

  return { fulfilled: true, fulfillment_data: fulfillmentData };
}

export async function settleWalletTopup(orderId: string) {
  const admin = createAdminSupabaseClient();
  const { data: topup, error } = await admin
    .from("wallet_topups")
    .select("id, user_id, amount, status")
    .eq("order_id", orderId)
    .single();

  if (error || !topup) throw new Error(error?.message || "Topup tidak ditemukan");
  if ((topup as any).status === "settlement") return { already_settled: true };

  await admin.from("wallet_topups").update({ status: "settlement" }).eq("id", (topup as any).id);
  await admin.rpc("apply_wallet_adjustment", {
    p_user_id: (topup as any).user_id,
    p_amount: Number((topup as any).amount),
    p_type: "topup",
    p_description: `Top up saldo via Midtrans (${orderId})`,
    p_admin_user_id: null
  });

  await notifyTelegramTopup((topup as any).user_id, orderId, Number((topup as any).amount));
  return { settled: true };
}
