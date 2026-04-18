import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  answerTelegramCallbackQuery,
  buildCheckBotButtons,
  deleteTelegramMessage,
  editTelegramMessage,
  sendTelegramMessage,
  sendTelegramPhoto,
  upsertTelegramUser
} from "@/lib/telegram";
import {
  adjustWalletByTelegramAdmin,
  createTelegramProductOrder,
  createTelegramTopup,
  ensureTelegramCustomerProfile,
  getProfileByTelegramId
} from "@/lib/telegram-commerce";
import { PANEL_RAM_PRESETS, getPanelPresetByKey } from "@/lib/panel-packages";
import { SITE, QUICK_TOPUP_AMOUNTS } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils";

function topupMenuKeyboard() {
  return {
    inline_keyboard: [
      ...QUICK_TOPUP_AMOUNTS.map((amount) => [{ text: `Top up ${formatRupiah(amount)}`, callback_data: `topup:${amount}` }]),
      [{ text: "⬅️ Kembali", callback_data: "home:menu" }]
    ]
  };
}

function panelPlanKeyboard(productId: string) {
  return {
    inline_keyboard: [
      ...PANEL_RAM_PRESETS.map((plan) => [
        { text: `${plan.label} • ${formatRupiah(plan.price)}`, callback_data: `plan:${productId}:${plan.key}` }
      ]),
      [{ text: "⬅️ Kembali", callback_data: "catalog:list" }]
    ]
  };
}

function paymentChoiceKeyboard(productId: string, panelPlanKey?: string) {
  const suffix = panelPlanKey ? `:${panelPlanKey}` : "";
  const selected = panelPlanKey ? getPanelPresetByKey(panelPlanKey) : null;
  return {
    inline_keyboard: [
      ...(selected ? [[{ text: `Paket: ${selected.label} • ${formatRupiah(selected.price)}`, callback_data: "noop:selected" }]] : []),
      [{ text: "⚡ Bayar QRIS dinamis", callback_data: `buy:${productId}:qris${suffix}` }],
      [{ text: "💳 Top up saldo", callback_data: "topup:menu" }],
      [{ text: "⬅️ Kembali", callback_data: panelPlanKey ? `planback:${productId}` : "catalog:list" }]
    ]
  };
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🛒 Beli produk", callback_data: "catalog:list" }],
      [{ text: "💳 Top up saldo", callback_data: "topup:menu" }],
      [{ text: "👛 Cek saldo saya", callback_data: "wallet:info" }],
      [{ text: "📝 Daftar pertama kali", callback_data: "register:first" }],
      ...buildCheckBotButtons().inline_keyboard
    ]
  };
}

function buildPaymentLinks(result: any) {
  const buttons: any[] = [];
  if (result.paymentUrl) {
    buttons.push([{ text: "⚡ Buka halaman QRIS", url: result.paymentUrl }]);
  }
  if (result.waitingUrl) buttons.push([{ text: "🌐 Buka halaman order web", url: result.waitingUrl }]);
  buttons.push(...buildCheckBotButtons().inline_keyboard);
  return { inline_keyboard: buttons };
}

async function sendCatalog(chatId: number, messageId?: number) {
  const admin = createAdminSupabaseClient();
  const { data: products } = await admin
    .from("products")
    .select("id, name, price, stock, service_type, sold_count, is_active")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  const text = !products?.length
    ? "Saat ini belum ada produk aktif untuk auto order."
    : [
        `🛒 <b>Katalog Auto Order ${SITE.name}</b>`,
        "",
        `Untuk panel bot WA, paket RAM / CPU / disk dipilih setelah Anda menekan produk panelnya.`,
        "",
        ...products.map((p) => {
          const isPanel = (p.service_type || "credential") === "pterodactyl";
          return `• <b>${p.name}</b> — ${isPanel ? "pilih paket 1GB s/d Unlimited" : formatRupiah(p.price)} • ${isPanel ? "auto ready" : `stok ${p.stock}`} • terjual ${p.sold_count || 0}`;
        })
      ].join("\n");

  const keyboard = !products?.length
    ? mainKeyboard()
    : {
        inline_keyboard: [
          ...products.map((p) => [{ text: `${p.name}`, callback_data: `product:${p.id}` }]),
          [{ text: "⬅️ Menu utama", callback_data: "home:menu" }]
        ]
      };

  if (messageId) return editTelegramMessage(chatId, messageId, text, { bot: "auto", reply_markup: keyboard });
  return sendTelegramMessage(chatId, text, { bot: "auto", reply_markup: keyboard });
}

