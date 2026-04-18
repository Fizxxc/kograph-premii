import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  createPterodactylServer,
  createPterodactylUser,
  preparePterodactylServerConfig,
} from "@/lib/pterodactyl";
import { sendTelegramMessage } from "@/lib/telegram";
import { getDefaultWhatsappBotEnvironment } from "@/lib/panel-packages";
import {
  isChatBasedService,
  isPanelService,
  isStockManagedService,
} from "@/lib/service-types";

function safeUsername(value: string) {
  return (
    value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) ||
    `user${Date.now().toString().slice(-6)}`
  );
}

function buildPanelCredentials(preferredUsername?: string | null, preferredEmail?: string | null) {
  const seed = crypto.randomBytes(3).toString("hex");
  const username = `${safeUsername(preferredUsername || "panel")}${seed}`.slice(
    0,
    16
  );
  const emailDomain =
    process.env.PTERODACTYL_LOGIN_DOMAIN?.trim() || "panel.kograph.local";
  const email = preferredEmail?.trim().toLowerCase() || `${username}@${emailDomain}`;
  const password = `KgP!${crypto.randomBytes(6).toString("base64url")}`;
  return { username, email, password };
}

function parseAdminChatIds() {
  return String(process.env.TELEGRAM_ADMIN_CHAT_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function notifyTelegramProduct(
  tx: any,
  productName: string,
  fulfillmentData: any
) {
  if (!tx.telegram_id) return;

  const lines = [
    `✅ <b>Pembayaran berhasil terverifikasi</b>`,
    "",
    `<b>Order ID</b>: <code>${tx.order_id}</code>`,
    `<b>Produk</b>: ${productName}`,
    `<b>Status</b>: settlement`,
  ];

  if (fulfillmentData?.panel_plan_label) {
    lines.push(`<b>Paket</b>: ${fulfillmentData.panel_plan_label}`);
  }

  if (fulfillmentData?.type === "pterodactyl") {
    lines.push(
      "",
      `<b>Panel URL</b>: ${fulfillmentData.panel_url || "-"}`,
      `<b>Username</b>: <code>${fulfillmentData.panel_username || "-"}</code>`,
      `<b>Email</b>: <code>${fulfillmentData.panel_email || "-"}</code>`,
      `<b>Password</b>: <code>${fulfillmentData.panel_password || "-"}</code>`,
      `<b>Spesifikasi</b>: RAM ${fulfillmentData.memory_text || "-"} • Disk ${
        fulfillmentData.disk_text || "-"
      } • CPU ${fulfillmentData.cpu_text || "-"}`
    );
  } else if (fulfillmentData?.type === "chat_service") {
    lines.push(
      "",
      `Admin sudah menerima bukti pembayaran Anda dan room live chat siap dipakai untuk briefing, revisi, dan update progres.`
    );
  }

  await sendTelegramMessage(tx.telegram_id, lines.join("\n"), {
    bot: "auto",
    disable_web_page_preview: false,
  }).catch(() => null);
}

async function notifyTelegramTopup(
  userId: string,
  orderId: string,
  amount: number
) {
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
      `<b>Saldo sekarang</b>: Rp ${Intl.NumberFormat("id-ID").format(
        Number(profile.balance || 0)
      )}`,
    ].join("\n"),
    { bot: "auto" }
  ).catch(() => null);
}

