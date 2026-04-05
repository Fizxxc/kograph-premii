import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  buildTelegramStatusMessage,
  sendTelegramMessage,
  upsertTelegramUser
} from "@/lib/telegram";
import { SITE } from "@/lib/constants";

function helpText() {
  return [
    `🤖 <b>${SITE.botUsername}</b> siap membantu.`,
    ``,
    `<b>Command tersedia:</b>`,
    `/start - mulai berlangganan bot`,
    `/help - bantuan command`,
    `/contact - info kontak support`,
    `/status TOKEN - cek status pesanan`,
    ``,
    `Contoh: <code>/status ABCD1234EF56</code>`
  ].join("\n");
}

function contactText() {
  return [
    `💎 <b>Kontak ${SITE.name}</b>`,
    ``,
    `<b>WA</b>: ${SITE.support.whatsapp}`,
    `<b>Email</b>: ${SITE.support.email}`,
    `<b>Telegram</b>: ${SITE.support.telegram}`
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
    }

    const admin = createAdminSupabaseClient();
    const payload = await request.json();

    const message = payload.message;
    if (!message?.chat?.id || !message?.from) {
      return NextResponse.json({ ok: true });
    }

    const chatId = Number(message.chat.id);
    const text = String(message.text ?? "").trim();

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
          `✨ <b>Selamat datang di ${SITE.name}</b>`,
          ``,
          `Bot ini bisa dipakai untuk cek status order dengan style ringkas dan cepat.`,
          ``,
          `Gunakan <code>/status TOKEN</code>`,
          `atau ketik <code>/help</code> untuk melihat semua command.`
        ].join("\n")
      );

      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/help")) {
      await sendTelegramMessage(chatId, helpText());
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/contact")) {
      await sendTelegramMessage(chatId, contactText());
      return NextResponse.json({ ok: true });
    }

    if (text.startsWith("/status")) {
      const token = text.replace("/status", "").trim().toUpperCase();

      if (!token) {
        await sendTelegramMessage(chatId, `Masukkan token status. Contoh: <code>/status ABCD1234EF56</code>`);
        return NextResponse.json({ ok: true });
      }

      const { data: tx } = await admin
        .from("transactions")
        .select(`
          order_id,
          status,
          amount,
          final_amount,
          status_token,
          products ( name ),
          app_credentials ( account_data )
        `)
        .eq("status_token", token)
        .single();

      if (!tx) {
        await sendTelegramMessage(
          chatId,
          `Token tidak ditemukan. Cek lagi token Anda dari halaman waiting payment atau orders.`
        );
        return NextResponse.json({ ok: true });
      }

      const product = Array.isArray(tx.products) ? tx.products[0] : tx.products;
      const credential = Array.isArray(tx.app_credentials) ? tx.app_credentials[0] : tx.app_credentials;

      await sendTelegramMessage(
        chatId,
        buildTelegramStatusMessage({
          orderId: tx.order_id,
          productName: product?.name || "Produk Premium",
          status: tx.status,
          amount: Number(tx.amount),
          finalAmount: Number(tx.final_amount ?? tx.amount),
          credential: credential?.account_data ?? null,
          supportToken: tx.status_token
        })
      );

      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, helpText());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram webhook error", error);
    return NextResponse.json({ ok: true });
  }
}
