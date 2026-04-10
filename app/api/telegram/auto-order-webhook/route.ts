import { NextResponse } from "next/server";
import {
  answerTelegramCallbackQuery,
  buildAutoOrderButtons,
  buildCheckBotButtons,
  sendTelegramMessage,
  upsertTelegramUser
} from "@/lib/telegram";
import {
  adjustWalletByTelegramAdmin,
  createTelegramProductOrder,
  createTelegramTopup,
  getProfileByTelegramId
} from "@/lib/telegram-commerce";
import { QUICK_TOPUP_AMOUNTS, SITE } from "@/lib/constants";
import { formatRupiah } from "@/lib/utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function isTelegramAdmin(chatId: number) {
  return String(process.env.TELEGRAM_ADMIN_CHAT_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .includes(String(chatId));
}

function topupMenuKeyboard() {
  return {
    inline_keyboard: [
      QUICK_TOPUP_AMOUNTS.map((amount) => ({
        text: `Top up ${formatRupiah(amount)}`,
        callback_data: `topup:${amount}`
      })),
      [{ text: "Lihat katalog", callback_data: "catalog:list" }],
      [{ text: "Cek order", url: `https://t.me/${SITE.botUsername}` }]
    ]
  };
}

function paymentChoiceKeyboard(productId: string) {
  return {
    inline_keyboard: [
      [{ text: "Bayar Midtrans", callback_data: `buy:${productId}:midtrans` }],
      [{ text: "Bayar dengan saldo web", callback_data: `buy:${productId}:balance` }],
      [{ text: "Top up saldo", callback_data: "topup:menu" }]
    ]
  };
}