async function ensureLinkedProfile(chatId: number, from?: { username?: string | null; first_name?: string | null; last_name?: string | null }) {
  const profile = await getProfileByTelegramId(String(chatId));
  if (profile) return profile;
  if (!from) throw new Error("Akun Telegram ini belum terdaftar. Tekan tombol Daftar pertama kali dulu.");
  return ensureTelegramCustomerProfile({
    telegramId: String(chatId),
    username: from.username ?? null,
    firstName: from.first_name ?? null,
    lastName: from.last_name ?? null
  });
}

function isTelegramAdmin(chatId: number) {
  const raw = String(process.env.TELEGRAM_ADMIN_CHAT_IDS || "");
  return raw.split(",").map((item) => item.trim()).filter(Boolean).includes(String(chatId));
}

function extractRoomIdFromText(text?: string | null) {
  const match = String(text || "").match(/#ROOM:([a-f0-9-]{8,})/i);
  return match?.[1] || null;
}

async function showHome(chatId: number, messageId?: number) {
  const text = [
    `🤖 <b>@${SITE.autoOrderBotUsername}</b> siap membantu auto order.`,
    "",
    `Bot ini bisa dipakai untuk:`,
    `• buat order produk secara otomatis`,
    `• order panel bot WhatsApp dengan pilihan paket 1GB sampai Unlimited`,
    `• bayar pakai QRIS dinamis yang langsung terhubung ke status order`,
    `• top up saldo langsung dari Telegram`,
    `• daftar pertama kali langsung dari bot tanpa wajib daftar web`,
    `• lihat ringkasan saldo dan order sukses otomatis setelah webhook settlement`,
    "",
    `Tekan tombol daftar pertama kali jika ini kunjungan awal Anda.`
  ].join("\n");

  if (messageId) return editTelegramMessage(chatId, messageId, text, { bot: "auto", reply_markup: mainKeyboard() });
  return sendTelegramMessage(chatId, text, { bot: "auto", reply_markup: mainKeyboard() });
}

async function showWalletInfo(chatId: number, messageId?: number) {
  const profile = await ensureLinkedProfile(chatId);
  const text = [
    `👛 <b>Saldo akun Anda</b>`,
    "",
    `<b>Nama</b>: ${profile.full_name || "User Kograph"}`,
    `<b>Telegram ID</b>: <code>${profile.telegram_id || chatId}</code>`,
    `<b>Saldo</b>: ${formatRupiah(profile.balance || 0)}`
  ].join("\n");

  if (messageId) return editTelegramMessage(chatId, messageId, text, { bot: "auto", reply_markup: topupMenuKeyboard() });
  return sendTelegramMessage(chatId, text, { bot: "auto", reply_markup: topupMenuKeyboard() });
}

async function showPaymentResult(chatId: number, sourceMessageId: number, result: any, isTopup = false) {
  await deleteTelegramMessage(chatId, sourceMessageId, "auto").catch(() => null);

  const lines = isTopup
    ? [
        `💰 <b>Top up saldo dibuat</b>`,
        "",
        `<b>Order ID</b>: <code>${result.orderId}</code>`,
        `<b>Nominal</b>: ${formatRupiah(result.amount)}`,
        `<b>Pembayaran</b>: QRIS dinamis`,
        `Selesaikan pembayaran dari tombol di bawah. Setelah settlement masuk, saldo akan otomatis bertambah.`
      ]
    : [
        `🧾 <b>Order berhasil dibuat</b>`,
        "",
        `<b>Order ID</b>: <code>${result.orderId}</code>`,
        `<b>Total</b>: ${formatRupiah(result.finalAmount)}`,
        `<b>Token cek</b>: <code>${result.statusToken}</code>`,
        `<b>Pembayaran</b>: QRIS dinamis`,
        result.paymentUrl
          ? `Scan QRIS dari gambar atau pakai link backup pada tombol di bawah. Setelah settlement masuk, status akan otomatis sukses.`
          : `Menunggu QRIS disiapkan oleh sistem.`,
        "",
        `Setelah bayar, Anda bisa cek status di @${SITE.botUsername}.`
      ];

  const replyMarkup = buildPaymentLinks(result);

  if (result.paymentQrUrl) {
    try {
      return await sendTelegramPhoto(chatId, result.paymentQrUrl, lines.join("\n"), {
        bot: "auto",
        reply_markup: replyMarkup
      });
    } catch {
      return sendTelegramMessage(chatId, [...lines, `<b>Link bayar backup</b>: ${result.paymentUrl || "-"}`].join("\n"), {
        bot: "auto",
        reply_markup: replyMarkup,
        disable_web_page_preview: false
      });
    }
  }

  return sendTelegramMessage(chatId, lines.join("\n"), {
    bot: "auto",
    reply_markup: replyMarkup,
    disable_web_page_preview: false
  });
}

async function sendRegistrationSuccess(chatId: number, user: any, messageId?: number) {
  const text = [
    `✅ <b>Akun Telegram siap dipakai</b>`,
    "",
    `<b>Nama</b>: ${user.full_name || "User Telegram"}`,
    `<b>Telegram ID</b>: <code>${chatId}</code>`,
    `<b>Status</b>: ${user.created ? "akun baru berhasil dibuat" : "akun sudah pernah terdaftar"}`,
    `Sekarang Anda bisa order langsung dari bot, top up saldo, dan menerima notifikasi sukses otomatis.`
  ].join("\n");

  if (messageId) return editTelegramMessage(chatId, messageId, text, { bot: "auto", reply_markup: mainKeyboard() });
  return sendTelegramMessage(chatId, text, { bot: "auto", reply_markup: mainKeyboard() });
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_AUTO_ORDER_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_AUTO_ORDER_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    const payload = await request.json();
    const message = payload.message;
    const callback = payload.callback_query;

    if (message?.chat?.id && message?.from) {
      const chatId = Number(message.chat.id);
      const text = String(message.text || "").trim();

      await upsertTelegramUser({
        chat_id: chatId,
        username: message.from.username ?? null,
        first_name: message.from.first_name ?? null,
        last_name: message.from.last_name ?? null
      });

      const adminReplyRoomId = isTelegramAdmin(chatId)
        ? extractRoomIdFromText(message.reply_to_message?.text || message.reply_to_message?.caption)
        : null;
      const adminReplyText = String(message.text || message.caption || "").trim();
      if (adminReplyRoomId && adminReplyText && !adminReplyText.startsWith("/")) {
        const admin = createAdminSupabaseClient();
        const { data: room } = await admin.from("live_chat_rooms").select("id, customer_user_id").eq("id", adminReplyRoomId).maybeSingle();
        if (room) {
          await admin.from("live_chat_messages").insert({
            room_id: adminReplyRoomId,
            sender_user_id: null,
            sender_role: "admin",
            message: adminReplyText
          });
          await admin.from("live_chat_rooms").update({ last_message_at: new Date().toISOString() }).eq("id", adminReplyRoomId);
          await sendTelegramMessage(chatId, `✅ Balasan berhasil dikirim ke room <code>${adminReplyRoomId}</code>.`, { bot: "auto" }).catch(() => null);
          return NextResponse.json({ ok: true });
        }
      }

      if (text.startsWith("/daftar")) {
        const registered = await ensureTelegramCustomerProfile({
          telegramId: String(chatId),
          username: message.from.username ?? null,
          firstName: message.from.first_name ?? null,
          lastName: message.from.last_name ?? null
        });
        await sendRegistrationSuccess(chatId, registered);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/start")) {
        await showHome(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/buy")) {
        await sendCatalog(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/saldo")) {
        await showWalletInfo(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/topup")) {
        const amount = Number(text.replace("/topup", "").trim() || 0);
        if (!amount) {
          await sendTelegramMessage(chatId, "Pilih nominal top up di bawah atau gunakan format <code>/topup 50000</code>.", {
            bot: "auto",
            reply_markup: topupMenuKeyboard()
          });
          return NextResponse.json({ ok: true });
        }

        const profile = await ensureLinkedProfile(chatId, message.from);
        const topup = await createTelegramTopup({ userId: profile.id, amount, telegramId: String(chatId) });
        await showPaymentResult(chatId, message.message_id, topup, true);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/adjustsaldo")) {
        if (!isTelegramAdmin(chatId)) {
          await sendTelegramMessage(chatId, "Perintah ini hanya bisa digunakan admin.", { bot: "auto" });
          return NextResponse.json({ ok: true });
        }

        const parts = text.split(" ").filter(Boolean);
        if (parts.length < 4) {
          await sendTelegramMessage(chatId, "Format: <code>/adjustsaldo TELEGRAM_ID NOMINAL KETERANGAN</code>", { bot: "auto" });
          return NextResponse.json({ ok: true });
        }

        const target = await adjustWalletByTelegramAdmin({
          targetTelegramId: parts[1],
          amount: Number(parts[2]),
          description: parts.slice(3).join(" "),
          adminUserId: null
        });

        await sendTelegramMessage(chatId, `✅ Saldo user <b>${target.full_name || target.telegram_id}</b> berhasil disesuaikan sebesar ${formatRupiah(Number(parts[2]))}.`, { bot: "auto" });
        return NextResponse.json({ ok: true });
      }

      await showHome(chatId);
      return NextResponse.json({ ok: true });
    }

    if (callback?.id && callback?.message?.chat?.id) {
      const chatId = Number(callback.message.chat.id);
      const data = String(callback.data || "");
      const messageId = Number(callback.message.message_id);
      await answerTelegramCallbackQuery(callback.id, "Diproses...", "auto");

      if (data === "home:menu") {
        await showHome(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "register:first") {
        const registered = await ensureTelegramCustomerProfile({
          telegramId: String(chatId),
          username: callback.from?.username ?? null,
          firstName: callback.from?.first_name ?? null,
          lastName: callback.from?.last_name ?? null
        });
        await sendRegistrationSuccess(chatId, registered, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "catalog:list") {
        await sendCatalog(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "wallet:info") {
        await showWalletInfo(chatId, messageId);
        return NextResponse.json({ ok: true });
      }

      if (data === "topup:menu") {
        await editTelegramMessage(chatId, messageId, "Pilih nominal top up saldo yang ingin Anda buat.", {
          bot: "auto",
          reply_markup: topupMenuKeyboard()
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("topup:")) {
        const amount = Number(data.split(":")[1] || 0);
        const topup = await createTelegramTopup({
          userId: (await ensureLinkedProfile(chatId, callback.from)).id,
          amount,
          telegramId: String(chatId)
        });
        await showPaymentResult(chatId, messageId, topup, true);
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("product:")) {
        const productId = data.split(":")[1] || "";
        const admin = createAdminSupabaseClient();
        const { data: product } = await admin.from("products").select("id, name, service_type").eq("id", productId).maybeSingle();
        const isPanel = (product?.service_type || "credential") === "pterodactyl";

        if (isPanel) {
          await editTelegramMessage(chatId, messageId, `Pilih paket panel bot WA untuk <b>${product?.name || "produk panel"}</b>.`, {
            bot: "auto",
            reply_markup: panelPlanKeyboard(productId)
          });
          return NextResponse.json({ ok: true });
        }

        await editTelegramMessage(chatId, messageId, "Pilih metode pembayaran untuk produk ini.", {
          bot: "auto",
          reply_markup: paymentChoiceKeyboard(productId)
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("planback:")) {
        const productId = data.split(":")[1] || "";
        await editTelegramMessage(chatId, messageId, "Pilih lagi paket panel bot WA yang Anda inginkan.", {
          bot: "auto",
          reply_markup: panelPlanKeyboard(productId)
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("plan:")) {
        const [, productId, planKey] = data.split(":");
        const selected = getPanelPresetByKey(planKey);
        await editTelegramMessage(
          chatId,
          messageId,
          [
            `Paket yang dipilih: <b>${selected.label}</b>`,
            `RAM ${selected.memoryMb === 0 ? "Unlimited" : `${Math.round(selected.memoryMb / 1024)}GB`} • Disk ${selected.diskMb === 0 ? "Unlimited" : `${Math.max(1, Math.round(selected.diskMb / 1024))}GB`} • CPU ${selected.cpuPercent === 0 ? "Unlimited" : `${selected.cpuPercent}%`}`,
            `Harga ${formatRupiah(selected.price)}`
          ].join("\n"),
          {
            bot: "auto",
            reply_markup: paymentChoiceKeyboard(productId || "", planKey)
          }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("buy:")) {
        const [, productId, paymentMethodRaw, planKey] = data.split(":");
        const methodValue = paymentMethodRaw === "balance" ? "balance" : paymentMethodRaw === "qris" ? "qris" : "midtrans";
        const result = await createTelegramProductOrder({
          userId: (await ensureLinkedProfile(chatId, callback.from)).id,
          telegramId: String(chatId),
          productId: productId || "",
          paymentMethod: methodValue,
          panelPlanKey: planKey || undefined
        });
        await showPaymentResult(chatId, messageId, result, false);
        return NextResponse.json({ ok: true });
      }

      if (data === "noop:selected") return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram auto order webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