async function ensureRoomForChatService(input: {
  admin: ReturnType<typeof createAdminSupabaseClient>;
  tx: any;
  product: any;
}) {
  const admin = input.admin;
  const existingRoomId = input.tx.fulfillment_data?.room_id || null;

  if (existingRoomId) {
    const { data: room } = await admin
      .from("live_chat_rooms")
      .select("id")
      .eq("id", existingRoomId)
      .maybeSingle();

    if (room?.id) return room.id as string;
  }

  const { data: recentRoom } = await admin
    .from("live_chat_rooms")
    .select("id")
    .eq("product_id", input.product.id)
    .eq("customer_user_id", input.tx.user_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentRoom?.id) return recentRoom.id as string;

  const { data: room, error } = await admin
    .from("live_chat_rooms")
    .insert({
      product_id: input.product.id,
      customer_user_id: input.tx.user_id,
      telegram_chat_id: input.tx.telegram_id || null,
      title: `Chat ${input.product.name}`,
      status: "paid",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const supportAdminIds = Array.isArray(input.product.support_admin_ids)
    ? input.product.support_admin_ids.filter(Boolean)
    : [];

  if (supportAdminIds.length) {
    const { error: roomAdminsError } = await admin
      .from("live_chat_room_admins")
      .insert(
        supportAdminIds.map((adminUserId: string) => ({
          room_id: room.id,
          admin_user_id: adminUserId,
        }))
      );

    if (roomAdminsError) {
      console.warn(
        "Failed to insert live_chat_room_admins:",
        roomAdminsError.message
      );
    }
  }

  return room.id as string;
}

async function notifyAdminsForChatService(input: {
  admin: ReturnType<typeof createAdminSupabaseClient>;
  tx: any;
  product: any;
  roomId: string;
}) {
  const admin = input.admin;
  const amount = Number(input.tx.final_amount || 0);
  const paymentMethod = String(input.tx.payment_method || "midtrans").toUpperCase();

  const { error: insertMessagesError } = await admin
    .from("live_chat_messages")
    .insert([
      {
        room_id: input.roomId,
        sender_user_id: null,
        sender_role: "system",
        message: `🛒 Order ${
          input.product.name
        } sudah dibayar. Admin bisa lanjutkan proses dari room ini.\n\nOrder ID: ${
          input.tx.order_id
        }\nMetode bayar: ${paymentMethod}\nTotal: Rp ${Intl.NumberFormat(
          "id-ID"
        ).format(amount)}`,
      },
      {
        room_id: input.roomId,
        sender_user_id: null,
        sender_role: "system",
        message:
          "✅ Bukti pembayaran otomatis dari sistem sudah masuk dan customer siap diarahkan ke proses briefing atau pengerjaan.",
      },
    ]);

  if (insertMessagesError) {
    console.warn(
      "Failed to insert live_chat_messages:",
      insertMessagesError.message
    );
  }

  const { error: roomUpdateError } = await admin
    .from("live_chat_rooms")
    .update({
      status: "paid",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", input.roomId);

  if (roomUpdateError) {
    console.warn("Failed to update live_chat_rooms:", roomUpdateError.message);
  }

  const roomUrl = `${String(process.env.NEXT_PUBLIC_APP_URL || "").replace(
    /\/$/,
    ""
  )}/chat/${input.roomId}`;
  const customerName = input.tx.guest_email || input.tx.guest_name || input.tx.user_id || "guest";

  const text = [
    `💬 <b>Order live chat sudah dibayar</b>`,
    `#ROOM:${input.roomId}`,
    "",
    `<b>Produk</b>: ${input.product.name}`,
    `<b>Order ID</b>: <code>${input.tx.order_id}</code>`,
    `<b>Metode</b>: ${paymentMethod}`,
    `<b>Total</b>: Rp ${Intl.NumberFormat("id-ID").format(amount)}`,
    `<b>User</b>: <code>${customerName}</code>`,
    "",
    `Reply pesan ini untuk membalas customer dari Telegram, atau buka room web: ${roomUrl}`,
  ].join("\n");

  for (const chatId of parseAdminChatIds()) {
    await sendTelegramMessage(chatId, text, {
      bot: "auto",
      disable_web_page_preview: false,
    }).catch(() => null);
  }
}

export async function fulfillProductOrder(orderId: string) {
  const admin = createAdminSupabaseClient();

  const { data: tx, error } = await admin
    .from("transactions")
    .select(
      `id, order_id, user_id, product_id, status, coupon_code, telegram_id, payment_method, final_amount, fulfillment_data, guest_name, guest_email,
       products ( id, name, service_type, pterodactyl_config, sold_count, stock, live_chat_enabled, support_admin_ids )`
    )
    .eq("order_id", orderId)
    .single();

  if (error || !tx) throw new Error(error?.message || "Transaksi tidak ditemukan");

  const product = Array.isArray((tx as any).products)
    ? (tx as any).products[0]
    : (tx as any).products;

  if (!product) throw new Error("Produk transaksi tidak ditemukan");

  const isPanel = isPanelService(product.service_type);
  const isChatService =
    isChatBasedService(product.service_type) || Boolean(product.live_chat_enabled);
  const isStockManaged = isStockManagedService(product.service_type);

  if (!isPanel && !isChatService && (tx as any).status === "settlement") {
    return { already_settled: true };
  }

  if (isStockManaged) {
    const { data, error: rpcError } = await admin.rpc("fulfill_transaction", {
      p_order_id: orderId,
    });
    if (rpcError) throw new Error(rpcError.message);

    const { error: soldCountError } = await admin
      .from("products")
      .update({ sold_count: Number(product.sold_count || 0) + 1 })
      .eq("id", product.id);

    if (soldCountError) throw new Error(soldCountError.message);

    await notifyTelegramProduct(tx, product.name, null);
    return data;
  }

  if (isChatService) {
    if (
      (tx as any).status === "settlement" &&
      (tx as any).fulfillment_data?.type === "chat_service"
    ) {
      return {
        already_settled: true,
        fulfillment_data: (tx as any).fulfillment_data,
      };
    }

    const roomId = await ensureRoomForChatService({ admin, tx, product });

    const fulfillmentData = {
      ...((tx as any).fulfillment_data || {}),
      type: "chat_service",
      room_id: roomId,
      status_note:
        "Pembayaran valid. Admin sudah menerima notifikasi otomatis dan room live chat siap dipakai.",
    };

    const { error: txUpdateError } = await admin
      .from("transactions")
      .update({ status: "settlement", fulfillment_data: fulfillmentData })
      .eq("id", (tx as any).id);

    if (txUpdateError) throw new Error(txUpdateError.message);

    const { error: soldCountError } = await admin
      .from("products")
      .update({ sold_count: Number(product.sold_count || 0) + 1 })
      .eq("id", product.id);

    if (soldCountError) throw new Error(soldCountError.message);

    await notifyAdminsForChatService({
      admin,
      tx: { ...(tx as any), fulfillment_data: fulfillmentData },
      product,
      roomId,
    });

    await notifyTelegramProduct(
      { ...(tx as any), fulfillment_data: fulfillmentData },
      product.name,
      fulfillmentData
    );

    return { fulfilled: true, fulfillment_data: fulfillmentData };
  }

  if (
    (tx as any).status === "settlement" &&
    (tx as any).fulfillment_data?.panel_email
  ) {
    return {
      already_settled: true,
      fulfillment_data: (tx as any).fulfillment_data,
    };
  }

  const panelConfig = product.pterodactyl_config || {};
  const pendingFulfillment = (tx as any).fulfillment_data || {};
  const preferredUsername =
    pendingFulfillment.requested_username || (tx as any).telegram_id || "panel";
  const guestName = String((tx as any).guest_name || "").trim();
  const guestEmail = String((tx as any).guest_email || "").trim().toLowerCase();
  let accountEmail = guestEmail;
  let fullName = guestName || preferredUsername || "Customer Premium";

  if ((tx as any).user_id) {
    const { data: userRow, error: userError } = await admin.auth.admin.getUserById(
      (tx as any).user_id
    );
    if (userError) throw new Error(userError.message);
    accountEmail = String(userRow.user?.email || guestEmail || "").trim().toLowerCase();
    fullName = String(
      userRow.user?.user_metadata?.full_name || guestName || preferredUsername || "Customer Premium"
    );
  }

  const panelIdentity = buildPanelCredentials(preferredUsername, accountEmail || undefined);

  const preparedConfig = await preparePterodactylServerConfig({
    nest_id: Number(
      panelConfig.nest_id || process.env.PTERODACTYL_DEFAULT_NEST_ID || 1
    ),
    egg_id: Number(panelConfig.egg_id || process.env.PTERODACTYL_DEFAULT_EGG_ID || 1),
    allocation_id: Number(
      panelConfig.allocation_id || process.env.PTERODACTYL_DEFAULT_ALLOCATION_ID || 1
    ),
    location_id: Number(
      panelConfig.location_id || process.env.PTERODACTYL_DEFAULT_LOCATION_ID || 1
    ),
    memory: Number(pendingFulfillment.memory ?? panelConfig.memory ?? 1024),
    disk: Number(pendingFulfillment.disk ?? panelConfig.disk ?? 2048),
    cpu: Number(pendingFulfillment.cpu ?? panelConfig.cpu ?? 40),
    databases: Number(panelConfig.databases || 1),
    backups: Number(panelConfig.backups || 1),
    allocations: Number(panelConfig.allocations || 1),
    startup: panelConfig.startup || undefined,
    docker_image:
      panelConfig.docker_image ||
      process.env.PTERODACTYL_DEFAULT_DOCKER_IMAGE ||
      undefined,
    environment: getDefaultWhatsappBotEnvironment(panelConfig.environment || {}),
  });

  const panelUser = await createPterodactylUser({
    email: panelIdentity.email,
    username: panelIdentity.username,
    first_name: fullName.split(" ")[0],
    last_name: fullName.split(" ").slice(1).join(" ") || "Premium",
    password: panelIdentity.password,
  });

  const server = await createPterodactylServer({
    name: `${product.name} - ${panelIdentity.username}`,
    user_id: panelUser.id,
    external_id: orderId,
    config: preparedConfig,
  });

  const fulfillmentData = {
    ...pendingFulfillment,
    type: "pterodactyl",
    telegram_id: (tx as any).telegram_id || null,
    requested_username: preferredUsername,
    buyer_name: fullName,
    panel_url: process.env.PTERODACTYL_PANEL_URL || null,
    panel_username: panelIdentity.username,
    panel_email: panelIdentity.email,
    panel_password: panelIdentity.password,
    panel_user_id: panelUser.id,
    server_id: server.id,
    server_uuid: server.uuid,
    server_identifier: server.identifier,
    note: "Login panel sudah dibuat otomatis. Simpan email dan password panel Anda dengan baik.",
    memory_text:
      pendingFulfillment.memory_text ||
      (Number(pendingFulfillment.memory) === 0
        ? "Unlimited"
        : `${Math.round(Number(pendingFulfillment.memory || 1024) / 1024)}GB`),
    disk_text:
      pendingFulfillment.disk_text ||
      (Number(pendingFulfillment.disk) === 0
        ? "Unlimited"
        : `${Math.max(
            1,
            Math.round(Number(pendingFulfillment.disk || 2048) / 1024)
          )}GB`),
    cpu_text:
      pendingFulfillment.cpu_text ||
      (Number(pendingFulfillment.cpu) === 0
        ? "Unlimited"
        : `${pendingFulfillment.cpu || 40}%`),
  };

  const { error: txUpdateError } = await admin
    .from("transactions")
    .update({ status: "settlement", fulfillment_data: fulfillmentData })
    .eq("id", (tx as any).id);

  if (txUpdateError) throw new Error(txUpdateError.message);

  const { error: soldCountError } = await admin
    .from("products")
    .update({ sold_count: Number(product.sold_count || 0) + 1 })
    .eq("id", product.id);

  if (soldCountError) throw new Error(soldCountError.message);

  if ((tx as any).coupon_code) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("used_count")
      .eq("code", (tx as any).coupon_code)
      .maybeSingle();

    if (coupon) {
      const { error: couponUpdateError } = await admin
        .from("coupons")
        .update({ used_count: Number((coupon as any).used_count || 0) + 1 })
        .eq("code", (tx as any).coupon_code);

      if (couponUpdateError) {
        console.warn("Failed to update coupon usage:", couponUpdateError.message);
      }
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

  const { error: topupUpdateError } = await admin
    .from("wallet_topups")
    .update({ status: "settlement" })
    .eq("id", (topup as any).id);

  if (topupUpdateError) throw new Error(topupUpdateError.message);

  const { error: walletRpcError } = await admin.rpc("apply_wallet_adjustment", {
    p_user_id: (topup as any).user_id,
    p_amount: Number((topup as any).amount),
    p_type: "topup",
    p_description: `Top up saldo via Midtrans (${orderId})`,
    p_admin_user_id: null,
  });

  if (walletRpcError) throw new Error(walletRpcError.message);

  await notifyTelegramTopup(
    (topup as any).user_id,
    orderId,
    Number((topup as any).amount)
  );

  return { settled: true };
}