async function sendCatalog(chatId: number) {
  const admin = createAdminSupabaseClient();
  const { data: products } = await admin
    .from("products")
    .select("id, name, price, stock, service_type, sold_count, is_active")
    .eq("is_active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(12);

  if (!products?.length) {
    await sendTelegramMessage(chatId, "Saat ini belum ada produk aktif untuk auto order.", {
      bot: "auto",
      reply_markup: buildAutoOrderButtons()
    });
    return;
  }

  await sendTelegramMessage(
    chatId,
    [
      `🛒 <b>Katalog Auto Order ${SITE.name}</b>`,
      "",
      "Pilih produk dari tombol di bawah. Sistem akan membuat order yang tersambung ke akun Anda berdasarkan Telegram ID yang tersimpan di profile web.",
      "",
      ...products.map((p) => {
        const isPanel = (p.service_type || "credential") === "pterodactyl";
        return `• <b>${p.name}</b> — ${formatRupiah(p.price)} • ${
          isPanel ? "auto ready" : `stok ${p.stock}`
        } • terjual ${p.sold_count || 0}`;
      })
    ].join("\n"),
    {
      bot: "auto",
      reply_markup: {
        inline_keyboard: products.map((p) => [
          { text: `${p.name} (${formatRupiah(p.price)})`, callback_data: `product:${p.id}` }
        ])
      }
    }
  );
}

async function ensureLinkedProfile(chatId: number) {
  const profile = await getProfileByTelegramId(String(chatId));
  if (!profile) {
    throw new Error(
      "Akun Telegram ini belum terhubung. Login ke web lalu isi Telegram ID di halaman Profile dengan angka chat ID Telegram Anda."
    );
  }
  return profile;
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (
      process.env.TELEGRAM_AUTO_ORDER_WEBHOOK_SECRET &&
      secret !== process.env.TELEGRAM_AUTO_ORDER_WEBHOOK_SECRET
    ) {
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

      if (text.startsWith("/start")) {
        await sendTelegramMessage(
          chatId,
          [
            `🤖 <b>@${SITE.autoOrderBotUsername}</b> siap membantu auto order.`,
            "",
            "Bot ini bisa dipakai untuk:",
            "• buat order produk secara otomatis",
            "• bayar pakai Midtrans atau saldo yang tersimpan di web",
            "• top up saldo langsung dari Telegram",
            "• lihat ringkasan saldo akun yang terhubung",
            "",
            "Sebelum memakai auto order, pastikan Telegram ID Anda sudah diisi di halaman profile web agar order tidak tertukar akun."
          ].join("\n"),
          { bot: "auto", reply_markup: buildAutoOrderButtons() }
        );
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/buy")) {
        await sendCatalog(chatId);
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/topup")) {
        const amount = Number(text.replace("/topup", "").trim() || 0);
        if (!amount) {
          await sendTelegramMessage(
            chatId,
            "Pilih nominal top up di bawah atau gunakan format <code>/topup 50000</code>.",
            { bot: "auto", reply_markup: topupMenuKeyboard() }
          );
          return NextResponse.json({ ok: true });
        }

        const profile = await ensureLinkedProfile(chatId);
        const topup = await createTelegramTopup({ userId: profile.id, amount });

        await sendTelegramMessage(
          chatId,
          [
            `💰 <b>Top up saldo dibuat</b>`,
            "",
            `<b>Order ID</b>: <code>${topup.orderId}</code>`,
            `<b>Nominal</b>: ${formatRupiah(topup.amount)}`,
            `<b>Link bayar</b>: ${topup.paymentUrl}`,
            "",
            "Setelah pembayaran terverifikasi, saldo akan otomatis masuk ke akun Anda."
          ].join("\n"),
          { bot: "auto", reply_markup: buildCheckBotButtons(), disable_web_page_preview: false }
        );
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/saldo")) {
        const profile = await ensureLinkedProfile(chatId);
        await sendTelegramMessage(
          chatId,
          [
            `👛 <b>Saldo akun Anda</b>`,
            "",
            `<b>Nama</b>: ${profile.full_name || "User Kograph"}`,
            `<b>Telegram ID</b>: <code>${profile.telegram_id || chatId}</code>`,
            `<b>Saldo</b>: ${formatRupiah(profile.balance || 0)}`
          ].join("\n"),
          { bot: "auto", reply_markup: topupMenuKeyboard() }
        );
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith("/adjustsaldo")) {
        if (!isTelegramAdmin(chatId)) {
          await sendTelegramMessage(chatId, "Perintah ini hanya bisa digunakan admin.", { bot: "auto" });
          return NextResponse.json({ ok: true });
        }

        const parts = text.split(" ").filter(Boolean);
        if (parts.length < 4) {
          await sendTelegramMessage(
            chatId,
            "Format: <code>/adjustsaldo TELEGRAM_ID NOMINAL KETERANGAN</code>",
            { bot: "auto" }
          );
          return NextResponse.json({ ok: true });
        }

        const target = await adjustWalletByTelegramAdmin({
          targetTelegramId: parts[1],
          amount: Number(parts[2]),
          description: parts.slice(3).join(" "),
          adminUserId: null
        });

        await sendTelegramMessage(
          chatId,
          `✅ Saldo user <b>${target.full_name || target.telegram_id}</b> berhasil disesuaikan sebesar ${formatRupiah(Number(parts[2]))}.`,
          { bot: "auto" }
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        "Gunakan /buy untuk auto order, /topup untuk isi saldo, atau /saldo untuk cek saldo akun Anda.",
        { bot: "auto", reply_markup: buildAutoOrderButtons() }
      );
      return NextResponse.json({ ok: true });
    }

    if (callback?.id && callback?.message?.chat?.id) {
      const chatId = Number(callback.message.chat.id);
      const data = String(callback.data || "");
      await answerTelegramCallbackQuery(callback.id, "Diproses...", "auto");

      if (data === "catalog:list") {
        await sendCatalog(chatId);
        return NextResponse.json({ ok: true });
      }

      if (data === "topup:menu") {
        await sendTelegramMessage(chatId, "Pilih nominal top up saldo yang ingin Anda buat.", {
          bot: "auto",
          reply_markup: topupMenuKeyboard()
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("topup:")) {
        const topup = await createTelegramTopup({
          userId: (await ensureLinkedProfile(chatId)).id,
          amount: Number(data.split(":")[1] || 0)
        });

        await sendTelegramMessage(
          chatId,
          [
            `💰 <b>Top up saldo dibuat</b>`,
            "",
            `<b>Order ID</b>: <code>${topup.orderId}</code>`,
            `<b>Nominal</b>: ${formatRupiah(topup.amount)}`,
            `<b>Bayar di sini</b>: ${topup.paymentUrl}`
          ].join("\n"),
          { bot: "auto", disable_web_page_preview: false, reply_markup: buildCheckBotButtons() }
        );
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("product:")) {
        const productId = data.split(":")[1] || "";
        await sendTelegramMessage(chatId, "Pilih metode pembayaran untuk produk ini.", {
          bot: "auto",
          reply_markup: paymentChoiceKeyboard(productId)
        });
        return NextResponse.json({ ok: true });
      }

      if (data.startsWith("buy:")) {
        const [, productId, paymentMethodRaw] = data.split(":");
        const paymentMethod = paymentMethodRaw === "balance" ? "balance" : "midtrans";

        const result = await createTelegramProductOrder({
          userId: (await ensureLinkedProfile(chatId)).id,
          telegramId: String(chatId),
          productId: productId || "",
          paymentMethod
        });

        await sendTelegramMessage(
          chatId,
          [
            `🧾 <b>Order berhasil dibuat</b>`,
            "",
            `<b>Order ID</b>: <code>${result.orderId}</code>`,
            `<b>Total</b>: ${formatRupiah(result.finalAmount)}`,
            `<b>Token cek</b>: <code>${result.statusToken}</code>`,
            result.paymentUrl
              ? `<b>Link bayar</b>: ${result.paymentUrl}`
              : `<b>Pembayaran</b>: Dipotong dari saldo web Anda`,
            "",
            `Setelah bayar, Anda bisa cek status di @${SITE.botUsername}.`
          ].join("\n"),
          { bot: "auto", disable_web_page_preview: false, reply_markup: buildCheckBotButtons() }
        );
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram auto order webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
